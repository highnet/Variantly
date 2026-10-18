#!/usr/bin/env node
/**
 * The short cuts (cuts.json): a 90 s and a 60 s film per theme, each with its
 * own voice lines, cut from the full film's picture.
 *
 *   npm run build -- --no-captions   once: out/variantly-demo-<theme>-nocaptions.mp4
 *   npm run cuts                     every cut, both themes
 *   node cuts.mjs 60s --theme dark   one cut, one theme
 *
 * Per cut and theme:
 *   1. voices each beat's line with the same ElevenLabs voice, model and
 *      settings as voice.mjs (audio/cuts/, re-read only when the line changes);
 *   2. takes the beat's shots from the no-captions film, at real speed, sharing
 *      the line's length (plus a breath) between them;
 *   3. mixes the voice with SeekReel's cue engine, then ducks the cut's Strudel
 *      score (music/cut-<id>.strudel, rendered by music.mjs) under it;
 *   4. burns in captions from the word timings, and writes
 *      out/variantly-demo-<theme>-<cut>.mp4 and its .srt.
 */
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { at, duration, ffmpeg, log, readJson, run, seekreelDir, takeFacts, writeJson, FPS, WIDTH, HEIGHT } from './lib/common.mjs';
import { risky, toSpoken, toWritten } from './lib/pronounce.mjs';
import { duckUnder, musicFor } from './music.mjs';

const args = process.argv.slice(2);
const themeAt = args.indexOf('--theme');
const themes = themeAt > -1 ? [args.splice(themeAt, 2)[1]] : ['light', 'dark'];
const { cuts } = readJson(at('cuts.json'));
const wanted = args.length ? cuts.filter((c) => args.includes(c.id)) : cuts;
if (!wanted.length) throw new Error(`No cut named ${args.join(', ')} in cuts.json (${cuts.map((c) => c.id).join(', ')}).`);

const BREATH = 0.45; // silence after each line before the next beat
const LEAD = 0.15; // the voice starts this long into its beat

// ------------------------------------------------------------ voice

const facts = takeFacts();
const fill = (text) => text.replace(/\{\{(\w+)\}\}/g, (m, k) => facts[k] ?? m);
const key = process.env.ELEVEN_API_KEY;
const voice = process.env.ELEVEN_VOICE_ID;
if (!key || !voice) throw new Error('The cuts need ELEVEN_API_KEY and ELEVEN_VOICE_ID in .env.');
const model = process.env.ELEVEN_MODEL || 'eleven_multilingual_v2';
const settings = {
  stability: Number(process.env.ELEVEN_STABILITY ?? 0.62),
  similarity_boost: Number(process.env.ELEVEN_SIMILARITY ?? 0.8),
  style: Number(process.env.ELEVEN_STYLE ?? 0.05),
  speed: Number(process.env.ELEVEN_SPEED ?? 0.95),
  use_speaker_boost: true,
};
const VOICE_DIR = at('audio', 'cuts');
mkdirSync(VOICE_DIR, { recursive: true });
const manifest = readJson(path.join(VOICE_DIR, 'manifest.json'), {});

function words(alignment) {
  const out = [];
  let current = null;
  alignment.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) return void (current = null);
    if (!current) out.push((current = { word: '', start: alignment.character_start_times_seconds[i], end: 0 }));
    current.word += ch;
    current.end = alignment.character_end_times_seconds[i];
  });
  return out;
}

