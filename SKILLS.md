# variantly — a skill file for agents

What this is: the operating manual for driving variantly, without the
homepage's pitch or the README's prose. Fetch the latest copy at any time:

```sh
curl -fsSL https://variantly.style/SKILLS.md
```

(or `https://raw.githubusercontent.com/highnet/variantly/main/SKILLS.md`)

If you are a person, the README is friendlier and
[variantly.style](https://variantly.style) is friendlier still.

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

There are no preset themes: variantly has no theme library or templates. Each
direction is either the person's own words or one Impeccable rolls fresh for
that variant, and the agent designs it from scratch for this project.

Use it when someone asks for their site to "look better", "get a redesign",
or "try a few directions", and they can look at a browser. Do not use it for
behaviour changes, for a single element (that is `/impeccable live`), or on a
deployed production site.

## Installing this skill

`npx variantly install-skill` writes the short form of this manual as a skill
for every agent on the PATH, so the agent knows to reach for variantly when
someone asks for a redesign. One `SKILL.md` serves every supported agent.

```sh
npx variantly install-skill                                   # agents on PATH, user-wide
npx variantly install-skill --providers=claude                # ~/.claude/skills/variantly/
npx variantly install-skill --providers=codex                 # ~/.agents/skills/variantly/
npx variantly install-skill --providers=copilot               # ~/.copilot/skills/variantly/
npx variantly install-skill --providers=gemini                # ~/.gemini/skills/variantly/
npx variantly install-skill --providers=cursor                # ~/.cursor/skills/variantly/
npx variantly install-skill --providers=opencode              # ~/.config/opencode/skills/variantly/
npx variantly install-skill --providers=grok                  # ~/.grok/skills/variantly/
npx variantly install-skill --providers=hermes                # ~/.hermes/skills/variantly/
npx variantly install-skill --providers=pi                    # ~/.pi/agent/skills/variantly/
npx variantly install-skill --providers=antigravity           # ~/.gemini/antigravity-cli/skills/variantly/
npx variantly install-skill --providers=codex --scope=project # .agents/skills/variantly/ in the repo
```

Project scope writes `.claude/skills/`, `.agents/skills/`, `.github/skills/`,
`.gemini/skills/`, `.cursor/skills/`, `.opencode/skills/`, `.grok/skills/`, `.hermes/skills/` or `.pi/skills/` in the repository, for everyone who clones it. Running it again updates the
file in place. Claude Code can also use the plugin:
`/plugin marketplace add highnet/variantly` then
`/plugin install variantly@variantly`. Restart the agent after installing.

## Requirements

- Node 20.11 or newer, git, and a repository with at least one commit.
- One agent CLI on `PATH`, signed in: `claude`, `codex`, `copilot`, `gemini`,
  `cursor-agent`, `opencode`, `grok`, `hermes`, `pi` or `agy` (Antigravity). Claude Code and Codex may be pointed at OpenRouter instead
  (README, "Using OpenRouter"); that counts as signed in.
- The Impeccable skill installed for that agent:
  `npx impeccable install --providers=<claude|codex|copilot|gemini|cursor|opencode|grok|hermes|pi|antigravity> --scope=global --yes --no-hooks`.
  The wizard checks this and can run it. Where each agent looks: Claude Code
  `~/.claude/skills`, `.claude/skills`; Codex `~/.agents/skills`,
  `.agents/skills`; Copilot `~/.copilot/skills`, `~/.agents/skills`,
  `.github/skills`, `.agents/skills`, `.claude/skills`; Gemini `~/.gemini/skills`,
  `~/.agents/skills`, `.gemini/skills`, `.agents/skills`; Cursor
  `~/.cursor/skills`, `~/.agents/skills`, `~/.claude/skills` and the same three
  in the project; OpenCode `~/.config/opencode/skills`, `~/.agents/skills`,
  `~/.claude/skills`, `.opencode/skills`, `.agents/skills`, `.claude/skills`;
  Grok Build `~/.grok/skills`, `~/.agents/skills`, `~/.claude/skills` and
  `.grok/skills`, `.agents/skills`, `.claude/skills`; Hermes Agent
  `~/.hermes/skills` (`$HERMES_HOME/skills`) only, since one-shot runs never
  read an untrusted project's skills; Pi `~/.pi/agent/skills`,
  `~/.agents/skills`, `.pi/skills`, `.agents/skills`; Antigravity CLI
  `~/.gemini/antigravity-cli/skills`, `.agents/skills`, `.agent/skills`
  (Impeccable's own global install for it lands in `~/.gemini/config/skills`;
  variantly copies it into each worktree's `.agents/skills`).
- A project whose dev server can be told its port (`{port}` in the command,
  or a `PORT` environment variable). Static HTML needs nothing.

## Commands

```sh
npx variantly                    # open the wizard for the repo containing .
npx variantly path/to/app        # ... for another folder
npx variantly doctor             # check node, git, agents, Impeccable, stack
npx variantly status             # the current run as JSON
npx variantly keep 3             # restyle the rest of the site in variant 3's style, apply it
npx variantly keep 3 --no-rollout # apply variant 3 as built, its redesigned pages only
npx variantly clean              # remove every variantly worktree, branch, state
npx variantly install-skill      # put the variantly skill where your agents read skills
```

Flags for the default command: `--agent claude|codex|copilot|gemini|cursor|opencode|grok|hermes|pi|antigravity|demo`,
`--agents <agent[:model]:count,...>` (split the variants across agents and
models, e.g. `claude:opus:2,gemini:2`; every agent must be installed and signed
in), `--blind` (hide who made each variant until one is kept), `--count 1..10`, `--brief "<text>"`, `--yes` (skip the wizard and start
generating with detected defaults), `--demo` (the built-in demo agent: no AI,
crude fixed restyles, for trying the flow), `--no-open`, `--port <n>`.

## The agent's job, step by step

1. Run `npx variantly doctor` in the project. Fix what it marks `✗`: a missing
   commit (`git add -A && git commit -m "Before variantly"`), a missing agent,
   or a missing Impeccable install. Use your own id in what follows:
   `claude`, `codex`, `copilot`, `gemini`, `cursor`, `opencode`, `grok`, `hermes`, `pi` or `antigravity`.
2. Start a run. With the person present: `npx variantly` and let them use the
   wizard. Without the wizard:

   ```sh
   npx variantly --yes --agent claude  --count 4 --brief "warmer, less corporate"
   npx variantly --yes --agent codex   --count 4 --brief "warmer, less corporate"
   npx variantly --yes --agent copilot --count 4 --brief "warmer, less corporate"
   npx variantly --yes --agent gemini  --count 4 --brief "warmer, less corporate"
   npx variantly --yes --agent cursor  --count 4 --brief "warmer, less corporate"
   npx variantly --yes --agent opencode --count 4 --brief "warmer, less corporate"
   npx variantly --yes --agent grok    --count 4 --brief "warmer, less corporate"
   npx variantly --yes --agent hermes  --count 4 --brief "warmer, less corporate"
   npx variantly --yes --agent pi      --count 4 --brief "warmer, less corporate"
   npx variantly --yes --agent antigravity --count 4 --brief "warmer, less corporate"
   ```

   This prints the app URL (default `http://localhost:4477`) and keeps running.
   Run it in the background; it must stay alive while the person compares.
3. Tell the person the URL and what they will see: their site on the left of a
   slider, a variant on the right, `1`–`9`/`0` to switch variants.
4. Poll `npx variantly status` (a file read; cheap) until `phase` is `ready`.
   Each variant has `status` (`reviewing` during the Impeccable critique and
   audit pass), `summary`, `review`, `files` and `error`, and once scored an
   `audit` with Lighthouse scores and axe-core violations; the original's is
   `baseline`. Quote the scores when the person asks which is best, but the
   choice is still theirs. `--no-browser`, `--no-review` and `--no-audit` turn
   the checks off.
5. Let the person choose. Never choose for them unless they told you which.
   When they name one: `npx variantly keep <n>`, then stop the background
   `variantly` process. `keep` first runs one more agent pass that carries
   the chosen style to every other page, so it takes a while; the person's
   working tree then has the whole restyle, unstaged, for them to review and
   commit.
6. If `keep` reports dependency changes, run their install command. If it
   reports conflicts, the files contain conflict markers to resolve.

## What it costs and how long it takes

Each variant is one full agent session on the person's account, with the
usage that implies; a real redesign is a long session, not a quick edit. Two
run at a time by default (`concurrency`), so wall-clock time is roughly the
variant count divided by two, times one session. The app streams every agent's
progress (files edited, commands run, skills loaded) from each CLI's JSON
event stream. Usage appears only as the agent reports it: Claude Code reports
each session's dollar cost, Codex and Copilot report tokens (in `status` as
`usage`); variantly never estimates a price. A
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
POST /api/sync             re-read the run after `variantly keep`/`clean` in a
                           terminal; { change, state }, change null if none
GET  /api/detect           detected stacks, agents, defaults
POST /api/generate         start a run (body: the wizard's config)
POST /api/ensure/v3        start variant 3's dev server
POST /api/retry/3          retry a failed variant
POST /api/cancel/3         stop a running variant
POST /api/audit/v3         score variant 3 again (or audit/original)
POST /api/finalize/3       keep variant 3
POST /api/discard          throw the run away
GET  /api/events           server-sent events: state, server, log, notice
```
