import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createParser } from '../src/agent-output.mjs';
import { extractSummary } from '../src/brief.mjs';

// Fixtures name the worktree C:/wt/v1; swap in an absolute path for this platform.
const CWD = path.resolve('/wt/v1').replace(/\\/g, '/');

/** Feed a fixture through a parser; return the parser and every log line. */
const feed = (/** @type {string} */ name, /** @type {import('../src/agent-output.mjs').OutputKind} */ kind) => {
  const parser = createParser(kind, { cwd: CWD });
  const body = readFileSync(new URL(`./fixtures/agent-output/${name}.jsonl`, import.meta.url), 'utf8').replaceAll('C:/wt/v1', CWD);
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

test('claude: live usage from assistant events, replaced by the result total', () => {
  const p = createParser('claude-stream');
  const msg = (id, out) => JSON.stringify({ type: 'assistant', message: { id, usage: { input_tokens: 10, output_tokens: out }, content: [] } });
  p.push(msg('a', 5));
  p.push(msg('a', 5));
  p.push(msg('b', 7));
  assert.deepEqual(p.usage(), { inputTokens: 20, outputTokens: 12, cachedInputTokens: 0 });
  p.push(JSON.stringify({ type: 'result', total_cost_usd: 0.5, usage: { input_tokens: 100, output_tokens: 50 } }));
  assert.deepEqual(p.usage(), { inputTokens: 100, outputTokens: 50, cachedInputTokens: 0 });
  assert.equal(p.costUsd(), 0.5);
});

test('a usage or rate limit halts the queue; the agent mentioning one in its text does not', () => {
  const p = createParser('claude-stream');
  p.push(JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'Added a rate limit banner.' }] } }));
  assert.equal(p.unavailable(), undefined);
  p.push(JSON.stringify({ type: 'result', is_error: true, result: 'Claude AI usage limit reached' }));
  assert.match(p.unavailable() ?? '', /usage or rate limit/);
  const q = createParser('text');
  q.note('Error: 429 Too Many Requests');
  assert.match(q.unavailable() ?? '', /rate limit/);
});

test('Gemini CLI stream-json: deltas shown a line at a time, tools, failures, tokens', () => {
  const { parser, lines } = feed('gemini', 'gemini-stream');
  assert.equal(lines[0], 'Gemini CLI session started (gemini-3-pro)');
  assert.ok(lines.includes("I'll load the Impeccable skill and read the site first."), 'deltas join into one line');
  assert.ok(lines.includes('→ activate_skill impeccable'));
  assert.ok(lines.includes('→ read_file src/styles/global.css'), 'paths under the worktree are shown relative');
  assert.ok(lines.includes('→ replace src/styles/global.css'));
  assert.ok(lines.includes('→ run_shell_command npm run lint'));
  assert.ok(lines.includes('  ✗ Command exited with code 1'));
  assert.ok(lines.includes('Warning: Loop detected, retrying'));
  assert.ok(lines.includes('SUMMARY: Editorial world: Fraunces display over Inter, ink on warm paper.'), 'held text is flushed before the result');
  assert.equal(lines.at(-1), 'Finished in 31s, 48k in / 3k out tokens');
  assert.deepEqual(parser.usage(), { inputTokens: 48000, outputTokens: 3000, cachedInputTokens: 30000 });
  assert.equal(extractSummary(parser.text()), 'Editorial world: Fraunces display over Inter, ink on warm paper.');
  assert.equal(parser.costUsd(), undefined);
  assert.equal(parser.error(), undefined, 'a warning is not a failure');
});

test('Gemini CLI: an error result is the run error', () => {
  const parser = createParser('gemini-stream');
  parser.push(JSON.stringify({ type: 'result', status: 'error', error: { type: 'FatalAuthenticationError', message: 'Quota exceeded' }, stats: {} }));
  assert.equal(parser.error(), 'Quota exceeded');
});

test('Cursor CLI stream-json: tool calls by kind, failures, tokens, summary', () => {
  const { parser, lines } = feed('cursor', 'cursor-stream');
  assert.equal(lines[0], 'Cursor CLI session started (Claude 4.6 Sonnet)');
  assert.ok(lines.includes('→ Read src/styles/global.css'));
  assert.ok(lines.includes('→ Edit src/styles/global.css'));
  assert.ok(lines.includes('→ Shell npm run lint'));
  assert.ok(lines.some((l) => l.startsWith('  ✗ shell:')), 'a failed command is reported');
  assert.ok(lines.includes('→ Mcp browser_navigate'));
  assert.ok(!lines.some((l) => l.includes('hmm')), 'thinking stays off the board');
  assert.equal(lines.at(-1), 'Finished in 412s, 1k in / 15k out tokens');
  assert.deepEqual(parser.usage(), { inputTokens: 1200, outputTokens: 15000, cachedInputTokens: 93000 });
  assert.equal(extractSummary(parser.text()), 'Editorial world: Fraunces display over Inter, ink on warm paper.');
  assert.equal(parser.error(), undefined);
});

