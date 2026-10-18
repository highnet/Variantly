# variantly

**N redesigns of your site, running side by side. Keep one. For agents and humans.**

- **Redesigns your site N ways**, each in a different direction, using the
  coding agent you already use and the [Impeccable](https://impeccable.style) design skill.
- **Every variant runs as your real site**, on its own dev server.
- **Compare** with a 1…N picker and a before/after slider.
- **Keep one**: it's applied to your working tree. **Nothing touches your code before that.**

```sh
npx variantly
```

- **Other package managers:** `pnpm dlx variantly`, `yarn dlx variantly`, `bunx variantly`
  (works for every command below).
- **No `npx`?** Install [Node.js](https://nodejs.org/en/download); it ships with npx.
- **Opens a browser wizard:** app location, agent, brief, number of variants. Then watch and compare.
- **For agents:** [SKILLS.md](SKILLS.md). **Homepage:** [variantly.style](https://variantly.style).

**Contents**

- [What it is, and what it is not](#what-it-is-and-what-it-is-not)
- [Install](#install)
- [How it works](#how-it-works)
- [Stacks](#stacks)
- [Agents and cost](#agents-and-cost)
- [Commands](#commands)
- [Safety](#safety)
- [Development](#development)

## What it is, and what it is not

- **Impeccable [live mode](https://impeccable.style/docs/live/)**: variants of **one element** in your running page.
- **variantly**: the same idea for the **whole site** (tokens, type, layout, components, every file).
- Each variant gets its **own git worktree** and **dev server**; a local proxy shows them side by side.
- **No preset themes:** no theme library, template or palette. Each variant is **designed from scratch** for your site, in a direction you describe or one Impeccable rolls. **Run twice, get different designs.**
- **Workflow:** variantly to **choose a direction** → `/impeccable live` to **tune details**.
- **Not a hosted service:** no account, no model, no server. Runs **on your machine** with **your** agent subscription or API key.

## Install

**Requirements:** Node 20.11+, git, one agent CLI.

```sh
npx variantly            # run it from your project
npm install -g variantly # or keep it around
```

You need **one** of these, signed in. The wizard detects the ones you have,
and can install one and open its sign-in for you:

| Agent | Install |
| --- | --- |
| Claude Code | `npm install -g @anthropic-ai/claude-code` |
| Codex CLI | `npm install -g @openai/codex` |
| GitHub Copilot CLI | `npm install -g @github/copilot` |
| Gemini CLI | `npm install -g @google/gemini-cli` |
| Cursor CLI | `curl https://cursor.com/install -fsS \| bash` (Windows: `irm 'https://cursor.com/install?win32=true' \| iex`) |
| OpenCode | `npm install -g opencode-ai` |
| Grok Build | `curl -fsSL https://x.ai/cli/install.sh \| bash` (Windows: `irm https://x.ai/cli/install.ps1 \| iex`) |
| Hermes Agent | `curl -fsSL https://hermes-agent.nousresearch.com/install.sh \| bash` (Windows: `iex (irm https://hermes-agent.nousresearch.com/install.ps1)`) |

The agent has to be the **command-line** one: variantly runs it headless.
Lovable, Bolt, v0 and other browser builders can't run on your machine.

**Using [OpenRouter](https://openrouter.ai)?** Point Claude Code or Codex at it
before you start variantly; it counts as signed in.

```sh
# Claude Code
export ANTHROPIC_BASE_URL=https://openrouter.ai/api
export ANTHROPIC_AUTH_TOKEN=<your OpenRouter key>
export ANTHROPIC_API_KEY=""
```

```toml
# Codex: ~/.codex/config.toml, with OPENROUTER_API_KEY set in your shell
model_provider = "openrouter"
model = "anthropic/claude-sonnet-4.6"

[model_providers.openrouter]
name = "OpenRouter"
base_url = "https://openrouter.ai/api/v1"
env_key = "OPENROUTER_API_KEY"
```

Pick a model that is good at tool use; the agent edits files and runs
commands for 10–20 minutes per variant.

and Impeccable installed for it (the wizard offers to run this for you):

```sh
npx impeccable install --providers=claude --scope=global --yes --no-hooks   # or codex, copilot, gemini, cursor, opencode, grok, hermes
```

**Mix agents in one run.** Split the variants across agents and models, say
two from Claude Code and two from Gemini CLI, for more variety. In the wizard,
**Add another agent** under the agent list; on the command line:

```sh
npx variantly --agents claude:opus:2,claude:sonnet:1,gemini:2   # agent[:model]:count
npx variantly --agents claude:2,codex:2 --blind                 # hide who made what until you keep one
```

Every agent in a mix must be installed and signed in before the run starts.
Each variant shows the agent and model that made it, and the board adds up the
spend per agent. The wizard remembers your last mix.

**No agent yet?** `npx variantly --demo` runs the full flow with fixed restyles: **no AI, no account**.

**Let your agent drive it.** `install-skill` teaches your agent variantly once
(defaults: **agents on your PATH**, **user-wide**):

```sh
npx variantly install-skill                              # every agent you have
npx variantly install-skill --providers=codex,copilot    # just these
npx variantly install-skill --scope=project              # into this repo, for everyone who clones it
```

| Agent | User-wide (`--scope=global`) | In the project (`--scope=project`) | Then ask |
| --- | --- | --- | --- |
| Claude Code | `~/.claude/skills/variantly/` | `.claude/skills/variantly/` | "redesign my site with variantly" or `/variantly` |
| Codex CLI | `~/.agents/skills/variantly/` | `.agents/skills/variantly/` | "redesign my site with variantly" or `$variantly` |
| GitHub Copilot CLI | `~/.copilot/skills/variantly/` | `.github/skills/variantly/` | "redesign my site with variantly" or `/variantly` |
| Gemini CLI | `~/.gemini/skills/variantly/` | `.gemini/skills/variantly/` | "redesign my site with variantly" |
| Cursor CLI | `~/.cursor/skills/variantly/` | `.cursor/skills/variantly/` | "redesign my site with variantly" or `/variantly` |
| OpenCode | `~/.config/opencode/skills/variantly/` | `.opencode/skills/variantly/` | "redesign my site with variantly" |
| Grok Build | `~/.grok/skills/variantly/` | `.grok/skills/variantly/` | "redesign my site with variantly" or `/variantly` |
| Hermes Agent | `~/.hermes/skills/variantly/` | `.hermes/skills/variantly/` (after `hermes skills trust`) | "redesign my site with variantly" or `/variantly` |

**Claude Code plugin** alternative:

```
/plugin marketplace add highnet/variantly
/plugin install variantly@variantly
```

**Check everything:** `npx variantly doctor`.

## How it works

`npx variantly` opens a four-step wizard in your browser:

1. **Setup.** Confirms the detected app and agent (installed, signed in,
   Impeccable present); switch either if needed.
2. **Variants.** How many (**2, 4 or 6**), which pages, optional extras.
3. **Your site.** Who it's for, what it offers, what must stay, plus any
   notes. Skipped if you have a `PRODUCT.md`.
4. **Review.** A summary with Edit links and the session cost; **Make variants**
   starts the run. Your files aren't touched until you keep one.

Then, under the hood:

1. **Snapshot.** Records your commit plus uncommitted tracked edits
   (`git stash create`, touches nothing) as the base.
2. **Worktrees.** One per variant in `~/.variantly/`, **outside your project**,
   invisible to your editor and watchers. Dependencies and env files are
   **linked or copied**, so nothing reinstalls (except Next.js, see below).
3. **Agents.** Your agent runs **headless** per worktree with a brief:
   - variant *k* of *N* and a **direction** (Editorial, Swiss precision, Dark
     technical… or one Impeccable command each in Refine mode)
   - **your own words**
   - **rules:** keep content and behaviour; no installs, servers or commits
   - **Two at a time** by default; each log is **live**.
4. **Checks.** On by default, each a wizard switch:
   - **Browser for the agent:** headless [Playwright MCP](https://github.com/microsoft/playwright-mcp)
     on its own variant; screenshots at **desktop and phone** widths and fixes what it sees.
   - **Review pass:** a second session running Impeccable **critique** and
     **audit** plus the scores; fixes the worst issues, keeps the direction.
     **Costs ~50% more.**
   - **Scores:** [axe-core](https://github.com/dequelabs/axe-core) and
     [Lighthouse](https://github.com/GoogleChrome/lighthouse) on the original
     and each variant: **accessibility, performance, best practices, SEO, axe
     violations**, each vs the original.

   Run via `npx` at **pinned versions**: any stack, still **zero dependencies**.
   Needs Chromium/Chrome (`$CHROME_PATH`, Playwright's cache, or a normal install).
5. **Preview.** Each finished variant gets a **dev server** and a **proxy**
   (scroll/navigation sync, framing headers stripped, HMR passes through).
   Only the original plus the **last few viewed** run at once.
6. **Compare.** **Slider**, **single** or **side-by-side**. `1`–`9`, `0`,
   arrows to switch; panes stay **in sync**.
7. **Keep.** The diff is applied with a **three-way merge** (your edits since
   are kept), **unstaged for review**. Others stay as `variantly/*` branches
   until `variantly clean`.

## Stacks

- **Works with anything that has a dev server.**
- **Auto-detected** at the repo root or **up to two levels down** (`apps/web`, `frontend/`):

| Stack | Dev command variantly uses |
| --- | --- |
| Next.js | `next dev --port {port}` |
| SvelteKit | `vite dev --port {port} --strictPort` |
| Astro | `astro dev --port {port}` |
| Nuxt | `nuxi dev --port {port}` |
| Vite (React / Svelte / Vue) | `vite --port {port} --strictPort` |
| Bun | `bun run dev` (reads `PORT`) |
| Static HTML | built-in static server |
| Laravel (Inertia / Livewire) | `php artisan serve` + Vite |
| Rails 8 (Hotwire) | `bin/rails server -p {port}` |
| Django | `manage.py runserver` |
| FastAPI | `uvicorn <module>:app --port {port}` |
| Reflex | `reflex run --frontend-port {port} --backend-port {port2}` |
| Go (Templ, HTMX) | `go run .` (reads `PORT`) |
| Rust (Axum) | `cargo run` (reads `PORT`) |
| Wasp | `wasp start` (fixed ports: one variant at a time) |

- **Editable command** in the wizard: `{port}`, `{port2}` (second free port),
  `{run}` (package runner), `{python}` (your virtualenv's Python).

**Known limits**

- **Next.js:** real dependency install per variant (Turbopack rejects linked
  `node_modules`). Fast with pnpm/bun, slow with npm.
- **Rust:** separate target dirs, so **slow first builds**.
- **Hard-coded ports:** only one copy; use a custom command or one variant at a time.

## Agents and cost

- **variantly never sees a model.** It starts `claude -p`, `codex exec`,
  `copilot -p`, `gemini -p`, `cursor-agent -p`, `opencode run`, `grok -p` or
  `hermes chat --oneshot` per worktree, on **your account** (or your OpenRouter key).
- **One variant = one full agent session.** Ten variants cost ten sessions.
  **Default: four.**
- **Live board** from each agent's structured events: files read/edited,
  commands, skills, summaries.
- **Usage as reported:** Claude Code, OpenCode and Grok Build show
  **dollars**, Codex, Gemini, Cursor, OpenCode and Hermes Agent show
  **tokens**, Copilot shows **premium
  requests**. variantly **never estimates** a price.

**Default permissions**

- **Claude Code** runs with `--permission-mode acceptEdits` and a short list of
  allowed tools;
- **Codex** runs `codex exec --sandbox workspace-write` with
  `approval_policy=never` (it can write only its worktree; nothing waits for
  an approval);
- **Copilot** runs `copilot -p --allow-all-tools --no-ask-user` with
  `git push`, `git commit` and `rm` denied, and file access limited to the
  worktree, the brief and your user-wide skills (`--add-dir`);
- **Gemini** runs `gemini -p --approval-mode auto_edit` with a policy file that
  allows only the shell commands Impeccable needs (`npx impeccable`,
  `git status`, `git diff`, `ls`);
- **Cursor** runs `cursor-agent -p --force` in the worktree. Cursor has no
  per-command allow list on the command line, so safe mode relies on Cursor's
  own sandbox and settings.
- **OpenCode** runs `opencode run --format json` with a permission config
  passed in `OPENCODE_CONFIG_CONTENT`: edits allowed, shell commands denied
  except the ones Impeccable needs (`*impeccable*`, `git status`, `git diff`,
  `ls`), paths outside the worktree denied except the brief and your
  user-wide skills, and questions denied (nobody is there to answer).
- **Grok Build** runs `grok -p --permission-mode dontAsk` (anything not
  allowed is denied without asking) with reads, edits, search and the
  Impeccable, `git status`, `git diff` and `ls` commands allowed, and
  `--trust` so it loads the worktree's skills.
- **Hermes Agent** runs `hermes chat --oneshot` with only its file, terminal,
  skills and todo tools; one-shot runs deny dangerous shell commands. It
  reads project skills only in repositories you trusted, so install
  Impeccable for it **user-wide**.

- **"Full auto"** removes those limits (`--dangerously-skip-permissions`,
  `--dangerously-bypass-approvals-and-sandbox`, `--allow-all`,
  `--approval-mode yolo`, `--sandbox disabled`, `--auto`, `--always-approve`, `--yolo`). **Trusted projects only.**
- **Browser check on:** each agent gets the `playwright` MCP server
  (`--mcp-config` + `mcp__playwright` allowed for Claude Code;
  `-c mcp_servers.playwright.*` for Codex; `--additional-mcp-config` for
  Copilot; a settings file via `GEMINI_CLI_SYSTEM_SETTINGS_PATH` for Gemini;
  a `--plugin-dir` with `--approve-mcps` for Cursor; `mcp` in
  `OPENCODE_CONFIG_CONTENT` for OpenCode), **headless** and `--isolated`: **no shared browser profile**.
  Grok Build and Hermes Agent read MCP servers only from their own config
  files, so they run without the browser check.

## Commands

```
variantly [dir]            open the wizard (default: the current directory)
variantly doctor [dir]     check node, git, agents, Impeccable, detected stack
variantly status [dir]     the current run as JSON
variantly keep <n> [dir]   roll variant n's style out to every page, then apply it;
                           the others stay as branches (--no-rollout: skip the rollout)
variantly clean [dir]      remove every worktree, branch and state file
variantly install-skill    put the variantly skill where your agents read skills

  --agent <id>   claude | codex | copilot | gemini | cursor | opencode | grok | hermes | demo
  --agents <mix> split the variants: agent[:model]:count,… e.g. claude:opus:2,gemini:2
  --blind        hide which agent made each variant until you keep one
  --count <n>    1–10
  --brief <txt>  what you want, in your words
  --yes          skip the wizard and start with detected defaults
  --demo         built-in demo agent, no AI
  --no-open      don't open a browser
  --port <n>     app port (default 4477)

  install-skill:
  --providers <ids>  claude,codex,copilot (default: the agents on your PATH)
  --scope <s>        global (default) or project
```

## Safety

- **Your working tree is untouched** until you keep a variant. Variants live **outside your project**.
- **Local app:** `127.0.0.1` only, **rejects non-loopback `Host`** (DNS rebinding),
  **requires `X-Variantly`** on every POST (cross-site pages can't send it).
- **Preview proxy** strips `X-Frame-Options`/CSP **for local preview only**.
- **Untracked files aren't copied**; `.env` files are **copied, not linked**.

## Development

- **Plain JavaScript** (ES modules, JSDoc types checked by `tsc`).
- **No runtime dependencies, no build step.**
- Homepage: [`site/`](site/).

```sh
npm install
npm run typecheck
npm test                 # node:test, including an end-to-end run with the demo agent
node bin/variantly.mjs --demo path/to/some/site
```

- [CONTRIBUTING.md](CONTRIBUTING.md) · [Conventional Commits](https://www.conventionalcommits.org/)
- Releases: **release-please** → npm **with provenance**.

## Credits

- Built on [Impeccable](https://impeccable.style) by Paul Bakaus (Apache-2.0).
- **Independent**: not affiliated with or endorsed by Impeccable. See [NOTICE.md](NOTICE.md).

MIT © highnet. See [LICENCE.md](LICENCE.md).
