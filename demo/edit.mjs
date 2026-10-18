// Cut one take of the recording into the film, and write everything the
// SeekReel stage and the soundtrack read.
//
//   node edit.mjs --theme light|dark
//
// In:  video/<theme>/raw.mp4, video/raw-timeline.json (shared), audio/*
// Out: seekreel.<theme>.json           with a footage edit list: one clip per
//                                      scene, the wait sped up, transitions
//      build/<theme>/footage/          SeekReel's cut: one JPEG per film frame
//      timeline.<theme>.json           scenes, clicks and captions in film time
//      build/<theme>/cues.json         voice, UI sounds and the music bed
//      out/variantly-demo-<theme>.srt  captions for YouTube
//      seekreel.<theme>.vertical.json
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { at, FPS, HEIGHT, log, PAD_MS, readJson, run, script, seekreelDir, VOICE_LEAD, WIDTH, writeJson } from './lib/common.mjs';

const film = script();
// --theme light|dark: which recording to cut. Both come from one take.
const themeArg = process.argv.indexOf('--theme');
const THEME = themeArg > -1 ? process.argv[themeArg + 1] : 'light';
if (!['light', 'dark'].includes(THEME)) throw new Error(`--theme must be light or dark, got ${THEME}`);
const BUILD = `build/${THEME}`;
// One take, two themes: both pages were driven in lockstep, so they share one
// timeline. The dark recording started a moment after the light one; shift
// every in and out point by that, and the two films cut identically.
const raw = readJson(at('video', 'raw-timeline.json'));
const OFFSET = raw.offsets?.[THEME] ?? 0;
const durations = readJson(at('audio', 'durations.json'), {});
const byId = Object.fromEntries(film.scenes.map((s) => [s.id, s]));

const lineSeconds = (id) =>
  !byId[id]?.text ? (byId[id]?.hold ?? 0) / 1000 : durations[id] ?? (byId[id].text.split(/\s+/).length / 140) * 60;

// ------------------------------------------------------------ the edit

