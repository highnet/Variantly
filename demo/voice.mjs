// Narration: one ElevenLabs line per scene, with character timings for captions.
//
//   ELEVEN_API_KEY=... ELEVEN_VOICE_ID=... node voice.mjs [sceneId ...]
//   node voice.mjs --voice local     rehearsal voice, no keys: the system's own
//                                    speech (Windows SAPI, macOS say, espeak)
//   node voice.mjs --lint            list narration words with no pronunciation
//                                    rule (capitals, digits, symbols); exit 1 if any
//   node voice.mjs --dict            write pronunciations.pls and, with keys,
//                                    upload it as an ElevenLabs dictionary
//
// Captions keep the written text; the voice reads the spoken text that
// lib/pronounce.mjs makes from it with pronunciations.json (or a scene's own
// `say`). Word timings are mapped back onto the written words.
//
// Writes audio/<id>.mp3, audio/<id>.wav (48 kHz, what SeekReel mixes),
// audio/<id>.words.json (word timings) and audio/durations.json.
// A scene whose text has not changed since its last render is skipped, so
// editing one line costs one request.
import { createHash } from 'node:crypto';
import { existsSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { at, duration, ffmpeg, log, readJson, run, script, writeJson } from './lib/common.mjs';
import { risky, toPls, toSpoken, toWritten } from './lib/pronounce.mjs';

const args = process.argv.slice(2);
const voiceFlag = args.indexOf('--voice');
const wantLocal = voiceFlag > -1 && args[voiceFlag + 1] === 'local';
if (voiceFlag > -1) args.splice(voiceFlag, 2);

if (args.includes('--lint')) {
  let bad = 0;
  for (const scene of script().scenes) {
    if (!scene.text) continue;
    const words = risky(scene.text);
    if (words.length) {
      bad += words.length;
      console.log(`${scene.id}: ${words.join(', ')}`);
    }
  }
  if (bad) {
    console.log(`\n${bad} word(s) without a pronunciation rule. Add them to pronunciations.json (or give the scene a "say").`);
    process.exit(1);
  }
  log('voice', 'lint: every risky word has a pronunciation rule');
  process.exit(0);
}

const key = process.env.ELEVEN_API_KEY;
const voice = process.env.ELEVEN_VOICE_ID;
const LOCAL = wantLocal || !key || !voice;
if (LOCAL && !wantLocal) {
  log('voice', 'No ELEVEN_API_KEY / ELEVEN_VOICE_ID: using the local rehearsal voice. Fill in .env for the real one.');
}

/**
 * The rehearsal voice: whatever speech the system has. Timings are only
 * approximate, so a rehearsal's captions and holds are close, not exact.
 */
async function speakLocally(text, wav) {
  const txt = `${wav}.txt`;
  writeFileSync(txt, text);
  try {
    if (process.platform === 'win32') {
      const ps = `Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; ` +
        `$s.SetOutputToWaveFile('${wav.replace(/'/g, "''")}'); $s.Speak([IO.File]::ReadAllText('${txt.replace(/'/g, "''")}')); $s.Dispose()`;
      await run('powershell', ['-NoProfile', '-Command', ps], { quiet: true });
    } else if (process.platform === 'darwin') {
      await run('say', ['-f', txt, '-o', `${wav}.aiff`], { quiet: true });
      await ffmpeg(['-i', `${wav}.aiff`, wav]);
      rmSync(`${wav}.aiff`, { force: true });
    } else {
      const engine = await run('espeak-ng', ['--version'], { quiet: true }).then(() => 'espeak-ng', () => 'espeak');
      await run(engine, ['-s', '165', '-f', txt, '-w', wav], { quiet: true });
    }
  } finally {
    rmSync(txt, { force: true });
  }
}

/** Approximate word timings: each word's share of the line by its length. */
function spreadWords(text, seconds) {
  const list = text.split(/\s+/).filter(Boolean);
  const weight = list.map((w) => w.length + 1);
  const total = weight.reduce((a, b) => a + b, 0);
  let at = 0;
  return list.map((word, i) => {
    const span = (seconds * weight[i]) / total;
    const out = { word, start: Number(at.toFixed(3)), end: Number((at + span).toFixed(3)) };
    at += span;
    return out;
  });
}

const model = process.env.ELEVEN_MODEL || 'eleven_multilingual_v2';
// A calm, even read: a little more stability, almost no style, slightly
// under normal speed.
const settings = {
  stability: Number(process.env.ELEVEN_STABILITY ?? 0.62),
  similarity_boost: Number(process.env.ELEVEN_SIMILARITY ?? 0.8),
  style: Number(process.env.ELEVEN_STYLE ?? 0.05),
  speed: Number(process.env.ELEVEN_SPEED ?? 0.95),
  use_speaker_boost: true,
};
// An uploaded pronunciation dictionary (voice.mjs --dict prints these).
// Optional: the aliases are already applied to the text.
const dictionary = process.env.ELEVEN_DICT_ID
  ? [{ pronunciation_dictionary_id: process.env.ELEVEN_DICT_ID, version_id: process.env.ELEVEN_DICT_VERSION }]
  : undefined;

if (args.includes('--dict')) {
  writeFileSync(at('pronunciations.pls'), toPls());
  log('voice', 'wrote pronunciations.pls');
  if (LOCAL) {
    log('voice', 'No ElevenLabs keys: not uploaded. The aliases still apply to the text.');
    process.exit(0);
  }
  const form = new FormData();
  form.append('name', 'variantly-demo');
  form.append('file', new Blob([toPls()], { type: 'application/pls+xml' }), 'pronunciations.pls');
  const res = await fetch('https://api.elevenlabs.io/v1/pronunciation-dictionaries/add-from-file', { method: 'POST', headers: { 'xi-api-key': key }, body: form });
  if (!res.ok) {
    console.error(`ElevenLabs ${res.status}: ${await res.text()}`);
    process.exit(1);
  }
  const body = await res.json();
  log('voice', `uploaded. Add to .env:\nELEVEN_DICT_ID=${body.id}\nELEVEN_DICT_VERSION=${body.version_id}`);
  process.exit(0);
}

const only = new Set(args);
const scenes = script().scenes;
mkdirSync(at('audio'), { recursive: true });
const manifest = readJson(at('audio', 'manifest.json'), {});
const durations = readJson(at('audio', 'durations.json'), {});

/** Character alignment → words with start/end seconds. */
function words(alignment) {
  const out = [];
  let current = null;
  alignment.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) {
      current = null;
      return;
    }
    if (!current) {
      current = { word: '', start: alignment.character_start_times_seconds[i], end: 0 };
      out.push(current);
    }
    current.word += ch;
    current.end = alignment.character_end_times_seconds[i];
  });
  return out;
}

