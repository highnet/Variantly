// @ts-check
/*
 * Parsers for each agent CLI's structured output. Every supported agent can
 * stream JSON events in headless mode; a parser turns those events into the
 * short progress lines the board shows, collects the agent's final text (where
 * the SUMMARY line lives), and keeps whatever usage the CLI itself reported.
 * Nothing here estimates cost: a figure appears only when the agent said it.
 *
 * Event shapes, as of the versions these were checked against:
 * - Claude Code `--output-format stream-json --verbose`: system/assistant/user/result.
 * - Codex CLI 0.162 `codex exec --json`: thread.*, turn.*, item.* (codex-rs/exec/src/exec_events.rs).
 * - Copilot CLI 1.0 `copilot -p --output-format json`: session events, one per
 *   line, `{ type, data, id, timestamp }` (@github/copilot-sdk session-events.d.ts).
 */
import path from 'node:path';

/** @typedef {'claude-stream' | 'codex-json' | 'copilot-json' | 'text'} OutputKind */

/**
 * Token counts as the agent reported them, summed over the session.
 * @typedef {object} Usage
 * @property {number} inputTokens
 * @property {number} outputTokens
 * @property {number} cachedInputTokens
 */

/**
 * @typedef {object} OutputParser
 * @property {(line: string) => string[]} push  feed one stdout line, get log lines back
 * @property {() => string} text                the agent's own words, for the SUMMARY line
 * @property {() => number | undefined} costUsd  only Claude Code reports a dollar figure
 * @property {() => Usage | undefined} usage
 * @property {() => number | undefined} credits  Copilot's AI credits, when reported
 * @property {() => string | undefined} error   a fatal error the agent reported, if any
 * @property {() => string | undefined} unavailable  set when the output says the agent can't run
 *                                                    at all (not installed, not signed in)
 * @property {(line: string) => void} note       feed a stderr line (checked, not parsed)
 * @property {() => string[]} tail               the last few things the agent said
 */

/**
 * Output that means the agent CLI can't do any work here, so no variant will
 * succeed with it: a launcher shim with no real CLI behind it, or no sign-in.
 * Matched against stdout and stderr, JSON or not.
 */
