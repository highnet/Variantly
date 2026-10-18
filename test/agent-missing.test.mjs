// One agent alone that isn't installed: `--agent claude --yes` must refuse up
// front, in the terminal, the way a mix with a missing agent already does,
// rather than start a run whose every variant fails with "spawn claude ENOENT".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runOk, which } from '../src/proc.mjs';
import { assertAgentsReady, normalizeConfig } from '../src/server.mjs';

const win = process.platform === 'win32';
const CLI = fileURLToPath(new URL('../bin/variantly.mjs', import.meta.url));
const tmp = mkdtempSync(path.join(os.tmpdir(), 'variantly-missing-'));

// A PATH with node and git and nothing else: no agent CLI on it.
const bin = path.join(tmp, 'bin');
mkdirSync(bin);
if (!win) {
  symlinkSync(process.execPath, path.join(bin, 'node'));
  symlinkSync(String(which('git')), path.join(bin, 'git'));
}
const env = { ...process.env, PATH: bin, HOME: tmp, VARIANTLY_HOME: path.join(tmp, 'home'), VARIANTLY_DEMO_DELAY: '0' };

test.after(() => rmSync(tmp, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }));

test('a single agent that is not installed is refused before the run, with its install command', { skip: win }, async () => {
  const saved = { PATH: process.env.PATH, HOME: process.env.HOME };
  Object.assign(process.env, { PATH: bin, HOME: tmp });
  try {
    const config = normalizeConfig({ command: 'npx serve -l {port}', agent: 'claude', count: 2 });
    await assert.rejects(assertAgentsReady(config, tmp), (err) => {
      assert.equal(/** @type {Error} */ (err).message, "Not started: Claude Code isn't installed (npm install -g @anthropic-ai/claude-code).");
      return true;
    });
  } finally {
    Object.assign(process.env, saved);
  }
});

test('`--agent claude --yes` without claude says so in the terminal and starts nothing', { skip: win, timeout: 60_000 }, async () => {
  const repo = path.join(tmp, 'site');
  mkdirSync(repo);
  writeFileSync(path.join(repo, 'index.html'), '<!doctype html><title>Shop</title><h1>Shop</h1>');
  const git = (/** @type {string[]} */ ...args) => runOk('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: repo });
  await git('init', '-q');
  await git('add', '-A');
  await git('commit', '-qm', 'init');

  const port = String(20000 + Math.floor(Math.random() * 20000));
  const child = spawn(process.execPath, [CLI, '--agent', 'claude', '--yes', '--count', '2', '--no-open', '--port', port, repo], { env });
  let out = '';
  let err = '';
  child.stdout.on('data', (d) => (out += d));
  child.stderr.on('data', (d) => (err += d));
  const exited = new Promise((resolve) => child.on('exit', resolve));
  try {
    // The CLI keeps the app open for the person to fix it; it reports first.
    const end = Date.now() + 45_000;
    while (!/Not started/.test(err) && !/Generating/.test(out) && Date.now() < end) await new Promise((r) => setTimeout(r, 100));
    assert.match(err, /Not started: Claude Code isn't installed \(npm install -g @anthropic-ai\/claude-code\)\./, `stdout:\n${out}\nstderr:\n${err}`);
    assert.doesNotMatch(out, /Generating/);
    assert.doesNotMatch(err + out, /ENOENT/);
  } finally {
    child.kill('SIGTERM');
    await exited;
  }
});
