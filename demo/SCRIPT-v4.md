# variantly: the walkthrough (script v4.1)

**About 8:53** · Joaquin's voice (ElevenLabs) · 1080p60, light and dark, 16:9 and 9:16 · not recorded yet

The teaching format (learn card, mental model, pause and think, recap) is the owner's ask. **On screen** is the picture and any card, **>** is the voiceover, and `[id]` is the scene id in `script.json`, which matches this script scene for scene.

---

## 0 · Cold open (0:00–0:09) `[cold]`

**On screen:** fast cuts through the ten variants on the beat, then **Ten redesigns: tactile, surreal, cinematic, collage… Keep one.** and `npx variantly` typed. Music from frame one.

## 1 · Why (0:09–1:12)

**The problem** `[hi]`. **On screen:** the Tallyboard site scrolling slowly. Lower third: **Joaquin · Variantly**.
> Hi, I'm Joaquin, the designer behind Variantly. Redesigning a site usually means betting on one direction. If it's wrong, you start over. Variantly is for developers who already use a coding agent, and for designers exploring directions. Your agent builds several complete redesigns at once, each one running as your real site, and you keep the one you like.

**What you'll learn** `[learn]`. **On screen:** the learn card, four lines.
> In this video, you'll learn how to set up a run, give each variant its own direction, compare the results on your real site, and keep one.

**Mental model** `[model]`. **On screen:** Your project → Copies (git worktrees) → Previews → Compare → Keep → Rollout.
> First, the mental model. Your project stays exactly where it is. Each variant is a separate copy, an isolated git worktree, with its own preview server. You compare the previews side by side. You keep one. And one last pass rolls it out to the rest of the site.

## 2 · What you need (1:12–1:40) `[need]`

**On screen:** terminal: `node -v`, the five agents, `npx variantly`; the wizard opens. Lower third: **Designs by Impeccable · impeccable.style**.
> You need two things: Node, and a coding agent you already use. In your project folder, run npx variantly. It opens a wizard in your browser. The design work is done by Impeccable, an open-source design skill for coding agents. One thing to watch: it has to be the command-line agent. Browser builders like Lovable or Bolt can't run on your machine.

## 3 · Setup (1:40–2:22)

**Agents** `[setup]`. **On screen:** the setup checklist and the agent cards, each with a *Ready* tag or its fix (*Install*, *Sign in*, *Add it*); then the *Add another agent* card.
> Setup finds your app and checks your agent. Each agent card says whether it's ready, and if it isn't, the fix sits right on the card. I'm using Claude Code. You could switch to Codex, Copilot, Gemini or Cursor, or any model on OpenRouter, and combine them in one run.

**Why combine** `[combine]`. **On screen:** the mix card: **Claude Code · opus · 5** and **Gemini CLI · default · 5**, with the three reasons landing as rows.
> Why combine agents? Each model has its own design instincts. So you get more genuinely different directions, you see which model designs best for your site, and you can spread the work across accounts you already pay for.

## 4 · What to make (2:22–2:52) `[make]`

**On screen:** pick **6**, open **More settings**, step Variants to **10** and At a time to **5**.
> Next, what to make. The quick picks are two, four or six. I'll pick six, then open More settings and step it up to ten, the maximum. I'll let five agents work at a time, so the run happens in two waves. The rarer settings live behind More settings. That's progressive disclosure: the common path stays short, and the detail is there when you need it.

## 5 · Your own directions (2:52–3:30) `[directions]`

**On screen:** ten empty direction fields reading *Impeccable picks*. V01 and V02 typed slowly, V03–V10 fast, under the **Trends I'm watching this winter** card.
> Now, your own directions. Every slot starts blank, and blank means Impeccable picks. To pin one, type it in your own words. I'll type the first two slowly. Tactile imperfection: raw paper, brushstrokes and stitching. Then surreal distortion: impossible proportions, dreamlike light. These are the trends I'm watching this winter, from this year's trend reports: human-made texture meeting digital surrealism. One trend per variant. You can mix, too: leave any slot blank, and Impeccable still picks that one.

