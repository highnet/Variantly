import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { detectRoutes } from '../src/routes.mjs';
import { stepFrom, STEPS } from '../src/steps.mjs';
import { writeBrief } from '../src/brief.mjs';

const tmp = mkdtempSync(path.join(os.tmpdir(), 'variantly-routes-'));
test.after(() => rmSync(tmp, { recursive: true, force: true }));

const touch = (/** @type {string} */ rel) => {
  const file = path.join(tmp, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, '');
};

test('file-based routes are found, home first, groups and api dropped', () => {
  ['src/app/page.tsx', 'src/app/pricing/page.tsx', 'src/app/(marketing)/about/page.tsx', 'src/routes/blog/+page.svelte', 'pages/contact.vue', 'pages/index.astro', 'pages/_app.tsx', 'pages/api/x.ts', 'node_modules/x/app/page.tsx'].forEach(touch);
  assert.deepEqual(detectRoutes(tmp), ['/', '/about', '/blog', '/contact', '/pricing']);
});

test('code-routed stacks just get the home page', () => {
  assert.deepEqual(detectRoutes(path.join(tmp, 'nothing-here')), ['/']);
});

test('steps only move forward', () => {
  let at = 0;
  for (const line of ['Copilot CLI session started', 'DIRECTION: Night shift', '→ edit src/app/globals.css', '→ bash npx tsc --noEmit', '→ create DESIGN.md', 'Committed 3 changed files.']) {
    const next = stepFrom(line, at);
    assert.ok(next > at, line);
    at = next;
  }
  assert.equal(at, STEPS.length - 1);
  assert.equal(stepFrom('DIRECTION: again', at), -1);
});

const brief = (/** @type {Partial<import('../src/brief.mjs').BriefInput>} */ over) =>
  writeBrief({ variant: 1, count: 2, approach: 'redesign', direction: '', brief: '', routes: [], appRel: '', stackName: 'Next.js', stackId: 'next', styles: '', hasProduct: false, hasDesign: false, ...over });

test('the brief targets only the home page by default and keeps copy', () => {
  const b = brief({});
  assert.match(b, /the home page \(`\/`\) only/);
  assert.match(b, /every piece of copy/);
  assert.doesNotMatch(b, /Also, after the redesign/);
});

test('extras add Impeccable passes; copy rewrite frees the wording', () => {
  const b = brief({ routes: ['/', '/pricing'], extras: ['copy', 'motion'] });
  assert.match(b, /these pages: `\/`, `\/pricing`/);
  assert.match(b, /Impeccable's `clarify`/);
  assert.match(b, /Impeccable's `animate`/);
  assert.match(b, /the facts in the copy/);
});
