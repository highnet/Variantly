import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ServerPool } from '../src/servers.mjs';

// Answers HTTP at once but writes its ready file only later, like
// `php artisan serve` next to a Vite that hasn't written public/hot yet.
const SERVER = `
const http = require('node:http');
const fs = require('node:fs');
http.createServer((req, res) => res.end('<!doctype html><html><head></head></html>')).listen(Number(process.env.PORT), '127.0.0.1');
setTimeout(() => fs.writeFileSync('hot', 'http://127.0.0.1:1'), 1500);
`;

test('a server with a ready file is ready only once it writes a fresh one, which stopping removes', async (t) => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'variantly-ready-'));
  writeFileSync(path.join(dir, 'server.cjs'), SERVER);
  // A stale copy left by an earlier run must not count.
  writeFileSync(path.join(dir, 'hot'), 'stale');
  const old = new Date(Date.now() - 60_000);
  (await import('node:fs')).utimesSync(path.join(dir, 'hot'), old, old);

  const pool = new ServerPool({ inject: () => '' });
  t.after(async () => {
    await pool.closeAll();
    rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  });
  await pool.add({ id: 'original', cwd: dir, command: `"${process.execPath}" server.cjs`, bootTimeout: 20_000, readyFile: 'hot' });
  const started = Date.now();
  await pool.ensure('original');
  assert.equal(pool.status('original')?.state, 'ready');
  assert.ok(Date.now() - started >= 1200, `ready after ${Date.now() - started}ms, before the ready file was written`);
  assert.ok(existsSync(path.join(dir, 'hot')));
  // Killed servers can't clean up; the pool removes what this run wrote.
  await pool.stop('original');
  assert.equal(existsSync(path.join(dir, 'hot')), false);
});

test('a server stopped while it is still being set up never starts', async (t) => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'variantly-race-'));
  writeFileSync(path.join(dir, 'server.cjs'), "require('node:fs').writeFileSync('started', '');\nsetInterval(() => {}, 1000);\n");
  const pool = new ServerPool({ inject: () => '' });
  t.after(() => rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }));
  await pool.add({ id: 'v1', cwd: dir, command: `"${process.execPath}" server.cjs`, bootTimeout: 5_000 });
  const boot = pool.ensure('v1');
  await pool.closeAll();
  await boot;
  await new Promise((r) => setTimeout(r, 1500));
  assert.equal(existsSync(path.join(dir, 'started')), false, 'the dev server was spawned after closeAll');
});