// One clip per scene, cut from the raw recording. A timelapse is sped up to
// fit its line; a few scene changes get a transition. SeekReel's `footage`
// step does the cutting and reports where every clip landed.
const TRANSITIONS = { hi: { type: 'fade', duration: 0.5 }, lapse: { type: 'fade', duration: 0.4 }, compare: { type: 'fadeblack', duration: 0.5 } };
const round3 = (n) => Math.round(n * 1000) / 1000;
// Dead air: an overrun longer than TIGHTEN_MIN s after a line (plus its pad)
// is sped up, at most TIGHTEN_MAX×, aiming to end TIGHTEN_KEEP s after it.
const TIGHTEN_MIN = 1.5;
const TIGHTEN_MAX = 3;
const TIGHTEN_KEEP = 0.5;
// A long overrun that would still run past TIGHTEN_LONG s at TIGHTEN_MAX× may go
// up to TIGHTEN_LONG_MAX× to fit TIGHTEN_LONG s (the website beat's concept swaps).
const TIGHTEN_LONG = 8;
const TIGHTEN_LONG_MAX = 5;
// The other way: a line longer than its footage slows the scene, down to this.
const STRETCH_MIN = 0.8;
// A timelapse with `realHead` (ms) first plays that long at real speed, under
// a real clock, and only then speeds up: the viewer sees the honest time
// before the fast part. The fast part is a second clip labelled "<id>+".
const clips = raw.scenes.flatMap((scene) => {
  const length = scene.end - scene.start;
  const from = round3(Math.max(0, scene.start - OFFSET));
  const clip = {
    label: scene.id,
    src: `video/${THEME}/raw.mp4`,
    // The length is computed once from the shared timeline, so both themes
    // get clips of exactly the same length.
    from,
    to: round3(from + round3(length)),
    ...(TRANSITIONS[scene.id] ? { transition: TRANSITIONS[scene.id] } : {}),
  };
  if (!scene.timelapse) {
    // Dead air: when a scene's actions ran past its line, play the overrun
    // faster (up to TIGHTEN_MAX×) so the scene ends just after the voice.
    // The line's own part stays at real speed, so the words still match.
    // A scene's `rest` (a deliberate silent hold, like the pause countdown) counts as its line.
    const spoken = byId[scene.id]?.text ? lineSeconds(scene.id) + PAD_MS / 1000 + (byId[scene.id].rest ?? 0) / 1000 : 0;
    // A line longer than its footage: play the scene a little slower (at
    // least STRETCH_MIN×), so the picture lasts as long as the voice.
    if (spoken && spoken > length + 0.2) return [{ ...clip, speed: Number(Math.max(STRETCH_MIN, length / spoken).toFixed(4)) }];
    const slack = length - spoken - TIGHTEN_KEEP;
    if (!spoken || slack <= TIGHTEN_MIN) return [clip];
    const cut = round3(from + spoken);
    const over = length - spoken;
    let fast = Math.min(TIGHTEN_MAX, over / TIGHTEN_KEEP);
    if (over / fast > TIGHTEN_LONG) fast = Math.min(TIGHTEN_LONG_MAX, over / TIGHTEN_LONG);
    const speed = Number(fast.toFixed(4));
    return [
      { ...clip, to: cut },
      { label: `${scene.id}+`, src: clip.src, from: cut, to: clip.to, speed },
    ];
  }
  const target = Math.max(lineSeconds(scene.id) + PAD_MS / 1000, (byId[scene.id]?.hold ?? 0) / 1000, 5);
  const head = round3(Math.min((byId[scene.id]?.realHead ?? 0) / 1000, length / 4, target / 2));
  if (head <= 0) return [{ ...clip, speed: Number(Math.max(1, length / target).toFixed(4)) }];
  return [
    { ...clip, to: round3(from + head) },
    { label: `${scene.id}+`, src: clip.src, from: round3(from + head), to: clip.to, speed: Number(Math.max(1, (length - head) / (target - head)).toFixed(4)) },
  ];
});

// The cold open: the payoff first. Quick cuts (up to ten; key 0 is V10) of the variants from the
// compare chapter (just after each number key), then a hold under the title.
const cold = film.scenes.find((s) => s.montage);
const shown = (raw.keys ?? []).filter((k) => /^[0-9]$/.test(k.key)).slice(0, 10);
if (cold && shown.length) {
  const cut = shown.length > 4 ? 0.6 : 0.9;
  const montage = shown.map((k, i) => ({
    label: `cold${i}`,
    src: `video/${THEME}/raw.mp4`,
    from: round3(k.t + 1.4 - OFFSET),
    to: round3(k.t + 1.4 - OFFSET + cut),
  }));
  const last = shown.at(-1);
  const rest = Math.max(1, (cold.hold ?? 7000) / 1000 - cut * shown.length);
  montage.push({ label: `cold${shown.length}`, src: `video/${THEME}/raw.mp4`, from: round3(last.t + 1.4 + cut - OFFSET), to: round3(last.t + 1.4 + cut - OFFSET + rest) });
  clips.unshift(...montage);
}

