// A run started with `--yes` can fail before any page is open. The problem
// must still reach the page once it connects, and stop once a run starts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runOk } from '../src/proc.mjs';
import { startApp } from '../src/server.mjs';

const tmp = mkdtempSync(path.join(os.tmpdir(), 'variantly-problem-'));
process.env.VARIANTLY_HOME = path.join(tmp, 'home');
const repo = path.join(tmp, 'site');
mkdirSync(repo);
writeFileSync(path.join(repo, 'index.html'), '<!doctype html><title>x</title>');
const git = (/** @type {string[]} */ ...args) => runOk('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: repo });
await git('init', '-q');
await git('add', '-A');
await git('commit', '-qm', 'init');

const app = await startApp({ repo, port: 0 });

test.after(async () => {
  await app.close();
  rmSync(tmp, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
});

/** The events a fresh page gets on connect, read for a moment. */
const firstEvents = async () => {
  const ctrl = new AbortController();
  const res = await fetch(`${app.url}/api/events`, { signal: ctrl.signal });
  const reader = /** @type {ReadableStreamDefaultReader<Uint8Array>} */ (res.body?.getReader());
  let text = '';
  const stop = setTimeout(() => ctrl.abort(), 400);
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      text += new TextDecoder().decode(value);
    }
  } catch {
    // aborted: done reading
  }
  clearTimeout(stop);
  return [...text.matchAll(/^event: (\w+)\ndata: (.*)$/gm)].map((m) => ({ event: m[1], data: JSON.parse(m[2]) }));
};

test('a problem from before any page opened is shown to the page that connects later', async () => {
  app.problem('The run did not start: no agent is installed.');
  const events = await firstEvents();
  assert.deepEqual(
    events.find((e) => e.event === 'problem')?.data,
    { message: 'The run did not start: no agent is installed.' },
  );
  // A reload still shows it while nothing has started.
  assert.ok((await firstEvents()).some((e) => e.event === 'problem'));
});

test('once a run starts, the held problem is no longer replayed', async () => {
  app.session.emit('state', { ...app.session.snapshot(), phase: 'generating' });
  const events = await firstEvents();
  assert.equal(events.some((e) => e.event === 'problem'), false);
});
