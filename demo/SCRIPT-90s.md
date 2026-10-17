# variantly in 90 seconds

**About 1:30, about 195 spoken words** · Joaquin's voice (ElevenLabs, trained on the owner's own voice) · cut from the full take's footage · 16:9 and 9:16 · captions burned in

Same format as `SCRIPT-v4.md`: per beat, the time, what's on screen, then the voiceover. `[id]` names the full film's scene the footage comes from. The variants to flick through, for the most contrast: **V10** quiet organic minimalism, **V04** maximalist collage, **V03** cinematic drama, **V06** expressive typography.

---

## The hook (0:00–0:06)

**0:00** `[compare]` V01 against the original, the divider sweeping across. **0:03** `[walk]` hard cuts on keys 0, 4, 3, 6.
> Ten redesigns of one site, all running for real. Here's the whole run, in ninety seconds.

## The command (0:06–0:15)

**0:06** `[need]` the terminal card, `~/tallyboard $ npx variantly`, the wizard opening. **0:11** `[stacks]` the three doctor panels at about 1 s each: Next.js, Django, Static HTML.
> I'm Joaquin. I built Variantly so you don't have to bet on one direction. Run npx variantly. Next.js, Django, plain HTML: it finds them.

## The brief (0:15–0:30)

**0:15** `[make]` 10 variants, 5 at a time. **0:19** `[directions]` V01 and V02 typing, then the trends card. **0:25** `[brief]` punch in on *Uses 20 sessions*, click **Make 10 variants**.
> Pick how many, and give each one its own direction, or leave it blank and Impeccable picks. Then the review shows the cost first: ten variants, twenty sessions on your own plan.

## The run (0:30–0:45)

**0:30** `[lapse]` the board at real speed under **● Real time**, then **▶▶ Sped up**. **0:37** `[worktrees]` the diagram, *main branch untouched*. **0:41** `[retry]` a *Failed:* reason and **Retry**; if the take had no failure, `[doctor]` the ✗ line instead.
> Real time first: this run took {{runMinutes}} minutes. Here it is, sped up. Each variant gets its own git worktree, so your main branch is never touched. One fails? Retry just that one.

If the ✗ is used instead of Retry, the last sentence is: "No commit yet? Doctor marks it with a cross."

## Compare (0:45–1:15)

**0:45** `[compare]` the slider, before and after. **0:50** `[walk]` keys 0, 4, 3, 6 at about 2 s each. **0:58** `[scores]` I, punch in on the scores. **1:05** `[walk]` M, the phone layout. **1:10** `[again]` the `npx variantly clean` card.
> Then compare, on your real site, not screenshots. Drag for a before and after. Quiet minimalism. Maximalist collage. Cinematic drama. Expressive type. Press I: axe-core and Lighthouse scores against your original. Press M for the phone layout. Hate them all? Run it again. Nothing is kept until you press Keep.

## Keep (1:15–1:25)

**1:15** `[keep]` Keep V01, the *Restyle the rest of the site* checkbox, Apply. **1:19** `[sitewide]` the about page in V01's look, then the git card: last commit still *before*, the diff stat.
> Keep one, and a last pass rolls it out to every page. It lands in your working tree, so you review it like any other change. Nothing is committed.

## Try it (1:25–1:30)

**1:25** `[wrap]` the end card: `npx variantly` · variantly.style · *Free & open source (MIT)*.
> Free and open source. Run npx variantly. It's at variantly.style.

---

# The 30-second vertical (9:16, LinkedIn and X)

**About 0:30, about 55 words** · just the hook and the slider · captions burned in, inside the 9:16 safe area.

## Beats

**0:00–0:03** `[walk]` keys 0, 4, 3, 6, a hard cut on each.
> Ten redesigns of one site.

**0:03–0:10** `[compare]` V01 against the original, the divider dragged slowly left, right, centre. The vertical window follows the cursor.
> Drag for a before and after. This is the real site running, not screenshots.

**0:10–0:20** `[walk]` V10, V04, V03, V06 at 2.5 s each.
> My agent built ten at once, each in its own copy. My main branch was never touched.

**0:20–0:26** `[keep]` Keep V01, Apply.
> I keep one. It lands as a normal change, and nothing is committed.

**0:26–0:30** `[wrap]` the end card.
> npx variantly. Free and open source.

## Recording notes

- **How they're made.** Both cuts are edited by hand from the full take's renders without captions: run `npm run build:nocaptions` after `npm run edit`, which writes a silent 16:9 and 9:16 picture with no burned-in captions (`out/variantly-demo-<theme>-nocaptions*.mp4`). The 90 s is cut from both, the 30 s from the 9:16 one. They need their own voiceover, so a `cuts` list in `edit.mjs` would also need a second voice script, captions and cue sheet: more than a little code, so not built. Generate the lines with the same ElevenLabs voice and settings as `voice.mjs` (model `eleven_multilingual_v2`, stability 0.62, similarity 0.8, style 0.05, speed 0.95), with the aliases from `pronunciations.json` applied by hand (Next.js, Django, HTML, npx).
- **Captions.** The landing page will likely autoplay muted, so both cuts carry burned-in captions of their own lines, added in the editor over the no-captions picture. In 9:16 keep them above the bottom 20% and left of the right 120 px, at 52 px or more, as the stage does. The full film's `.srt` is `out/variantly-demo-<theme>.srt`.
- **Where you are.** At this length a chapter label would change every few seconds, so use a thin progress bar along the top instead, added in the editor. The full film's corner label shows full-film chapters, so crop or cover it.
- **Real time.** Say the real minutes from the take (`video/raw-timeline.json` marks, or the full film's `lapse` line after `voice.mjs lapse`), and keep the real-speed head of the lapse before the speed-up.
- **Footage the full take doesn't guarantee:** a real failure and Retry (it only happens by chance; the doctor ✗ from `video/doctor.json` is the deterministic fallback), and the progress bar. Everything else, including the stack panels, the ✗, the git card and the "Free & open source (MIT)" end card, is in the full render.
- **Terminal.** The terminal cards are 34 px on the 1920 frame (about 18–20 pt) with a clean `~/tallyboard $` prompt and no machine paths.
