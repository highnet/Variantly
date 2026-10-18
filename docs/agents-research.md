# Research notes: Grok Build, Antigravity, OpenCode, Pi, Hermes Agent

Notes behind the adapters in `src/agents.mjs`, gathered 2026-10-17/18 and
used for PR #132. Each
fact names its source. "Ran" means the real binary was downloaded and run here
(in a throwaway `$HOME`, no account) to check flags, errors and output shapes;
nothing below was run against a signed-in account except where it says so.

## Where Impeccable installs for each agent

Source: Impeccable repo `crates/skills/src/providers.rs` at commit
`08d5b470495d242ca0470f4aeae1956c3a074f83` (PROVIDER_ALIASES,
home_skills_dir_override), and its README "Option 5: Copy from Repository".

| Agent | `--providers=` id | Project skills | Global skills |
| --- | --- | --- | --- |
| Grok Build | `grok` | `.grok/skills` | `~/.grok/skills` |
| Antigravity | `antigravity` | `.agent/skills` | `~/.gemini/config/skills` |
| OpenCode | `opencode` | `.opencode/skills` | `$OPENCODE_CONFIG_DIR/skills`, else `$XDG_CONFIG_HOME/opencode/skills`, else `~/.config/opencode/skills` |
| Pi | `pi` | `.pi/skills` | `~/.pi/agent/skills` |
| Hermes Agent | `hermes` | `.hermes/skills` | `$HERMES_HOME/skills` (only when under home), else `~/.hermes/skills` |

## OpenCode

- Binary `opencode`; install `npm install -g opencode-ai` (npm package
  `opencode-ai`, 1.19.3 checked). Source: opencode.ai/docs, npm.
- Headless: `opencode run [message..] --format json` (raw JSON events, one per
  line). `-m provider/model`, `--dir`, `--auto` (auto-approve anything not
  explicitly denied). Source: `opencode run --help` (ran, 1.19.3),
  https://opencode.ai/docs/cli/.
- Permissions: config key `permission` with `allow | ask | deny` per tool
  (`read`, `edit` covers edit/write/patch, `bash` by command pattern, `glob`,
  `grep`, `skill`, `webfetch`, `question`, `external_directory`, `doom_loop`);
  last matching pattern wins. `external_directory` defaults to ask. Source:
  https://opencode.ai/docs/permissions/.
- Config can be passed per run with `OPENCODE_CONFIG_CONTENT` (inline JSON,
  runtime overrides). Source: https://opencode.ai/docs/config/.
- MCP: config key `mcp`, `{ type: "local", command: [..], enabled: true }`.
  Source: https://opencode.ai/docs/mcp-servers/.
- Skills: `.opencode/skills`, `~/.config/opencode/skills`, plus
  `.claude/skills`, `~/.claude/skills`, `.agents/skills`, `~/.agents/skills`.
  Source: https://opencode.ai/docs/skills/.
- Sign-in: `opencode auth login`, credentials in
  `~/.local/share/opencode/auth.json`; providers also come from env keys.
  OpenCode Zen's free models (`opencode/big-pickle`, ...) work with no sign-in.
  Source: https://opencode.ai/docs/cli/, `opencode models` (ran).
- **Ran end to end** with the free `opencode/big-pickle` model, safe permission
  config via `OPENCODE_CONFIG_CONTENT`, brief outside the working folder: the
  edit landed, `git status` ran, `rm` was denied by the rule. Event shapes:
  `step_start`, `text` (`part.text`, whole part), `tool_use` (`part.tool`,
  `part.state.status`, `part.state.input.filePath`/`command`, `part.state.error`),
  `step_finish` (`part.tokens.{input,output,reasoning,cache.{read,write}}`,
  `part.cost` in dollars), `error` (`error.name`, `error.data.message`).
  Fixture: `test/fixtures/agent-output/opencode.jsonl`.

## Grok Build

