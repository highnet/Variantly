// A cancelled variant stops its clock. Without finishedAt the board kept
// counting its time up after Stop, past the run's own elapsed time.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runOk } from '../src/proc.mjs';
import { Session } from '../src/session.mjs';

const tmp = mkdtempSync(path.join(os.tmpdir(), 'variantly-cancel-'));
process.env.VARIANTLY_HOME = path.join(tmp, 'home');
const repo = path.join(tmp, 'site');
mkdirSync(repo);
writeFileSync(path.join(repo, 'index.html'), '<h1>Hi</h1>\n');
await runOk('git', ['init', '-q'], { cwd: repo });
await runOk('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '-A'], { cwd: repo });
await runOk('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'init'], { cwd: repo });

test.after(() => rmSync(tmp, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }));

test('cancelling a running variant records when it stopped', async () => {
  const session = new Session({ repo });
  await session.load();
  const startedAt = Date.now() - 5000;
  session.state.variants = [
    /** @type {any} */ ({ n: 1, direction: '', agent: 'demo', model: '', status: 'running', summary: '', files: [], startedAt }),
    /** @type {any} */ ({ n: 2, direction: '', agent: 'demo', model: '', status: 'queued', summary: '', files: [] }),
  ];
  await session.cancel(1);
  await session.cancel(2);
  const [one, two] = session.state.variants;
  assert.equal(one.status, 'cancelled');
  assert.ok(one.finishedAt && one.finishedAt >= startedAt + 5000, 'a started variant gets finishedAt');
  assert.equal(two.status, 'cancelled');
  assert.equal(two.finishedAt, undefined, 'a variant that never started has no finish time');
  await session.close();
});