const SEEKREEL = seekreelDir();
const base = {
  fps: FPS,
  background: '#0d0d10',
  audio: { engine: 'cues', cues: `${BUILD}/cues.json`, wav: `${BUILD}/soundtrack.wav` },
  probe: 'probe',
  deliver: 'out',
  encode: { crf: 18, keyint: FPS },
};
const wide = {
  name: `variantly-demo-${THEME}`,
  stage: `stage/${THEME}.html`,
  duration: 'footage',
  width: WIDTH,
  height: HEIGHT,
  out: `${BUILD}/frames-16x9`,
  footage: { out: `${BUILD}/footage`, fit: 'cover', quality: 3, clips },
  ...base,
  variants: [{ name: '' }, { name: 'silent', audio: false }],
};
writeJson(at(`seekreel.${THEME}.json`), wide);
log('edit', `cutting ${clips.length} clips with SeekReel`);
for (const c of clips) {
  if (!c.label.endsWith('+') || byId[c.label.slice(0, -1)]?.timelapse) continue;
  const over = c.to - c.from;
  log('edit', `tightened ${c.label.slice(0, -1)}: ${over.toFixed(1)}s overrun → ${(over / c.speed).toFixed(1)}s (×${c.speed})`);
}
await run(process.execPath, [path.join(SEEKREEL, 'bin', 'seekreel.ts'), 'footage', '-c', at(`seekreel.${THEME}.json`)]);
const footage = readJson(at(BUILD, 'footage', 'footage.json'));
const total = footage.duration;

const placed = Object.fromEntries(footage.clips.map((c) => [c.label, c]));
function toFilm(t) {
  const scene = raw.scenes.find((s) => t >= s.start && t <= s.end);
  if (!scene) return null;
  const fast = placed[`${scene.id}+`];
  const clip = fast && t - OFFSET >= fast.from ? fast : placed[scene.id];
  return clip.start + (t - OFFSET - clip.from) / clip.speed;
}

// ------------------------------------------------------------ captions

function wordsFor(id, voiceAt) {
  const file = at('audio', `${id}.words.json`);
  if (existsSync(file)) {
    return readJson(file).map((w) => ({ ...w, start: w.start + voiceAt, end: w.end + voiceAt }));
  }
  // No voice yet: spread the words evenly so a dry run still has captions.
  const words = byId[id].text.split(/\s+/);
  const each = lineSeconds(id) / words.length;
  return words.map((word, i) => ({ word, start: voiceAt + i * each, end: voiceAt + (i + 1) * each }));
}

/**
 * A card or diagram with its reveals in film time: each item, node or row
 * with `on` appears when the voice says that word (the first match after the
 * previous one); items without `on` follow the one before by 0.35 s.
 */
function synced(spec, id, voiceAt, start) {
  if (!spec) return null;
  const words = byId[id].text ? wordsFor(id, voiceAt) : [];
  const norm = (w) => w.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
  let cursor = 0;
  let last = start + 0.6;
  const place = (list) =>
    list?.map((item, i) => {
      let at = i ? last + 0.35 : last;
      if (item.on) {
        const k = words.findIndex((w, j) => j >= cursor && norm(w.word) === norm(item.on));
        if (k > -1) {
          at = words[k].start;
          cursor = k + 1;
        } else log('edit', `${id}: no word "${item.on}" in the line; revealing in sequence`);
      }
      last = at;
      return { ...item, at: round3(at) };
    });
  // A card's window can open on a word, and a countdown can start when one ends.
  const find = (word, end) => {
    const w = words.find((x) => norm(x.word) === norm(word));
    if (!w) log('edit', `${id}: no word "${word}" in the line`);
    return w ? round3(end ? w.end : w.start) : undefined;
  };
  const fromAt = spec.fromOn ? find(spec.fromOn) : undefined;
  const countAt = spec.countOn ? find(spec.countOn, true) : undefined;
  return { ...spec, fromAt, countAt, nodes: place(spec.nodes), rows: place(spec.rows), items: place(spec.items) };
}

/** Words → caption cues: at most ~42 characters, broken at sentence ends. */
function cuesFrom(words) {
  const out = [];
  let current = null;
  for (const w of words) {
    if (current && (current.text.length + w.word.length + 1 > 42)) current = null;
    if (!current) {
      current = { start: w.start, end: w.end, text: w.word };
      out.push(current);
    } else {
      current.text += ` ${w.word}`;
      current.end = w.end;
    }
    if (/[.!?]$/.test(w.word)) current = null;
  }
  return out;
}