- Binary `grok`; install `curl -fsSL https://x.ai/cli/install.sh | bash`
  (Windows `irm https://x.ai/cli/install.ps1 | iex`); the script puts it in
  `~/.grok/bin`. Source: https://docs.x.ai/build/overview.md, the install script.
- Headless: `grok -p <prompt>`; `--output-format plain|json|streaming-json|streaming-messages-json`;
  `-m/--model`; `--cwd`; `--always-approve`; `--permission-mode
  default|acceptEdits|auto|dontAsk|bypassPermissions|plan`; `--allow`/`--deny`
  rules such as `Bash(git *)`, `Read`, `Edit`, `Grep`, `MCPTool(server__*)`;
  `--sandbox <profile>`. Source: `grok --help` (ran, 1.0.62),
  https://docs.x.ai/build/cli/headless-scripting.md,
  https://docs.x.ai/build/cli/reference.md,
  https://docs.x.ai/build/features/permissions.md,
  https://docs.x.ai/build/enterprise.md ("dontAsk: silently deny anything
  without an explicit allow rule; headless, CI").
- `streaming-messages-json` is Claude Code's stream-json shape (ran): `system`
  `init` (model, tools, skills), `result` with `total_cost_usd`, `usage`,
  `is_error`, `errors[]`. Tools are named `read_file`, `search_replace`,
  `write`, `run_terminal_command`, `grep`, `list_dir`, ...
- Skills: `./.grok/skills` (walked to the repo root), `~/.grok/skills`,
  `~/.agents/skills`, Claude Code's skills. Ran: project skills load only in a
  trusted folder; the undocumented `--trust` flag trusts it (the Impeccable
  README tells Grok users to launch with `--trust`). Source:
  https://docs.x.ai/build/features/skills-plugins-marketplaces.md, ran.
- MCP: only from `~/.grok/config.toml`, project `.grok/config.toml`, `.mcp.json`
  or plugins; no per-run flag (`--mcp-config`, `--plugin-dir` are rejected by
  1.0.62). So variantly runs Grok without the browser check.
- Sign-in: `grok login` (`--device-auth` for headless), or `XAI_API_KEY`;
  cached login lives in `~/.grok/auth.json` (binary strings). Unsigned run
  prints `Not signed in. ...` (ran).

## Hermes Agent

- Binary `hermes`; install `curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash`
  (Windows `iex (irm https://hermes-agent.nousresearch.com/install.ps1)`).
  Source: hermes-agent README at `e6cf2a9b1e8f98d40408b09a9a55993c8459b4b4`.
