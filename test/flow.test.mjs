// The whole pipeline on a real git repository, with the demo agent standing
// in for a model: worktrees, agent runs, commits, dev servers behind the
// preview proxy, the app's API and its guards, and finalize.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runOk } from '../src/proc.mjs';
import { startApp, normalizeConfig, detectProject } from '../src/server.mjs';
import { findChrome } from '../src/checks.mjs';

const tmp = mkdtempSync(path.join(os.tmpdir(), 'variantly-flow-'));
process.env.VARIANTLY_HOME = path.join(tmp, 'home');
process.env.VARIANTLY_DEMO_DELAY = '0';

const repo = path.join(tmp, 'site');
mkdirSync(repo);
writeFileSync(path.join(repo, 'index.html'), '<!doctype html><html><head><link rel="stylesheet" href="style.css"><title>Shop</title></head><body><h1>Plain shop</h1><a href="/about.html">About</a></body></html>');
writeFileSync(path.join(repo, 'about.html'), '<!doctype html><html><head><title>About</title></head><body>About</body></html>');
writeFileSync(path.join(repo, 'style.css'), 'body { font-family: sans-serif; }\n');
const git = (/** @type {string[]} */ ...args) => runOk('git', args, { cwd: repo });
await git('init', '-q');
await git('-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '-A');
await git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'init');