// The cold open's cuts are one scene.
const sceneClips = [];
// So is a timelapse's real-speed head with its fast part ("<id>+").
for (const clip of footage.clips) {
  const label = clip.label.startsWith('cold') ? cold.id : clip.label.replace(/\+$/, '');
  const prev = sceneClips.at(-1);
  if (prev && prev.label === label) {
    prev.end = clip.end;
    if (clip.label.endsWith('+')) Object.assign(prev, { fastAt: clip.start, speed: clip.speed });
  } else sceneClips.push({ ...clip, label });
}

// Terminal cards filled from what the take captured: `capture: "stacks"` is
// the stack montage, `capture: "fail"` the doctor ✗ (stacks.mjs). Without a
// capture the script's own lines stay.
const doctor = readJson(at('video', 'doctor.json'), null);
function terminalFor(def) {
  const term = def.terminal;
  if (!term?.capture || !doctor) return term ?? null;
  if (term.capture === 'stacks') return { ...term, sequence: doctor.stacks.map((s) => ({ title: s.title, prompt: `${s.title} $`, lines: s.lines })) };
  if (term.capture === 'fail') return { ...term, title: doctor.fail.title, prompt: `${doctor.fail.title} $`, lines: doctor.fail.lines };
  return term;
}
// How long the run had taken when a timelapse began, and in all
// (script.json `clockFrom` names the mark the clock counts from).
function clockFor(def, clipLabel) {
  const rawScene = raw.scenes.find((s) => s.id === clipLabel);
  const mark = def.clockFrom && raw.marks?.[def.clockFrom];
  if (!rawScene || mark == null) return null;
  return { from: round3(rawScene.start - mark), total: round3(rawScene.end - mark) };
}
const scenes = sceneClips.map((clip, i) => {
  const def = byId[clip.label];
  // A scene starts once the transition into it has finished.
  const start = clip.start + clip.transition.duration;
  const end = sceneClips[i + 1]?.start ?? clip.end;
  const voiceAt = start + VOICE_LEAD;
  return {
    id: clip.label,
    start,
    end,
    // Only a timelapse shows its speed (the ▶▶ chip); a tightened overrun plays quietly.
    speed: def.timelapse ? Number(clip.speed.toFixed(2)) : 1,
    fastAt: def.timelapse ? clip.fastAt ?? null : null,
    clock: def.timelapse ? clockFor(def, clip.label) : null,
    voiceAt,
    voice: lineSeconds(clip.label),
    step: def.step ?? null,
    chapter: def.chapter ?? null,
    lower: def.lower ?? null,
    kinetic: def.kinetic ?? null,
    diagram: typeof def.diagram === 'object' ? synced(def.diagram, clip.label, voiceAt, start) : def.diagram ?? null,
    card: synced(def.card, clip.label, voiceAt, start),
    terminal: terminalFor(def),
    // The end card can wait for a word (`fromOn`), so the closing line plays over the kept site first.
    cta: def.cta ? synced(def.cta, clip.label, voiceAt, start) : null,
    montage: !!def.montage,
    captions: def.text ? cuesFrom(wordsFor(clip.label, voiceAt)) : [],
  };
});
const captions = scenes.flatMap((s) => s.captions);
// Close tiny gaps so captions do not flicker off between phrases.
captions.forEach((c, i) => {
  const next = captions[i + 1];
  if (next && next.start - c.end < 0.35) c.end = next.start;
  else c.end += 0.25;
});

const clicks = raw.clicks
  .map((c) => ({ ...c, t: toFilm(c.t) }))
  .filter((c) => c.t !== null && c.t < total);

// The cursor, in film time. The stage draws it, so it stays crisp and moves
// on every frame however the recording's frame rate wobbled.
const path_ = (raw.cursor?.path ?? [])
  .map(([t, x, y]) => [toFilm(t), x, y])
  .filter(([t]) => t !== null && t <= total)
  .map(([t, x, y]) => [Number(t.toFixed(3)), x, y]);