/** Voices one beat; returns { wav, seconds, words } with words in written form. */
async function voiceBeat(cut, beats, i) {
  const beat = beats[i];
  const text = fill(beat.text);
  const bad = risky(text);
  if (bad.length) log('cuts', `warning: ${cut.id}/${beat.id}: no pronunciation rule for ${bad.join(', ')}`);
  const line = toSpoken(text, beat.say && fill(beat.say));
  const name = `${cut.id}-${beat.id}`;
  const mp3 = path.join(VOICE_DIR, `${name}.mp3`);
  const wav = path.join(VOICE_DIR, `${name}.wav`);
  const wordsFile = path.join(VOICE_DIR, `${name}.words.json`);
  const hash = createHash('sha1').update(JSON.stringify([line.spoken, text, voice, model, settings])).digest('hex');
  if (manifest[name] !== hash || !existsSync(mp3) || !existsSync(wav)) {
    const near = (k) => beats[k] && toSpoken(fill(beats[k].text)).spoken;
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/with-timestamps?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'content-type': 'application/json' },
      body: JSON.stringify({ text: line.spoken, model_id: model, voice_settings: settings, previous_text: near(i - 1), next_text: near(i + 1) }),
    });
    if (!res.ok) throw new Error(`ElevenLabs ${res.status} for ${name}: ${await res.text()}`);
    const body = await res.json();
    writeFileSync(mp3, Buffer.from(body.audio_base64, 'base64'));
    writeJson(wordsFile, toWritten(words(body.alignment), line));
    await ffmpeg(['-i', mp3, '-ar', '48000', '-ac', '1', wav]);
    manifest[name] = hash;
    writeJson(path.join(VOICE_DIR, 'manifest.json'), manifest);
    log('cuts', `voiced ${name}`);
  }
  return { wav, seconds: await duration(mp3), words: readJson(wordsFile) };
}

// ------------------------------------------------------------ captions

/** Words → short caption phrases: at most 7 words, broken after punctuation. */
function phrases(list) {
  const out = [];
  let cur = null;
  for (const w of list) {
    if (!cur) out.push((cur = { start: w.start, end: w.end, text: w.word, n: 1 }));
    else Object.assign(cur, { end: w.end, text: `${cur.text} ${w.word}`, n: cur.n + 1 });
    if (/[.!?,:;]$/.test(w.word) || cur.n >= 7) cur = null;
  }
  // Hold each phrase until the next one starts (or briefly past its last word).
  return out.map((p, i) => ({ ...p, end: Math.max(p.end, Math.min(out[i + 1]?.start ?? p.end + 0.6, p.end + 0.6)) }));
}

const stamp = (s, sep) => {
  const ms = Math.round(s * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor(ms / 60000) % 60;
  const sec = Math.floor(ms / 1000) % 60;
  if (sep === '.') return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(Math.floor((ms % 1000) / 10)).padStart(2, '0')}`;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
};

function ass(lines) {
  const head = [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${WIDTH}`,
    `PlayResY: ${HEIGHT}`,
    'WrapStyle: 0',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    // White on a soft dark box, bottom centre, clear of the logo and the chapter chip.
    'Style: Cap,Arial,52,&H00FFFFFF,&H00FFFFFF,&H64101014,&H64101014,1,0,0,0,100,100,0,0,3,14,0,2,200,200,72,1',
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ];
  return [...head, ...lines.map((l) => `Dialogue: 0,${stamp(l.start, '.')},${stamp(l.end, '.')},Cap,,0,0,0,,${l.text}`)].join('\n') + '\n';
}

const srt = (lines) => lines.map((l, i) => `${i + 1}\n${stamp(l.start)} --> ${stamp(l.end)}\n${l.text}\n`).join('\n');

// ------------------------------------------------------------ the cut

const SEEKREEL = seekreelDir();
const PYTHON = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const r3 = (n) => Math.round(n * 1000) / 1000;

