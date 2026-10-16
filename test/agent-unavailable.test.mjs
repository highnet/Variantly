// An agent that can't run must say so once, plainly, instead of every variant
// failing with "finished without changing any files". The case recorded on a
// real Windows machine: VS Code's Copilot Chat puts a `copilot` launcher on
// PATH that, run headless, prints the line below and exits 0.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { agentById, binCandidates, isKnownShim, probeAgent, versionFrom } from '../src/agents.mjs';
import { createParser, unavailableReason } from '../src/agent-output.mjs';
import { runOk, which } from '../src/proc.mjs';
import { detectProject, normalizeConfig } from '../src/server.mjs';
import { Session } from '../src/session.mjs';

const SHIM_LINE = 'Cannot find GitHub Copilot CLI (https://docs.github.com/en/copilot/how-tos/set-up/install-copilot-cli)';
const win = process.platform === 'win32';

const tmp = mkdtempSync(path.join(os.tmpdir(), 'variantly-unavail-'));
const shimDir = path.join(tmp, 'Code', 'User', 'globalStorage', 'github.copilot-chat', 'copilotCli');
const realDir = path.join(tmp, 'npm-global');

/** Write an executable `name` in dir that prints `lines`. */
const fakeBin = (/** @type {string} */ dir, /** @type {string} */ name, /** @type {string[]} */ lines) => {
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, win ? `${name}.cmd` : name);
  writeFileSync(file, win ? `@echo off\r\n${lines.map((l) => `echo ${l}`).join('\r\n')}\r\n` : `#!/bin/sh\n${lines.map((l) => `echo '${l}'`).join('\n')}\n`);
  if (!win) chmodSync(file, 0o755);
  return file;
};
const shim = fakeBin(shimDir, 'copilot', [SHIM_LINE]);
const real = fakeBin(realDir, 'copilot', ['GitHub Copilot CLI 1.0.98.']);
/** What a variant did, for a failure message that explains itself. */
const story = async (/** @type {Session} */ session, /** @type {{ n: number, status: string, error?: string }} */ v) => {
  const wt = session.worktreeFor(v.n);
  const status = await runOk('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: wt }).then((out) => out, (e) => String(e));
  return `V${v.n} ${v.status}${v.error ? `: ${v.error}` : ''}\ngit status in ${wt}:\n${status}\nlog:\n${session.logFor(v.n).slice(-25).join('')}`;
};
const env = (/** @type {string[]} */ dirs) => ({ ...process.env, PATH: dirs.join(path.delimiter), APPDATA: path.join(tmp, 'appdata') });

test.after(() => rmSync(tmp, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }));

test('the recorded shim line is recognised; real version lines are not', () => {
  assert.equal(versionFrom(SHIM_LINE), null);
  assert.equal(versionFrom('Split-Path : Cannot bind argument to parameter \'Path\' because it is null.'), null);
  assert.equal(versionFrom('GitHub Copilot CLI 1.0.98.\nRun \'copilot update\' to check for updates.'), 'GitHub Copilot CLI 1.0.98.');
  assert.equal(versionFrom('codex-cli 0.162.1'), 'codex-cli 0.162.1');
  assert.equal(versionFrom('2.1.4 (Claude Code)'), '2.1.4 (Claude Code)');
  assert.equal(unavailableReason(SHIM_LINE), SHIM_LINE);
  assert.ok(unavailableReason('Error: Not logged in. Please run `copilot login`.'));
  assert.equal(unavailableReason('→ Edit src/styles/global.css'), undefined);
});

test('a real CLI later on PATH wins over the VS Code launcher', async () => {
  assert.ok(isKnownShim(shim));
  assert.deepEqual(binCandidates('copilot', env([shimDir, realDir])), [real, shim]);
  const found = await probeAgent(/** @type {any} */ (agentById('copilot')), env([shimDir, realDir]));
  assert.equal(found.path, real);
  assert.equal(found.version, 'GitHub Copilot CLI 1.0.98.');
});

test('only the launcher on PATH: not installed, and the reason is reported', async () => {
  const found = await probeAgent(/** @type {any} */ (agentById('copilot')), env([shimDir]));
  assert.equal(found.path, '');
  assert.match(found.note, /is not GitHub Copilot CLI: Cannot find GitHub Copilot CLI/);
});

