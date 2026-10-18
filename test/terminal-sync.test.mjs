// The app stays open while the CLI keeps or cleans the run in a terminal. The
// app must notice (on a sync, which the page sends when it regains focus and
// before Keep or Clean, and on its own next write) and refuse to act on its
// stale copy, with a plain message instead of git's.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { runOk } from '../src/proc.mjs';
import { detectProject, normalizeConfig, startApp } from '../src/server.mjs';
import { stateDirFor } from '../src/session.mjs';

const CLI = fileURLToPath(new URL('../bin/variantly.mjs', import.meta.url));
// The real path, as `git rev-parse --show-toplevel` gives the CLI: macOS's
// tmpdir is a symlink and Windows' can be a short 8.3 name, and either would
// make the app and the CLI look in different state folders.
const tmp = realpathSync.native(mkdtempSync(path.join(os.tmpdir(), 'variantly-sync-')));
process.env.VARIANTLY_HOME = path.join(tmp, 'home');
process.env.VARIANTLY_DEMO_DELAY = '0';

const repo = path.join(tmp, 'site');
mkdirSync(repo);
writeFileSync(path.join(repo, 'index.html'), '<!doctype html><html><head><link rel="stylesheet" href="style.css"><title>Shop</title></head><body><h1>Shop</h1></body></html>');
writeFileSync(path.join(repo, 'style.css'), 'body { font-family: sans-serif; }\n');
const git = (/** @type {string[]} */ ...args) => runOk('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: repo });
await git('init', '-q');
await git('add', '-A');
await git('commit', '-qm', 'init');

const app = await startApp({ repo, port: 0 });
const api = async (/** @type {string} */ method, /** @type {string} */ route, /** @type {unknown} */ body) => {
  const res = await fetch(`${app.url}/api/${route}`, {
    method,
    headers: { 'content-type': 'application/json', ...(method === 'POST' ? { 'x-variantly': '1' } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
};
const until = async (/** @type {() => boolean} */ cond, ms = 60_000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (cond()) return;
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('timed out');
};
/** `variantly <args>` in a terminal beside the open app. */
const cli = (/** @type {string[]} */ ...args) => promisify(execFile)(process.execPath, [CLI, ...args, repo], { env: process.env });
const makeRun = async () => {
  const info = await detectProject(repo);
  const gen = await api('POST', 'generate', normalizeConfig({ ...info.suggested, agent: 'demo', count: 2, audit: false, review: false }));
  assert.equal(gen.status, 200, JSON.stringify(gen.json));
  await until(() => app.session.state.phase === 'ready');
  // The terminal reads the state file, so wait for the app's pending writes
  // to land (slow runners lag behind the in-memory phase).
  await app.session.saveQueue;
  // A preview is up, as it would be while someone compares.
  await app.session.pool.ensure('v2');
};

test.after(async () => {
  await app.close();
  rmSync(tmp, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
});

test('kept from the terminal: the app catches up and its Keep says so instead of git', async () => {
  await makeRun();
  const { stdout } = await cli('keep', '1', '--no-rollout');
  assert.match(stdout, /Applied variant 1/);
  const applied = readFileSync(path.join(repo, 'style.css'), 'utf8');
  // Still the stale copy until something re-reads the file.
  assert.equal(app.session.state.phase, 'ready');

  // Keep in the stale app: refused plainly, nothing applied a second time.
  const fin = await api('POST', 'finalize/2', { sitewide: false });
  assert.equal(fin.status, 400);
  assert.equal(fin.json.error, 'This run was kept from the terminal: variant 1 is in your working tree.');
  assert.doesNotMatch(fin.json.error, /git|fatal|index/);
  assert.equal(readFileSync(path.join(repo, 'style.css'), 'utf8'), applied);
  // And the app now shows the kept run (the kept screen), with no previews left running.
  const state = await api('GET', 'state');
  assert.equal(state.json.phase, 'finalized');
  assert.equal(state.json.chosen, 1);
  assert.equal(app.session.pool.status('v2')?.state ?? 'stopped', 'stopped');

  // Nothing more to catch up on.
  assert.equal((await api('POST', 'sync', {})).json.change, null);
  await api('POST', 'discard', {});
  await git('checkout', '--', 'style.css');
});

test('cleaned from the terminal: a sync (window focus) reports it and moves the app to setup', async () => {
  await makeRun();
  await cli('clean');
  assert.equal(existsSync(stateDirFor(repo)), false);

  const sync = await api('POST', 'sync', {});
  assert.equal(sync.status, 200);
  assert.equal(sync.json.change.kind, 'cleaned');
  assert.equal(sync.json.change.message, 'This run was cleaned up from the terminal. Start a new one when you’re ready.');
  assert.equal(sync.json.state.phase, 'setup');
  assert.deepEqual(sync.json.state.variants, []);
  // The app doesn't put the state clean removed back.
  await app.session.save();
  assert.equal(existsSync(path.join(stateDirFor(repo), 'state.json')), false);
});

test('cleaned from the terminal: Keep in the stale app refuses plainly, and its next write doesn\'t undo the clean', async () => {
  await makeRun();
  await cli('clean');
  // The app's own write (an audit landing, say) must not resurrect the run.
  await app.session.save();
  assert.equal(app.session.state.phase, 'setup');
  assert.equal(existsSync(path.join(stateDirFor(repo), 'state.json')), false);

  await makeRun();
  await cli('clean');
  const fin = await api('POST', 'finalize/1', { sitewide: false });
  assert.equal(fin.status, 400);
  assert.equal(fin.json.error, 'This run was cleaned up from the terminal. Start a new one when you’re ready.');
  assert.equal(readFileSync(path.join(repo, 'style.css'), 'utf8').replace(/\r\n/g, '\n'), 'body { font-family: sans-serif; }\n');
});

test('Keep checks the run is still there: a missing branch is a plain error, not git\'s', async () => {
  await makeRun();
  // Gone behind every session's back, with the state file untouched. (The
  // previews let go first, as a person closing the app would: Windows will
  // not delete a folder a live process sits in.)
  await app.session.release();
  await git('worktree', 'remove', '--force', app.session.worktreeFor(1));
  await git('branch', '-D', app.session.branchFor(1));
  const fin = await api('POST', 'finalize/1', { sitewide: false });
  assert.equal(fin.status, 400);
  assert.match(fin.json.error, /^Variant 1’s branch is gone, so there is nothing to apply\./);
  assert.equal(app.session.state.phase, 'ready');
  await api('POST', 'discard', {});
});
