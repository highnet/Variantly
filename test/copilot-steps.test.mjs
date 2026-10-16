// The run that sat on "Choosing a direction": Copilot on Windows wrote its
// files through PowerShell here-strings, never an edit tool, so the step
// tracker never saw it start building. This replays that shape end to end:
// a fake `copilot` prints Copilot's JSON events (the real powershell call
// included), really changes a file, and the session must move the variant
// from choosing a direction to building before it saves.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runOk } from '../src/proc.mjs';
import { detectProject, normalizeConfig } from '../src/server.mjs';
import { Session } from '../src/session.mjs';
import { STEPS } from '../src/steps.mjs';

const win = process.platform === 'win32';
const tmp = mkdtempSync(path.join(os.tmpdir(), 'variantly-copilot-steps-'));
test.after(() => rmSync(tmp, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }));

const ev = (/** @type {string} */ type, /** @type {object} */ data) => JSON.stringify({ type, id: type, timestamp: new Date(0).toISOString(), data });

test('Copilot writing files through PowerShell moves a variant from choosing a direction to building', async () => {
  const bin = path.join(tmp, 'bin');
  mkdirSync(bin);
  // The agent itself, in node, so it runs the same on every platform.
  const script = path.join(bin, 'fake-copilot.mjs');
  writeFileSync(
    script,
    `import { writeFileSync } from 'node:fs';
const say = (l) => process.stdout.write(l + '\\n');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
if (process.argv.includes('--version')) { say('GitHub Copilot CLI 1.0.98.'); process.exit(0); }
say(${JSON.stringify(ev('session.start', { sessionId: 's1' }))});
say(${JSON.stringify(ev('assistant.message', { content: 'DIRECTION: Ephemeris field atlas' }))});
await wait(600);
say(${JSON.stringify(
      ev('tool.execution_start', {
        toolCallId: 'c1',
        toolName: 'powershell',
        arguments: { command: "@' import math colors={ 'paper':'#f2eddf' } '@ | Set-Content -Path style.css", description: 'write styles' },
      }),
    )});
writeFileSync('style.css', 'body { background: #f2eddf; }\\n');
await wait(900);
say(${JSON.stringify(ev('assistant.message', { content: 'SUMMARY: A field atlas in paper and ink.' }))});
`,
  );
  const shim = path.join(bin, win ? 'copilot.cmd' : 'copilot');
  writeFileSync(shim, win ? `@echo off\r\nnode "${script}" %*\r\n` : `#!/bin/sh\nexec node "${script}" "$@"\n`);
  if (!win) chmodSync(shim, 0o755);

  const repo = path.join(tmp, 'site');
  mkdirSync(repo);
  writeFileSync(path.join(repo, 'index.html'), '<!doctype html><link rel="stylesheet" href="style.css"><h1>Shop</h1>');
  writeFileSync(path.join(repo, 'style.css'), 'body { background: white; }\n');
  const git = (/** @type {string[]} */ ...args) => runOk('git', args, { cwd: repo });
  await git('init', '-q');
  await git('add', '-A');
  await git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'init');

  const saved = { PATH: process.env.PATH, HOME: process.env.VARIANTLY_HOME };
  process.env.PATH = [bin, saved.PATH].join(path.delimiter);
  process.env.VARIANTLY_HOME = path.join(tmp, 'home');
  const session = new Session({ repo });
  const seen = new Set();
  try {
    await session.load();
    const info = await detectProject(repo);
    assert.equal(info.agents.find((a) => a.id === 'copilot')?.installed, true);
    await session.generate(
      normalizeConfig({ ...info.suggested, agent: 'copilot', count: 1, concurrency: 1, review: false, audit: false, browser: false }),
    );
    const end = Date.now() + 60_000;
    while (session.state.phase === 'generating' && Date.now() < end) {
      const step = session.state.variants[0]?.step;
      if (typeof step === 'number') seen.add(STEPS[step].id);
      await new Promise((r) => setTimeout(r, 50));
    }
    const v = session.state.variants[0];
    assert.equal(v.status, 'done', v.error);
    assert.ok(seen.has('direction'), `steps seen: ${[...seen].join(', ')}`);
    assert.ok(seen.has('build'), `steps seen: ${[...seen].join(', ')}`);
  } finally {
    await session.discard().catch(() => {});
    await session.close();
    process.env.PATH = saved.PATH;
    if (saved.HOME === undefined) delete process.env.VARIANTLY_HOME;
    else process.env.VARIANTLY_HOME = saved.HOME;
  }
});