const presses = (raw.cursor?.presses ?? [])
  .map((p) => ({ ...p, t: toFilm(p.t), hold: p.hold / (placed[raw.scenes.find((s) => p.t >= s.start && p.t <= s.end)?.id]?.speed ?? 1) }))
  .filter((p) => p.t !== null && p.t < total);
const cursor = { path: path_, presses };

const spotlights = (raw.spotlights ?? [])
  .map((s) => ({ ...s, t0: toFilm(s.t0), t1: toFilm(s.t1) }))
  .filter((s) => s.t0 !== null && s.t1 !== null);
const keys = (raw.keys ?? []).map((k) => ({ ...k, t: toFilm(k.t) })).filter((k) => k.t !== null);
const chapters = scenes.filter((s) => s.chapter || s.montage).map((s) => ({ t: s.montage ? 0 : s.start, title: s.chapter?.title ?? 'Intro' }));

writeJson(at(`timeline.${THEME}.json`), { variantly: raw.variantly ?? null, fps: FPS, width: WIDTH, height: HEIGHT, duration: total, scenes, clicks, captions, cursor, spotlights, keys, chapters, prompt: film.prompt ?? '$', diffstat: raw.diffstat ?? '', branches: raw.branches ?? [], lastCommit: raw.lastCommit ?? '' });

const stamp = (t) => {
  const ms = Math.round(t * 1000);
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};
mkdirSync(at('out'), { recursive: true });
writeFileSync(
  at('out', `variantly-demo-${THEME}.srt`),
  captions.map((c, i) => `${i + 1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}\n`).join('\n'),
);

const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
writeFileSync(
  at('out', `youtube-description-${THEME}.txt`),
  [
    'N redesigns of your site, side by side. Keep one. All you need is Node and Claude Code: npx variantly',
    '',
    'variantly.style',
    'Designs by Impeccable · impeccable.style',
    '',
    'Chapters',
    ...chapters.map((c) => `${mmss(c.t)} ${c.title}`),
    '',
    // The same list goes in the pinned comment (PINNED-COMMENT.md).
    'Commands shown',
    ...[...new Set(scenes.flatMap((s) => [s.terminal?.lines ?? [], ...(s.terminal?.sequence ?? []).map((p) => p.lines), s.terminal?.after ?? []].flat()).filter((l) => l.startsWith('$ ')).map((l) => l.slice(2)))],
    '',
    'Music: generated with SeekReel',
  ].join('\n') + '\n',
);

// ------------------------------------------------------------ soundtrack

const UI = {
  tick: { sound: 'tick', gain: 0.22 },
  pop: { sound: 'pop', gain: 0.35 },
  whoosh: { sound: 'whoosh', gain: 0.4 },
  stamp: { sound: 'stamp', gain: 0.45 },
};
const outro = scenes.find((s) => s.cta);
writeJson(at(BUILD, 'cues.json'), {
  duration: total,
  sampleRate: 48000,
  // With a Strudel score (music/full.strudel) the music is mixed in by build.mjs instead.
  bed: existsSync(at('music', 'full.strudel')) ? undefined : {
    tempo: 92,
    barsPerChord: 2,
    progression: [
      { tones: ['D3', 'F3', 'A3', 'C4'], root: 'D2' },
      { tones: ['Bb2', 'D3', 'F3', 'A3'], root: 'Bb1' },
      { tones: ['F3', 'A3', 'C4', 'E4'], root: 'F2' },
      { tones: ['C3', 'E3', 'G3', 'Bb3'], root: 'C2' },
    ],
    figure: [0, 2, 1, 3],
    dense: [scenes[1]?.start ?? 0, outro?.start ?? total],
    bassFrom: scenes[1]?.start ?? 0,
    shaker: false,
  },
  tracks: scenes
    .filter((s) => existsSync(at('audio', `${s.id}.wav`)))
    // Paths are relative to the cue sheet, which lives in build/<theme>/.
    .map((s) => ({ at: Number(s.voiceAt.toFixed(3)), file: `../../audio/${s.id}.wav`, gain: 1.0 })),
  duck: { gain: 0.22, attack: 0.15, release: 0.6 },
  cues: [
    { at: 0.05, sound: 'swell', note: 'D2', dur: 1.6, gain: 0.5 },
    // A hit on each cut of the cold open, a riser into every chapter.
    ...footage.clips.filter((c) => c.label.startsWith('cold')).map((c) => ({ at: Number(c.start.toFixed(3)), sound: 'stamp', gain: 0.5 })),
    ...scenes.filter((sc) => sc.chapter).map((sc) => ({ at: Number(Math.max(0, sc.start - 0.9).toFixed(3)), sound: 'swell', note: 'A2', dur: 1.1, gain: 0.32 })),
    ...keys.map((k) => ({ at: Number(k.t.toFixed(3)), sound: 'tick', gain: 0.2 })),
    ...clicks.map((c) => ({ at: Number(c.t.toFixed(3)), ...(UI[c.sound] ?? UI.tick) })),
    ...(outro ? [{ at: outro.start + 0.1, sound: 'chime', note: 'A5', gain: 0.35 }] : []),
  ],
  master: { fadeIn: 0.1, fadeOut: 1.5, peak: 0.8 },
});

