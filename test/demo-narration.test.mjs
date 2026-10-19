// The demo film's voice check: a line read by the system's rehearsal voice
// (no ElevenLabs keys) must never reach a published film.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { localHash, unfitLines, unfitMessage } from '../demo/lib/narration.mjs';
import { toSpoken } from '../demo/lib/pronounce.mjs';

const scenes = [
  { id: 'hook', text: 'Ten redesigns at once.' },
  { id: 'call', text: '' },
  { id: 'wrap', text: 'To try it, run npx variantly. Thanks for watching.' },
];
const local = (s) => localHash(toSpoken(s.text, s.say).spoken, s.text);

test('lines voiced by ElevenLabs pass', () => {
  const manifest = { hook: 'a1', wrap: 'b2' };
  const voices = { hook: 'elevenlabs', wrap: 'elevenlabs' };
  const unfit = unfitLines(scenes, { manifest, voices });
  assert.deepEqual(unfit, { robot: [], missing: [] });
  assert.equal(unfitMessage(unfit), null);
});

test('a line marked local is caught', () => {
  const unfit = unfitLines(scenes, { manifest: { hook: 'a1', wrap: 'b2' }, voices: { hook: 'elevenlabs', wrap: 'local' } });
  assert.deepEqual(unfit.robot, ['wrap']);
  assert.match(unfitMessage(unfit), /rehearsal voice.*wrap/);
});

test('a local line from before voices.json is caught by its hash', () => {
  const unfit = unfitLines(scenes, { manifest: { hook: 'a1', wrap: local(scenes[2]) } });
  assert.deepEqual(unfit.robot, ['wrap']);
});

test('a line with no audio is caught; a scene with no text is not', () => {
  const unfit = unfitLines(scenes, { manifest: { hook: 'a1', wrap: 'b2' }, hasAudio: (id) => id !== 'hook' });
  assert.deepEqual(unfit, { robot: [], missing: ['hook'] });
});
