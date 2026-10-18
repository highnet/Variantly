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
 * - Gemini CLI 0.64 `gemini -p --output-format stream-json`: init, message,
 *   tool_use, tool_result, error, result (packages/core/src/output/types.ts).
 * - Cursor CLI 2026.10 `cursor-agent -p --output-format stream-json`: system,
 *   user, assistant, thinking, tool_call (started/completed), result.
 * - OpenCode 1.19 `opencode run --format json`: step_start, text, tool_use,
 *   step_finish (tokens and dollar cost per step), error. Captured from a real run.
 * - Grok Build 1.0.62 `grok -p --output-format streaming-messages-json`: Claude
 *   Code's stream-json shape; a failed run's `result` carries `errors[]`.
 * - Hermes Agent `hermes chat --oneshot -q --format stream-json`: system init,
 *   text (deltas), tool_use, tool_result, result (hermes_cli/stream_json.py).
 * - Pi 1.3 `pi -p --mode json`: session, message_end (assistant text, usage
 *   with cost, stopReason/errorMessage), tool_execution_start/end, auto_retry_*.
 */
import path from 'node:path';

/** @typedef {'claude-stream' | 'codex-json' | 'copilot-json' | 'gemini-stream' | 'cursor-stream' | 'opencode-json' | 'grok-stream' | 'hermes-stream' | 'pi-json' | 'text'} OutputKind */

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
 * @property {() => number | undefined} costUsd  a dollar figure, when the agent reports one
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
  /\bplease (?:run )?`?(?:copilot|codex|claude|cursor-agent|agent)(?: auth)? login\b/i,
  /\bplease set an auth method\b/i,
  /\b401 Unauthorized\b/i,
  /\binvalid api key\b/i,
  /\bincorrect api key\b/i,
  /\bauthentication (?:is )?required\b/i,
  /\bno authentication information found\b/i,
];

/**
 * Usage or rate limits: every other variant would hit the same wall, so the
 * queue stops too.
 */
export const LIMITED = /usage limit|rate limit|\b429\b|overloaded/i;

/** @param {string} line */
export const limitReason = (line) =>
  LIMITED.test(line) ? `the agent hit a usage or rate limit; wait for it to reset, then retry. (${clip(line, 200)})` : undefined;

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
    /** @type {string | undefined} */ limited: undefined,
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
  const parsers = { 'claude-stream': claude, 'codex-json': codex, 'copilot-json': copilot, 'gemini-stream': gemini, 'cursor-stream': cursor, 'opencode-json': opencode, 'grok-stream': grok, 'hermes-stream': hermes, 'pi-json': pi };
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
      // stderr and reported errors only: the agent's own words (and code) may mention rate limits.
      state.limited ??= limitReason(line);
      remember([line]);
    },
    unavailable: () => state.unavailable ?? state.limited ?? (state.error ? limitReason(state.error) : undefined),
    tail: () => [...state.tail],
    text: () => state.text.join('\n'),
    costUsd: () => state.costUsd,
    usage: () => state.usage,
    credits: () => state.credits,
    error: () => state.error,
  };
}

/**
 * @typedef {{ text: string[], costUsd?: number, credits?: number, usage?: Usage, error?: string, final?: boolean, lastMessage?: string, pending?: string }} ParseState
 * @typedef {(p: unknown) => string} Rel
 * @typedef {(input: number, output: number, cached: number) => void} AddUsage
 */

/** @param {any} event @param {ParseState} state @param {Rel} rel @param {AddUsage} addUsage */
function claude(event, state, rel, addUsage) {
  if (event.type === 'system' && event.subtype === 'init') return [`Claude Code session started (${event.model ?? 'default model'})`];
  if (event.type === 'assistant') {
    // Live usage, per message (one message spans several events with the
    // same id and usage); the result event replaces it with the total.
    const u = event.message?.usage;
    const id = event.message?.id;
    if (u && !state.final && id !== state.lastMessage) {
      state.lastMessage = id;
      addUsage(u.input_tokens, u.output_tokens, num(u.cache_read_input_tokens) + num(u.cache_creation_input_tokens));
    }
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
    if (u) {
      state.final = true;
      state.usage = undefined;
    }
    if (u) addUsage(u.input_tokens, u.output_tokens, num(u.cache_read_input_tokens) + num(u.cache_creation_input_tokens));
    if (event.is_error) state.error = typeof event.result === 'string' ? event.result : 'Claude Code reported an error.';
    const cost = typeof event.total_cost_usd === 'number' ? `, $${event.total_cost_usd.toFixed(2)}` : '';
    return [`Finished in ${Math.round(num(event.duration_ms) / 1000)}s${cost}`];
  }
  return [];
}

/** Grok Build speaks Claude Code's stream-json, under its own name. @param {any} event @param {ParseState} state @param {Rel} rel @param {AddUsage} addUsage */
function grok(event, state, rel, addUsage) {
  if (event.type === 'system' && event.subtype === 'init') return [`Grok Build session started (${event.model ?? 'default model'})`];
  const out = claude(event, state, rel, addUsage);
  if (event.type === 'result' && event.is_error && Array.isArray(event.errors) && event.errors.length) {
    state.error = String(event.errors[0]);
    return [...out, `Error: ${clip(state.error, 300)}`];
  }
  return out;
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
    // Copilot CLI 1.0.9x reports no tokens: spend is premium requests, live
    // in usage checkpoints and final in the top-level `result` event.
    case 'session.usage_checkpoint':
      if (typeof d.totalPremiumRequests === 'number') state.credits = d.totalPremiumRequests;
      return [];
    case 'result': {
      const u = event.usage ?? {};
      if (typeof u.premiumRequests === 'number') state.credits = u.premiumRequests;
      const changed = u.codeChanges?.filesModified?.length ?? 0;
      const secs = Math.round(num(u.totalApiDurationMs) / 1000);
      const spend = typeof state.credits === 'number' ? `, ${state.credits} premium request${state.credits === 1 ? '' : 's'}` : '';
      return [`Finished: ${changed} file${changed === 1 ? '' : 's'} changed, ${secs}s of model time${spend}`];
    }
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

/** @param {any} event @param {ParseState} state @param {Rel} rel @param {AddUsage} addUsage */
function gemini(event, state, rel, addUsage) {
  // Assistant text streams in small deltas: keep all of it for the SUMMARY
  // line, but show it a whole line at a time.
  if (event.type === 'message') {
    if (event.role !== 'assistant' || typeof event.content !== 'string') return [];
    // Deltas join without a separator; the parser joins text entries with one.
    state.text[0] = (state.text[0] ?? '') + event.content;
    const lines = ((state.pending ?? '') + event.content).split(/\r?\n/);
    state.pending = lines.pop();
    return lines.map((l) => l.trim()).filter(Boolean);
  }
  const held = state.pending?.trim() ? [state.pending.trim()] : [];
  state.pending = '';
  return [...held, ...geminiEvent(event, state, rel, addUsage)];
}

/** @param {any} event @param {ParseState} state @param {Rel} rel @param {AddUsage} addUsage */
function geminiEvent(event, state, rel, addUsage) {
  switch (event.type) {
    case 'init':
      return [`Gemini CLI session started (${event.model ?? 'default model'})`];
    case 'tool_use': {
      const a = event.parameters && typeof event.parameters === 'object' ? event.parameters : {};
      const file = a.file_path ?? a.absolute_path ?? a.path ?? a.dir_path;
      const target = file ? rel(file) : (a.command ?? a.pattern ?? a.query ?? a.url ?? a.name ?? '');
      return [tool(event.tool_name ?? 'tool', target)];
    }
    case 'tool_result':
      return event.status === 'error' ? [`  ✗ ${event.error?.message ?? 'tool failed'}`] : [];
    case 'error':
      if (event.severity === 'error') state.error = event.message ?? 'Gemini CLI reported an error.';
      return [`${event.severity === 'error' ? 'Error' : 'Warning'}: ${event.message ?? ''}`];
    case 'result': {
      const s = event.stats ?? {};
      if (s.input_tokens !== undefined || s.output_tokens !== undefined) {
        state.usage = undefined;
        addUsage(s.input_tokens, s.output_tokens, s.cached);
      }
      if (event.status === 'error') state.error = event.error?.message ?? 'Gemini CLI reported an error.';
      return [`Finished in ${Math.round(num(s.duration_ms) / 1000)}s, ${tokens(state.usage)}`];
    }
    default:
      return [];
  }
}

/** @param {any} event @param {ParseState} state @param {Rel} rel @param {AddUsage} addUsage */
function cursor(event, state, rel, addUsage) {
  if (event.type === 'system' && event.subtype === 'init') return [`Cursor CLI session started (${event.model ?? 'default model'})`];
  if (event.type === 'assistant') {
    /** @type {string[]} */
    const out = [];
    for (const block of event.message?.content ?? []) {
      if (block.type === 'text' && block.text?.trim()) {
        state.text.push(block.text);
        out.push(block.text.trim());
      }
    }
    return out;
  }
  if (event.type === 'tool_call') {
    // `tool_call` holds one key per kind: readToolCall, editToolCall,
    // shellToolCall, mcpToolCall, ... each with its args (and, once
    // completed, its result).
    const [key, call] = Object.entries(event.tool_call ?? {})[0] ?? [];
    if (!key) return [];
    const name = key === 'function' ? (call?.name ?? 'tool') : key.replace(/ToolCall$/, '');
    if (event.subtype === 'completed') {
      const failed = call?.result?.error ?? call?.result?.failure ?? call?.result?.rejected;
      return failed ? [`  ✗ ${name}: ${clip(failed.message ?? failed.error ?? JSON.stringify(failed), 140)}`] : [];
    }
    if (event.subtype !== 'started') return [];
    const a = call?.args ?? (typeof call?.arguments === 'string' ? parseJson(call.arguments) : call?.arguments) ?? {};
    const file = a.path ?? a.filePath ?? a.file_path ?? a.targetFile;
    const target = file ? rel(file) : (a.command ?? a.pattern ?? a.query ?? a.globPattern ?? a.url ?? a.toolName ?? '');
    return [tool(name.charAt(0).toUpperCase() + name.slice(1), target)];
  }
  if (event.type === 'result') {
    if (typeof event.result === 'string') state.text.push(event.result);
    const u = event.usage;
    if (u) {
      state.usage = undefined;
      addUsage(u.inputTokens, u.outputTokens, num(u.cacheReadTokens) + num(u.cacheWriteTokens));
    }
    if (event.is_error) state.error = typeof event.result === 'string' && event.result ? event.result : 'Cursor CLI reported an error.';
    return [`Finished in ${Math.round(num(event.duration_ms) / 1000)}s${u ? `, ${tokens(state.usage)}` : ''}`];
  }
  return [];
}

/** @param {any} event @param {ParseState} state @param {Rel} rel @param {AddUsage} addUsage */
function opencode(event, state, rel, addUsage) {
  const p = event.part ?? {};
  switch (event.type) {
    case 'text': {
      // Some models leak reasoning tags into the text; they are not words.
      const text = typeof p.text === 'string' ? p.text.replace(/<\/?think>/g, '') : '';
      if (!text.trim()) return [];
      state.text.push(text);
      return [text.trim()];
    }
    case 'tool_use': {
      const st = p.state ?? {};
      const a = st.input && typeof st.input === 'object' ? st.input : {};
      const file = a.filePath ?? a.file_path ?? a.path;
      const target = file ? rel(file) : (a.command ?? a.pattern ?? a.url ?? a.name ?? a.query ?? '');
      const name = String(p.tool ?? 'tool');
      const line = tool(name.charAt(0).toUpperCase() + name.slice(1), target);
      return st.status === 'error' ? [line, `  ✗ ${clip(st.error ?? 'tool failed', 140)}`] : [line];
    }
    case 'step_finish': {
      const t = p.tokens ?? {};
      addUsage(t.input, t.output, num(t.cache?.read) + num(t.cache?.write));
      if (typeof p.cost === 'number') state.costUsd = num(state.costUsd) + p.cost;
      return [];
    }
    case 'error': {
      const e = event.error ?? {};
      state.error = e.data?.message ?? e.message ?? e.name ?? 'OpenCode reported an error.';
      return [`Error: ${state.error}`];
    }
    default:
      return [];
  }
}

/** @param {any} event @param {ParseState} state @param {Rel} rel @param {AddUsage} addUsage */
function hermes(event, state, rel, addUsage) {
  // Text streams in deltas, like Gemini's: shown a whole line at a time.
  if (event.type === 'text') {
    if (typeof event.text !== 'string') return [];
    state.text[0] = (state.text[0] ?? '') + event.text;
    const lines = ((state.pending ?? '') + event.text).split(/\r?\n/);
    state.pending = lines.pop();
    return lines.map((l) => l.trim()).filter(Boolean);
  }
  const held = state.pending?.trim() ? [state.pending.trim()] : [];
  state.pending = '';
  return [...held, ...hermesEvent(event, state, rel, addUsage)];
}

/** @param {any} event @param {ParseState} state @param {Rel} rel @param {AddUsage} addUsage */
function hermesEvent(event, state, rel, addUsage) {
  switch (event.type) {
    case 'system':
      return event.subtype === 'init' ? [`Hermes Agent session started (${event.model || 'default model'})`] : [];
    case 'tool_use': {
      const a = event.input && typeof event.input === 'object' ? event.input : {};
      const target = a.path ? rel(a.path) : (a.command ?? a.pattern ?? a.name ?? a.query ?? a.url ?? '');
      return [tool(event.name ?? 'tool', target)];
    }
    case 'tool_result':
      return event.is_error ? [`  ✗ ${event.name ?? 'tool'}: ${clip(event.output ?? 'failed', 140)}`] : [];
    case 'result': {
      const t = event.tokens ?? {};
      state.usage = undefined;
      addUsage(t.input, t.output, num(t.cache_read) + num(t.cache_write));
      // The final answer, whole; the deltas were the same words.
      if (typeof event.text === 'string' && event.text.trim()) state.text = [event.text];
      if (event.error) state.error = String(event.error);
      else if (event.exit_code && event.exit_code !== 0) state.error = `Hermes Agent stopped with exit code ${event.exit_code}.`;
      return [`Finished in ${Math.round(num(event.duration_ms) / 1000)}s, ${tokens(state.usage)}`];
    }
    default:
      return [];
  }
}

/** @param {any} event @param {ParseState} state @param {Rel} rel @param {AddUsage} addUsage */
function pi(event, state, rel, addUsage) {
  switch (event.type) {
    case 'session':
      return ['Pi session started'];
    case 'message_end': {
      const m = event.message ?? {};
      if (m.role !== 'assistant') return [];
      const u = m.usage ?? {};
      addUsage(u.input, u.output, num(u.cacheRead) + num(u.cacheWrite));
      if (typeof u.cost?.total === 'number') state.costUsd = num(state.costUsd) + u.cost.total;
      /** @type {string[]} */
      const out = [];
      for (const block of Array.isArray(m.content) ? m.content : []) {
        if (block.type === 'text' && block.text?.trim()) {
          state.text.push(block.text);
          out.push(block.text.trim());
        }
      }
      if (m.stopReason === 'error' || m.stopReason === 'aborted') {
        const error = String(m.errorMessage || 'Pi reported an error.');
        state.error = error;
        out.push(`Error: ${clip(error, 300)}`);
      }
      return out;
    }
    case 'tool_execution_start': {
      const a = event.args && typeof event.args === 'object' ? event.args : {};
      const target = a.path ? rel(a.path) : (a.command ?? a.pattern ?? '');
      return [tool(event.toolName ?? 'tool', target)];
    }
    case 'tool_execution_end': {
      if (!event.isError) return [];
      const text = (event.result?.content ?? []).map((/** @type {any} */ c) => c.text ?? '').join(' ');
      return [`  ✗ ${event.toolName ?? 'tool'}: ${clip(text || 'failed', 140)}`];
    }
    case 'auto_retry_start':
      return [`  ↻ retry ${event.attempt}/${event.maxAttempts}: ${clip(event.errorMessage ?? '', 120)}`];
    case 'auto_retry_end':
      if (event.success === false) state.error = event.finalError ?? state.error ?? 'Pi gave up retrying.';
      return [];
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
