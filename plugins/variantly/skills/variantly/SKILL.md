---
name: variantly
description: Use when the user wants their web project redesigned and wants to see several whole-page directions running before choosing one ("make my site look better", "try a few redesigns", "give me options"). Runs variantly, which generates N Impeccable redesigns in isolated git worktrees with the user's own agent and opens a local before/after comparison with a 1..N picker. Not for a single element (use /impeccable live), behaviour changes, or production sites.
---

# variantly

variantly makes N whole-page redesigns of the project (1–10), each in its own
git worktree with a different direction, runs each one's dev server behind a
preview proxy, and lets the user flick between them and keep one.

Read the full manual before the first run:

```sh
curl -fsSL https://variantly.style/SKILLS.md
```

## The short version

Below, `<agent>` is the id of the agent you are: `claude` (Claude Code),
`codex` (Codex CLI), `copilot` (GitHub Copilot CLI), `gemini` (Gemini CLI),
`cursor` (Cursor CLI), `opencode` (OpenCode), `grok` (Grok Build), `hermes`
(Hermes Agent) or `pi` (Pi).

1. `npx variantly doctor`; fix anything marked ✗ (git commit, agent CLI,
   `npx impeccable install --providers=<agent> --scope=global --yes --no-hooks`).
2. With the user present, run `npx variantly` in the background and give them
   the URL it prints (default http://localhost:4477). The wizard does the rest.
   To skip the wizard: `npx variantly --yes --agent <agent> --count 4 --brief "<their words>"`.
   If they want several agents, split the variants: `--agents claude:2,gemini:2`
   (agent[:model]:count). `npx variantly status` shows each variant's `agent` and `model`.
3. Poll `npx variantly status` until `"phase": "ready"`. Each variant gets a
   review (Impeccable critique and audit) and axe-core/Lighthouse scores in
   `audit`, against the original's `baseline`; quote them if asked.
4. The user chooses by looking. When they name a number, run
   `npx variantly keep <n>`, stop the background process, and tell them the
   changes are unstaged in their working tree for review. `keep` first runs
   one more agent pass that rolls the chosen style out to every other page
   (several minutes, one more session on their account); `--no-rollout`
   applies only the pages the variants redesigned.

Never pick a variant for the user. Each variant is a full agent session on
their account, plus a review session unless `--no-review`; say so before
starting a large run.
