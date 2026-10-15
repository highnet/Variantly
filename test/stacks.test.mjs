import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { adapterById, detect, fill, installFailed, packageRunner, projectInfo as infoFor } from '../src/stacks.mjs';

/** Write a fixture tree: { 'path': 'contents' } */
const fixture = (/** @type {Record<string, string>} */ files) => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'variantly-stack-'));
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    writeFileSync(path.join(dir, rel), body);
  }
  return dir;
};

const pkg = (/** @type {Record<string,string>} */ deps, scripts = {}) =>
  JSON.stringify({ dependencies: deps, scripts });

// One fixture per stack in the compatibility list, plus Impeccable Live's
// runtimes. Each names the adapter it must resolve to.
const CASES = [
  ['nextjs', { 'package.json': pkg({ next: '16.0.0', react: '19.0.0' }), 'package-lock.json': '{}' }, /next dev --port \{port\}/],
  ['sveltekit', { 'package.json': pkg({ '@sveltejs/kit': '2.0.0', vite: '6' }) }, /vite dev --port \{port\} --strictPort/],
  ['astro', { 'package.json': pkg({ astro: '5.0.0' }) }, /astro dev --port \{port\}/],
  ['nuxt', { 'package.json': pkg({ nuxt: '3.15.0' }) }, /nuxi dev --port \{port\}/],
  ['django', { 'manage.py': '', 'requirements.txt': 'django' }, /manage\.py runserver 127\.0\.0\.1:\{port\}/],
  ['fastapi', { 'app/main.py': 'from fastapi import FastAPI\napi = FastAPI()\n' }, /uvicorn app\.main:api --port \{port\}/],
  ['reflex', { 'rxconfig.py': 'import reflex' }, /reflex run --frontend-port \{port\} --backend-port \{port2\}/],
  ['laravel', { artisan: '', 'composer.json': '{}', 'vite.config.js': '' }, /php artisan serve --port=\{port\}.*vite --port \{port2\}/],
  ['go', { 'go.mod': 'module x\nrequire github.com/a-h/templ v0.3.0\n' }, /templ generate && go run \./],
  ['wasp', { 'main.wasp': 'app x {}', 'package.json': pkg({ react: '18' }) }, /wasp start/],
  ['rust', { 'Cargo.toml': '[package]\nname="x"' }, /cargo run/],
  ['rails', { Gemfile: '', 'config/application.rb': '', 'Procfile.dev': 'css: bin/rails tailwindcss:watch' }, /tailwindcss:build && bin\/rails server -p \{port\}/],
  ['vite', { 'package.json': pkg({ vite: '6', react: '19' }) }, /vite --port \{port\} --strictPort/],
  ['bun', { 'package.json': pkg({}, { dev: 'bun --hot index.ts' }), 'bun.lock': '' }, /bun run dev/],
  ['static', { 'index.html': '<!doctype html>' }, /static-server\.mjs" \{port\}/],
];

for (const [id, files, command] of CASES) {
  test(`detects ${id}`, (t) => {
    const dir = fixture(/** @type {Record<string,string>} */ (files));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    const [best] = detect(dir);
    assert.ok(best, 'something was detected');
    assert.equal(best.adapter.id, id);
    assert.match(best.adapter.command(/** @type {any} */ (infoFor(best.appRoot))), /** @type {RegExp} */ (command));
  });
}

test('finds the frontend in a monorepo and ranks it first', (t) => {
  const dir = fixture({
    'go.mod': 'module api',
    'web/package.json': pkg({ vite: '6', svelte: '5' }),
    'web/pnpm-lock.yaml': '',
  });
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const found = detect(dir);
  assert.deepEqual(found.map((f) => f.rel).sort(), ['', 'web']);
  assert.equal(found[0].rel, 'web');
  assert.equal(packageRunner(path.join(dir, 'web'), dir).run, 'pnpm exec');
});

test('a Go or Rust API ranks below its Vite frontend, a server-rendered one above it', (t) => {
  /** @type {[Record<string, string>, string][]} */
  const cases = [
    [{ 'go.mod': 'module api\nrequire github.com/go-chi/chi/v5 v5.2.1', 'cmd/api/main.go': '', 'web/package.json': pkg({ vite: '7', react: '19' }) }, 'web'],
    [{ 'Cargo.toml': '[dependencies]\naxum = "0.8"', 'frontend/package.json': pkg({ vite: '7', react: '19' }) }, 'frontend'],
    [{ 'go.mod': 'module site', 'templates/index.html': '', 'tools/package.json': pkg({ vite: '7' }) }, ''],
    [{ 'Cargo.toml': '[dependencies]\naskama = "0.14"', 'admin/package.json': pkg({ vite: '7' }) }, ''],
  ];
  for (const [files, want] of cases) {
    const dir = fixture(files);
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    assert.equal(detect(dir)[0].rel, want, JSON.stringify(Object.keys(files)));
  }
});

test('a Jinja templates folder is not mistaken for a static site', (t) => {
  const dir = fixture({ 'main.py': 'from fastapi import FastAPI\napp = FastAPI()\n', 'templates/index.html': '{% block x %}{% endblock %}' });
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  assert.deepEqual(detect(dir).map((f) => `${f.rel}:${f.adapter.id}`), [':fastapi']);
});

test('pnpm skipping unapproved build scripts is not a failed install', () => {
  assert.equal(installFailed(1, 'Error: ERR_PNPM_IGNORED_BUILDS\n  Ignored build scripts: sharp'), false);
  assert.equal(installFailed(1, 'ERR_PNPM_OUTDATED_LOCKFILE'), true);
  assert.equal(installFailed(0, ''), false);
});

test('a Next.js app inside apps/web of a Python repo wins over the Python backend', (t) => {
  const dir = fixture({
    'pyproject.toml': '',
    'main.py': 'from fastapi import FastAPI\napp = FastAPI()',
    'apps/web/package.json': pkg({ next: '16' }),
  });
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const [best] = detect(dir);
  assert.equal(best.adapter.id, 'nextjs');
  assert.equal(best.rel, 'apps/web');
});

test('fill replaces known placeholders and leaves the rest', () => {
  assert.equal(fill('{run} next dev --port {port} {nope}', { run: 'npx', port: 3001 }), 'npx next dev --port 3001 {nope}');
});


test('Laravel with Vite waits for public/hot; without Vite it does not', () => {
  const laravel = adapterById('laravel');
  const info = (/** @type {Record<string,string>} */ files) => /** @type {any} */ ({ has: (/** @type {string} */ f) => f in files, read: () => '' });
  assert.equal(laravel.readyFile?.(laravel.command(info({ artisan: '', 'composer.json': '', 'vite.config.js': '' }))), 'public/hot');
  assert.equal(laravel.readyFile?.(laravel.command(info({ artisan: '', 'composer.json': '' }))), undefined);
});