export const UNAVAILABLE = [
  /Cannot find GitHub Copilot CLI/i,
  /\b(?:not|isn't|is not) (?:logged|signed) in\b/i,
  /\bplease (?:run )?`?(?:copilot|codex|claude)(?: auth)? login\b/i,
  /\b401 Unauthorized\b/i,
  /\binvalid api key\b/i,
  /\bauthentication (?:is )?required\b/i,
  /\bno authentication information found\b/i,
];

/** @param {string} line */
export const unavailableReason = (line) => (UNAVAILABLE.some((re) => re.test(line)) ? clip(line, 300) : undefined);

/**
 * @param {OutputKind} kind
 * @param {{ cwd?: string }} [opts]  paths under cwd are shown relative to it
 * @returns {OutputParser}
 */
export function createParser(kind, opts = {}) {
  const state = {
    /** @type {string[]} */ text: [],
    /** @type {number | undefined} */ costUsd: undefined,
    /** @type {Usage | undefined} */ usage: undefined,
    /** @type {number | undefined} */ credits: undefined,
    /** @type {string | undefined} */ error: undefined,
    /** @type {string | undefined} */ unavailable: undefined,
    /** @type {string[]} */ tail: [],
  };
  const remember = (/** @type {string[]} */ lines) => {
    state.tail.push(...lines.filter((l) => l.trim()));
    if (state.tail.length > 8) state.tail.splice(0, state.tail.length - 8);
  };
  const check = (/** @type {string} */ line) => {
    state.unavailable ??= unavailableReason(line);
  };
  const rel = (/** @type {unknown} */ p) => shortPath(String(p ?? ''), opts.cwd);
  const addUsage = (/** @type {number} */ input, /** @type {number} */ output, /** @type {number} */ cached) => {
    const u = (state.usage ??= { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 });
    u.inputTokens += num(input);
    u.outputTokens += num(output);
    u.cachedInputTokens += num(cached);
  };
  /** @type {Record<string, (event: any, state: ParseState, rel: Rel, addUsage: AddUsage) => string[]>} */
  const parsers = { 'claude-stream': claude, 'codex-json': codex, 'copilot-json': copilot };
  const describe = parsers[kind];

  return {
    push(line) {
      if (!line.trim()) return [];
      check(line);
      /** @type {string[]} */
      let out;
      if (kind === 'text' || !describe) {
        state.text.push(line);
        out = [line];
      } else {
        const event = parseJson(line);
        // Not every line is an event: warnings and banners pass through as-is.
        out = !event || typeof event !== 'object' ? [line] : describe(event, state, rel, addUsage);
      }
      remember(out);
      return out;
    },
    note(line) {
      if (!line.trim()) return;
      check(line);
      remember([line]);
    },
    unavailable: () => state.unavailable,
    tail: () => [...state.tail],
    text: () => state.text.join('\n'),
    costUsd: () => state.costUsd,
    usage: () => state.usage,
    credits: () => state.credits,
    error: () => state.error,
  };
}

/**
 * @typedef {{ text: string[], costUsd?: number, credits?: number, usage?: Usage, error?: string }} ParseState
 * @typedef {(p: unknown) => string} Rel
 * @typedef {(input: number, output: number, cached: number) => void} AddUsage
 */

/** @param {any} event @param {ParseState} state @param {Rel} rel @param {AddUsage} addUsage */
function claude(event, state, rel, addUsage) {
  if (event.type === 'system' && event.subtype === 'init') return [`Claude Code session started (${event.model ?? 'default model'})`];
  if (event.type === 'assistant') {
    /** @type {string[]} */
    const out = [];
    for (const block of event.message?.content ?? []) {
      if (block.type === 'text' && block.text?.trim()) {
        state.text.push(block.text);
        out.push(block.text.trim());
      }
      if (block.type === 'tool_use') {
        const input = block.input ?? {};
        const target = input.file_path ?? input.path ?? input.pattern ?? input.command ?? input.skill ?? '';
        out.push(tool(block.name, input.file_path ?? input.path ? rel(target) : target));
      }
    }
    return out;
  }
  if (event.type === 'result') {
    if (typeof event.result === 'string') state.text.push(event.result);
    if (typeof event.total_cost_usd === 'number') state.costUsd = event.total_cost_usd;
    const u = event.usage;
    if (u) addUsage(u.input_tokens, u.output_tokens, num(u.cache_read_input_tokens) + num(u.cache_creation_input_tokens));
    if (event.is_error) state.error = typeof event.result === 'string' ? event.result : 'Claude Code reported an error.';
    const cost = typeof event.total_cost_usd === 'number' ? `, $${event.total_cost_usd.toFixed(2)}` : '';
    return [`Finished in ${Math.round(num(event.duration_ms) / 1000)}s${cost}`];
  }
  return [];
}

/** @param {any} event @param {ParseState} state @param {Rel} rel @param {AddUsage} addUsage */
function codex(event, state, rel, addUsage) {
  const item = event.item ?? {};
  switch (event.type) {
    case 'thread.started':
      return ['Codex session started'];
    case 'turn.completed': {
      const u = event.usage ?? {};
      addUsage(u.input_tokens, u.output_tokens, u.cached_input_tokens);
      return [`Turn finished: ${tokens(state.usage)}`];
    }
    case 'turn.failed':
      state.error = event.error?.message ?? 'Codex reported a failed turn.';
      return [`Failed: ${state.error}`];
    case 'error':
      // Codex reports its own retries as `error` events; only the last word counts.
      if (/^Reconnecting\.\.\./.test(event.message ?? '')) return [`  ↻ ${clip(event.message, 120)}`];
      state.error = event.message ?? 'Codex reported an error.';
      return [`Error: ${state.error}`];
    case 'item.started':
      if (item.type === 'command_execution') return [tool('Shell', item.command)];
      if (item.type === 'mcp_tool_call') return [tool(`${item.server}.${item.tool}`)];
      if (item.type === 'web_search') return [tool('WebSearch', item.query)];
      return [];
    case 'item.completed':
      if (item.type === 'agent_message' && item.text?.trim()) {
        state.text.push(item.text);
        return [item.text.trim()];
      }
      if (item.type === 'file_change') {
        const verb = { add: 'Write', delete: 'Delete', update: 'Edit' };
        const lines = (item.changes ?? []).map((/** @type {any} */ c) => tool(verb[/** @type {'add'} */ (c.kind)] ?? 'Edit', rel(c.path)));
        return item.status === 'failed' ? [...lines, '  ✗ patch failed'] : lines;
      }
      if (item.type === 'command_execution' && item.status !== 'completed') {
        return [`  ✗ ${item.status === 'declined' ? 'declined' : `exit ${item.exit_code ?? '?'}`}: ${clip(item.command, 100)}`];
      }
      if (item.type === 'mcp_tool_call' && item.status === 'failed') return [`  ✗ ${item.server}.${item.tool}: ${item.error?.message ?? 'failed'}`];
      if (item.type === 'error') return [`Warning: ${item.message}`];
      return [];
    default:
      return [];
  }
}

/** @param {any} event @param {ParseState} state @param {Rel} rel @param {AddUsage} addUsage */
function copilot(event, state, rel, addUsage) {
  const d = event.data ?? {};
  // Subagents report through the same stream; their text is not the answer.
  const root = !event.agentId;
  switch (event.type) {
    case 'session.start':
      return [`Copilot CLI session started (${d.selectedModel ?? 'default model'})`];
    case 'skill.invoked':
      return [tool('Skill', d.name)];
    case 'tool.execution_start': {
      const a = d.arguments && typeof d.arguments === 'object' ? d.arguments : {};
      const file = a.path ?? a.file_path ?? a.filePath;
      const target = file ? rel(file) : (a.command ?? a.pattern ?? a.query ?? a.url ?? a.skill ?? '');
      return [tool(d.toolName ?? 'tool', target)];
    }
    case 'tool.execution_complete':
      return d.success === false ? [`  ✗ ${d.error?.message ?? 'tool failed'}`] : [];
    case 'assistant.message':
      if (typeof d.content !== 'string' || !d.content.trim()) return [];
      if (root) state.text.push(d.content);
      return [d.content.trim()];
    case 'assistant.usage':
      addUsage(d.inputTokens, d.outputTokens, d.cacheReadTokens);
      return [];
    case 'session.task_complete':
      if (root && typeof d.summary === 'string' && d.summary.trim()) state.text.push(d.summary);
      return [];
    case 'session.error':
      state.error = d.message ?? 'Copilot CLI reported an error.';
      return [`Error: ${state.error}`];
    case 'session.warning':
      return d.message ? [`Warning: ${d.message}`] : [];
    case 'session.shutdown': {
      const changed = d.codeChanges?.filesModified?.length ?? 0;
      const lines = typeof d.codeChanges?.linesAdded === 'number' ? ` (+${d.codeChanges.linesAdded} −${num(d.codeChanges.linesRemoved)})` : '';
      if (d.errorReason) state.error ??= d.errorReason;
      // Copilot bills in AI credits / premium requests; keep whatever figure it reports.
      for (const [k, val] of Object.entries(d)) {
        if (typeof val === 'number' && /credit|premium/i.test(k)) state.credits = val;
      }
      const secs = Math.round(num(d.totalApiDurationMs) / 1000);
      return [`Finished: ${changed} file${changed === 1 ? '' : 's'} changed${lines}, ${secs}s of model time, ${tokens(state.usage)}`];
    }
    default:
      return [];
  }
}

/** @param {string} name @param {unknown} [target] */
const tool = (name, target) => `→ ${name}${target ? ` ${clip(String(target), 140)}` : ''}`;

/** @param {string} s @param {number} n */
const clip = (s, n) => {
  const one = String(s ?? '').replace(/\s+/g, ' ').trim();
  return one.length > n ? one.slice(0, n - 1) + '…' : one;
};

/** @param {Usage | undefined} u */
export const tokens = (u) => (u ? `${compact(u.inputTokens)} in / ${compact(u.outputTokens)} out tokens` : 'no usage reported');

/** @param {number} n */
const compact = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n));

/** @param {unknown} n */
const num = (n) => (typeof n === 'number' && Number.isFinite(n) ? n : 0);

/** @param {string} p @param {string} [cwd] */
const shortPath = (p, cwd) => {
  if (!cwd || !p || !path.isAbsolute(p)) return p.replace(/\\/g, '/');
  const r = path.relative(cwd, p);
  return (r && !r.startsWith('..') && !path.isAbsolute(r) ? r : p).replace(/\\/g, '/');
};

/** @param {string} line */
const parseJson = (line) => {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
};
