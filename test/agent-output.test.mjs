import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createParser } from '../src/agent-output.mjs';
import { extractSummary } from '../src/brief.mjs';

const CWD = 'C:/wt/v1';

/** Feed a fixture through a parser; return the parser and every log line. */
const feed = (/** @type {string} */ name, /** @type {import('../src/agent-output.mjs').OutputKind} */ kind) => {
  const parser = createParser(kind, { cwd: CWD });
  const body = readFileSync(new URL(`./fixtures/agent-output/${name}.jsonl`, import.meta.url), 'utf8');
  const lines = body.split(/\r?\n/).flatMap((l) => parser.push(l));
  return { parser, lines };
};

test('Claude Code stream-json: tools, summary, reported dollar cost', () => {
  const { parser, lines } = feed('claude', 'claude-stream');
  assert.equal(lines[0], 'Claude Code session started (claude-opus-5-5)');
  assert.ok(lines.includes('→ Skill impeccable'));
  assert.ok(lines.includes('→ Edit src/styles/global.css'), 'paths under the worktree are shown relative');
  assert.equal(lines.at(-1), 'Finished in 412s, $1.23');
  assert.equal(parser.costUsd(), 1.2345);
  assert.deepEqual(parser.usage(), { inputTokens: 1200, outputTokens: 15000, cachedInputTokens: 93000 });
  assert.match(extractSummary(parser.text()), /^Editorial world: Fraunces/);
  assert.equal(parser.error(), undefined);
});

test('Codex exec --json: commands, file changes, failures, tokens, no invented cost', () => {
  const { parser, lines } = feed('codex', 'codex-json');
  assert.equal(lines[0], 'Codex session started');
  assert.ok(lines.includes('→ Shell npm run lint'));
  assert.ok(lines.includes('  ✗ exit 1: npm run lint'));
  assert.ok(lines.includes('→ Edit src/styles/global.css'));
  assert.ok(lines.includes('→ Write src/styles/tokens.css'));
  assert.ok(lines.includes('→ docs.search'));
  assert.ok(lines.includes('→ WebSearch Fraunces variable font css'));
  assert.ok(lines.includes('Warning: command output truncated'));
  assert.ok(!lines.some((l) => l.includes('Reading the brief')), 'reasoning summaries stay out of the log');
  assert.ok(!lines.some((l) => l.includes('Load Impeccable')), 'todo lists stay out of the log');
  assert.equal(lines.at(-1), 'Turn finished: 245k in / 12k out tokens');
  assert.equal(parser.costUsd(), undefined);
  assert.deepEqual(parser.usage(), { inputTokens: 245000, outputTokens: 12000, cachedInputTokens: 180000 });
  assert.match(extractSummary(parser.text()), /^Swiss precision: strict 12-column grid/);
});

test('Codex exec --json: a failed turn is the error the run reports', () => {
  const { parser, lines } = feed('codex-failed', 'codex-json');
  assert.ok(lines.includes('Failed: You\'ve hit your usage limit.'));
  assert.equal(parser.error(), 'You\'ve hit your usage limit.');
  assert.equal(parser.usage(), undefined);
});

test('Codex exec --json, real unauthenticated run: retries are compact, the 401 is the error', () => {
  const { parser, lines } = feed('codex-unauthenticated', 'codex-json');
  assert.equal(lines[0], 'Codex session started');
  const retries = lines.filter((l) => l.startsWith('  ↻ Reconnecting... '));
  assert.equal(retries.length, 9);
  assert.ok(retries.every((l) => l.length <= 125), 'retry lines are clipped');
  assert.match(lines.at(-1) ?? '', /^Failed: unexpected status 401 Unauthorized/);
  assert.match(parser.error() ?? '', /^unexpected status 401 Unauthorized/);
  assert.equal(parser.text(), '');
});

test('Copilot --output-format json: tools, skills, subagents, shutdown summary', () => {
  const { parser, lines } = feed('copilot', 'copilot-json');
  assert.equal(lines[0], 'Copilot CLI session started (gpt-5.4)');
  assert.ok(lines.includes('→ view C:/home/.variantly/site-1a2b3c4d/briefs/v1.md'), 'paths outside the worktree stay absolute');
  assert.ok(lines.includes('→ Skill impeccable'));
  assert.ok(lines.includes('→ edit src/styles/global.css'));
  assert.ok(lines.includes('→ powershell git push'));
  assert.ok(lines.includes('  ✗ Permission denied: shell(git push)'));
  assert.ok(!lines.some((l) => l === 'Read'), 'streaming deltas are not logged');
  assert.equal(lines.at(-1), 'Finished: 2 files changed (+120 −45), 98s of model time, 80k in / 8k out tokens');
  // `cost` in assistant.usage is a billing multiplier, not dollars.
  assert.equal(parser.costUsd(), undefined);
  assert.deepEqual(parser.usage(), { inputTokens: 80000, outputTokens: 8000, cachedInputTokens: 52000 });
  // A subagent's SUMMARY line is not the variant's summary.
  assert.match(extractSummary(parser.text()), /^Warm & tactile: clay and paper tones/);
  assert.ok(!parser.text().includes('not the answer'));
});

test('Copilot: session.error is reported as the run error', () => {
  const parser = createParser('copilot-json');
  const lines = parser.push(JSON.stringify({ type: 'session.error', data: { errorType: 'authentication', message: 'Not signed in. Run copilot login.' } }));
  assert.deepEqual(lines, ['Error: Not signed in. Run copilot login.']);
  assert.equal(parser.error(), 'Not signed in. Run copilot login.');
});

test('non-JSON lines pass through; plain text output keeps every line', () => {
  const json = createParser('codex-json');
  assert.deepEqual(json.push('WARNING: proceeding, even though we could not create PATH aliases'), [
    'WARNING: proceeding, even though we could not create PATH aliases',
  ]);
  assert.deepEqual(json.push('   '), []);
  assert.deepEqual(json.push('{"type":"some.future_event","data":{}}'), [], 'unknown events are ignored');

  const text = createParser('text');
  text.push('Restyling with the demo palette');
  text.push('SUMMARY: Demo palette 2');
  assert.equal(extractSummary(text.text()), 'Demo palette 2');
  assert.equal(text.usage(), undefined);
});