const app = await startApp({ repo, port: 0 });
const api = async (/** @type {string} */ method, /** @type {string} */ route, /** @type {unknown} */ body, headers = { 'x-variantly': '1' }) => {
  const res = await fetch(`${app.url}/api/${route}`, {
    method,
    headers: { 'content-type': 'application/json', ...(method === 'POST' ? headers : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
};
const until = async (/** @type {() => boolean | Promise<boolean>} */ cond, ms = 60_000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await cond()) return;
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('timed out');
};

test.after(async () => {
  await app.close();
  rmSync(tmp, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
});

test('detect suggests the static adapter and the demo agent is accepted', async () => {
  const info = await detectProject(repo);
  assert.equal(info.suggested.stackId, 'static');
  assert.equal(info.hasCommits, true);
});

test('POST without the X-Variantly header is refused', async () => {
  const res = await api('POST', 'discard', {}, /** @type {any} */ ({}));
  assert.equal(res.status, 403);
});

test('requests with a foreign Host header are refused (DNS rebinding)', async () => {
  const http = await import('node:http');
  const status = await new Promise((resolve) => {
    http.get({ host: '127.0.0.1', port: app.port, path: '/api/state', headers: { host: 'evil.example' } }, (res) => {
      res.resume();
      resolve(res.statusCode);
    });
  });
  assert.equal(status, 421);
});

test('generates two variants, serves them, and finalizes the chosen one', async () => {
  const info = await detectProject(repo);
  const config = normalizeConfig({ ...info.suggested, agent: 'demo', count: 2, concurrency: 2, audit: false });
  const gen = await api('POST', 'generate', config);
  assert.equal(gen.status, 200, JSON.stringify(gen.json));

  await until(() => app.session.state.phase === 'ready');
  const variants = app.session.state.variants;
  assert.deepEqual(variants.map((v) => v.status), ['done', 'done']);
  // The shared PRODUCT.md (from the fixture's own title and README) guides the
  // agent but is not part of the variant.
  assert.ok(existsSync(path.join(app.session.worktreeFor(1), 'PRODUCT.md')));
  assert.deepEqual(variants[0].files, ['style.css']);
  assert.match(variants[1].summary, /Swiss precision/);

  // Every variant lives in its own worktree; the user's tree is untouched.
  assert.ok(existsSync(app.session.worktreeFor(1)));
  assert.equal(readFileSync(path.join(repo, 'style.css'), 'utf8'), 'body { font-family: sans-serif; }\n');

  // Start variant 2's server and read it through its preview proxy.
  await app.session.pool.ensure('v2');
  const status = app.session.pool.status('v2');
  assert.equal(status?.state, 'ready');
  const page = await (await fetch(`http://127.0.0.1:${status?.proxyPort}/`)).text();
  assert.match(page, /<head><script src="\/__variantly\/frame\.js" data-variantly="v2" defer><\/script>/);
  const css = await (await fetch(`http://127.0.0.1:${status?.proxyPort}/style.css`)).text();
  assert.match(css, /Swiss precision/);
  const frame = await fetch(`http://127.0.0.1:${status?.proxyPort}/__variantly/frame.js`);
  assert.equal(frame.status, 200);

  // A chat follow-up runs the agent again in variant 2 and commits its change
  // to the variant's branch, so keeping the variant keeps the change.
  assert.equal((await api('POST', 'chat/2', { message: '   ' })).status, 400);
  assert.equal((await api('POST', 'chat/9', { message: 'bigger header' })).status, 400);
  const asked = await api('POST', 'chat/2', { message: 'make the headings tighter' });
  assert.equal(asked.status, 200, JSON.stringify(asked.json));
  // One turn at a time per variant.
  assert.equal((await api('POST', 'chat/2', { message: 'and again' })).status, 400);
  const turns = () => app.session.state.variants[1].chat ?? [];
  await until(() => turns().at(-1)?.status === 'done');
  assert.deepEqual(turns().map((t) => t.role), ['user', 'agent']);
  assert.match(turns()[1].text, /make the headings tighter/);
  assert.deepEqual(turns()[1].files, ['style.css']);
  const chatCss = readFileSync(path.join(app.session.worktreeFor(2), 'style.css'), 'utf8');
  assert.match(chatCss, /variantly demo chat: make the headings tighter/);
  const wtGit = (/** @type {string[]} */ ...args) => runOk('git', args, { cwd: app.session.worktreeFor(2) });
  assert.match(await wtGit('log', '-1', '--format=%s'), /chat on variant 2/);
  assert.equal(await wtGit('status', '--porcelain', '--untracked-files=no'), '');
  // The shared PRODUCT.md was placed, not built: the chat commit leaves it out too.
  assert.doesNotMatch(await wtGit('show', '--name-only', '--format=', 'HEAD'), /PRODUCT\.md/);

  // The user keeps editing while they compare; finalize must merge, not clobber.
  writeFileSync(path.join(repo, 'about.html'), '<!doctype html><html><head><title>About us</title></head><body>About</body></html>');

  const fin = await api('POST', 'finalize/2', {});
  assert.equal(fin.status, 200, JSON.stringify(fin.json));
  assert.deepEqual(fin.json.files, ['style.css']);
  assert.equal(existsSync(path.join(repo, 'PRODUCT.md')), false);
  assert.deepEqual(fin.json.conflicts, []);
  assert.match(readFileSync(path.join(repo, 'style.css'), 'utf8'), /Swiss precision/);
  assert.match(readFileSync(path.join(repo, 'style.css'), 'utf8'), /variantly demo chat/);
  assert.match(readFileSync(path.join(repo, 'about.html'), 'utf8'), /About us/);
  assert.equal(existsSync(app.session.worktreeFor(1)), false);
  assert.equal(existsSync(app.session.worktreeFor(2)), false);
  // Branches are kept so nothing is lost.
  const branches = await git('branch', '--list', 'variantly/*');
  assert.match(branches, /v1/);
  assert.equal(app.session.state.phase, 'finalized');

  // Starting over after keeping must not delete the kept run's branches.
  const runId = app.session.state.runId;
  await api('POST', 'discard', {});
  assert.equal(app.session.state.phase, 'setup');
  assert.match(await git('branch', '--list', `variantly/${runId}/*`), /v2/);
});

test('discard wins against the UI asking for servers at the same time', async () => {
  const info = await detectProject(repo);
  await api('POST', 'generate', normalizeConfig({ ...info.suggested, agent: 'demo', count: 1, audit: false }));
  await until(() => app.session.state.phase === 'ready');
  await app.session.pool.ensure('v1');
  assert.equal(app.session.pool.status('v1')?.state, 'ready');
  const wt = app.session.worktreeFor(1);
  // The browser keeps calling ensure for visible panes while discard runs.
  const [res] = await Promise.all([api('POST', 'discard', {}), api('POST', 'ensure/v1', {}), api('POST', 'ensure/original', {})]);
  assert.equal(res.status, 200, JSON.stringify(res.json));
  await api('POST', 'ensure/v1', {});
  assert.equal(app.session.state.phase, 'setup');
  assert.equal(existsSync(wt), false);
});

// Fetches lighthouse, axe-core and playwright-core through npx, so it needs
// the network and a Chromium; skipped without them.
test('scores the original and each variant with axe-core and Lighthouse', { skip: !findChrome() || process.env.VARIANTLY_SKIP_AUDIT === '1', timeout: 300_000 }, async () => {
  const info = await detectProject(repo);
  await api('POST', 'generate', normalizeConfig({ ...info.suggested, agent: 'demo', count: 1 }));
  await until(() => app.session.state.phase === 'ready');
  await until(() => Boolean(app.session.state.baseline || app.session.state.baselineError), 240_000);
  const v = app.session.state.variants[0];
  await until(() => Boolean(v.audit || v.auditState === 'failed'), 240_000);
  assert.equal(v.auditError, undefined);
  assert.equal(app.session.state.baselineError, undefined);
  for (const a of [app.session.state.baseline, v.audit]) {
    assert.equal(typeof a?.lighthouse.accessibility, 'number');
    assert.equal(typeof a?.axe.total, 'number');
  }
  // The page has no lang attribute, which axe always flags.
  assert.ok(v.audit?.axe.violations.some((x) => x.id === 'html-has-lang'));
  await api('POST', 'discard', {});
});