// Each line is generated with its neighbours as context, so the read flows
// like one take instead of twelve separate ones.
for (const [i, scene] of scenes.entries()) {
  if (only.size && !only.has(scene.id)) continue;
  const line = toSpoken(scene.text, scene.say);
  const hash = createHash('sha1').update(JSON.stringify(LOCAL ? [line.spoken, scene.text, 'local'] : [line.spoken, scene.text, voice, model, settings, dictionary])).digest('hex');
  const mp3 = at('audio', `${scene.id}.mp3`);
  if (!only.size && manifest[scene.id] === hash && existsSync(mp3)) {
    log('voice', `${scene.id}: unchanged`);
    continue;
  }

  // A scene with no line (kinetic type, a silent timelapse) gets a short
  // silence: eleven_v3 and later reject empty text.
  if (!line.spoken.trim()) {
    const silence = ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono', '-t', '0.35'];
    await ffmpeg([...silence, at('audio', `${scene.id}.wav`)]);
    await ffmpeg([...silence, '-b:a', '128k', mp3]);
    durations[scene.id] = Number((await duration(mp3)).toFixed(3));
    writeJson(at('audio', `${scene.id}.words.json`), []);
    manifest[scene.id] = hash;
    log('voice', `${scene.id}: ${durations[scene.id]}s (silent)`);
    continue;
  }

  if (LOCAL) {
    const raw = at('audio', `${scene.id}.local.wav`);
    await speakLocally(line.spoken, raw);
    await ffmpeg(['-i', raw, '-ar', '48000', '-ac', '1', at('audio', `${scene.id}.wav`)]);
    await ffmpeg(['-i', raw, '-b:a', '128k', mp3]);
    rmSync(raw, { force: true });
    durations[scene.id] = Number((await duration(mp3)).toFixed(3));
    writeJson(at('audio', `${scene.id}.words.json`), toWritten(spreadWords(line.spoken, durations[scene.id]), line));
    manifest[scene.id] = hash;
    log('voice', `${scene.id}: ${durations[scene.id]}s (local)`);
    continue;
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'xi-api-key': key, 'content-type': 'application/json' },
      body: JSON.stringify({
        text: line.spoken,
        model_id: model,
        voice_settings: settings,
        pronunciation_dictionary_locators: dictionary,
        previous_text: scenes[i - 1] && toSpoken(scenes[i - 1].text, scenes[i - 1].say).spoken,
        next_text: scenes[i + 1] && toSpoken(scenes[i + 1].text, scenes[i + 1].say).spoken,
      }),
    },
  );
  if (!response.ok) {
    console.error(`ElevenLabs ${response.status} for "${scene.id}": ${await response.text()}`);
    process.exit(1);
  }
  const body = await response.json();
  writeFileSync(mp3, Buffer.from(body.audio_base64, 'base64'));
  writeJson(at('audio', `${scene.id}.words.json`), toWritten(words(body.alignment), line));
  // SeekReel's cue engine mixes WAV; 48 kHz matches its default rate.
  await ffmpeg(['-i', mp3, '-ar', '48000', '-ac', '1', at('audio', `${scene.id}.wav`)]);

  durations[scene.id] = Number((await duration(mp3)).toFixed(3));
  manifest[scene.id] = hash;
  log('voice', `${scene.id}: ${durations[scene.id]}s`);
}

writeJson(at('audio', 'durations.json'), durations);
writeJson(at('audio', 'manifest.json'), manifest);
const total = scenes.reduce((sum, s) => sum + (durations[s.id] ?? 0), 0);
log('voice', `total narration ${total.toFixed(1)}s`);
