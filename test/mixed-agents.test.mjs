// Splitting one run's variants across agents and models: parsing the
// --agents flag, normalising the wizard's rows, which agent makes which
// variant, and the check that every agent in a mix can run.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertAgentsReady, normalizeConfig, parseMix } from '../src/server.mjs';
import { agentOf, agentsFor } from '../src/session.mjs';

const base = { command: 'npx serve -l {port}', agent: 'claude', model: '' };

test('--agents takes agent, optional model and count; models keep their colons', () => {
  assert.deepEqual(parseMix('claude:opus:2, gemini:2,codex'), [
    { agent: 'claude', model: 'opus', count: 2 },
    { agent: 'gemini', model: '', count: 2 },
    { agent: 'codex', model: '', count: 1 },
  ]);
  assert.deepEqual(parseMix('codex:openrouter/qwen:free:3'), [{ agent: 'codex', model: 'openrouter/qwen:free', count: 3 }]);
  assert.throws(() => parseMix(':2'), /names no agent/);
  assert.throws(() => parseMix('claude:0'), /no variants/);
});

test('rows become the mix, the count is their sum and the first row is the agent', () => {
  const c = normalizeConfig({ ...base, count: 9, mix: [{ agent: 'claude', model: 'opus', count: 2 }, { agent: 'claude', model: 'sonnet', count: 1 }, { agent: 'gemini', count: 2 }] });
  assert.equal(c.count, 5);
  assert.equal(c.agent, 'claude');
  assert.equal(c.model, 'opus');
  assert.deepEqual(c.mix?.map((r) => `${r.agent}/${r.model}/${r.count}`), ['claude/opus/2', 'claude/sonnet/1', 'gemini//2']);
});

test('one row is not a mix; empty rows drop out; the total stops at 10', () => {
  const one = normalizeConfig({ ...base, count: 4, mix: [{ agent: 'gemini', model: 'pro', count: 3 }, { agent: 'codex', count: 0 }] });
  assert.equal(one.mix, undefined);
  assert.deepEqual([one.agent, one.model, one.count], ['gemini', 'pro', 3]);
  const big = normalizeConfig({ ...base, mix: [{ agent: 'claude', count: 8 }, { agent: 'gemini', count: 8 }] });
  assert.equal(big.count, 10);
  assert.deepEqual(big.mix?.map((r) => r.count), [8, 2]);
  assert.equal(normalizeConfig({ ...base, blind: true }).blind, true);
  assert.equal(normalizeConfig(base).blind, false);
});

test('each variant gets its row in order; old runs fall back to the config', () => {
  const who = agentsFor({ agent: 'claude', model: 'opus', mix: [{ agent: 'claude', model: 'opus', count: 2 }, { agent: 'gemini', model: '', count: 1 }] }, 3);
  assert.deepEqual(who, [
    { agent: 'claude', model: 'opus' },
    { agent: 'claude', model: 'opus' },
    { agent: 'gemini', model: '' },
  ]);
  assert.deepEqual(agentsFor({ agent: 'codex', model: 'm' }, 2), [
    { agent: 'codex', model: 'm' },
    { agent: 'codex', model: 'm' },
  ]);
  const config = /** @type {any} */ ({ agent: 'copilot', model: '' });
  assert.deepEqual(agentOf(config, /** @type {any} */ ({ n: 1 })), { agent: 'copilot', model: '' });
  assert.deepEqual(agentOf(config, /** @type {any} */ ({ n: 1, agent: 'gemini', model: 'flash' })), { agent: 'gemini', model: 'flash' });
});

test('a mix with an agent variantly doesn\'t know never starts', async () => {
  const c = normalizeConfig({ ...base, mix: [{ agent: 'demo', count: 1 }, { agent: 'nope', count: 1 }] });
  await assert.rejects(assertAgentsReady(c, process.cwd()), /every agent in the mix must be ready[\s\S]*"nope"/);
  // Demo-only mixes and single agents aren't checked.
  await assertAgentsReady(normalizeConfig({ ...base, mix: [{ agent: 'demo', model: 'a', count: 1 }, { agent: 'demo', model: 'b', count: 1 }] }), process.cwd());
  await assertAgentsReady(normalizeConfig({ ...base, agent: 'nope' }), process.cwd());
});
