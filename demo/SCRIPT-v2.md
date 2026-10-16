# variantly: the walkthrough (script v2, for review)

**Target:** 6:30 (5:45–7:00), 60 fps, 1080p captured at device scale 2 (crisp text), light and dark films identical apart from colour.
**Voice:** Joaquin (ElevenLabs), ~140 wpm, unhurried. About 830 words of narration, ~6:00 spoken plus room to breathe.
**Arc:** problem → what it is → how it works → proof → keep → what it costs → CTA.
**Every claim** below is checked against the shipped app (ui-next, src/) or README; sources are in the appendix.

Legend: **VO** narration · **SHOT** picture · **GFX** motion graphics · **SFX/MUSIC** sound.
Chapter chip, top right throughout: `01 · Setup`, mono, condensed, the site's split-flap style.

---

## 0 · Cold open (0:00–0:07)

**SHOT** No intro. Full-bleed compare view of Tallyboard, the slider sweeping once, then hard cuts on the beat: V01 → V02 → V03 → V04 → back to the ugly original, about 1 s each.
**GFX** On the last cut, kinetic type, Martian Mono, centre: **Four redesigns. One command.** Then `npx variantly`, typed.
**MUSIC** The bed starts on the first frame; a hit on each cut (SeekReel `stamp`), and a riser into ch. 1.
**VO** (none)

## 1 · Hi (0:07–0:40)

**SHOT** The before site, scrolled slowly in the inset window. Lower third: **Joaquin · Variantly**.
**VO**
> Hi, I'm Joaquin from Variantly.
> This is Tallyboard. It works. It just looks like every other template on the internet, and redesigning it means picking one direction and hoping it was the right one.
> Variantly takes a different approach. Your own coding agent redesigns your whole site several times over, each in a different direction. Every redesign runs as your real site, side by side. You keep the one you like.

**GFX** Kinetic type on the last line, held 2 s: **Nothing changes until you keep one.**

## 2 · What you need (0:40–1:20)

**SHOT** A clean terminal card (GFX, not a real terminal): `node -v`, `claude --version`, then `npx variantly`. The browser opens on the wizard.
**VO**
> You need two things: Node, and Claude Code signed in. Codex and Copilot work too.
> In your project, run npx variantly. It opens a wizard in your browser.
> The design work itself is done by Impeccable, an open-source design skill for coding agents. If your agent doesn't have it yet, Variantly installs it for you in one click.

**SHOT** The "Install Impeccable" blocker and button (see open question 1).
**GFX** Lower third: **Designs by Impeccable · impeccable.style**.

## 3 · Setup (1:20–1:50)

**SHOT** "Your setup". Punch-in on the checklist: `Static HTML app found · repo root · variantly starts it`, then `Claude Code ready`. Open "Use a different app or agent" briefly: dev command, the original, dependencies, permissions "Edits only". Close it.
**VO**
> Setup finds your app and how to run it, checks your agent and Impeccable, and tells you anything that would get in the way.
> Each variant will run your dev command on its own port. By default the agent may only edit files, inside its own copy of your project.

## 4 · What to make (1:50–2:40)

**SHOT** "What should we make?". Click **4**. Pages: Home. Hover the extras (tooltips visible): Rewrite the copy, Add motion, Add delight, Polish for phones, Harden. Open "More settings": Approach Redesign/Refine, "Your own directions" slots showing "Impeccable picks", At a time 2, Servers live, the three "Around Impeccable" switches.
**VO**
> Pick how many variants: two, four or six. We'll take four, for the home page.
> Extras are optional Impeccable passes: sharper copy, motion, small moments of delight, a phone pass, or hardening for accessibility.
> Under more settings, Redesign gives every variant a different visual world, and Refine keeps your look and improves it. Leave a direction blank and Impeccable chooses one, or type your own.
> Two agents work at a time. Each one gets a real browser to check its own work, then a review pass critiques and fixes it, and everything is scored with axe-core and Lighthouse, on your machine.

## 5 · About your site (2:40–3:05)

**SHOT** "About your site". Type the three answers (short). Punch-in on "What must stay?".
**VO**
> Then a few words about your site: who it's for, what it offers, and, most importantly, what must stay. Here: the prices, the sign-up button and the FAQ.
> Agents change presentation, never behaviour: every page, form and piece of copy stays.

