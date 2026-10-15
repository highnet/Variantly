// Copilot CLI 1.0.9x reports spend as premium requests, not tokens: in
// session.usage_checkpoint while it runs and in the final top-level result.
// Lines below are trimmed from a real `copilot -p … --output-format json` run.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createParser } from '../src/agent-output.mjs';

const LINES = [
  '{"type":"assistant.message","data":{"content":"ok"}}',
  '{"type":"session.usage_checkpoint","data":{"totalNanoAiu":184580000,"totalPremiumRequests":1}}',
  '{"type":"result","timestamp":"2026-10-15T21:25:05.741Z","exitCode":0,"usage":{"premiumRequests":2,"totalApiDurationMs":1154,"sessionDurationMs":3521,"codeChanges":{"linesAdded":0,"linesRemoved":0,"filesModified":["a.css"]}}}',
];

test('copilot premium requests are tracked live and at the end', () => {
  const p = createParser('copilot-json');
  assert.deepEqual(p.push(LINES[0]), ['ok']);
  p.push(LINES[1]);
  assert.equal(p.credits(), 1);
  assert.deepEqual(p.push(LINES[2]), ['Finished: 1 file changed, 1s of model time, 2 premium requests']);
  assert.equal(p.credits(), 2);
  assert.equal(p.usage(), undefined);
});