- Headless: `hermes chat --oneshot -q <prompt> --format stream-json`;
  `-m/--model`, `--provider`, `-t/--toolsets`, `--yolo`, `--source tool`
  (keeps third-party runs out of the user's session lists). Verified in
  `hermes_cli/_parser.py` and `website/docs/reference/cli-commands.md`.
- stream-json events (`hermes_cli/stream_json.py`): `system` `init` (model),
  `text` (delta), `tool_use` (`name`, `input`), `tool_result` (`name`,
  `is_error`, `output`), `result` (`exit_code`, `text`, `tokens.{input,output,cache_read,cache_write}`, `error`).
- Approvals: dangerous shell commands are auto-denied in `-q` runs by default
  (`approvals.single_query_mode: deny`); ordinary commands and file edits run.
  `--yolo` skips approvals. Toolsets: `file` (read/write/patch/search),
  `terminal`, `skills`, `todo`. Source: `website/docs/user-guide/security.md`,
  `website/docs/reference/toolsets-reference.md`.
- Skills: `~/.hermes/skills` (or `$HERMES_HOME/skills`); project
  `.hermes/skills` / `.agents/skills` load only after `hermes skills trust`, and
  non-interactive runs never auto-trust. So Impeccable must be installed
  user-wide for Hermes. Source: `website/docs/user-guide/features/skills.md`.
- MCP: `mcp_servers` in `config.yaml` only; no per-run flag. Runs without the
  browser check.
- Sign-in: `hermes setup` / `hermes auth`; credentials in `$HERMES_HOME/.env`
  and `$HERMES_HOME/auth.json`.
- Not run (Python install not attempted); flags checked against source.

## Pi

- Binary `pi`; install `npm install -g --ignore-scripts @earendil-works/pi-coding-agent`
  (or `curl -fsSL https://pi.dev/install.sh | sh`). Source: package
  `docs/quickstart.md` (1.3.0).
- Headless: `pi -p --mode json <prompt>`; `--model provider/id`, `--tools`
  allowlist (`read,bash,edit,write,grep,find,ls`), `--no-session`,
  `--approve`/`--no-approve` (project trust for this run), `--skill <path>`.
  Source: `pi --help` (ran, 1.3.0), `docs/json.md`.
- No approval system at all: "it does not ask for approval before every tool
  call" (`docs/security.md`). Safe mode can only drop tools, so variantly's
  safe mode leaves out `bash` (Impeccable's shell checks then don't run).
- JSON events (`docs/json.md`, ran): `session`, `agent_start`, `turn_start`,
  `message_start`/`message_update`/`message_end` (assistant `content[]` text
  blocks, `usage.{input,output,cacheRead,cacheWrite,cost.total}`,
  `stopReason`, `errorMessage`), `tool_execution_start` (`toolName`, `args`),
  `tool_execution_end` (`isError`), `auto_retry_*`, `agent_end`.
- Skills: `~/.pi/agent/skills`, `~/.agents/skills`, project `.pi/skills`,
  `.agents/skills` (project ones need trust). Ran: `--no-approve --skill <dir>`
  loads one folder of skills without trusting the rest of the project.
- MCP: `~/.pi/agent/mcp.json` or trusted `.pi/mcp.json` only; runs without the
  browser check.
- Sign-in: `/login` inside `pi`, saved to `~/.pi/agent/auth.json`
  (`$PI_CODING_AGENT_DIR`), or provider env keys. Exits 0 even on a provider
  error; the error is in the assistant message (ran).

## Antigravity

- Binary `agy`; install `curl -fsSL https://antigravity.google/cli/install.sh | bash`
  (Windows `irm https://antigravity.google/cli/install.ps1 | iex`), into
  `~/.local/bin`. Installer fetched and read; 1.4.1 downloaded, checksum checked.
- Headless: `agy [flags] -p <prompt>`, `--output-format text|json|stream-json`,
  `--model`, `--add-dir`, `--dangerously-skip-permissions`, `--mode
  accept-edits|auto|plan`. Source: `agy --help` (ran, 1.4.1),
  https://antigravity.google/docs/cli/headless.
- Permissions: reads and writes inside the workspace are auto-allowed; shell
  commands default to Ask and are soft-denied in headless runs unless allowed in
  `~/.gemini/antigravity-cli/settings.json`. `--mode` did not change the
  reported `permission_mode` (ran). Source: headless docs.
- stream-json: objects keyed by `event` (not `type`): `init`, `step_update`
  (`step_type` `agent_response` with `text_delta`, `tool` with `tool_name` and
  `tool_info.{parameters,error}`, `usage`), `result` (`status`, `response`,
  `error`, `usage`). Ran unauthenticated and with a bad key.
- Sign-in: OS keyring after an interactive `agy`, `AGY_ADC_AUTH=true`, or
  `modelProvider: "gemini"` plus `GEMINI_API_KEY`. Unsigned headless runs print
  `Authentication required` and wait up to 60 s for a code (ran).
- Skills (https://antigravity.google/docs/skills, CLI tab): the CLI reads
  `<workspace>/.agents/skills` (and `.agent/skills` for compatibility) and
  `~/.gemini/antigravity-cli/skills`. Impeccable's `--providers=antigravity`
  installs to `.agent/skills` or `~/.gemini/config/skills`; the latter is the
  Antigravity **app/IDE** folder, which the CLI docs don't list. variantly
  copies whichever copy it finds into each worktree's `.agents/skills`.
- Not verified: that skills load in a headless `agy -p` run (needs a sign-in).
</content>
</invoke>
