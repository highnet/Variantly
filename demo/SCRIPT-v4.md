# variantly: the walkthrough (script v4, for review)

**Recorder:** `script.json` matches this script scene for scene (scene ids in brackets). The chat scene stays flagged `pending` until #81 merges.

**What changed since v3**

- **Ten concepts, live.** The run makes ten variants, five agents at a time, each pinned to one of this season's design trends through "Your own directions". The season is context, said once; the content is what each trend looks like.
- **A teaching format.** Calm, short sentences, the why before the how, a "what you'll learn" card up front, a mental-model diagram, one "pause and think" beat and a recap. Holds are longer (`PAD_MS` 400 → 700 ms) and the voice is calmer (stability 0.62, style 0.05, speed 0.95).
- **Design reasoning, where it shows.** Joaquin explains the decisions behind the screens as they appear (review screen, progressive disclosure, real-site compare, site-wide keep), in a senior UI/UX register: one or two precise terms per beat, each said plainly.
- **Combining agents** gets its own beat with the why (#92). The take itself stays on Claude Code.
- **One card system.** Every explanatory graphic (learn, model and run diagrams, agents, trends, pause, facts, recap) is drawn by `stage/cards.mjs` in one flat language, built node by node on the word the voice says.
- **Pronunciation layer.** Captions keep the written words; the voice reads aliases from `pronunciations.json` (npx → "N P X", WCAG → "wuh-kag"…). `npm run voice:lint` fails on any unlisted risky word.

**Target:** 9:05 (8:45–9:30) without the chat beat, about 9:15 with it. v3 ran 5:55. The extra three minutes are the format the owner asked for: the learn/model/recap cards (~1:00), the directions chapter (~0:45), the combining beat (~0:20), six more variants in the compare walk (~0:25) and the pause beat with its five silent seconds (~0:30). Every chapter still fits in under 45 s, so the film stays skimmable by chapter, and the 60-second and designer's cuts below carry the short versions.
**Format:** 60 fps, 1080p captured at device scale 2, light and dark films identical apart from colour; 16:9 and 9:16.
**Voice:** Joaquin (ElevenLabs), ~133 wpm at speed 0.95. About 1,260 words.
**Arc:** problem → what you'll learn → mental model → setup (agents, combined) → what to make → your own directions → review → run → compare → pause and think → proof → keep (whole site) → rigour → recap → CTA.

Legend: **VO** narration · **SHOT** picture · **GFX** card or overlay · **SFX/MUSIC** sound. Chapter chip top right throughout.

---

## 0 · Cold open (0:00–0:09) [cold]

**SHOT** No intro. Fast cuts on the beat through the ten variants from the compare chapter (0.6 s each, keys 1…9, 0), then a hold.
**GFX** Kinetic type: **Ten redesigns: tactile, surreal, cinematic, collage… Keep one.** Then `npx variantly`, typed.
**MUSIC** Bed from frame one; a hit on each cut; riser into ch. 1.

## 1 · Why (0:09–1:19)

**1a Problem (0:09–0:36) [hi].** **SHOT** Tallyboard, the before site, scrolled slowly. Lower third **Joaquin · Variantly**.
> Hi, I'm Joaquin, the designer behind Variantly. Redesigning a site usually means betting on one direction. If it's wrong, you start over. Variantly is for developers who already use a coding agent, and for designers exploring directions. Your agent builds several complete redesigns at once, each one running as your real site, and you keep the one you like.

**1b What you'll learn (0:36–0:56) [learn].** **GFX** Learn card, four lines appearing on their words; the newest line takes the accent marker.
> In this video, you'll learn how to set up a run, give each variant its own direction, compare the results on your real site, and keep one. By the end, you'll have ten redesigns of a real site, and one of them applied.

**1c Mental model (0:56–1:19) [model].** **GFX** Flow diagram, one node per phrase: Your project → Copies (git worktrees) → Previews (one dev server each) → Compare → Keep → Rollout.
> First, the mental model. Your project stays exactly where it is. Each variant is a separate copy, an isolated git worktree, with its own preview server. You compare the previews side by side. You keep one. And one last pass rolls it out to the rest of the site.

## 2 · What you need (1:19–1:53) [need]

**SHOT** Terminal card: `node -v`, the five agents, `npx variantly`. The wizard opens. (Real take: "Install Impeccable" if `--fresh-impeccable`.)
**GFX** Lower third at 18 s: **Designs by Impeccable · impeccable.style**.
> You need two things: Node, and a coding agent you already use. In your project folder, run npx variantly. It opens a wizard in your browser. The design work is done by Impeccable, an open-source design skill for coding agents. If your agent doesn't have it yet, Variantly installs it in one click. One thing to watch: it has to be the command-line agent. Browser builders like Lovable or Bolt can't run on your machine.

## 3 · Setup (1:53–2:32)

**3a Agents (1:53–2:14) [setup].** **SHOT** Checklist (app found, agent ready). Open "Use a different app or agent"; spotlight the Agent list (*One agent, or several in one run.*), then the **Add another agent** button (*Split the variants across agents and models.*). Not clicked: the take stays on Claude Code.
> Setup finds your app and how to run it, and checks your agent. For this demo, I'm using the Claude Code CLI. You could switch to Codex, Copilot, Gemini or Cursor, or any model on OpenRouter. And you can combine them in one run.

**3b Why combine (2:14–2:32) [combine].** **GFX** Mix card in the wizard's own row shape (agent · model · count): **Claude Code · opus · 5** and **Gemini CLI · the agent's default · 5**, footed *10 variants in all, the most there can be. OpenRouter models run through Claude Code or Codex.* The three reasons land as rows on "instincts", "different" and "accounts". Behind the card: the dev command, close the drawer, continue.
> Why combine agents? Each model has its own design instincts. So you get more genuinely different directions, you see which model designs best for your site, and you can spread the work across accounts you already pay for.

## 4 · What to make (2:32–3:02) [make]

**SHOT** "How many variants?" with the 2/4/6 quick picks; click **6**. Open **More settings**; punch in on the **Variants** stepper and step 6 → 10 (four clicks; a "10" pick appears in the row). Step **At a time** 2 → 5.
> Next, what to make. The quick picks are two, four or six. I'll pick six, then open More settings and step it up to ten, the maximum. I'll let five agents work at a time, so the run happens in two waves. The rarer settings live behind More settings. That's progressive disclosure: the common path stays short, and the detail is there when you need it.

## 5 · Your own directions (3:02–3:47) [directions]

The featured beat. More settings stays open.

**SHOT** Spotlight "Your own directions": ten empty fields, each reading *Impeccable picks*. Spotlight V01 with the callout *Blank means Impeccable picks.* Type V01 and V02 at readable speed (55 ms a character), pause 2.5 s, then V03–V10 at about 4× (14 ms). Spotlight the filled list, close More settings, continue.
**GFX** From "winter" until 2.5 s before the scene ends, the trends card takes the frame while V03–V10 type underneath (the slow V01–V02 typing stays in view): *Trends I'm watching this winter*, two columns of palette swatch, name and essence (one column in 9:16), and a source line: *Curated from the 2026 trend reports by Adobe and Canva, and AW26–27 interiors and surface-design reporting.*

| | Typed direction | Card essence | Palette |
| --- | --- | --- | --- |
| V01 | Tactile imperfection: raw paper, brushstrokes, stitching, ivory and rust | raw paper, brushstrokes, stitching | ivory, rust, ink, ochre |
| V02 | Surreal distortion: impossible proportions, dreamlike light, icy blue | impossible proportions, dreamlike light | icy blue, silver, violet |
| V03 | Cinematic drama: film-noir shadows, theatrical light, oxblood velvet | film-noir shadow, theatrical light | black, oxblood, bone |
| V04 | Maximalist collage: cut-outs, stickers, clashing patterns, still readable | cut-outs, stickers, clashing patterns | pink, yellow, blue, black |
| V05 | Retro-tech nostalgia: early desktop OS, pixel icons, modern type | early desktop OS, pixel icons | grey, teal, navy |
| V06 | Expressive typography: inflated, warped, handwritten type as the event | inflated, warped, handwritten type | black, paper, orange |
| V07 | Warm eclecticism: mixed eras, warm wood, lived-in warmth | mixed eras, warm wood | walnut, mustard, green, cream |
| V08 | Neo-folk craft: one specific folk tradition, credited | one credited folk tradition | red, blue, linen |
| V09 | Sensory 3D materials: soft inflated chrome and glass | soft inflated chrome and glass | chrome, periwinkle, pink |
| V10 | Quiet organic minimalism: natural materials, negative space, earth tones | natural materials, negative space | clay, oak, moss |

> Now, your own directions. Every slot starts blank, and blank means Impeccable picks a direction for that variant. To pin one, type it in your own words. I'll type the first one slowly. Tactile imperfection: raw paper, brushstrokes and stitching. Then surreal distortion: impossible proportions, dreamlike light. These are the trends I'm watching this winter, drawn from this year's trend reports: human-made texture meeting digital surrealism. Raw paper, film-noir drama, inflated chrome, warm lived-in rooms. So each of the ten variants gets one of them. You can mix, too: leave any slot blank, and Impeccable still picks that one.

Mixing is said, not shown: a blank slot would break "one trend per variant".

## 6 · Review and go (3:47–4:19) [brief]

**SHOT** "About your site": three answers typed, punch in on "What must stay?". Review: spotlight the cost line (*Uses 20 sessions on your Claude Code account*), click **Make 10 variants**.
> A few words about your site, and what must stay. Here: the prices, the sign-up button and the FAQ. Agents change presentation, never behaviour. Then the review. I designed this screen to show exactly what will run and what it costs, because trust matters when an AI agent edits your code. Ten variants, each with a review pass, is twenty sessions on your own account. Make ten variants.

**Session cost:** the review computes `count × (review pass on ? 2 : 1)` = 10 × 2 = **20 sessions** (review is on by default). The dry run shows "Nothing is spent." instead.
**SFX** whoosh, riser.

## 7 · The run (4:19–5:14)

**7a Worktrees (4:19–4:33) [worktrees].** **SHOT** The board appears. **GFX** Run diagram: Your project (main branch untouched) → Worktrees with ten V01…V10 cells → Previews (one dev server each) → Five at a time (two waves).
> Each variant runs in an isolated git worktree, outside your project, so your main branch is never touched. Ten worktrees, ten dev servers, and five agents at a time.

**7b One agent (4:33–4:55) [agent].** Spotlight Direction, Status, Usage; open V01's output for 9 s.
> The board shows every variant live. Let's follow one agent. It reads your site and builds its direction. Then it opens its variant in a real browser, at desktop and phone width, and fixes what it sees. A second pass critiques and audits it, without changing the direction.

**7c Timelapse (4:55–5:06) [lapse].** Board sped up to fit 10 s, chip **▶▶ ~N min, sped up N×** with the real elapsed clock. Waits for every variant built and scored (timeout raised to 180 min).

**7d Failure is cheap (5:06–5:14) [retry].**
> If one variant goes wrong, stop it or retry it on its own. The others keep going.

**Expected real take:** ten variants at five at a time is two waves. Each variant is a build session (10–20 min) plus a review session, so a wave takes about 20–35 min and the whole run **50–80 min** (allow up to 2 h with the rollout); the dry run takes about 13 min. Five parallel agents keep a laptop usable; six (the UI maximum) saves little because the second wave would still be four variants long. Every preview stays live for the compare walk (`maxLive` 11, set by the recorder).

## 8 · Compare (5:14–7:01)

**8a Slider (5:14–5:28) [compare].** Compare opens on V01; drag the divider.
> Then, compare. This is your real site running, not screenshots, so you judge the real thing: real type, real layout, real interactions. Drag the divider for a before and after.

**8b Walk the ten (5:28–6:13) [walk].** Keys 2…9, then 0 for V10 (keycap GFX each time, 0.9 s holds), then side by side (S), phone (M), back. *Draft lines, rewritten after the real take to describe what each variant actually did:*
> Ten trends, ten sites. One: tactile imperfection, paper grain and stitched rules. Two: surreal distortion, cold light and impossible scale. Three: cinematic drama, deep shadow and oxblood. Four: maximalist collage, cut-outs that still read. Five: retro-tech, an early desktop with modern type. Six: expressive typography, the type is the event. Seven: warm eclecticism, wood and mixed eras. Eight: neo-folk craft, one named tradition. Nine: soft chrome and glass. Ten: quiet organic minimalism, space and earth tones. Number keys switch between them, and zero is V10. Press S for side by side, and M for the phone layout.

V08's line names the real tradition the agent chose and credits it (e.g. Dalarna kurbits, Otomí Tenango embroidery); add any new name to `pronunciations.json`.

**8c Pause and think (6:13–6:27) [pausetry].** **GFX** Pause card: *Which of these ten would you keep for your own site?* The countdown (5 → 0) and its thin depleting line start on the last word of the question, and the scene holds **five seconds of silence** (`rest: 5000`) before the next line. Behind the card the recorder switches to the kept variant.
> Pause the video for a moment, and think: which of these ten would you keep for your own site?
> *(five seconds, silent)*

**8c' How I decide (6:27–6:44) [decide].** **GFX** "How I decide" list, each criterion landing as it is said, the choice last.
> Here's how I decide. First, does it still read clearly? Second, does it fit the people who use the site? And third, would it hold up on every other page? Today, I'll keep tactile imperfection.

**8d Proof (6:44–7:01) [scores].** Press I: punch in on "Against your original" (accessibility points gained, axe issues fixed), freeze 1.5 s; glance at files changed.
> Every variant is scored against your original, on your machine, with axe-core and Lighthouse. Only the change is shown: how many accessibility points it gained, and how many axe issues it fixed. That's evidence, not just a look.

## 9 · Change it (needs #81) [chat]

> Almost right? Tell the agent what to change. It edits that variant, and the change comes with it when you keep it.

## 10 · Keep (7:01–7:43)

**10a Keep (7:01–7:19) [keep].** Keep V01 (`keep` in script.json; default 1, Tactile imperfection). Punch in on *Restyle the rest of the site to match (one more agent run)*. Apply.
> Keep the one you like. Notice this checkbox: one last agent pass carries the look to every other page. That's why we only previewed the home page. You judge one page, and the rest of the site follows.

**10b Rollout (7:19–7:26) [rollout].** Timelapse of the rollout pass.
**10c Site-wide (7:26–7:41) [sitewide].** "Rolled out site-wide", `git diff --stat` card, `npx variantly clean`; the about page and home in V01's look.
> Variantly applies it to your working tree, merging with anything you've changed since. Nothing is committed: review it with git diff. The other variants stay as branches until you clean them up.

**10d [call]** Kinetic type: **Your code. Your call.**

## 11 · Wrap (7:43–9:04)

**11a Rigour (7:43–8:14) [rigour].** **GFX** Facts card *The same care on variantly.style*, each row landing as its number is said, with PR #83's own metric names: **Transfer** (emulated phone) 1.5 MB → ~400 KB · **Font requests** (first load) 68 → ~18 · **Blocking time** (TVA concept, 4× CPU throttle) 3,790 ms → 2,291 ms. Source line: *Mobile performance pass, PR #83, prompted by an iPhone screen recording of the lag.*
> The same care went into the website. An iPhone screen recording showed lag, so I ran a mobile performance pass. On an emulated phone, it cut the transfer from one point five megabytes to about four hundred kilobytes, font requests on first load from sixty-eight to about eighteen, and blocking time on one concept from three thousand seven hundred ninety milliseconds to two thousand two hundred ninety-one.

**11b Recap (8:14–8:35) [recap].** **GFX** Recap card, same as the learn card.
> So, to recap. Each variant is an isolated copy of your project. You can pin a direction per variant, and combine agents. You compare them on your real site, with real scores. And you keep one, and it rolls out to the whole site.

**11c Close (8:35–9:04) [wrap].** Kept site, then the end card: split mark · `npx variantly` · variantly.style · *Designs by Impeccable · impeccable.style*.
> I designed and directed Variantly with Claude Code and Impeccable: I set the direction, I made the calls, and I tested it on a real iPhone. It runs entirely on your machine, with the agent you already use. No account, and no server of ours. To try it, run npx variantly in your project. The docs are at variantly.style. Thanks for watching.

---

## Cuts from the same footage

**60-second cut (LinkedIn):** cold open (0:09) → directions typing, sped up, with the trends card (0:10) → board timelapse (0:06) → compare walk, keys 1–0 at 0.6 s (0:08) → "fixed" freeze (0:04) → keep + rollout + about page (0:10) → end card (0:05). VO from 1a, 5 and 10a only. Burned-in captions.

**Designer's cut (75–90 s, for the portfolio):** the decisions, not the tutorial. Problem (1a, first three sentences) → model diagram (1c) → progressive disclosure (4, last two sentences) → review screen (6, the "I designed this screen" sentence) → real-site compare (8a) → pause card and criteria (8c) → proof freeze (8d) → keep site-wide (10a) → rigour card (11a) → AI/human line (11c, first sentence) → end card. Built by hand from the 16:9 render for now; a `cuts` list in script.json read by edit.mjs is the follow-up if it becomes a regular output.

## Graphics: the card system (`stage/cards.mjs`, `stage/stage.css`)

Designed with the Impeccable skill (context, craft floor, detector, critique pass). One language for all of them:

- Flat: the ground colour behind, white (light) or slate (dark) panels, 1.5px rule, 12px radius. No gradients, shadows, textures or decorative icons.
- One accent, the app's alert yellow, marks only the current step (a 6px bar inside the newest node, the newest list marker). The coordinator's note said violet; the shipped app's tokens (DESIGN.md, stage.css) use alert yellow, so the film follows the app.
- Type: Martian Mono condensed (75%) for titles, labels and figures; the system sans for sentences. No text under 24px; labels 28px in 16:9; sizes and gaps on the 8px grid.
- Motion: one curve and one duration everywhere (0.4 s ease-out, 12px rise for elements, 24px for whole cards); connectors draw themselves just before their node lands. Every reveal happens on the word the voice says (`on` in script.json → `at` in film time, resolved by edit.mjs from the word timings).
- Layout: each card is one block, optically centred in the space above the captions, its text left-aligned inside; flow groups are centred in the frame. Captions, logo and chapter label always draw above the cards. In 16:9 the logo and the chapter label sit on the bottom title-safe line (192px in, y 958).
- 9:16: nothing in the bottom 20% (below y 1536) or the right 120px, where Shorts, Reels and TikTok draw their own interface. The window shrinks to 896×896 at the 64px line, captions sit under it (y 1280), and logo, chapter label, lower third, chapter band, keycap and terminal all align to the 64px line. Flows run top to bottom; fact rows stack; the trends list is one column.

## Production notes

- **Captions:** .srt from the words ElevenLabs actually spoke, mapped back onto the written words, so "npx" reads as written while the voice says "N P X".
- **Sound:** cue-sheet voice tracks with SeekReel's duck (−10 dB); master −14 LUFS, true peak ≤ −1 dBTP.
- **YouTube chapters:** 0:00 Cold open · 0:09 Why · 1:19 What you need · 1:53 Setup · 2:32 What to make · 3:02 Your own directions · 3:47 Review and go · 4:19 The run · 5:14 Compare · 7:01 Keep · 7:43 Wrap. (Adjust after the real take; insert "Change it" before Keep once #81 merges.)
- **Thumbnail:** "Ten redesigns. Keep one." over a 2×2 grid of four variants, both themes.
- **QA gate:** `npm run voice:lint` clean; no dead air over 1 s; repeated frames in motion under 10%; both themes the same frame count; `raw-timeline.json` warnings and pageErrors empty; every claim below checked.

## Recorder changes (`script.json`, `record.mjs`, `edit.mjs`, `stage/`, `voice.mjs`)

- `script.json`: `mix: null` (Claude Code only), `keep: 1`, the ten directions (also listed in `directions`), stepper clicks (`More: Variants` ×4, `More: At a time` ×3), ten `fill` actions on `Direction for V01…V10`, keys 2–0 in the walk, lapse timeout 180 min, new scenes `learn`, `model`, `combine`, `directions`, `pausetry`, `decide`, `rigour`, `recap`; `promise` dropped (the learn card does its job).
- `record.mjs`: one step flag, `unlessMix` (skip a step when `mix` is set, so the count clicks don't fight a mix's rows), and one scene field, `rest` (extra silence after the line, for the pause). Everything else uses existing actions.
- `edit.mjs`: passes `card` through and resolves each `on` word to film time (and `fromOn`, a card opening on a word, and `countOn`, a countdown starting when a word ends); the cold open cuts up to ten variants (0.6 s each) instead of four.
- `stage/cards.mjs` (new): learn, recap, pause, facts, trends, mix and flow cards. `diagram` is now a flow spec object (the old `"worktrees"` string is gone).
- `voice.mjs` + `lib/pronounce.mjs` + `pronunciations.json`: the pronunciation layer, `--lint`, `--dict`.

## Open questions

1. **Combine beat:** the take stays on Claude Code. Film a mixed run instead by setting `"mix": "claude:5,gemini:5"` (the stepper clicks then skip themselves)?
2. **Length:** 9:05 is the teaching format. If it must come down, the first cuts are 8c/8c' (pause, −30 s) and 11a (rigour, −31 s).

## Appendix: claims and where they come from

- 1–10 variants; quick picks 2/4/6 plus a Variants stepper (min 1, max 10) and At a time (1–6) under More settings; "Your own directions" with one field per variant, placeholder "Impeccable picks" (ui-next/components/Checkin.tsx).
- Session cost: `sessions = count × (review ? 2 : 1)`; review on by default → 20 for ten (Checkin.tsx review step; src/server.mjs defaults).
- Concurrency default 2, server accepts 1–10, UI 1–6; live previews `maxLive` 2–11 (src/server.mjs normalizeConfig).
- Progressive disclosure: the rarer settings sit in a `<details>` "More settings" (Checkin.tsx).
- Review screen shows what runs and the session count, no dollar estimate (Checkin.tsx).
- Agents: Claude Code, Codex CLI, Copilot CLI, Gemini CLI, Cursor CLI; OpenRouter via Claude Code or Codex (README, src/agents.mjs sign-in notes, #71).
- Command-line agents only; "Lovable, Bolt, v0 and other browser builders can't run on your machine" (README).
- Combining agents in one run: "Add another agent" turns the picker into rows of agent, model and count; each variant uses its own agent for build, review, chat and rollout; `--agents claude:opus:2,gemini:2` (#92, Checkin.tsx MixEditor, src/session.mjs).
- The mix card mirrors the wizard's MixEditor rows (agent · model · count, model placeholder "the agent's default", footer "10 variants in all, the most there can be"); OpenRouter is not an agent of its own: Claude Code or Codex point at it (Checkin.tsx, README).
- The why for combining (different design instincts, compare models, spread across accounts) is the owner's reasoning, offered as opinion, not a measured claim.
- The ten trends are the owner's curated selection, synthesised from the 2026 trend reports by Adobe and Canva plus AW26–27 interiors and surface-design reporting; the voice calls them "the trends I'm watching this winter", and the card carries that source line.
- Isolated git worktrees outside the project, branches `variantly/<run>/vN`, one dev server each; the checkout is untouched (src/session.mjs, src/servers.mjs).
- Board steps, browser check at desktop and phone width, review pass that critiques and audits without changing the direction (Checkin.tsx CHECKS, src/brief.mjs).
- Compare runs the real site through a local proxy, not screenshots (PRODUCT.md, src/proxy.mjs); keys 1–9 and 0 for V10, S side by side, M phone, I details (ui-next Compare.tsx key handler).
- Scores against the original with axe-core and Lighthouse; only the change shown, axe drops as "fixed" (#82, Compare.tsx).
- Keep: "Restyle the rest of the site to match (one more agent run)", on by default; "Rolled out site-wide"; applied unstaged with a three-way-merge fallback; others stay as branches; `npx variantly clean` (#80, Kept.tsx, git.mjs).
- Site performance numbers, with PR #83's own metric names: "Phone, 4x CPU throttle: … TVA 3790 → 2291ms" (blocking time, TVA concept); "transfer 1.5MB → ~400KB" (emulated phone); "68 → ~18 font requests on first load" (PR #83 description).
- The performance pass was prompted by the owner's iPhone screen recording of the site lagging, and the owner tested the result on a real iPhone (owner's account; the recording is the owner's own evidence).
- AI/human split: commits are co-authored with Claude Code; designs by Impeccable (git history, NOTICE.md); tested on a real iPhone (owner, see the performance pass above). The opener ("the designer behind Variantly") and the close ("designed and directed … with Claude Code and Impeccable") say the same thing.
- No account, no server, runs locally (README).
