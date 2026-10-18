# variantly: the walkthrough (script v4.2)

**About 9:56** · Joaquin's voice (ElevenLabs, trained on the owner's own voice) · 1080p60, light and dark, 16:9 and 9:16 · not recorded yet

The teaching format (learn card, mental model, pause and think, recap) is the owner's ask. **On screen** is the picture and any card, **>** is the voiceover, and `[id]` is the scene id in `script.json`, which matches this script scene for scene. The corner label (`03/11 · Setup`) is on screen from the first chapter to the end card. Times are estimates at the voice's pace until the take.

---

## 0 · Cold open (0:00–0:09) `[cold]`

**On screen:** fast cuts through the ten variants on the beat, then **Ten redesigns: tactile, surreal, cinematic, collage… Keep one.** and `npx variantly` typed. Music from frame one.

## 1 · Why (0:09–1:15)

**The promise** `[hi]` (0:09). **On screen:** the Tallyboard site scrolling slowly. Lower third: **Joaquin · Variantly**.
> This is Variantly. In the next ten minutes, I'll show you one whole run, including what it costs and how to undo it. I'm Joaquin, and I built Variantly because redesigning a site usually means betting on one direction. If it's wrong, you start over. Here, your agent builds several complete redesigns at once, each one running as your real site, and you keep the one you like.

**What you'll learn** `[learn]` (0:40). **On screen:** the learn card, four lines.
> Here's what we'll cover: setting up a run, giving each variant its own direction, comparing them on your real site, and keeping one.

**Mental model** `[model]` (0:51). **On screen:** Your repo → Copies (git worktrees) → Previews → Compare → Keep → Rollout.
> First, the mental model. Your project stays where it is. Each variant is its own copy: a git worktree on its own branch, a little timeline of your site, with a preview. You compare them side by side, keep one, and a last pass rolls it out to the whole site.

## 2 · What you need (1:15–1:41) `[need]`

**On screen:** terminal (`~/tallyboard $` prompt): `node -v`, the five agents, `npx variantly`; the wizard opens and the camera punches in on its title. Lower third: **Designs by Impeccable · impeccable.style**.
> You need two things: Node, and a coding agent you already use. In your project folder, run npx variantly, and a wizard opens in your browser. The design work is done by Impeccable, an open-source design skill. One catch: it has to be the command-line agent, not a browser builder like Lovable or Bolt.

## 3 · Will it work on yours? (1:41–2:32)

**Stack montage** `[stacks]` (1:41). **On screen:** three terminal panels in turn, each `npx variantly doctor` and what it found: **Next.js** → `npx next dev`, **Django** → `python manage.py runserver`, **Static HTML** → the built-in static server.
> Will it work on yours? Here's variantly doctor on a Next.js app, a Django site, and plain HTML. It finds the stack, and the command that serves it, every time. And you can always type your own.

**A rough edge** `[doctor]` (1:58). **On screen:** `~/my-site $ npx variantly doctor`: ✓ node, ✓ git, **✗ repository ~/my-site (no commits yet)**, the ✗ line in the accent.
> Here's a rough edge, on purpose. This folder has no commit yet, so doctor marks it with a cross. Variantly can make that first commit for you, or you fix it and run doctor again.

**Not a developer?** `[beginner]` (2:15). **On screen:** variantly.style: open *Never used a terminal? Start here*, punch in on **Copy walk-me-through prompt**; back to the wizard.
> Not a developer? If you can paste a command, you're set. On variantly.style, there's a walk-me-through prompt. Paste it into any AI chat, and it takes you through it one small step at a time.

## 4 · Setup (2:32–3:17)

**Agents** `[setup]` (2:32). **On screen:** the setup checklist and the agent cards, each with a *Ready* tag or its fix (*Install*, *Sign in*, *Add it*); then the *Add another agent* card.
> Setup finds your app and checks your agent. Each card says if it's ready, and if not, the fix is right on the card. I'm using Claude Code. You could pick Codex, Copilot, Gemini, Cursor, or any OpenRouter model, and mix them in one run.

**Why mix** `[combine]` (2:53). **On screen:** the mix card: **Claude Code · opus · 5** and **Gemini CLI · default · 5**, the reasons landing as rows, then **--blind**.
> Why mix them? Each model has its own design instincts. So you get more varied directions, you see which model designs best for your site, and you spread the work across accounts you already pay for. Add --blind, and you won't see who made each one until you've kept it.

## 5 · What to make (3:17–3:40) `[make]`

