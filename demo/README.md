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

## Before every take

Always film the latest variantly. In the Variantly clone:

```sh
git checkout main && git pull
npm ci
npm run build:ui
```

`record` checks this and **stops** with the fix if anything is off:

- the version is older than 0.3.0, or the clone is behind `origin/main`;
- `ui-next/out` is missing or older than its sources (pulled but forgot `npm run build:ui`);
- there are uncommitted changes in `src/`, `ui-next/` or `bin/`.

It prints the version and commit it is filming and writes them into
`video/raw-timeline.json` and each `timeline.<theme>.json`. `ALLOW_STALE=1`
skips the stop, for testing only: never publish such a take.

## Run it on your machine

```sh
cd demo
npm run setup                              # once: dependencies + Chromium
cp .env.example .env                       # once: ELEVEN_API_KEY, ELEVEN_VOICE_ID
npx variantly doctor ../examples/tallyboard    # preflight: Claude Code signed in, Impeccable installed
npm run voice:local                        # rehearsal voice, no keys (Windows SAPI / macOS say / espeak)
npm run voice                              # narration in your ElevenLabs voice
npm run voice:lint                         # every risky word has a pronunciation rule
npm run record:dry                         # rehearsal: variantly's demo agent, no AI, ~15 min
npm run record                             # the real take: Claude Code, 10 variants, 5 at a time,
                                           # filmed in light and dark at once, in lockstep
npm run edit                               # cuts both themes
npm run probe                              # look at probe/*.png
npm run build:all                          # both themes: 16:9, 9:16, silent, poster, GIF
```

## Set up your machine (once)

Everything runs locally: voice, recording and rendering. Nothing needs this
repository's CI or any cloud service except ElevenLabs.

**1. Tools**

