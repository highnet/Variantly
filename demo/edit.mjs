// Cut one take of the recording into the film, and write everything the
// SeekReel stage and the soundtrack read.
//
//   node edit.mjs --theme light|dark
//
// In:  video/<theme>/raw.webm, video/raw-timeline.json (shared), audio/*
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

const lineSeconds = (id) => durations[id] ?? (byId[id].text.split(/\s+/).length / 150) * 60;

// ------------------------------------------------------------ the edit

// One clip per scene, cut from the raw recording. A timelapse is sped up to
// fit its line; a few scene changes get a transition. SeekReel's `footage`
// step does the cutting and reports where every clip landed.
const TRANSITIONS = { generate: { type: 'fade', duration: 0.4 }, compare: { type: 'fadeblack', duration: 0.5 } };
const round3 = (n) => Math.round(n * 1000) / 1000;
const clips = raw.scenes.map((scene) => {
  const length = scene.end - scene.start;
  const target = scene.timelapse ? Math.max(lineSeconds(scene.id) + PAD_MS / 1000, 5) : length;
  return {
    label: scene.id,
    src: `video/${THEME}/raw.webm`,
    // The length is computed once from the shared timeline, so both themes
    // get clips of exactly the same length.
    from: round3(Math.max(0, scene.start - OFFSET)),
    to: round3(Math.max(0, scene.start - OFFSET) + round3(length)),
    ...(scene.timelapse ? { speed: Number(Math.max(1, length / target).toFixed(4)) } : {}),
    ...(TRANSITIONS[scene.id] ? { transition: TRANSITIONS[scene.id] } : {}),
  };
});

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
await run(process.execPath, [path.join(SEEKREEL, 'bin', 'seekreel.ts'), 'footage', '-c', at(`seekreel.${THEME}.json`)]);
const footage = readJson(at(BUILD, 'footage', 'footage.json'));
const total = footage.duration;

const placed = Object.fromEntries(footage.clips.map((c) => [c.label, c]));
function toFilm(t) {
  const scene = raw.scenes.find((s) => t >= s.start && t <= s.end);
  if (!scene) return null;
  const clip = placed[scene.id];
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

const scenes = footage.clips.map((clip, i) => {
  const def = byId[clip.label];
  // A scene starts once the transition into it has finished.
  const start = clip.start + clip.transition.duration;
  const end = footage.clips[i + 1]?.start ?? clip.end;
  const voiceAt = start + VOICE_LEAD;
  return {
    id: clip.label,
    start,
    end,
    speed: Number(clip.speed.toFixed(2)),
    voiceAt,
    voice: lineSeconds(clip.label),
    title: def.title ?? null,
    presenter: def.presenter ?? null,
    step: def.step ?? null,
    terminal: def.terminal ?? null,
    cta: def.cta ?? null,
    captions: cuesFrom(wordsFor(clip.label, voiceAt)),
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

writeJson(at(`timeline.${THEME}.json`), { fps: FPS, width: WIDTH, height: HEIGHT, duration: total, scenes, clicks, captions });

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
  bed: {
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

for (const s of scenes) {
  log('edit', `${s.id.padEnd(9)} ${s.start.toFixed(2).padStart(6)}–${s.end.toFixed(2).padStart(6)}s${s.speed > 1 ? `  ×${s.speed}` : ''}`);
}