**On screen:** pick **6**, open **More settings**, step Variants to **10** and At a time to **5**.
> Next, what to make. The quick picks are two, four or six. I'll pick six, then step it up to ten under More settings, with five agents at a time, so it runs in two waves. The rarer settings stay back there. That's progressive disclosure: the common path stays short.

## 6 · Your own directions (3:40–4:07) `[directions]`

**On screen:** ten empty direction fields reading *Impeccable picks*. V01 and V02 typed slowly, V03–V10 fast, under the **Trends I'm watching this winter** card.
> Now, your own directions. Every slot starts blank, and blank means Impeccable picks. To pin one, type it in your own words. Tactile imperfection: raw paper, brushstrokes, stitching. Surreal distortion: impossible proportions, dreamlike light. These are the trends I'm watching this winter: human-made texture meeting digital surrealism. One per variant, and any slot you leave blank, Impeccable picks.

The ten directions: tactile imperfection · surreal distortion · cinematic drama · maximalist collage · retro-tech nostalgia · expressive typography · warm eclecticism · neo-folk craft · sensory 3D materials · quiet organic minimalism.

## 7 · Review and go (4:07–4:38) `[brief]`

**On screen:** three answers about the site typed; the review screen, punch in on *Uses 20 sessions on your Claude Code account* with the callout *The cost, before anything runs.*; click **Make 10 variants**.
> A few words about your site, and what must stay: here, the prices, the sign-up button and the FAQ. Then the review. I designed this screen to show exactly what will run, and what it costs. Variantly is free and open source; each variant is one session on your own plan, plus one for its review. Ten variants, twenty sessions. Trying it out? Start with four.

## 8 · The run (4:38–5:51)

**Is it safe?** `[worktrees]` (4:38). **On screen:** the board, then the run diagram (ten worktrees, five at a time, *main branch untouched*).
> Can this break your site? No. Each variant runs in an isolated git worktree, outside your project, so your main branch is never touched. And agents change presentation, never behaviour. Ten worktrees, ten dev servers, five agents at a time.

**One agent** `[agent]` (4:57). **On screen:** the board's Direction, Progress and Time columns; V01's step beside its log, punched in.
> The board shows each variant's direction, progress and time, live. Let's follow one. It reads your site, builds its direction, then opens it in a real browser, at desktop and phone width, and fixes what it sees. A second pass critiques and audits it, keeping the direction.

**Real time, then the timelapse** `[lapse]` (5:19). **On screen:** 3.5 s of the board at real speed under an amber, clock-style **● Real time · 00:12:40** (it counts from the Make click), then the rest sped up under **▶▶ Sped up 40× · 00:31:05 of ~60 min**.
> Real time, for the record: the whole run took {{runMinutes}} minutes, start to finish, so here's the rest, sped up.

**When it goes wrong** `[retry]` (5:29). **On screen:** *Show the board*, a *Retry* and a *Failed:* reason, then back to Compare.
> If a variant fails, the board says why, in the agent's own words, and you retry just that one. And if one comes out broken, like a layout that falls apart on a phone, tell the agent to fix it, retry it, or just don't keep it.

## 9 · Compare (5:51–7:52)

**Slider** `[compare]` (5:51). **On screen:** V01 against the original; drag the divider.
> Then, compare. This is your real site running, not screenshots, so you're judging the real thing: real type, real layout, real interactions. Drag the divider for a before and after.

**Walk the ten** `[walk]` (6:06). **On screen:** keys 1–9 and 0 through the variants; S for side by side with labelled panes; M for phone. *Rewrite after the real take to say what each variant actually did.*
> One: tactile imperfection, paper grain and stitched rules. Two: surreal distortion, cold light and impossible scale. Three: cinematic drama, deep shadow and oxblood. Four: maximalist collage, cut-outs that still read. Five: retro-tech, an early desktop with modern type. Six: expressive typography, where the type is the event. Seven: warm eclecticism, wood and mixed eras. Eight: neo-folk craft, one named tradition. Nine: soft chrome and glass. Ten: quiet organic minimalism, space and earth tones. S puts them side by side, both panes labelled, on one scrollbar. M is the phone layout.

**Pause and think** `[pausetry]` (6:47). **On screen:** the pause card with a 5-second countdown.
> Pause the video for a moment, and think: which of these ten would you keep for your own site?
> *(five seconds of silence)*

**How I decide** `[decide]` (7:02). **On screen:** the three criteria, landing as they're said.
> Here's how I decide. First, does it still read clearly? Second, does it fit the people who use the site? And third, would it hold up on every other page? Today, I'm keeping tactile imperfection.

