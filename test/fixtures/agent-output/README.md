# Agent output samples

One JSONL file per agent CLI, fed line by line to `src/agent-output.mjs` by
`test/agent-output.test.mjs`.

`codex-unauthenticated.jsonl` is a **real capture**: codex-cli 0.162.1 run
with variantly's exact safe-mode arguments, an empty `CODEX_HOME` and no API
key, so it starts a thread and fails on authentication. It proves the flags
are accepted and shows how Codex reports retries.

`opencode.jsonl` is a **real capture**: opencode-ai 1.19.3 run with
variantly's safe-mode permission config and the free `opencode/big-pickle`
model, on a one-line brief (make a colour blue, run `git status`, try `rm`).
Paths were rewritten to the ones below.

`grok-failed.jsonl` is a **real capture**: Grok Build 1.0.62 run with
variantly's exact safe-mode arguments and an invalid `XAI_API_KEY`. It proves
the flags are accepted and shows the error `result`. `grok.jsonl` is written
by hand in the same (Claude Code stream-json) shape.

The other files were **written by hand from each CLI's published event
schema**, not captured from a signed-in run (no agent was signed in where they
were written). Field names and nesting follow:

- `claude.jsonl`: Claude Code `-p --output-format stream-json --verbose`.
- `codex.jsonl`, `codex-failed.jsonl`: Codex CLI 0.162 `codex exec --json`,
  the `ThreadEvent` enum in `codex-rs/exec/src/exec_events.rs` (thread.started,
  turn.*, item.* with agent_message, reasoning, command_execution, file_change,
  mcp_tool_call, web_search, todo_list, error).
- `copilot.jsonl`: Copilot CLI 1.0.98 `copilot -p --output-format json`, the
  `SessionEvent` union in `@github/copilot-sdk` 1.0.22
  `dist/generated/session-events.d.ts` (`{ type, data, id, parentId, timestamp }`).

Paths use `C:/wt/v1` as the variant's worktree. Replace a file with a real
capture when one is available; the tests assert on behaviour, not on exact
line counts.
