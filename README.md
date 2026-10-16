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

You need **one** of these, signed in:

| Agent | Install |
| --- | --- |
| Claude Code | `npm install -g @anthropic-ai/claude-code` |
| Codex CLI | `npm install -g @openai/codex` |
| GitHub Copilot CLI | `npm install -g @github/copilot` |

and Impeccable installed for it (the wizard offers to run this for you):

```sh
npx impeccable install --providers=claude --scope=global --yes --no-hooks   # or codex, or copilot
```

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

**Claude Code plugin** alternative:

```
/plugin marketplace add highnet/ProjectHusky
/plugin install variantly@variantly
```

**Check everything:** `npx variantly doctor`.

## How it works

`npx variantly` opens a four-step wizard in your browser:

1. **Setup.** Confirms the detected app and agent (installed, signed in,
   Impeccable present); switch either if needed.
2. **Designs.** How many (**2, 4 or 6**), which pages, optional extras.
3. **Your site.** Who it's for, what it offers, what must stay, plus any
   notes. Skipped if you have a `PRODUCT.md`.
4. **Review.** A summary with Edit links and the session cost; **Make designs**
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
| Reflex | `reflex run --frontend-port {port}` |
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

- **variantly never sees a model.** It starts `claude -p`, `codex exec` or
  `copilot -p` per worktree, on **your account**.
- **One variant = one full agent session.** Ten variants cost ten sessions.
  **Default: four.**
- **Live board** from each agent's structured events: files read/edited,
  commands, skills, summaries.
- **Usage as reported:** Claude Code shows **dollars**, Codex/Copilot show
  **tokens**. variantly **never estimates** a price.

**Default permissions**

- **Claude Code** runs with `--permission-mode acceptEdits` and a short list of
  allowed tools;
- **Codex** runs `codex exec --sandbox workspace-write` with
  `approval_policy=never` (it can write only its worktree; nothing waits for
  an approval);
- **Copilot** runs `copilot -p --allow-all-tools --no-ask-user` with
  `git push`, `git commit` and `rm` denied, and file access limited to the
  worktree, the brief and your user-wide skills (`--add-dir`).

- **"Full auto"** removes those limits (`--dangerously-skip-permissions`,
  `--dangerously-bypass-approvals-and-sandbox`, `--allow-all`). **Trusted projects only.**
- **Browser check on:** each agent gets the `playwright` MCP server
  (`--mcp-config` + `mcp__playwright` allowed for Claude Code;
  `-c mcp_servers.playwright.*` for Codex; `--additional-mcp-config` for
  Copilot), **headless** and `--isolated`: **no shared browser profile**.

## Commands

```
variantly [dir]            open the wizard (default: the current directory)
variantly doctor [dir]     check node, git, agents, Impeccable, detected stack
variantly status [dir]     the current run as JSON
variantly keep <n> [dir]   apply variant n; the others stay as branches
variantly clean [dir]      remove every worktree, branch and state file
variantly install-skill    put the variantly skill where your agents read skills

  --agent <id>   claude | codex | copilot | demo
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