**Proof** `[scores]` (7:19). **On screen:** press I; punch in on the scores against the original.
> Every variant is scored against your original, right on your machine, with axe-core and Lighthouse. You only see the change: how many accessibility points it gained, and how many axe issues it fixed. So it's evidence, not just a look.

**Hate them all?** `[again]` (7:38). **On screen:** terminal: `npx variantly clean` and *Removed variantly worktrees, branches and state for this project.*
> And if you hate all ten? Run it again with a sharper brief. Nothing is kept unless you press Keep, and npx variantly clean removes every worktree and branch it made.

**Change it** `[chat]` (not filmed yet).
> Almost right? Tell the agent what to change. It edits that variant, and the change comes with it when you keep it.

## 10 · Keep (7:52–8:54)

**Keep** `[keep]` (7:52). **On screen:** keep V01; the *Restyle the rest of the site to match* checkbox; Apply.
> Keep the one you like. Notice this checkbox: one last agent pass carries the look to every other page. That's why we only previewed the home page. You judge one page, and the rest of the site follows.

**Rollout** `[rollout]` (8:11). **On screen:** 1.5 s at real speed under the real clock, then the rollout sped up.

**Nothing committed** `[sitewide]` (8:16). **On screen:** "Rolled out site-wide"; the take's own terminal: `git log --oneline -1` (still *before*), `git diff --stat`, the `variantly/*` branches, `npx variantly clean`; the about page in V01's look.
> It lands in your working tree, merged with anything you've changed since. The last commit is still yours: nothing is committed. So you review it like any other change, and undo it the same way. You keep one timeline; the others stay as branches until you run npx variantly clean.

**Hand-off** `[handoff]` (8:39). **On screen:** the kept screen: *Open your site*, *Open folder*, and the *Hand off to your agent* prompt.
> Then hand off to your own agent. Open your site, and this prompt gives it the local address, the design notes, and what to check.

**On screen** `[call]` (8:51): **Your code. Your call.**

## 11 · Wrap (8:54–9:56)

**The website** `[website]` (8:54). **On screen:** variantly.style: the title morphing as *Next concept* steps, then the demo's Winter 2026 / Classic toggle and 1–20 picker. Facts card: transfer 1.5 MB → ~400 KB, font requests 68 → ~18, blocking time 3,790 → 2,291 ms. *Optional:* the concept switch opening like a glowing amber doorway (only once that site PR has landed), and a 1–2 s flash of the *Orientation Reel* concept, the black-and-white instructional film with its paint-chip mascot Swatch, if it's live at the take.
> The website got the same care: twenty title concepts, twenty redesigns of one shop plus a Winter 2026 run, and a mobile pass that cut its transfer, font requests and blocking time on phones.

If the thirteen new concepts aren't live at the take, say "seven title concepts, with more on the way".

**Recap** `[recap]` (9:10). **On screen:** the recap card.
> To recap: each variant is an isolated copy, its own branch of your site. You can pin a direction per variant, and mix agents. You compare on your real site, with real scores. And you keep one, and it rolls out site-wide.

**Close** `[wrap]` (9:30). **On screen:** the kept Tallyboard scrolling; on "try", the end card: `npx variantly` · variantly.style · *Free & open source (MIT) · Designs by Impeccable*, and a small amber stamp, **Variant record VY-001 · kept**, like the record line in the site footer.
> I designed and directed Variantly with Claude Code and Impeccable: I set the direction, made the calls, and tested it on a real iPhone. It's free and open source, and it runs on your machine. No account, no server of ours. To try it, run npx variantly in your project. Docs at variantly.style. Thanks for watching.

## Recording notes

Rehearse with `npm run voice:lint` (must be clean) and `npm run record:dry` (the built-in demo agent, about 13 min, nothing spent). The real take is `npm run all`: voice, record, voice again (only the `lapse` line changes, now with the real run time), edit and build:all. It needs `ELEVEN_API_KEY` and `ELEVEN_VOICE_ID` in `demo/.env` (see `.env.example`); without them the voice falls back to a local rehearsal voice.

The real run is ten variants, five at a time, so two waves: about 50–80 min, allow 2 h with the rollout. It uses 20 sessions on the Claude Code account (ten variants, each with a review pass). The timelapse waits up to 180 min.

