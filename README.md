# variantly

**N redesigns of your site, running side by side. Keep one. For agents and humans.**

Your site works. It just looks like every other site. variantly asks the coding
agent you already use to redesign it several times over, each time in a
different direction, using the [Impeccable](https://impeccable.style) design
skill. Every variant runs as your real site, on its own dev server, and you
flick between them with a 1…N picker and a before/after slider. When one is
right, variantly applies it to your working tree. Nothing touches your code
before that.

```sh
npx variantly
```

That opens a short wizard in your browser: where your app is and how it runs,
which agent to use, what you want, and how many variants. Then you watch the
agents work, and compare.

[SKILLS.md](SKILLS.md) is the version of these docs written for an agent.
There is a homepage too: **[variantly.tools](https://variantly.tools)**.

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

Impeccable already has [live mode](https://impeccable.style/docs/live/): select
one element in your running page, get variants of it, pick one. variantly is
the same idea one level up. The variants are whole redesigns (tokens, type,
layout, components, across every file that needs it), so they can't be swapped
inside one running page. Each lives in its own git worktree with its own dev
server, and a local proxy puts them next to each other.

Use variantly to choose a direction. Use `/impeccable live` afterwards to tune
the details of the one you kept.

It is not a hosted service. It has no account, no model and no server of its
own: it runs on your machine and drives your agent with your subscription or
API key.

## Install

There is nothing to install beyond Node 20.11+, git, and one agent CLI:

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
npx impeccable install --providers=claude --scope=global
```

No agent yet? `npx variantly --demo` runs the whole flow with a built-in demo
agent that applies crude fixed restyles: no AI and no account, just a way to
see how it works.

**From Claude Code**, add the plugin and let your agent drive it:

```
/plugin marketplace add highnet/ProjectHusky
/plugin install variantly@variantly
```

Run `npx variantly doctor` to check everything in one go.

## How it works

1. **Snapshot.** variantly records your current commit, including uncommitted
   edits to tracked files (`git stash create`, which touches nothing), as the
   base every variant starts from.
2. **Worktrees.** Each variant gets a git worktree in `~/.variantly/`, outside
   your project, so your editor, watchers and type checker never see them.
   Installed dependencies and env files are linked or copied in, so nothing
   reinstalls (except Next.js; see below).
3. **Agents.** Your agent runs headless in each worktree with a brief: variant
   *k* of *N*, a direction (Editorial, Swiss precision, Dark technical… or one
   Impeccable command per variant in Refine mode), your own words, and rules
   (keep content and behaviour; don't install packages, start servers or
   commit). Two run at a time by default. You can watch each one's log live.
4. **Preview.** Each finished variant gets its own dev server and a preview
   proxy that injects a tiny script for scroll and navigation sync and strips
   the headers that stop framing. HMR websockets pass straight through. Only
   the original plus the last few variants you looked at run at once.
5. **Compare.** Slider, single or side-by-side view. `1`–`9`, `0`, arrows to
   switch; both panes stay on the same page at the same scroll position.
6. **Keep.** The chosen variant's diff is applied to your working tree with
   git (three-way, so edits you made meanwhile are merged, not overwritten),
   unstaged for you to review. The other variants stay as `variantly/*`
   branches until `variantly clean`.

## Stacks

variantly runs your project's own dev server, so it works with anything that
has one. It detects these out of the box, at the repository root or up to two
levels down (`apps/web`, `frontend/`):

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

That covers the runtimes Impeccable Live supports plus the usual full-stack
setups: Next.js + shadcn, SvelteKit, Astro islands, FastAPI/Django with HTMX,
Laravel + Inertia, Wasp, Go/Rust APIs with a Vite frontend, Rails 8 and Nuxt.
The wizard shows the command and lets you rewrite it: `{port}` is the port,
`{port2}` a second free port, `{run}` your package runner, `{python}` your
virtualenv's Python.

**Known limits.** Next.js variants get a real dependency install, because
Turbopack refuses a linked `node_modules`; with pnpm or bun this is quick, with
npm it is not. Rust variants compile in their own target directories, so the
first build of each is slow. Servers that hard-code their port can't run more
than one copy; use a custom command or one variant at a time.

## Agents and cost

variantly never sees a model. It starts `claude -p`, `codex exec` or
`copilot -p` in each worktree, and that agent uses your account. **Every
variant is one full agent session**, so ten variants cost what ten redesign
sessions cost you. The wizard defaults to four.

Permissions: by default Claude Code runs with `acceptEdits` and a short list of
allowed tools, Codex with `--full-auto` (workspace-write sandbox) and Copilot
with `--allow-all-tools` minus `git push` and `rm`. Every agent works inside its
own worktree. "Full auto" in the wizard removes those limits; use it only in
projects you trust.

## Commands

```
variantly [dir]            open the wizard (default: the current directory)
variantly doctor [dir]     check node, git, agents, Impeccable, detected stack
variantly status [dir]     the current run as JSON
variantly keep <n> [dir]   apply variant n; the others stay as branches
variantly clean [dir]      remove every worktree, branch and state file

  --agent <id>   claude | codex | copilot | demo
  --count <n>    1–10
  --brief <txt>  what you want, in your words
  --yes          skip the wizard and start with detected defaults
  --demo         built-in demo agent, no AI
  --no-open      don't open a browser
  --port <n>     app port (default 4477)
```

## Safety

- Your working tree is not modified until you keep a variant. Variants live
  outside your project.
- The local app listens on `127.0.0.1` only, rejects requests whose `Host`
  isn't loopback (DNS rebinding), and requires an `X-Variantly` header on every
  POST, which a page on another site can't send.
- The preview proxy strips `X-Frame-Options` and CSP for the local preview
  only. Your project's headers are unchanged.
- Untracked files are not copied into variants, and `.env` files are copied,
  not linked, so an agent editing one can't change yours.

## Development

The CLI is plain JavaScript (ES modules, JSDoc types checked by `tsc`) with no
runtime dependencies and no build step. The homepage lives in [`site/`](site/).

```sh
npm install
npm run typecheck
npm test                 # node:test, including an end-to-end run with the demo agent
node bin/variantly.mjs --demo path/to/some/site
```

See [CONTRIBUTING.md](CONTRIBUTING.md). Commits follow
[Conventional Commits](https://www.conventionalcommits.org/); releases are cut
by release-please and published to npm with provenance.

## Credits

variantly is built on [Impeccable](https://impeccable.style) by Paul Bakaus
(Apache-2.0). It is independent and not affiliated with or endorsed by
Impeccable; see [NOTICE.md](NOTICE.md).

MIT © highnet. See [LICENCE.md](LICENCE.md).