## 6 · Review (3:05–3:20)

**SHOT** "Ready when you are". Spotlight the cost line: *Uses 8 sessions on your Claude Code account. Your files aren't touched until you keep one.* Click **Make 4 variants**.
**VO**
> The review shows exactly what will run, and how many agent sessions it uses on your own account. Make four variants.

**SFX** whoosh, riser.

## 7 · The run (3:20–4:40)

**7a Worktrees (3:20–3:40).** **SHOT** The board appears. **GFX** A diagram card: your repo → four git worktrees outside your project → four dev servers → one preview. Branch names `variantly/<run>/v1…v4` (machine paths hidden).
> Each variant gets its own git worktree, outside your project, and its own dev server. Your checkout isn't touched.

**7b The board (3:40–3:55).** **SHOT** Spotlight the columns in turn: Variant, Direction, Status, Time, Files, Usage, Step. Readout: Elapsed, ready count, live usage.
> The board shows every variant live: its direction, status, the files it changed, and what it's using on your account as it goes.

**7c One agent, step by step (3:55–4:25).** **SHOT** Open V01's terminal. Hold on readable agent lines in real time (about 8 s), then timelapse with the chip **▶▶ ~14 min, sped up 40×**. The step cell walks: Reading the site → Choosing a direction → Building → Checking → Writing DESIGN.md → Saving. The direction badge appears with V01's real direction.
> Here's one agent at work. It reads your site, lets Impeccable choose a direction, and builds it. Then it opens its variant in a real browser, at desktop and phone width, and fixes what it sees. A second session reviews the result with Impeccable's critique and audit, and fixes the worst problems without changing the direction.

**7d Failure is cheap (4:25–4:40).** **SHOT** Point at Stop and Retry (no failure staged; just the controls).
> If a variant goes wrong, stop it or retry it on its own. The others keep going.

**MUSIC** The bed gets denser through the timelapse; riser into compare.

## 8 · Compare (4:40–5:50)

**8a Slider (4:40–4:55).** **SHOT** Compare opens on V01; drag the divider across. Before/After labels.
> Then compare, on your real site. Drag the divider for a before and after.

**8b Walk the four (4:55–5:25).** **SHOT** Keys 1, 2, 3, 4 (key-cap GFX on each press); the direction flag shows each time. Toggle side by side (s), then phone (m), then back.
> *(Written after the real take: one sentence per variant, naming its real direction. Placeholder:)*
> Variant one went [direction]. Two is [direction]. Three, [direction]. And four, [direction].
> Switch with the number keys, see them side by side, or check the phone layout.

**8c Scores (5:25–5:50).** **SHOT** Press i: the details drawer. Punch-in on "Scores · axe-core and Lighthouse": Accessibility, Performance, Best practices, SEO, axe violations, each against the original. The files-changed list.
> The details show what changed, file by file, and how each variant scores against your original for accessibility, performance, best practices and SEO.

## 9 · Keep (5:50–6:25)

**SHOT** Keep V02 → the dialog: *Apply V02 (…) to your working tree? N files. The others stay as branches.* → Apply → the kept screen.
**GFX** A terminal card: `git diff --stat` with real output from the take, then `npx variantly clean`.
> Keep the one you like. Variantly applies it to your working tree. If you've edited files since the run started, it merges with your changes. Nothing is committed: review it with git diff. The other variants stay as branches until you clean them up.

**GFX** Kinetic type: **Your code. Your call.**

## 10 · Wrap (6:25–6:50)

**SHOT** Slow pull-back from the kept site to the full grid of all four variants.
> Variantly runs entirely on your machine, with your own agent subscription. There's no account and no server, and it never sees a model.
> All you need is Node and Claude Code. Try it with npx variantly.

**GFX** End card: variantly logo · `npx variantly` · variantly.style. Below, smaller: **Designs by Impeccable · impeccable.style**. Bottom: music credit.
**MUSIC** Resolve, 1.5 s tail, fade.

---

## Production notes