The ten directions: tactile imperfection · surreal distortion · cinematic drama · maximalist collage · retro-tech nostalgia · expressive typography · warm eclecticism · neo-folk craft · sensory 3D materials · quiet organic minimalism.

## 6 · Review and go (3:30–4:02) `[brief]`

**On screen:** three answers about the site typed; the review screen with *Uses 20 sessions on your Claude Code account*; click **Make 10 variants**.
> A few words about your site, and what must stay. Here: the prices, the sign-up button and the FAQ. Agents change presentation, never behaviour. Then the review. I designed this screen to show exactly what will run and what it costs, because trust matters when an AI agent edits your code. Ten variants, each with a review pass, is twenty sessions on your own account. Make ten variants.

## 7 · The run (4:02–4:56)

**Worktrees** `[worktrees]`. **On screen:** the board, then the run diagram (ten worktrees, five at a time).
> Each variant runs in an isolated git worktree, outside your project, so your main branch is never touched. Ten worktrees, ten dev servers, and five agents at a time.

**One agent** `[agent]`. **On screen:** the board's Direction, Progress and Time columns; V01's step beside its log.
> The board shows each variant's direction, progress and time, live. Let's follow one. It reads your site and builds its direction. Then it opens its variant in a real browser, at desktop and phone width, and fixes what it sees. A second pass critiques and audits it, without changing the direction.

**Timelapse** `[lapse]`. **On screen:** the board sped up to 8 s, with the real elapsed time.

**Failure is cheap** `[retry]`. **On screen:** *Show the board*, a *Retry* and a *Failed:* reason, then back to Compare.
> If a variant fails, the board says why, in the agent's own words, and you retry just that one.

## 8 · Compare (4:56–6:41)

**Slider** `[compare]`. **On screen:** V01 against the original; drag the divider.
> Then, compare. This is your real site running, not screenshots, so you judge the real thing: real type, real layout, real interactions. Drag the divider for a before and after.

**Walk the ten** `[walk]`. **On screen:** keys 1–9 and 0 through the variants; S for side by side with labelled panes; M for phone. *Rewrite after the real take to say what each variant actually did.*
> Ten trends, ten sites. One: tactile imperfection, paper grain and stitched rules. Two: surreal distortion, cold light and impossible scale. Three: cinematic drama, deep shadow and oxblood. Four: maximalist collage, cut-outs that still read. Five: retro-tech, an early desktop with modern type. Six: expressive typography, the type is the event. Seven: warm eclecticism, wood and mixed eras. Eight: neo-folk craft, one named tradition. Nine: soft chrome and glass. Ten: quiet organic minimalism, space and earth tones. S is side by side, both panes labelled, on one scrollbar. M is the phone layout.

**Pause and think** `[pausetry]`. **On screen:** the pause card with a 5-second countdown.
> Pause the video for a moment, and think: which of these ten would you keep for your own site?
> *(five seconds of silence)*

**How I decide** `[decide]`. **On screen:** the three criteria, landing as they're said.
> Here's how I decide. First, does it still read clearly? Second, does it fit the people who use the site? And third, would it hold up on every other page? Today, I'll keep tactile imperfection.

**Proof** `[scores]`. **On screen:** press I; the scores against the original.
> Every variant is scored against your original, on your machine, with axe-core and Lighthouse. Only the change is shown: how many accessibility points it gained, and how many axe issues it fixed. That's evidence, not just a look.

## 9 · Change it `[chat]` (not filmed yet)

> Almost right? Tell the agent what to change. It edits that variant, and the change comes with it when you keep it.

## 10 · Keep (6:41–7:36)

