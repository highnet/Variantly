# variantly: the walkthrough (script v3, for review)

**Recorder:** `script.json` matches this script; the chat scene is flagged `pending` and skipped until #81 merges (it also needs a `chatDone` wait in record.mjs).

**What changed since v2:** five agents and OpenRouter (#71), the app's signature look (#79), keep restyles the whole site (#80), axe drops shown as "fixed" (#82), a new chat beat for PR #81 (film it once #81 merges), and mixing agents in one run (#92): the run is filmed as two variants from Claude Code and two from Gemini CLI. The intro, setup, brief and review are tighter to make room, so the film is shorter overall.

**Target:** 5:55 (5:25–6:25), 60 fps, 1080p captured at device scale 2, light and dark films identical apart from colour.
**Voice:** Joaquin (ElevenLabs), ~140 wpm, unhurried. About 800 words of narration.
**Arc:** problem → what it is → how it works → proof → adjust → keep (whole site) → what it costs → CTA.
**Every claim** is checked against the shipped app (ui-next, src/), README or a named PR; sources are in the appendix.

Legend: **VO** narration · **SHOT** picture · **GFX** motion graphics · **SFX/MUSIC** sound.
Chapter chip, top right throughout, in the app's signature look: the split mark, the violet accent, mono, condensed.

---

## 0 · Cold open (0:00–0:08)

**SHOT** No intro. Full-bleed compare view of Tallyboard, the slider sweeping once, then hard cuts on the beat: V01 → V02 → V03 → V04, about 1 s each. On the last cut, a fast whip through three *other* pages of the kept site (pricing, FAQ, sign-up), all in V04's look.
**GFX** Kinetic type, Martian Mono, centre, with the site's mismatched-typeface title reveal: **Four redesigns. Keep one. Your whole site follows.** Then `npx variantly`, typed.
**MUSIC** The bed starts on the first frame; a hit on each cut (SeekReel `stamp`), a riser into ch. 1.
**VO** (none)

## 1 · Hi (0:08–0:35)

**SHOT** The before site, scrolled slowly in the inset window. Lower third: **Joaquin · Variantly**.
**VO**
> Hi, I'm Joaquin from Variantly.
> This is Tallyboard. It works. It just looks like every other template, and redesigning it means picking one direction and hoping it was right.
> With Variantly, your own coding agent redesigns your site several times over, each in a different direction, and every redesign runs as your real site. You keep the one you like.

**GFX** Kinetic type on the last line, held 2 s: **Nothing changes until you keep one.**

## 2 · What you need (0:35–1:05)

**SHOT** A clean terminal card (GFX): `node -v`, then `npx variantly`. Beside it, a row of the five agent marks fading in one by one: Claude Code, Codex, Copilot, Gemini CLI, Cursor CLI, then a small "or any model via OpenRouter" tag. The browser opens on the wizard in the new look.
**VO**
> You need Node, and a coding agent you already use: Claude Code, Codex, Copilot, Gemini or Cursor. No subscription? Point Claude Code or Codex at OpenRouter.
> In your project, run npx variantly. It opens a wizard in your browser.
> The design work is done by Impeccable, an open-source design skill for coding agents. If your agent doesn't have it yet, Variantly installs it in one click.

**SHOT** The "Install Impeccable" blocker and button (filmed in a throwaway profile; see open question 1).
**GFX** Lower third: **Designs by Impeccable · impeccable.style**.

## 3 · Setup (1:05–1:35)

**SHOT** "Your setup". Punch-in on the checklist: app found, "Every agent in the mix is ready". Open "Use a different app or agent": spotlight the agent rows (Claude Code ×2, Gemini CLI ×2) with the callout *Each row can pick its own model*, a glance at "Hide who made each variant" (left off), then the dev command. Close it.
**VO**
> Setup finds your app and how to run it, checks your agent, and flags anything in the way. You can mix agents too: here, two variants from Claude Code and two from Gemini, for more variety. Each variant runs your dev command on its own port, and the agent may only edit files, in its own copy of your project.

## 4 · What to make (1:35–2:15)

**SHOT** "What should we make?". Click **4**. Pages: Home, then hover **All pages** and its hint (*keeping a variant restyles the rest of the site to match*). Hover the extras (tooltips visible). Open "More settings": Redesign/Refine, "Your own directions" showing "Impeccable picks". Close it.
**VO**
> Pick two, four or six variants. We'll take four, of the home page. That's fastest, and when you keep one, the rest of the site follows.
> Extras are optional Impeccable passes: sharper copy, motion, delight, a phone pass, or hardening for accessibility.
> Redesign gives every variant its own visual world; Refine keeps your look and improves it. Leave a direction blank and Impeccable picks one, or type your own.

## 5 · Brief and go (2:15–2:40)

**SHOT** "About your site": type the three answers (sped up 3×), punch-in on "What must stay?". Then "Ready when you are", spotlight the cost line, click **Make 4 variants**.
**VO**
> A few words about your site, and what must stay. Here: the prices, the sign-up button and the FAQ. Agents change presentation, never behaviour.
> The review shows exactly what runs, and how many sessions it uses on your own account. Make four variants.

**SFX** whoosh, riser.

## 6 · The run (2:40–3:45)

**6a Worktrees (2:40–2:55).** **SHOT** The board appears. **GFX** Diagram card: your repo → four git worktrees outside your project → four dev servers → one preview. Branches `variantly/<run>/v1…v4`.
> Each variant gets its own git worktree, outside your project, and its own dev server. Your checkout isn't touched.

**6b One agent, step by step (2:55–3:30).** **SHOT** Spotlight the readout first: *Claude ×2 · Gemini ×2*, with the callout *Spend adds up per agent*. Then three board columns only: Direction, Status, Usage. Open V01's terminal: about 6 s of readable agent lines in real time, then timelapse with the chip **▶▶ ~14 min, sped up 40×**. The step cell walks through the seven steps; V01's direction badge appears.
> The board shows every variant live. Here's one agent at work. It reads your site, lets Impeccable choose a direction, and builds it. Then it checks its variant in a real browser, at desktop and phone width, and fixes what it sees. A second pass critiques and audits it, without changing the direction.

**6c Failure is cheap (3:30–3:45).** **SHOT** Point at Stop and Retry.
> If one goes wrong, stop or retry it on its own. The others keep going.

**MUSIC** Denser through the timelapse; riser into compare.

## 7 · Compare (3:45–4:40)

**7a Slider (3:45–3:55).** **SHOT** Compare opens on V01; drag the divider across.
> Then compare, on your real site. Drag for a before and after.

**7b Walk the four (3:55–4:20).** **SHOT** Keys 1–4 (key-cap GFX), direction flag each time, with the made-by tag (Claude Code or Gemini CLI) in the corner label; side by side (s), phone (m), back.
> *(Written after the real take: one short sentence per variant, naming its real direction.)*
> The tag says which agent made each one. Switch with the number keys, see them side by side, or check the phone layout.

**7c Proof (4:20–4:40).** **SHOT** Press i: details drawer. Punch-in on "Against your original": only the change is shown, e.g. **Accessibility +10 · axe 20 fixed**, never the raw scores. SeekReel freeze-frame 1.5 s on it. Then a quick glance at the files-changed list.
> Every variant is scored against your original, on your machine. This one: accessibility up [N] points, and [M] axe issues fixed.
> *(N and M from the real take.)*

## 8 · Change it (4:40–5:05) *(needs PR #81)*

**SHOT** On V02, press **c**. The chat panel slides in with its suggestion chips. Type: *make the hero headline bigger, and the accent warmer*. The reply streams (sped up if long); the preview reloads with the change. Hold on before/after for 1 s.
**VO**
> Almost right? Tell the agent what to change. It edits that variant, and the change comes with it when you keep it.

## 9 · Keep (5:05–5:40)

**SHOT** Keep V02 → the dialog, punch-in on the checked box: *Restyle the rest of the site to match (one more agent run)*. Apply. Board timelapse of the rollout pass (chip **▶▶ sped up**). The kept screen: *Rolled out site-wide*. Then click through pricing, FAQ and sign-up, pages no variant ever redesigned, each now in V02's look.
**GFX** A terminal card: `git diff --stat` with real output, then `npx variantly clean`.
**VO**
> Keep the one you like. One last agent pass carries its look to every other page of your site, not just the ones you previewed.
> Variantly applies it to your working tree, merging with anything you've changed since. Nothing is committed: review it with git diff. The other variants stay as branches until you clean them up.

**GFX** Kinetic type: **Your code. Your call.**

## 10 · Wrap (5:40–5:55)

**SHOT** Slow pull-back across several pages of the kept site, tiled, all in one look.
> Variantly runs entirely on your machine, with the agent you already use. No account, no server, and it never sees a model.
> Try it with npx variantly.

**GFX** End card: the split mark · `npx variantly` · variantly.style. Smaller: **Designs by Impeccable · impeccable.style**. Bottom: music credit.
**MUSIC** Resolve, 1.5 s tail, fade.

---

## 60-second cut (LinkedIn)

Same footage, no new takes: cold open (0:08) → board timelapse (0:08) → compare slider + 1–4 (0:12) → "fixed" freeze (0:05) → chat edit (0:10) → keep + rollout + page click-through (0:12) → end card (0:05). VO: lines from ch. 1, 8 and 9 only. Burned-in captions on.

## Production notes

- **Look:** chapter cards, kinetic type, lower thirds and end card use the signature look from #79: split mark, soft violet accent, grainy-gradient ground, sentence case. Chapter cards use the site's mismatched-typeface title reveal.
- **Camera:** eased punch-ins and pull-backs with SeekReel `punchIn` and footage clips; inset window parallax ±6 px.
- **Spotlight:** dim the rest of the frame to 60% around the focused element, over the gradient ground.
- **Editing:** cut the takes with SeekReel footage edit lists (trims, speed, freezes, `xfade`). Freeze-frames on the "fixed" score and on the first never-redesigned page.
- **Clean data:** machine paths masked or replaced by GFX cards.
- **Capture:** CDP screencast at 60 fps, deviceScaleFactor 2, downsampled.
- **Sound:**
  - Music bed from SeekReel's cue engine (credited "Music: SeekReel").
  - Voiceover placed as cue-sheet `tracks` with SeekReel's native duck envelope (−10 dB), instead of a separate ffmpeg ducking step.
  - Master at −14 LUFS integrated, true peak ≤ −1 dBTP (two-pass loudnorm).
- **Voice:** ElevenLabs stability 0.55 / similarity 0.8 / style 0.1. Regenerate a line: `node voice.mjs <scene>`.
- **Captions:** .srt with word timings; burned in for the 60 s cut.
- **YouTube chapters:** 0:00 Cold open · 0:08 Hi · 0:35 What you need · 1:05 Setup · 1:35 What to make · 2:15 Brief and go · 2:40 The run · 3:45 Compare · 4:40 Change it · 5:05 Keep · 5:40 Wrap.
- **Thumbnail and poster:** "Keep one. Your whole site follows." over a 2×2 grid of the variants, both themes.
- **QA gate before publishing:** no on-screen typos; no dead air over 1 s; consistent cursor speed; every claim checked against the appendix; repeated frames in motion under 10%; both themes the same frame count.

## Recorder work (`script.json`, `record.mjs`)

- Scenes `promise`, `need`, `setup`: new terminal lines (drop `claude --version`), agent-mark row GFX.
- Scene `what`: hover the All pages toggle.
- `script.json` has `"mix": "claude:2,gemini:2"`: record.mjs starts variantly with `--agents` (a dry run uses `demo:2,demo:2`), so the wizard opens with the rows filled in. Scene `setup` spotlights `.mix` and the hide checkbox; scene `agent` spotlights the per-agent readout. A real take needs Claude Code and Gemini CLI both installed, signed in and with Impeccable.
- Merge the `about` and `review` scenes into `brief`.
- New scene `chat` (after #81 merges): `press c`, type, wait for the turn to finish and the preview to reload.
- Scene `keep`: assert the "Restyle the rest of the site" checkbox is checked, wait for the rollout to finish, then `goto` three non-redesigned routes.
- Scene `scores`: read the axe counts from the run for the N/M line.

## Open questions for you

1. **Impeccable install shot:** still recommend filming in a throwaway profile without Impeccable. OK?
2. **Chat beat:** film after #81 merges, or record everything else now and splice ch. 8 in later? (Recommended: splice later; ch. 8 is self-contained.)
3. **Agent row:** show the five agents' logos, or names only? Logos read faster but are other companies' marks.
4. **Failure/retry:** controls only (as scripted). The run budget goes to the rollout footage instead.
5. **Mixed run:** film the hero run as two Claude Code + two Gemini CLI (as scripted)? It shows off #92 but needs both agents signed in for the take; the fallback is all four on Claude and a 3 s insert of the mix rows.
6. **Impeccable credit wording:** unchanged from v2: "an open-source design skill for coding agents" plus the URL, no author named on screen.

## Appendix: claims and where they come from

- Agents: Claude Code, Codex CLI, Copilot CLI, Gemini CLI, Cursor CLI; OpenRouter via Claude Code or Codex (README, #71).
- Mixing agents: rows of agent, model and count; every agent must be ready before the run starts; made-by tags on board and compare; per-agent spend on the board; "Hide who made each variant" (Checkin.tsx, Board.tsx, Compare.tsx, #92, not merged yet).
- Impeccable install, Apache-2.0 (src/agents.mjs, NOTICE.md).
- Counts 2/4/6; extras; Redesign/Refine; "Impeccable picks"; browser check at desktop and phone width; review pass (Checkin.tsx, brief.mjs).
- All pages toggle and its hint "keeping a variant restyles the rest of the site to match"; route cap 40 (Checkin.tsx, #80).
- "Change presentation, not behaviour" (brief.mjs rules).
- Review line with session count, no dollar estimate (Checkin.tsx).
- Worktrees outside the project, branches `variantly/<run>/vN`, one dev server each (session.mjs, servers.mjs).
- Board, steps, Stop/Retry (Board.tsx, format.ts, steps.mjs, session.mjs).
- Compare keys 1–9/0, s, m, i; scores vs the original; files changed (Compare.tsx, Shell.tsx). axe drops shown as "fixed" (#82).
- Chat: `c` key, edits the variant on screen, committed to its branch so keeping it keeps the change (PR #81, not merged yet).
- Keep dialog checkbox "Restyle the rest of the site to match (one more agent run)", on by default, `--no-rollout` skips it; kept screen "Rolled out site-wide"; a failed rollout still keeps the variant (Compare.tsx, Kept.tsx, #80).
- Apply falls back to a three-way merge; unstaged, nothing committed; others stay as branches; `npx variantly clean` (git.mjs, Kept.tsx).
- No account, no server, never sees a model, runs locally (README).