test('parser flags unavailability from stdout or stderr and keeps a tail', () => {
  const p = createParser('copilot-json');
  p.push(SHIM_LINE);
  assert.equal(p.unavailable(), SHIM_LINE);
  assert.deepEqual(p.tail(), [SHIM_LINE]);
  const q = createParser('codex-json');
  q.note('Error: Not logged in');
  assert.equal(q.unavailable(), 'Error: Not logged in');
});

test('a run with the launcher fails once with its message and starts nothing else', async () => {
  const repo = path.join(tmp, 'site');
  mkdirSync(repo);
  writeFileSync(path.join(repo, 'index.html'), '<!doctype html><h1>Shop</h1>');
  const git = (/** @type {string[]} */ ...args) => runOk('git', args, { cwd: repo });
  await git('init', '-q');
  await git('-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '-A');
  await git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'init');

  const saved = { PATH: process.env.PATH, APPDATA: process.env.APPDATA, HOME: process.env.VARIANTLY_HOME };
  // The shim first, then the rest of PATH (git, node), but no real copilot.
  // Only node and git besides the shim, so a real Copilot CLI installed on
  // the machine can't be found.
  const gitDir = path.dirname(/** @type {string} */ (which('git')));
  process.env.PATH = [shimDir, path.dirname(process.execPath), gitDir, ...(win ? [path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32')] : ['/usr/bin', '/bin'])].join(path.delimiter);
  process.env.APPDATA = path.join(tmp, 'appdata');
  process.env.VARIANTLY_HOME = path.join(tmp, 'home');
  const session = new Session({ repo });
  try {
    await session.load();
    const info = await detectProject(repo);
    assert.equal(info.agents.find((a) => a.id === 'copilot')?.installed, false);
    await session.generate(normalizeConfig({ ...info.suggested, agent: 'copilot', count: 3, concurrency: 1 }));
    const end = Date.now() + 60_000;
    while (session.state.phase === 'generating' && Date.now() < end) await new Promise((r) => setTimeout(r, 150));
    const [first, ...rest] = session.state.variants;
    assert.equal(first.status, 'failed', await story(session, first));
    assert.match(first.error ?? '', /GitHub Copilot CLI can't run: Cannot find GitHub Copilot CLI/);
    for (const v of rest) {
      assert.equal(v.status, 'failed', await story(session, v));
      assert.match(v.error ?? '', /^Not started: GitHub Copilot CLI can't run/);
    }
  } finally {
    await session.discard().catch(() => {});
    await session.close();
    process.env.PATH = saved.PATH;
    if (saved.APPDATA === undefined) delete process.env.APPDATA;
    else process.env.APPDATA = saved.APPDATA;
    if (saved.HOME === undefined) delete process.env.VARIANTLY_HOME;
    else process.env.VARIANTLY_HOME = saved.HOME;
  }
});

test('an agent that changes nothing shows its last output in the error', async () => {
  const lazyDir = path.join(tmp, 'lazy');
  fakeBin(lazyDir, 'copilot', ['GitHub Copilot CLI 1.0.98.', 'I could not find the stylesheet.', 'Giving up.']);
  const repo = path.join(tmp, 'site');
  const saved = { PATH: process.env.PATH };
  process.env.PATH = [lazyDir, saved.PATH].join(path.delimiter);
  process.env.VARIANTLY_HOME = path.join(tmp, 'home2');
  const session = new Session({ repo });
  try {
    await session.load();
    const info = await detectProject(repo);
    assert.equal(info.agents.find((a) => a.id === 'copilot')?.installed, true);
    await session.generate(normalizeConfig({ ...info.suggested, agent: 'copilot', count: 2, concurrency: 1 }));
    const end = Date.now() + 60_000;
    while (session.state.phase === 'generating' && Date.now() < end) await new Promise((r) => setTimeout(r, 150));
    for (const v of session.state.variants) {
      const e = v.error ?? '';
      assert.match(e, /^The agent finished without changing any files\.\nLast output:\n/, await story(session, v));
      assert.match(e, / {2}Giving up\./);
    }
  } finally {
    await session.discard().catch(() => {});
    await session.close();
    process.env.PATH = saved.PATH;
    delete process.env.VARIANTLY_HOME;
  }
});