**Keep** `[keep]`. **On screen:** keep V01; the *Restyle the rest of the site to match* checkbox; Apply.
> Keep the one you like. Notice this checkbox: one last agent pass carries the look to every other page. That's why we only previewed the home page. You judge one page, and the rest of the site follows.

**Rollout** `[rollout]`. **On screen:** a 4 s timelapse of the rollout.

**Site-wide** `[sitewide]`. **On screen:** "Rolled out site-wide", the diff stat, the about page in V01's look.
> Variantly applies it to your working tree, merging with anything you've changed since. Nothing is committed. The other variants stay as branches until you clean them up.

**Hand-off** `[handoff]`. **On screen:** the kept screen: *Open your site*, *Open folder*, and the *Hand off to your agent* prompt.
> Then hand off to your own agent. Open your site, and this prompt names its local address, the design notes to follow, and what to check. Paste it into any agent to finish the job.

**On screen** `[call]`: **Your code. Your call.**

## 11 · Wrap (7:36–8:53)

**The website** `[website]`. **On screen:** variantly.style: the title morphing as *Next concept* steps, then the demo's Winter 2026 / Classic toggle and 1–20 picker. Facts card: transfer 1.5 MB → ~400 KB, font requests 68 → ~18, blocking time 3,790 → 2,291 ms.
> The website gets the same care. Its title morphs between typefaces, in 2D and 3D, across twenty concepts, from Bauhaus to Riso Poster to Candy 3D. Its demo has twenty redesigns of one shop, plus a Winter 2026 run of today's ten trends. And a mobile performance pass cut its transfer, font requests and blocking time on phones.

If the thirteen new concepts aren't live at the take, say "seven concepts, with more on the way".

**Recap** `[recap]`. **On screen:** the recap card.
> So, to recap. Each variant is an isolated copy of your project. You can pin a direction per variant, and combine agents. You compare them on your real site, with real scores. And you keep one, and it rolls out to the whole site.

**Close** `[wrap]`. **On screen:** the kept site, then the end card: `npx variantly` · variantly.style · *Designs by Impeccable*.
> I designed and directed Variantly with Claude Code and Impeccable: I set the direction, I made the calls, and I tested it on a real iPhone. It runs entirely on your machine, with the agent you already use. No account, and no server of ours. To try it, run npx variantly in your project. The docs are at variantly.style. Thanks for watching.

## Recording notes

Rehearse with `npm run voice:lint` (must be clean) and `npm run record:dry` (the built-in demo agent, about 13 min, nothing spent). The real take is `npm run all`, which runs voice, record, edit and build:all. It needs `ELEVEN_API_KEY` and `ELEVEN_VOICE_ID` in `demo/.env` (see `.env.example`); without them the voice falls back to a local rehearsal voice.

The real run is ten variants, five at a time, so two waves: about 50–80 min, allow 2 h with the rollout. It uses 20 sessions on the Claude Code account (ten variants, each with a review pass). The timelapse waits up to 180 min.

- `script.json` `"keep": 1` keeps V01 and `"mix": null` keeps the take on Claude Code. To film a mixed run, set `"mix": "claude:5,gemini:5"`; the count clicks then skip themselves (`unlessMix`).
- `--fresh-impeccable` films the one-click Impeccable install for real.
- `DEMO_WEB_URL` points the website beat at a local build (default https://variantly.style). Every site click there is optional, so a site change can't stop the take.
- The pause beat's five silent seconds are `"rest": 5000`.
- The chat scene stays `pending` until `record.mjs` has a `chatDone` wait and the runtime has about 10 s to spare.
- After the take, rewrite the walk lines to say what each variant actually did. V08 names and credits the real tradition the agent chose. Add any new name to `pronunciations.json`, then run `npm run voice:dict` to rewrite `pronunciations.pls`.
- 9:16: keep everything out of the bottom 20% and the right 120px, where Shorts, Reels and TikTok draw their own interface. No card text under 24px.
- The facts card's numbers come from PR #83 and use its metric names.
