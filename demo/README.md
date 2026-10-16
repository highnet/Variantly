# variantly demo video

The product video, made without a screen recorder or a microphone: Playwright
drives a real variantly run, ElevenLabs reads the narration, and
[SeekReel](https://github.com/highnet/seekreel) cuts the recording and renders
the titles, captions, zooms and soundtrack on top. One command rebuilds it.

```
script.json ──► voice.mjs ──► audio/<scene>.wav + word timings
     │
     └────────► record.mjs ─► video/raw.webm + raw-timeline.json   (real Claude Code run)
                      │
                 edit.mjs ──► seekreel.config.json (footage edit list) ─► seekreel footage
                      │       timeline.json · cues.json · out/variantly-demo.srt
                      ▼
                 build.mjs ─► seekreel build ─► out/variantly-demo.mp4 (16:9)
                                               out/variantly-demo-silent.mp4
                                               out/variantly-demo-vertical.mp4 (9:16)
                                               out/variantly-demo-poster.png
                                               out/variantly-demo.gif
```

## Run it on your machine

```sh
cd demo
npm run setup                              # once: dependencies + Chromium
cp .env.example .env                       # once: ELEVEN_API_KEY, ELEVEN_VOICE_ID
npx variantly doctor ../examples/tallyboard    # preflight: Claude Code signed in, Impeccable installed
npm run voice                              # narration in your voice
npm run record:dry                         # rehearsal: variantly's demo agent, no AI, ~3 min
npm run record                             # the real take: Claude Code, 4 variants, 2 at a time,
                                           # filmed in light and dark at once, in lockstep
npm run edit -- --theme light && npm run edit -- --theme dark
npm run probe                              # look at probe/*.png
node build.mjs all                         # both themes: 16:9, 9:16, silent, poster, GIF
```

## What you need

- **Node 22.18+** (SeekReel is TypeScript run directly by Node).
- **git**, and **Python 3** (SeekReel's cue engine mixes the soundtrack). On
  Windows that is usually `python`, which the scripts use by default.
- **SeekReel** checked out next to this repo (`../seekreel`), or `SEEKREEL_DIR`
  pointing at it, with `npm install` run inside it.
- **Claude Code**, signed in, with Impeccable installed. `record` runs
  `variantly doctor` first and stops if anything is missing.
- An **ElevenLabs** API key and your voice ID.

```sh
cd demo
npm run setup              # npm install + Playwright's Chromium
cp .env.example .env       # then fill in ELEVEN_API_KEY and ELEVEN_VOICE_ID
```

`.env` is git-ignored. The npm scripts load it, so nothing secret is ever
typed into a command or committed.

## Make the film

```sh
npm run all                # voice → record → edit → build everything
```

Or step by step:

| Step | Command | Time | Notes |
| --- | --- | --- | --- |
| Voice | `npm run voice` | ~30 s | Only re-reads lines whose text changed. `node voice.mjs hook` forces one. |
| Rehearse | `npm run record:dry` | ~3 min | variantly's built-in demo agent: no AI, no cost. Checks every click. |
| Record | `npm run record` | 20–60 min | A real run with Claude Code: **4 variants, real tokens**. |
| Edit | `npm run edit` | ~1 min | Cuts the recording, writes captions, cues and configs. |
| Check | `npm run probe` | ~10 s | Renders 5 frames into `probe/`. Look at them before building. |
| Build | `npm run build` | ~45 min | 16:9 MP4, silent MP4 and poster. Roughly one second per frame. |
| Vertical | `npm run build:vertical` | ~45 min | 9:16 for Reels, Shorts and TikTok. |
| GIF | `npm run gif` | ~10 s | Six seconds of the before/after slider. Needs the 16:9 film. |

`npm run probe -- 12.5,40,61` probes particular seconds.

## How it fits together

**`script.json`** is the film. Each scene has an `id`, the narration `text`,
and the Playwright `actions` that happen while it is spoken:

| Action | Example |
| --- | --- |
| `goto` | `{ "goto": "{{app}}" }`. `{{app}}` is the variantly URL, `{{site}}` the example site. |
| `click` | `{ "click": "role=button[name=/Continue/]", "zoom": true, "sound": "pop" }` |
| `fill` | `{ "fill": "role=textbox[name=/Who is it for/]", "text": "…" }`, typed visibly. |
| `hover`, `press`, `wait`, `waitFor` | `{ "wait": 800 }`, `{ "waitFor": "body[data-view=\"compare\"]" }` |
| `scroll` | `{ "scroll": 700, "ms": 1800 }` |
| `drag` | the compare slider: `{ "drag": "role=slider[…]", "to": [20, 80, 50] }` (percentages) |
| `waitPanes` | wait until both compare panes have loaded |
| `waitApi` | `{ "waitApi": "allDone" }` waits on `/api/state` until every variant is built and scored |

Scene extras: `title` (the opening card), `presenter` (the lower third),
`terminal` (the typed command card), `timelapse` (sped up to fit its line),
`cta` (the closing card).

Selectors are Playwright selectors. Prefer `role=` and visible text, which
survive UI restyles. `zoom: true` makes the stage punch in on that click, and
`sound` picks the UI sound (`tick`, `pop`, `whoosh`, `stamp`).

**One take, two themes.** `record.mjs` drives a light and a dark browser
side by side against the same variantly run, with every move and click made
on both at the same moment. Only the light page talks to variantly; the dark
page's requests that would change anything are answered locally, and it
follows the real run through the same live updates. So the two films are the
same take — same variants, same cursor, same timing — and differ only in theme.

**`record.mjs`** copies `examples/tallyboard` into `.work/tallyboard` as a
fresh git repo, starts variantly on it with its own `VARIANTLY_HOME` (your own
runs are untouched), and drives the wizard in a 1920×1080 Chromium. It draws a
visible cursor and click ripple. Each scene is held until its narration has
been spoken, plus 400 ms. Every scene start and click is logged to
`video/raw-timeline.json`.

**`edit.mjs`** turns that log into a SeekReel `footage` edit list. Each scene
is one clip. The generation wait is sped up to fit its line (a 25-minute run
becomes about 12 seconds, with a "▶▶ 120×" chip and the real elapsed time).
There is a fade into the run and a dip to black into the compare view. It
then writes:

- `timeline.json`: scenes, clicks and caption cues in film time.
- `cues.json`: each voice line at its scene, a quiet music bed that ducks
  under the voice, and a UI sound on each click.
- `out/variantly-demo.srt`: captions for YouTube, timed to the words
  ElevenLabs actually spoke.

**`stage/`** is the SeekReel stage. It shows the footage frame for `t`, then
draws the title card, the presenter lower third, the terminal card, captions,
punch-in zooms, the timelapse chip, the logo bug and the closing card.
`index.html` is 16:9. `vertical.html` is 9:16, a 1080-wide window that
follows the cursor across the recording.

## Changing things

- **Narration:** edit `text` in `script.json`, then run `npm run voice`,
  `npm run edit` and `npm run build`. Re-recording is only needed if a scene's
  length changed noticeably. A longer line holds the screen longer, so record
  again for that.
- **Voice:** change `ELEVEN_VOICE_ID` (or `ELEVEN_STABILITY`,
  `ELEVEN_SIMILARITY`, `ELEVEN_STYLE`) in `.env`, then run `npm run voice` and
  carry on from `edit`.
- **Flow:** edit `actions`, rehearse with `npm run record:dry`, then
  `npm run record`.
- **Look:** `stage/stage.css` and `stage/stage.mjs`. `npm run probe` shows the
  change in seconds.
- **Transitions:** `TRANSITIONS` in `edit.mjs`. Any ffmpeg xfade name works
  (`fade`, `fadeblack`, `wipeleft`, `slideup`, `circleopen`…).
- **Which variant is kept:** `keep` in `script.json`.

## Between takes

`record` starts from a fresh copy every time, so there is nothing to reset.
If a take is interrupted, variantly may leave worktrees behind in `.work/`.
Delete the folder, or run `npx variantly clean .work/tallyboard` first.

## Checks before publishing

- `npm run probe`, then look at `probe/*.png`: captions match the voice, the
  zooms land on the right control, nothing is cut off.
- Watch `out/variantly-demo.mp4` end to end. Look for no gap in the voice
  longer than a second, no clipped words, no error toasts or stuck spinners.
- `video/raw-timeline.json` lists `warnings` (an action that ran past its
  line) and `pageErrors`. Both should be empty.
- Everything on screen is the fictional Tallyboard site and variantly itself:
  no real customer data.