| | Windows | macOS |
| --- | --- | --- |
| Node **22.18+** (SeekReel runs TypeScript directly) | `winget install OpenJS.NodeJS.LTS`, or nodejs.org | `brew install node`, or nodejs.org |
| git | `winget install Git.Git` | `xcode-select --install` |
| Python 3 (SeekReel's sound mixer) | `winget install Python.Python.3.12`; the scripts call `python` | preinstalled `python3`, or `brew install python` |
| Claude Code, signed in | `npm install -g @anthropic-ai/claude-code`, then `claude` | same |
| Impeccable for Claude | `npx impeccable install --providers=claude --scope=global --yes --no-hooks` | same |

**Playwright is pinned to 1.63.0** in the demo and in SeekReel, so the one
`npx playwright install chromium` that `npm run setup` runs serves both. If you
point at another browser with `CHROMIUM`, it must match that version. `record`
films a two-second test clip first and stops with the fix if recording does
not work, instead of failing after an hour-long take.

**Smooth capture.** The app is captured frame by frame through Chromium's
screencast, each frame with the time it was painted, and rebuilt at a constant
60 fps by those times. The film is 60 fps too, so nothing is resampled. `edit`
reports how many frames repeat while the app moves (a scroll, a drag, typing);
over 10% means the machine could not paint both themes fast enough. Close
other apps, or use `record --single` for a light-only take. A take needs a few
GB of free disk for the captured frames, which are deleted after encoding
(`KEEP_FRAMES=1` keeps them).

**Filming the Impeccable install.** `npm run record -- --fresh-impeccable`
sets your agent's installed Impeccable skill aside for the take, so the wizard
offers "Install Impeccable" and the one-click install is filmed for real. If
the take does not install it, your copy is put back when the take ends.

**Crisp text.** Pages render at 2× and the screencast downsamples them to
1080p. On a slow machine, `CAPTURE_SCALE=1` halves the work.

**Rehearse without keys.** `npm run voice:local` (or `voice` with no keys in
`.env`) uses the system's own speech: Windows' built-in voices, macOS `say`,
or `espeak-ng` on Linux. It writes the same files as ElevenLabs, with approximate word
timings, so `record:dry`, `edit` and `build` all work. Run `npm run voice`
with your keys before the real take; it re-voices every line.

**ffmpeg needs no install.** Both the demo and SeekReel use the `ffmpeg-static`
build from npm. To use your own, set `FFMPEG` (and `FFPROBE`) in `.env`.

Check with `node -v` (22.18 or later), `git --version` and `python --version`
(`python3 --version` on macOS).

**2. Repositories, side by side**

```sh
git clone https://github.com/highnet/Variantly
git clone https://github.com/highnet/seekreel
cd Variantly && npm install && npm run build:ui
cd ../seekreel && npm install
```

The demo finds SeekReel at `../seekreel`. If you keep it elsewhere, set
`SEEKREEL_DIR` in `.env`, e.g. `C:\code\seekreel` or `/Users/you/code/seekreel`.

`npm run build:ui` builds the app interface the video films (ui-next). Run it
again after pulling Variantly changes.

**3. The demo**

```sh
cd Variantly/demo
npm run setup              # dependencies + Playwright's Chromium (npx playwright install chromium)
```

Copy `.env.example` to `.env` (Windows: `copy .env.example .env`, macOS:
`cp .env.example .env`) and fill in:

- `ELEVEN_API_KEY`: ElevenLabs → Profile → API keys.
- `ELEVEN_VOICE_ID`: your voice's ID, under ElevenLabs → Voices → your voice → ID.

`.env` is git-ignored. The npm scripts load it with Node's `--env-file`, so
the key is never typed into a command or committed.

**Paths with spaces** (e.g. `C:\Users\Jane Doe\code`) work. Keep the
checkout outside OneDrive or iCloud-synced folders: a sync client locking files
mid-render slows it down and can break git worktrees.

## Make the film

```sh
npm run all                # voice → record → voice (real run time) → edit → build everything
```

Or step by step:

| Step | Command | Time | Notes |
| --- | --- | --- | --- |
| Voice | `npm run voice` | ~30 s | Only re-reads lines whose text changed. `node voice.mjs hook` forces one. |
| Lint | `npm run voice:lint` | ~1 s | Fails on any narration word (capitals, digits, symbols, file names) without a pronunciation rule. |
| Rehearse | `npm run record:dry` | ~15 min | variantly's built-in demo agent: no AI, no cost. Checks every click. |
| Record | `npm run record` | 50–80 min (up to 2 h) | A real run with Claude Code: **10 variants, 5 at a time, 20 sessions** (a build and a review pass each), plus the rollout. |
| Edit | `npm run edit` | ~5 min | Cuts both themes' recordings, writes captions, cues and configs. |
| Check | `npm run probe` | ~10 s | Renders 5 frames into `probe/`. Look at them before building. |
| Build | `npm run build` | ~1 h per theme | 16:9 MP4, silent MP4 and poster, at 60 fps. About half a second per frame. |
| Vertical | `npm run build:vertical` | ~1 h per theme | 9:16 for Reels, Shorts and TikTok. |
| Everything | `npm run build:all` | ~4 h | Both themes, both shapes, GIFs. Leave it running overnight. |
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
| `key` | `{ "key": "0" }` presses a key on every page; in compare, `0` is V10 |

Step flags: `optional` (skip if the element never appears), `realOnly` (skip in
a dry run), `unlessMix` (skip when `mix` is set: the count clicks, which a
mix's rows replace), `zoom`, `sound`, `moveMs` (cursor travel time),
`delay` on `fill` (ms per character: 55 reads comfortably, 14 is about 4×),
`callout` and `point` on `spotlight`.

Scene extras: `title` (the opening card), `lower` (the lower third),
`terminal` (the typed command card), `timelapse` (sped up to fit its line),
`kinetic` (full-frame kinetic type), `cta` (the closing card), `rest` (ms of
silence after the line), `say` (what the
voice reads instead of `text`, which stays the caption), and the teaching
cards and diagrams below.

Top level: `agent`, `mix` (e.g. `"claude:5,gemini:5"` films a combined run;
`null` films one agent), `keep` (the variant kept, 1–10), `directions` (the
ten typed directions, for reference).

### Teaching cards and diagrams

`stage/cards.mjs` draws every explanatory graphic in one flat language. A scene carries one `card` or one `diagram`:

| Kind | Example |
| --- | --- |
| `mix` | `{ "kind": "mix", "rows": [{ "agent": "Claude Code", "model": "opus", "count": 5, "on": "combine" }], "total": "…", "items": [{ "text": "…", "on": "instincts." }] }`: the wizard's agent rows, then reasons |
| `learn`, `recap` | `{ "kind": "learn", "title": "In this video", "items": [{ "text": "Set up a run", "on": "set" }] }` |
| `pause` | `{ "kind": "pause", "title": "Pause and think", "question": "…", "seconds": 5, "countOn": "site?" }`: the countdown starts when the voice says that word; give the scene `"rest": 5000` for the silent hold |
| `facts` | `{ "kind": "facts", "title": "…", "rows": [{ "label": "…", "before": "1.5 MB", "after": "~400 KB", "on": "transfer" }], "source": "…" }` |
| `trends` | `{ "kind": "trends", "title": "…", "items": [{ "name": "…", "essence": "…", "swatch": ["#f3ecdc"] }] }`: beside the app, not over it |
| `flow` (as `diagram`) | `{ "kind": "flow", "title": "How it works", "nodes": [{ "label": "Your project", "sub": "untouched", "on": "project" }], "connect": true }`; `"stack": "branches"` adds the V01…V10 cells |

`on` is a word in the scene's line: the item appears when the voice says it
(the first match after the previous item's word; `edit.mjs` resolves it from
the word timings). Items without `on` follow the one before by 0.35 s. Cards
draw under the logo, chapter chip and captions. `from` / `until` (seconds into
the scene), `fromOn` (open on a word), `untilEnd` (close that many seconds
before the scene ends) and `source` (a small source line) also work on any
card. A scene's `rest` (ms) adds silence after its line.

To check a card without a take, serve `stage/` with a stub `/_seekreel/stage.js`
and a synthetic `timeline.light.json`, and screenshot `light.html?t=…`.

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

- **Pronunciation:** captions show `text`; the voice reads it through
  `pronunciations.json`, which swaps listed words for aliases (`npx` →
  "N P X", `WCAG` → "wuh-kag", `V10` → "V ten", `€3,490` → "three thousand
  four hundred ninety euros"). Aliases work on every ElevenLabs model, unlike
  phoneme tags. Word timings come back for the spoken words and are mapped
  onto the written ones, so captions stay exact. `npm run voice:lint` lists
  any word that looks risky (capitals inside or throughout, digits, symbols
  `& / # : ~`, file names, URLs) and has no rule; add one with a short `why`.
  A scene's `say` overrides its whole line. `npm run voice:dict` writes
  `pronunciations.pls` (a W3C PLS alias lexicon) and, with keys, uploads it
  as an ElevenLabs pronunciation dictionary; put the printed
  `ELEVEN_DICT_ID` / `ELEVEN_DICT_VERSION` in `.env` to send it with every
  line as well.
- **Pacing:** a calm read by default: stability 0.62, style 0.05, speed 0.95
  (`ELEVEN_STABILITY`, `ELEVEN_STYLE`, `ELEVEN_SPEED`), and 700 ms of silence
  after each line (`PAD_MS` in `lib/common.mjs`).
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
- **Which variant is kept:** `keep` in `script.json` (1 = Tactile imperfection).

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