test('Gemini and Cursor sign-in failures (real captures) mean the agent is unavailable', () => {
  // Gemini CLI 0.64 and Cursor CLI 2026.10.16, run with variantly's safe-mode flags and an empty home.
  const gemini = createParser('gemini-stream');
  gemini.note('Please set an Auth method in your /home/u/.gemini/settings.json or specify one of the following environment variables before running: GEMINI_API_KEY, GOOGLE_GENAI_USE_VERTEXAI, GOOGLE_GENAI_USE_GCA');
  assert.ok(gemini.unavailable());
  const cursor = createParser('cursor-stream');
  cursor.note("Error: Authentication required. Please run 'agent login' first, or set CURSOR_API_KEY environment variable.");
  assert.ok(cursor.unavailable());
});

test('OpenCode run --format json (real capture): tools, denied command, per-step tokens and cost', () => {
  const { parser, lines } = feed('opencode', 'opencode-json');
  assert.ok(lines.includes('→ Read C:/home/.variantly/site-1a2b3c4d/briefs/v1.md'), 'paths outside the worktree stay absolute');
  assert.ok(lines.includes('→ Bash ls -la'));
  assert.ok(lines.includes('→ Edit style.css'), 'paths under the worktree are shown relative');
  assert.ok(lines.includes('→ Bash git status'));
  assert.ok(lines.includes('→ Bash rm style.css'));
  assert.ok(lines.some((l) => /^ {2}✗ The user has specified a rule which prevents you/.test(l)), 'a denied command shows as failed');
  assert.ok(!lines.some((l) => l.includes('</think>')), 'leaked reasoning tags are dropped');
  assert.equal(extractSummary(parser.text()), 'done.');
  assert.equal(parser.costUsd(), 0, 'a free model reports $0');
  const u = parser.usage();
  assert.ok(u && u.inputTokens > 0 && u.outputTokens > 0 && u.cachedInputTokens > 0);
  assert.equal(parser.error(), undefined);
});

test('OpenCode error event is the run\'s error', () => {
  const parser = createParser('opencode-json');
  const out = parser.push(JSON.stringify({ type: 'error', sessionID: 's', error: { name: 'UnknownError', data: { message: 'Unexpected server error.' } } }));
  assert.deepEqual(out, ['Error: Unexpected server error.']);
  assert.equal(parser.error(), 'Unexpected server error.');
});

test('Grok Build streaming-messages-json: Claude Code\'s shape under its own name, with dollars', () => {
  const { parser, lines } = feed('grok', 'grok-stream');
  assert.equal(lines[0], 'Grok Build session started (grok-build)');
  assert.ok(lines.includes('→ read_file C:/home/.variantly/site-1a2b3c4d/briefs/v1.md'));
  assert.ok(lines.includes('→ search_replace src/styles/global.css'));
  assert.ok(lines.includes('→ run_terminal_command npx impeccable detect src'));
  assert.equal(lines.at(-1), 'Finished in 201s, $0.42');
  assert.equal(parser.costUsd(), 0.42);
  assert.deepEqual(parser.usage(), { inputTokens: 18000, outputTokens: 400, cachedInputTokens: 9000 });
  assert.match(extractSummary(parser.text()), /^Brutalist world/);
  assert.equal(parser.error(), undefined);
});

test('Grok Build, real run with a bad key: the result\'s errors[] is the error, and the agent is unavailable', () => {
  const { parser, lines } = feed('grok-failed', 'grok-stream');
  assert.equal(lines[0], 'Grok Build session started (grok-4.6)');
  assert.match(parser.error() ?? '', /Incorrect API key provided/);
  assert.match(lines.at(-1) ?? '', /^Error: Internal error/);
  assert.ok(parser.unavailable(), 'a bad key stops the rest of that agent\'s variants');
});

test('Grok Build, not signed in: unavailable', () => {
  const parser = createParser('grok-stream');
  parser.note('Error: Not signed in. To authenticate without a browser, run:');
  assert.match(parser.unavailable() ?? '', /Not signed in/);
});

