# variantly — a skill file for agents

What this is: the operating manual for driving variantly, without the
homepage's pitch or the README's prose. Fetch the latest copy at any time:

```sh
curl -fsSL https://variantly.tools/SKILLS.md
```

(or `https://raw.githubusercontent.com/highnet/ProjectHusky/main/SKILLS.md`)

If you are a person, the README is friendlier and
[variantly.tools](https://variantly.tools) is friendlier still.

## In one paragraph

variantly produces N whole-page redesigns of a web project (1–10) and lets a
person choose one by looking at them running. For each variant it makes a git
worktree outside the project, starts a coding agent (Claude Code, Codex CLI or
GitHub Copilot CLI, whichever the person has) in it with a brief that asks for
a design in one named direction using the
[Impeccable](https://impeccable.style) skill, commits the result to a branch,
and runs that worktree's own dev server behind a local preview proxy. A local
web app shows the original and every variant with a before/after slider and a
1…N picker. Keeping one applies its diff to the working tree with git; the rest
stay as branches. variantly brings no model: every variant is one session of
the person's own agent, on their account.

Use it when someone asks for their site to "look better", "get a redesign",
or "try a few directions", and they can look at a browser. Do not use it for
behaviour changes, for a single element (that is `/impeccable live`), or on a
deployed production site.

## Requirements

- Node 20.11 or newer, git, and a repository with at least one commit.
- One agent CLI on `PATH`, signed in: `claude`, `codex` or `copilot`.
- The Impeccable skill installed for that agent:
  `npx impeccable install --providers=<claude|codex|copilot> --scope=global`.
  The wizard checks this and can run it.
- A project whose dev server can be told its port (`{port}` in the command,
  or a `PORT` environment variable). Static HTML needs nothing.

## Commands

```sh
npx variantly                    # open the wizard for the repo containing .
npx variantly path/to/app        # ... for another folder
npx variantly doctor             # check node, git, agents, Impeccable, stack
npx variantly status             # the current run as JSON
npx variantly keep 3             # apply variant 3, discard the others' worktrees
npx variantly clean              # remove every variantly worktree, branch, state
```

Flags for the default command: `--agent claude|codex|copilot|demo`,
`--count 1..10`, `--brief "<text>"`, `--yes` (skip the wizard and start
generating with detected defaults), `--demo` (the built-in demo agent: no AI,
crude fixed restyles, for trying the flow), `--no-open`, `--port <n>`.

## The agent's job, step by step

1. Run `npx variantly doctor` in the project. Fix what it marks `✗`: a missing
   commit (`git add -A && git commit -m "Before variantly"`), a missing agent,
   or a missing Impeccable install.
2. Start a run. With the person present: `npx variantly` and let them use the
   wizard. Without the wizard:

   ```sh
   npx variantly --yes --agent claude --count 4 --brief "warmer, less corporate"
   ```

   This prints the app URL (default `http://localhost:4477`) and keeps running.
   Run it in the background; it must stay alive while the person compares.
3. Tell the person the URL and what they will see: their site on the left of a
   slider, a variant on the right, `1`–`9`/`0` to switch variants.
4. Poll `npx variantly status` (a file read; cheap) until `phase` is `ready`.
   Each variant has `status`, `summary`, `files` and `error`.
5. Let the person choose. Never choose for them unless they told you which.
   When they name one: `npx variantly keep <n>`, then stop the background
   `variantly` process. Their working tree now has that variant's changes,
   unstaged, for them to review and commit.
6. If `keep` reports dependency changes, run their install command. If it
   reports conflicts, the files contain conflict markers to resolve.

## What it costs and how long it takes

Each variant is one full agent session on the person's account, with the
usage that implies; a real redesign is a long session, not a quick edit. Two
run at a time by default (`concurrency`), so wall-clock time is roughly the
variant count divided by two, times one session. The app streams every agent's
progress, and with Claude Code it shows each session's cost when it ends. A
variant that fails says why in `status` and can be retried from the app
without redoing the others.

Only the original plus the last few viewed variants run dev servers at once
(default 3), so a ten-variant run does not start ten servers.

## Things that go wrong

- **"not inside a git repository" / "no commits yet."** variantly needs git.
  Initialise and commit.
- **Untracked files are missing in the variants.** Worktrees contain committed
  and modified tracked files only. Commit or stage what the site needs.
- **A variant's server never answers.** The dev command must use `{port}` or
  read `PORT`. Edit the command in the wizard; `{run}` is the package runner,
  `{python}` the project's interpreter, `{port2}` a second free port.
- **Next.js variants take a minute to start.** Turbopack does not accept linked
  `node_modules`, so Next variants get a real install (fast with pnpm or bun).
- **Wasp** serves on fixed ports, so its variants are previewed one at a time.

## Stacks

Vite, Next.js, SvelteKit, Astro, Nuxt, Bun and static HTML (the runtimes
Impeccable Live supports), plus Laravel (Inertia or Livewire), Rails 8,
Django, FastAPI, Reflex, Go (Templ, HTMX), Rust (Axum), Wasp, and any other
server through a custom command. Detection looks at the repository root and two
levels below it, so `apps/web` or `frontend/` is found.

## Local API

The app's JSON API is on the same port. Every POST needs the header
`X-Variantly: 1`; requests with a non-loopback `Host` are refused.

```
GET  /api/state            the run, servers included
GET  /api/detect           detected stacks, agents, defaults
POST /api/generate         start a run (body: the wizard's config)
POST /api/ensure/v3        start variant 3's dev server
POST /api/retry/3          retry a failed variant
POST /api/cancel/3         stop a running variant
POST /api/finalize/3       keep variant 3
POST /api/discard          throw the run away
GET  /api/events           server-sent events: state, server, log
```