- **One scene at a time.** The voice is made per scene, so a chapter-sized retake is one command: `node --env-file-if-exists=.env voice.mjs <sceneId> [sceneId …]` (e.g. `voice.mjs walk`), then `npm run edit` and `npm run build:all`. Unchanged scenes are skipped. A new length re-times the cut; it only needs a new `record` if the line got much longer than the scene's actions.
- **Real time, honestly.** `{{runMinutes}}` in the `lapse` line is filled from the take (the `runStart` mark on the Make click to the `runEnd` mark when every variant is done, in `video/raw-timeline.json`); before a take it reads "about 60". After a take, `voice.mjs lapse` re-voices that line with the real number. The lapse plays its first 3.5 s (`realHead`) at real speed under a **● Real time** clock counting from the Make click, then speeds up; the rollout does the same for 1.5 s.
- **The rough edge is deterministic.** `stacks.mjs` (run by `record`, or `node stacks.mjs` on its own) makes three small projects (Next.js, Django, a copy of Tallyboard) and one git folder with no commit, runs `variantly doctor` on each, and saves the output to `video/doctor.json`; `edit` puts it in the `stacks` and `doctor` terminal cards. No agent and no keys. The ✗ is "no commits yet", which every machine shows. The `retry` beat stays optional: it only shows a failure if one happens.
- **The terminal.** Cards render at 34 px on the 1920 frame (about 18–20 pt on a laptop screen), with a clean `~/tallyboard $` prompt (`script.json` `prompt`; the doctor cards use their own folder). No machine paths: the recorder masks them on screen and `stacks.mjs` replaces them in doctor's output. The side terminal with the diff is 22 px, readable at 1080p; don't use it in the 9:16 cut.
- **A change every 10–20 s.** The longest holds now have a punch-in (`"zoom": true` on a spotlight or a click): the wizard title in `need`, the agent log in `agent`, the cost in `brief`, the scores in `scores`, the walk-me-through prompt in `beginner`. The close plays over the kept site and brings the end card in on "try". Cards reveal on spoken words, so card scenes change with the line.
- `script.json` `"keep": 1` keeps V01 and `"mix": null` keeps the take on Claude Code. To film a mixed run, set `"mix": "claude:5,gemini:5"`; the count clicks then skip themselves (`unlessMix`). `--blind` only hides something in a mixed run, so the film says it over the mix card; its own clip needs a mixed `--blind` take (see `PINNED-COMMENT.md`).
- The `beginner` beat films the live variantly.style (or `DEMO_WEB_URL`); every click there is optional, so a site change can't stop the take. The *Copy walk-me-through prompt* button is from PR #115.
- `--fresh-impeccable` films the one-click Impeccable install for real.
- The pause beat's five silent seconds are `"rest": 5000`.
- The chat scene stays `pending` until `record.mjs` has a `chatDone` wait and the runtime has about 10 s to spare. Chapters are numbered over filmed scenes only, so a pending one leaves no gap.
- After the take, rewrite the walk lines to say what each variant actually did. V08 names and credits the real tradition the agent chose. Add any new name to `pronunciations.json`, then run `npm run voice:dict` to rewrite `pronunciations.pls`.
- **Captions** are burned into every render by the stage (16:9 and 9:16) and also written to `out/variantly-demo-<theme>.srt` for YouTube. `npm run build:nocaptions` (or `build.mjs wide|vertical --no-captions`) also renders a silent picture without them, `out/variantly-demo-<theme>-nocaptions*.mp4`, for the short cuts; the normal films keep their captions.
- 9:16: keep everything out of the bottom 20% and the right 120px, where Shorts, Reels and TikTok draw their own interface. No card text under 24px. The corner label sits top left above the picture in 9:16 and bottom right in 16:9, and is drawn over every card and veil.
- `edit` writes `out/youtube-description-<theme>.txt` with the real chapter times and the commands shown; copy them into `PINNED-COMMENT.md` and the description after the take.
- Embed the final video on the site: `DEMO_VIDEO_ID_LIGHT` and `DEMO_VIDEO_ID_DARK` in `site/lib/site.ts` are empty until it's uploaded.
- **The timeline thread.** The site's lore (variantly.style as an artifact of a retro-futurist bureau that keeps branching timelines) shows up only as light touches: variants as branches and little timelines, "for the record" over the lapse, the amber clock-style readout and the record stamp on the end card. Keep it that subtle, and use generic time, branch and bureau words only: no names, terms or slogans from any film or TV franchise.
- The facts card's numbers come from PR #83 and use its metric names. FAQ answers (cost, safety, "none of them", "not a developer") follow `site/lib/content.ts`.
