# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Developers and indie hackers whose site works but looks generic: a default
shadcn dashboard, a template landing page, a Bootstrap-era admin. They already
use a coding agent CLI (Claude Code, Codex CLI or GitHub Copilot CLI) and want
a real redesign without hiring a designer or hand-prompting the agent through
ten attempts. A second audience is the agents themselves: an agent that has
been asked to "make this look better" should be able to find, install and
drive variantly on its own.

The job: go from "this looks bland" to a chosen, applied redesign in one
sitting, having actually seen the alternatives running.

## Product Purpose

variantly is a command-line tool that opens a local web app. A short wizard
configures the run; the user's own agent then produces N whole-page redesigns
of their site (1 to 10), each with the Impeccable design skill and each in a
different direction. Every variant runs as the real site on its own dev
server. The user flicks between them with a 1…N picker, compares any of them
against the original with a before/after slider, and keeps one; variantly
applies that variant's changes to their working tree.

Success: the user keeps a variant and never thinks about variantly again
until the next redesign.

## Positioning

Whole-page variants, live. Impeccable Live (`/impeccable live`) lets you pick
one element in a running page and choose between versions of it. variantly is
the same idea one level up: complete redesigns of the site, running as real,
clickable apps side by side, with a before/after slider. It is an extension
of Impeccable, not a competitor: Impeccable does the design work inside each
variant, and after picking one, `/impeccable live` is the natural next step
for element-level tuning.

## Operating Context

- Runs on the user's machine: `npx variantly` in a git repository.
- Inference is the user's own: variantly drives the agent CLI they already
  have, signed in with their own account or key. variantly brings no model,
  no account and no server.
- Each variant lives in its own git worktree outside the project folder, so
  nothing touches the user's source until they pick one.
- Previews go through a local proxy, so any stack with a dev server works,
  including servers without HMR (Laravel, Rails, Django, Go, Rust).
- Supported stacks: Impeccable Live's seven (Vite, Next.js, SvelteKit, Astro,
  Nuxt, Bun, static HTML) plus Laravel/Inertia/Livewire, Rails 8/Hotwire,
  Django, FastAPI, Reflex, Go (Templ, HTMX), Rust (Axum), Wasp, and a custom
  command for anything else.
- Agents also read SKILLS.md and the site's agent view.

## Capabilities and Constraints

- 1–10 variants per run; generation concurrency and the number of live dev
  servers are capped (defaults 2 and 3) to keep laptops usable.
- Approaches: Redesign (a new visual world per variant) or Refine (one
  Impeccable command per variant: polish, bolder, typeset, ...).
- A demo agent (no AI) exists for trying the flow and for testing.
- Finalize applies the chosen diff with git; other variants stay as branches
  until `variantly clean`.
- Requires git and at least one commit. Untracked files are not copied into
  variants.
- Cost is the user's agent usage: one agent session per variant.

## Brand Commitments

- Name: variantly (lowercase). Domain: variantly.style.
- Voice matches the author's other tools (Seekreel, Rallypoint, Codewright):
  plain, specific and honest. Say what it costs, what it won't do and where it
  can fail. No hype, no superlatives.
- Every public surface has a human/agent fork ("I'm a human" / "I'm an
  agent") and an agent-readable SKILLS.md.
- Each of the author's tools has its own distinct visual world; variantly must
  not borrow Rallypoint's or Seekreel's look.
- Credit Impeccable (Apache-2.0, by Paul Bakaus) clearly; never imply
  endorsement or use its marks as variantly's.

## Evidence on Hand

- None yet: no users, testimonials, download counts, benchmarks or press.
  Never fabricate any of them. Demonstrations must be real runs (the demo agent
  or a real agent run on a real project).

## Product Principles

1. Show, don't describe: real running variants beat screenshots and mockups.
2. Nothing lands until you choose: the user's tree is untouched until finalize.
3. Bring your own agent: variantly orchestrates; it never sells inference.
4. Honest about cost and failure: every variant is an agent session; a failed
   variant says why and can be retried.
5. Humans and agents are both first-class users.

## Accessibility & Inclusion

The local app must be fully keyboard-operable (picker shortcuts, focusable
slider) and meet WCAG 2.2 AA contrast in its own chrome.