test('Hermes Agent stream-json: text deltas joined, tools, a blocked command, tokens', () => {
  const { parser, lines } = feed('hermes', 'hermes-stream');
  assert.equal(lines[0], 'Hermes Agent session started (anthropic/claude-sonnet-4.6)');
  assert.ok(lines.includes('Reading the brief first.'), 'deltas are shown a whole line at a time');
  assert.ok(lines.includes('→ read_file C:/home/.variantly/site-1a2b3c4d/briefs/v1.md'));
  assert.ok(lines.includes('→ skill_view impeccable'));
  assert.ok(lines.includes('→ patch src/styles/global.css'));
  assert.ok(lines.includes('  ✗ terminal: BLOCKED: dangerous command denied in single-query mode'));
  assert.equal(lines.at(-1), 'Finished in 305s, 90k in / 7k out tokens');
  assert.deepEqual(parser.usage(), { inputTokens: 90000, outputTokens: 7000, cachedInputTokens: 61000 });
  assert.equal(parser.costUsd(), undefined, 'stream-json carries no price');
  assert.match(extractSummary(parser.text()), /^Editorial world: Fraunces display, ink on cream/);
  assert.equal(parser.error(), undefined);
});

test('Hermes Agent: a failed result is the error', () => {
  const parser = createParser('hermes-stream');
  parser.push(JSON.stringify({ type: 'result', exit_code: 1, text: '', tokens: {}, duration_ms: 10, error: 'No inference provider configured.' }));
  assert.equal(parser.error(), 'No inference provider configured.');
  const quiet = createParser('hermes-stream');
  quiet.push(JSON.stringify({ type: 'result', exit_code: 1, text: '', tokens: {}, duration_ms: 10 }));
  assert.match(quiet.error() ?? '', /exit code 1/);
});

test('Pi --mode json: assistant text, tools, a failed edit, retries, dollars as reported', () => {
  const { parser, lines } = feed('pi', 'pi-json');
  assert.equal(lines[0], 'Pi session started');
  assert.ok(lines.includes('Reading the brief.'));
  assert.ok(!lines.includes('Reading'), 'streaming deltas are not logged');
  assert.ok(lines.includes('→ read C:/home/.variantly/site-1a2b3c4d/briefs/v1.md'));
  assert.ok(lines.includes('→ edit src/styles/global.css'));
  assert.ok(lines.includes('  ✗ edit: Could not find the exact text in src/styles/global.css.'));
  assert.ok(lines.includes('  ↻ retry 1/3: 529 overloaded'));
  assert.deepEqual(parser.usage(), { inputTokens: 4500, outputTokens: 480, cachedInputTokens: 17500 });
  assert.equal(parser.costUsd()?.toFixed(4), '0.0356');
  assert.match(extractSummary(parser.text()), /^Swiss precision/);
  assert.equal(parser.error(), undefined);
});

test('Pi, real run whose provider refused: exit 0 but the error is reported', () => {
  const { parser, lines } = feed('pi-failed', 'pi-json');
  assert.equal(lines[0], 'Pi session started');
  assert.match(parser.error() ?? '', /security token included in the request is invalid/);
  assert.ok(lines.some((l) => l.startsWith('Error: UnrecognizedClientException')));
  assert.equal(parser.text(), '');
});

test('Antigravity stream-json: events keyed by `event`, deltas, tool steps, a soft-denied command', () => {
  const { parser, lines } = feed('antigravity', 'antigravity-stream');
  assert.equal(lines[0], 'Antigravity session started (gemini-3.6-flash)');
  assert.ok(lines.includes('Reading the brief.'));
  assert.ok(lines.includes('→ view_file C:/home/.variantly/site-1a2b3c4d/briefs/v1.md'));
  assert.ok(lines.includes('→ replace_file_content src/styles/global.css'));
  assert.ok(lines.includes('→ run_command npx impeccable detect src'));
  assert.ok(lines.includes('  ✗ run_command needs approval; add command(npx) to permissions.allow'));
  assert.equal(lines.filter((l) => l.startsWith('→ view_file')).length, 1, 'a tool shows once, when done');
  assert.equal(lines.at(-1), 'Finished in 95s, 32k in / 31 out tokens');
  assert.deepEqual(parser.usage(), { inputTokens: 32100, outputTokens: 31, cachedInputTokens: 29000 });
  assert.match(extractSummary(parser.text()), /^Brutalist world/);
  assert.equal(parser.error(), undefined);
});

test('Antigravity, real run with a bad key: the result is the error, the agent is unavailable', () => {
  const { parser, lines } = feed('antigravity-failed', 'antigravity-stream');
  assert.equal(lines[0], 'Antigravity session started (gemini-3.6-flash)');
  assert.match(parser.error() ?? '', /API key not valid/);
  assert.ok(parser.unavailable());
  assert.equal(lines.at(-1), 'Finished in 0s, no usage reported');
});

test('Antigravity, not signed in: the stderr prompt marks it unavailable', () => {
  const parser = createParser('antigravity-stream');
  parser.note('Authentication required. Please visit the URL to log in:');
  assert.ok(parser.unavailable());
});