// ------------------------------------------------------------ SeekReel configs

const compare = scenes.find((s) => s.id === 'compare');
writeJson(at(`seekreel.${THEME}.json`), { ...wide, poster: compare ? Number((compare.start + 2.5).toFixed(2)) : 1 });
// The vertical cut shows the same 16:9 footage through a moving window, so it
// reads the frames the wide config cut instead of cutting its own.
writeJson(at(`seekreel.${THEME}.thumb.json`), {
  name: `variantly-demo-${THEME}-thumbnail`,
  stage: `stage/thumb-${THEME}.html`,
  duration: 1,
  fps: 1,
  width: 1280,
  height: 720,
  out: `${BUILD}/frames-thumb`,
  probe: `${BUILD}/thumb`,
  deliver: 'out',
});
writeJson(at(`seekreel.${THEME}.vertical.json`), {
  name: `variantly-demo-${THEME}`,
  stage: `stage/vertical-${THEME}.html`,
  duration: total,
  width: 1080,
  height: 1920,
  out: `${BUILD}/frames-9x16`,
  ...base,
  variants: [{ name: 'vertical' }],
});

// ------------------------------------------------------------ smoothness

// Wherever the app itself moves (a scroll, a drag, typing), a frame that
// repeats the one before is a stutter. Count them in the cut footage.
{
  const { createHash } = await import('node:crypto');
  const { readFileSync, existsSync: has } = await import('node:fs');
  const frame = (i) => at(BUILD, 'footage', 'frames', `${String(i).padStart(5, '0')}.jpg`);
  let moving = 0;
  let repeats = 0;
  for (const [a, b] of raw.motion ?? []) {
    const from = toFilm(a), to = toFilm(b);
    if (from === null || to === null) continue;
    let last = null;
    for (let i = Math.ceil(from * FPS); i <= Math.floor(to * FPS); i++) {
      if (!has(frame(i))) break;
      const hash = createHash('md5').update(readFileSync(frame(i))).digest('hex');
      if (last !== null) {
        moving++;
        if (hash === last) repeats++;
      }
      last = hash;
    }
  }
  if (moving) {
    const share = repeats / moving;
    log('edit', `smoothness: ${repeats}/${moving} repeated frames while the app moves (${(share * 100).toFixed(1)}%)`);
    if (share > 0.1) log('edit', 'warning: more than 10% repeated frames in motion: the capture could not keep up. Close other apps, or record with --single.');
  }
}

for (const s of scenes) {
  log('edit', `${s.id.padEnd(9)} ${s.start.toFixed(2).padStart(6)}–${s.end.toFixed(2).padStart(6)}s${s.speed > 1 ? `  ×${s.speed}` : ''}`);
}
