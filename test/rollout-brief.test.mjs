// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractRollout, readBriefMeta, writeBrief, writeRolloutBrief } from '../src/brief.mjs';

test('the rollout brief names the done pages and the pages left to restyle', () => {
  const brief = writeRolloutBrief({ variant: 2, agent: 'codex', done: ['/'], pages: ['/about', '/pricing'], appRel: 'web', direction: 'Night-shift field manual' });
  assert.deepEqual(readBriefMeta(brief), { rollout: true, variant: 2, appRel: 'web' });
  assert.match(brief, /\$impeccable/);
  assert.match(brief, /`\/about`, `\/pricing`/);
  assert.match(brief, /Do not redesign/);
  assert.match(brief, /ROLLOUT:/);
});

test('the rollout brief still asks for every page when none were detected', () => {
  assert.match(writeRolloutBrief({ variant: 1, done: [], pages: [], appRel: '', direction: '' }), /could not list the other pages/);
});

test('variant briefs ask for the look to live in shared tokens and components', () => {
  const brief = writeBrief({ variant: 1, count: 2, approach: 'redesign', direction: '', brief: '', routes: [], appRel: '', stackName: 'Next.js', styles: '', hasProduct: false, hasDesign: false, stackId: 'next' });
  assert.match(brief, /rolled out to every other page/);
});

test('extractRollout reads the last ROLLOUT line', () => {
  assert.equal(extractRollout('ROLLOUT: old\nmore\nROLLOUT: **/about and /pricing**'), '/about and /pricing');
});
