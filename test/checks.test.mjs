import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { extractReview, writeBrief, writeReviewBrief } from '../src/brief.mjs';
import { auditMarkdown, findChrome, NPX_HALF_INSTALLED, playwrightMcp } from '../src/checks.mjs';
import { normalizeConfig } from '../src/server.mjs';
import { AGENTS } from '../src/agents.mjs';

const BASE = { variant: 1, count: 2, approach: /** @type {const} */ ('redesign'), direction: '', brief: '', routes: [], appRel: '', stackName: 'Static', stackId: 'static', styles: '', hasProduct: false, hasDesign: false };

test('the brief tells the agent about its browser only when it has one', () => {
  assert.match(writeBrief(BASE), /there is no browser/);
  const withBrowser = writeBrief({ ...BASE, previewUrl: 'http://localhost:4100' });
  assert.match(withBrowser, /Playwright browser tools/);
  assert.match(withBrowser, /http:\/\/localhost:4100/);
  assert.doesNotMatch(withBrowser, /there is no browser/);
});

test('the review brief runs Impeccable critique and audit and carries the scores', () => {
  const r = writeReviewBrief({ variant: 3, agent: 'codex', routes: ['/pricing'], audit: '- axe-core: 2 violating elements' });
  assert.match(r, /\$impeccable/);
  assert.match(r, /\*\*critique\*\* on \/pricing/);
  assert.match(r, /\*\*audit\*\*/);
  assert.match(r, /## Automated scores\n\n- axe-core: 2 violating/);
  assert.match(r, /Keep the direction/);
  // Rules stay numbered in order.
  assert.deepEqual(r.match(/## Rules[\s\S]*?## When/)?.[0].match(/^\d(?=\.)/gm), ['1', '2', '3', '4', '5', '6', '7']);
  assert.doesNotMatch(writeReviewBrief({ variant: 1, routes: [] }), /Automated scores/);
  assert.equal(extractReview('done\nREVIEW: Fixed **contrast** on buttons.'), 'Fixed contrast on buttons.');
});

test('the checks are on by default and can be turned off', () => {
  const on = normalizeConfig({ command: 'x {port}' });
  assert.deepEqual([on.browser, on.review, on.audit], [true, true, true]);
  const off = normalizeConfig({ command: 'x {port}', browser: false, review: false, audit: false });
  assert.deepEqual([off.browser, off.review, off.audit], [false, false, false]);
});

test('findChrome prefers CHROME_PATH, then the Playwright cache', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'variantly-chrome-'));
  try {
    const exe = path.join(dir, 'chromium-1200', 'chrome-linux', 'chrome');
    mkdirSync(path.dirname(exe), { recursive: true });
    writeFileSync(exe, '');
    assert.equal(findChrome({ PLAYWRIGHT_BROWSERS_PATH: dir }, path.join(dir, 'nohome')), exe);
    const own = path.join(dir, 'mine');
    writeFileSync(own, '');
    assert.equal(findChrome({ CHROME_PATH: own, PLAYWRIGHT_BROWSERS_PATH: dir }, dir), own);
    assert.deepEqual(playwrightMcp(own).args.slice(-2), ['--executable-path', own]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('auditMarkdown lists scores, violations and weak audits', () => {
  const md = auditMarkdown({
    url: 'http://x/',
    at: 0,
    lighthouse: { performance: 99, accessibility: 80, bestPractices: 100, seo: null, weak: [{ id: 'image-alt', title: 'Images lack alt', score: 0, value: '' }] },
    axe: { critical: 1, serious: 0, moderate: 0, minor: 0, total: 1, violations: [{ id: 'image-alt', impact: 'critical', help: 'Images must have alt', nodes: 1, targets: ['img'] }] },
  });
  assert.match(md, /accessibility 80/);
  assert.match(md, /SEO –/);
  assert.match(md, /\*\*critical\*\* `image-alt`/);
  assert.match(md, /`image-alt` \(0\): Images lack alt/);
});

test('a half-finished npx install is recognised, other audit errors are not', () => {
  assert.match(
    "Cannot find package 'C:\\npm\\cache\\_npx\\226e9d75deb1597e\\node_modules\\debug\\index.js' imported from C:\\npm\\cache\\_npx\\226e9d75deb1597e\\node_modules\\lighthouse-logger\\index.js",
    NPX_HALF_INSTALLED,
  );
  assert.match("Cannot find module '/home/u/.npm/_npx/abc/node_modules/axe-core/axe.min.js'", NPX_HALF_INSTALLED);
  assert.doesNotMatch('Could not start the audit: spawn npx ENOENT', NPX_HALF_INSTALLED);
  assert.doesNotMatch('net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4000/', NPX_HALF_INSTALLED);
});

test('every agent gets a Playwright MCP that writes its output outside the worktree', () => {
  const state = path.join(os.tmpdir(), 'variantly-state');
  const cwd = path.join(state, 'v1');
  const out = path.join(state, 'browser', 'v1');
  const mcp = { playwright: playwrightMcp('/bin/chrome', out) };
  const at = mcp.playwright.args.indexOf('--output-dir');
  assert.equal(mcp.playwright.args[at + 1], out);
  assert.ok(path.relative(cwd, out).startsWith('..'), 'output dir is outside the worktree');
  // Agents that take MCP servers only from the user's own config run without a browser.
  for (const agent of AGENTS.filter((a) => a.mcp !== false)) {
    const inv = agent.invocation({ cwd, briefPath: path.join(state, 'briefs', 'v1.md'), permissions: 'full', mcp });
    const all = JSON.stringify([inv.args, inv.files ?? {}, inv.env ?? {}]);
    assert.ok(all.includes('--output-dir'), `${agent.id} passes --output-dir`);
    assert.ok(all.includes(JSON.stringify(JSON.stringify(out)).slice(2, -2)) || all.includes(JSON.stringify(out).slice(1, -1)), `${agent.id} passes the output dir`);
  }
});

test('the brief points screenshots at the output dir', () => {
  const md = writeBrief({ ...BASE, previewUrl: 'http://127.0.0.1:5000/', shots: '/state/browser/v1' });
  assert.match(md, /Save screenshots only in \/state\/browser\/v1/);
  assert.doesNotMatch(writeBrief({ ...BASE, previewUrl: 'http://127.0.0.1:5000/' }), /Save screenshots/);
});
