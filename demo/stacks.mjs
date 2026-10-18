// B-roll for "will it work on mine?": run `variantly doctor` against three
// small projects (Next.js, Django, static HTML) and one folder with a known
// problem, and keep what it printed for the film's terminal cards.
//
//   node stacks.mjs            writes video/doctor.json (record.mjs runs it too)
//
// No agent runs and no keys are needed: doctor only detects. The projects are
// made fresh in .work/stacks, each a git repo, so the output is the same on
// every machine except the version numbers. The "rough edge" folder is a git
// repo with no commit yet, so doctor marks it ✗ every time.
import { spawn } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { at, log, REPO, run, writeJson } from './lib/common.mjs';

const ROOT = at('.work', 'stacks');
const HOME = at('.work', 'stacks-home');

const PROJECTS = [
  {
    id: 'nextjs',
    title: 'my-next-app',
    files: {
      'package.json': JSON.stringify({ name: 'my-next-app', private: true, scripts: { dev: 'next dev' }, dependencies: { next: '16.0.0', react: '19.0.0', 'react-dom': '19.0.0' } }, null, 2),
      'package-lock.json': '{}',
      'app/page.tsx': 'export default function Page() { return <h1>Hello</h1>; }\n',
      'app/globals.css': 'body { margin: 0; }\n',
    },
  },
  {
    id: 'django',
    title: 'my-django-site',
    files: {
      'manage.py': '#!/usr/bin/env python\n',
      'requirements.txt': 'django\n',
      'templates/base.html': '<!doctype html><title>Hello</title>\n',
      'static/css/site.css': 'body { margin: 0; }\n',
    },
  },
  { id: 'static', title: 'tallyboard', copy: path.join(REPO, 'examples', 'tallyboard') },
];

/** Doctor's output with the take's folders replaced by short names. */
function doctor(dir, title) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(REPO, 'bin', 'variantly.mjs'), 'doctor', dir], { cwd: dir, env: { ...process.env, VARIANTLY_HOME: HOME } });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('exit', () => resolve(out.split(dir).join(`~/${title}`).split(REPO).join('variantly')));
    child.on('error', (e) => resolve(String(e)));
  });
}

/** Command templates as a person would read them. */
const readable = (line) =>
  line
    .replace('{run}', 'npx')
    .replace('{python}', 'python')
    .replace(/\{node\} "\{variantly\}\/src\/static-server\.mjs"/, 'built-in static server on')
    .replace(/\s{2,}/g, '  ')
    .trimEnd();

async function project(dir, { commit = true } = {}) {
  const git = (...args) => run('git', args, { cwd: dir, quiet: true });
  await git('init', '-q');
  if (!commit) return;
  await git('add', '-A');
  await git('-c', 'user.name=Demo', '-c', 'user.email=demo@example.com', 'commit', '-qm', 'before');
}

export async function captureDoctor() {
  rmSync(ROOT, { recursive: true, force: true });
  mkdirSync(HOME, { recursive: true });
  const stacks = [];
  for (const p of PROJECTS) {
    const dir = path.join(ROOT, p.title);
    if (p.copy) cpSync(p.copy, dir, { recursive: true });
    for (const [rel, body] of Object.entries(p.files ?? {})) {
      mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      writeFileSync(path.join(dir, rel), body);
    }
    await project(dir);
    const out = await doctor(dir, p.title);
    // The App section: what variantly found and how it will serve it.
    const app = out.split('\nApp\n')[1]?.split('\n').filter((l) => l.trim()) ?? [];
    stacks.push({ id: p.id, title: `~/${p.title}`, lines: [`$ npx variantly doctor`, ...app.slice(0, 2).map(readable)] });
  }

  // The rough edge: a fresh repo with no commit yet. Only the top block is
  // filmed; the agent list differs from machine to machine.
  const bare = path.join(ROOT, 'my-site');
  mkdirSync(bare, { recursive: true });
  writeFileSync(path.join(bare, 'index.html'), '<!doctype html><title>My site</title>\n');
  await project(bare, { commit: false });
  const out = await doctor(bare, 'my-site');
  const top = out.split('\nAgents')[0].split('\n').filter((l) => /^[✓✗]/.test(l));
  const fail = { title: '~/my-site', lines: ['$ npx variantly doctor', ...top] };

  const file = at('video', 'doctor.json');
  writeJson(file, { stacks, fail });
  log('stacks', `doctor output for ${stacks.map((s) => s.id).join(', ')} and one ✗ -> video/doctor.json`);
  if (!top.some((l) => l.startsWith('✗'))) log('stacks', 'warning: the no-commit folder showed no ✗; check doctor');
  return { stacks, fail };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await captureDoctor();
  for (const s of [...result.stacks, result.fail]) console.log(`\n${s.title}\n${s.lines.join('\n')}`);
}