- **Camera:** every chapter is built from eased punch-ins to the element under discussion and pull-backs, with SeekReel `punchIn` and footage clips. The inset window gets subtle parallax (±6 px against the cursor).
- **Spotlight:** dim the rest of the frame to 60% around the focused element on the board and in the dialogs.
- **Chapter cards:** 1.2 s, number plus title in Martian Mono, with a riser. The step chip stays visible.
- **Clean data:** machine paths are masked or replaced by a GFX card. The demo site content is plausible.
- **Capture:** CDP screencast at 60 fps, rendered at 60 fps. Capture at deviceScaleFactor 2 and downsample for crisp text (new: doubles capture cost; to be verified in a dry run).
- **Sound:**
  - Music bed composed in SeekReel's cue engine (generated, no licence needed; credited "Music: SeekReel").
  - Ducked 10 dB under the voice. UI ticks on clicks, whooshes on transitions, risers into chapters.
  - Master at −14 LUFS integrated, true peak ≤ −1 dBTP (ffmpeg loudnorm, two-pass).
- **Voice:** ElevenLabs settings stability 0.55 / similarity 0.8 / style 0.1. Regenerate any line that sounds off: `node voice.mjs <scene>`.
- **Captions:** a .srt with word timings. Burned-in captions optional (default on for the LinkedIn cut).
- **YouTube chapters** in `out/youtube-description.txt`: 0:00 Cold open · 0:07 Hi · 0:40 What you need · 1:20 Setup · 1:50 What to make · 2:40 About your site · 3:05 Review · 3:20 The run · 4:40 Compare · 5:50 Keep · 6:25 Wrap.
- **Thumbnail and poster:** "Four redesigns. One command." over a 2×2 grid of the variants, in both themes.
- **QA gate before publishing:**
  - no typos on screen;
  - no dead air over 1 s;
  - consistent cursor speed;
  - every claim checked against the appendix;
  - repeated frames in motion under 10%;
  - both themes the same frame count.

## Open questions for you

1. **Impeccable install shot.** On your machine Impeccable is already installed, so the "Install Impeccable" button won't appear. Options:
   - (a) film it in a throwaway user profile without Impeccable (recommended);
   - (b) show a GFX recreation;
   - (c) cut the shot and keep the line.
2. **Walking the four variants.** The narration names each real direction, so it's written after the take, then re-voiced. OK?
3. **Length.** At 6:30, is the cold open plus intro (0:40) right, or do you want a 60–90 s cut-down too (same footage, for LinkedIn)?
4. **Impeccable credit wording.** "an open-source design skill for coding agents" plus the URL, with no author named on screen. OK, or do you want "by Paul Bakaus", as the site's fine print has it?
5. **Failure/retry.** Show the controls only (as scripted), or stage a real failed variant? Staging one costs an extra run.

## Appendix: claims and where they come from

- Agents: Claude Code, Codex CLI, Copilot CLI (README). Impeccable install command: `npx impeccable install --providers=… --scope=global` (src/agents.mjs:390). Impeccable is Apache-2.0 (NOTICE.md).
- Counts 2/4/6, default 4. At a time defaults to 2. "about 10–20 minutes" per variant (Checkin.tsx variants hint).
- Extras and their meanings, Redesign/Refine, "Your own directions… Impeccable picks", the browser check at desktop and phone width, the review pass (critique and audit, fixes the worst, keeps the direction), scores on your machine (Checkin.tsx:30-34, brief.mjs).
- "Change presentation, not behaviour": every route, copy, form field and handler kept (brief.mjs rules).
- Review line "Uses N sessions on your … account. Your files aren't touched until you keep one." (Checkin.tsx). No dollar estimate is shown.
- Worktrees outside the project, branches `variantly/<run>/vN`, one dev server each (session.mjs, servers.mjs).
- Board columns, the 7 steps, Stop/Retry (Board.tsx, format.ts, steps.mjs, session.mjs).
- Compare: keys 1–9/0, ← →, o, s, m, i; details scores vs the original; files changed (Compare.tsx, Shell.tsx).
- Keep: plain apply, falling back to a three-way merge with your edits; unstaged, nothing committed; others stay as branches; `npx variantly clean` (git.mjs, Kept.tsx).
- No account, no server, never sees a model, runs locally (README).