async function build(cut, theme) {
  const film = at('out', `variantly-demo-${theme}-nocaptions.mp4`);
  if (!existsSync(film)) throw new Error(`Missing ${path.relative(at(), film)}: run \`node build.mjs wide --no-captions --theme ${theme}\` first.`);
  const tl = readJson(at(`timeline.${theme}.json`));
  const sceneOf = (id) => tl.scenes.find((s) => s.id === id) ?? (() => { throw new Error(`${cut.id}: no scene "${id}" in timeline.${theme}.json`); })();
  const keyAt = (k) => (tl.keys.find((x) => x.key === k) ?? (() => { throw new Error(`${cut.id}: key ${k} was never pressed in the take`); })()).t + 1.0;

  const dir = at('build', theme, 'cuts', cut.id);
  mkdirSync(dir, { recursive: true });
  const segments = [];
  const tracks = [];
  const caps = [];
  let t = 0;
  for (const [i] of cut.beats.entries()) {
    const beat = cut.beats[i];
    const v = await voiceBeat(cut, cut.beats, i);
    const length = r3(LEAD + v.seconds + BREATH);
    tracks.push({ at: r3(t + LEAD), file: v.wav, gain: 1.0 });
    caps.push(...phrases(v.words.map((w) => ({ ...w, start: w.start + t + LEAD, end: w.end + t + LEAD }))));
    const fixed = beat.shots.reduce((sum, s) => sum + (s.dur ?? 0), 0);
    const free = beat.shots.filter((s) => s.dur == null).length;
    const each = free ? Math.max(0.8, (length - fixed) / free) : 0;
    let used = 0;
    for (const [j, shot] of beat.shots.entries()) {
      // The last shot takes whatever is left, so the beat lands exactly on its line.
      const dur = j === beat.shots.length - 1 ? r3(length - used) : r3(shot.dur ?? each);
      const scene = shot.scene && sceneOf(shot.scene);
      const from = shot.key ? keyAt(shot.key) : shot.fromEnd != null ? scene.end - shot.fromEnd : scene.start + (shot.from ?? 0);
      segments.push({ from: r3(Math.min(Math.max(0, from), tl.duration - dur)), dur });
      used += dur;
    }
    t = r3(t + length);
  }
  const total = t;

  // Sound: the cut's own lines and two cues, then its Strudel score
  // (music/cut-<id>.strudel) ducked under them.
  const cues = {
    duration: total,
    sampleRate: 48000,
    tracks,
    cues: [{ at: 0.05, sound: 'swell', note: 'D2', dur: 1.6, gain: 0.4 }, { at: Math.max(0, total - 4), sound: 'chime', note: 'A5', gain: 0.3 }],
    master: { fadeIn: 0.1, fadeOut: 1.2, peak: 0.72 },
  };
  writeJson(path.join(dir, 'cues.json'), cues);
  const voiceOnly = path.join(dir, 'soundtrack.voice.wav');
  await run(PYTHON, [path.join(SEEKREEL, 'src', 'audio', 'render.py'), '--cues', path.join(dir, 'cues.json'), '--out', voiceOnly]);
  const score = at('music', `cut-${cut.id}.strudel`);
  const wav = path.join(dir, 'soundtrack.wav');
  if (existsSync(score)) await duckUnder(voiceOnly, await musicFor(score, total), wav, total);
  else copyFileSync(voiceOnly, wav);

  // Picture: the shots joined with hard cuts, captions burned in.
  writeFileSync(path.join(dir, 'captions.ass'), ass(caps));
  const inputs = segments.flatMap((s) => ['-ss', String(s.from), '-t', String(s.dur), '-i', film]);
  const chain = segments.map((_, k) => `[${k}:v]settb=AVTB,setpts=PTS-STARTPTS,fps=${FPS},format=yuv420p[v${k}]`).join(';');
  const join = `${segments.map((_, k) => `[v${k}]`).join('')}concat=n=${segments.length}:v=1:a=0[cut];[cut]subtitles=captions.ass[out]`;
  const name = `variantly-demo-${theme}-${cut.id}`;
  const mp4 = at('out', `${name}.mp4`);
  await ffmpeg(
    [...inputs, '-i', wav, '-filter_complex', `${chain};${join}`, '-map', '[out]', '-map', `${segments.length}:a`,
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-g', String(FPS), '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '192k', '-t', String(total), '-movflags', '+faststart', mp4],
    // subtitles= reads captions.ass relative to here: no drive-letter escaping on Windows.
    { cwd: dir },
  );
  writeFileSync(at('out', `${name}.srt`), srt(caps));
  log('cuts', `${name}.mp4: ${total.toFixed(1)}s, ${segments.length} shots`);
}

for (const cut of wanted) for (const theme of themes) await build(cut, theme);
