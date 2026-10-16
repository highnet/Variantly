// Narration: one ElevenLabs line per scene, with character timings for captions.
//
//   ELEVEN_API_KEY=... ELEVEN_VOICE_ID=... node voice.mjs [sceneId ...]
//   node voice.mjs --voice local     rehearsal voice, no keys: the system's own
//                                    speech (Windows SAPI, macOS say, espeak)
//
// Writes audio/<id>.mp3, audio/<id>.wav (48 kHz, what SeekReel mixes),
// audio/<id>.words.json (word timings) and audio/durations.json.
// A scene whose text has not changed since its last render is skipped, so
// editing one line costs one request.
import { createHash } from 'node:crypto';
import { existsSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { at, duration, ffmpeg, log, readJson, run, script, writeJson } from './lib/common.mjs';

const args = process.argv.slice(2);
const voiceFlag = args.indexOf('--voice');
const wantLocal = voiceFlag > -1 && args[voiceFlag + 1] === 'local';
if (voiceFlag > -1) args.splice(voiceFlag, 2);

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
const settings = {
  stability: Number(process.env.ELEVEN_STABILITY ?? 0.5),
  similarity_boost: Number(process.env.ELEVEN_SIMILARITY ?? 0.8),
  style: Number(process.env.ELEVEN_STYLE ?? 0.15),
  use_speaker_boost: true,
};

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
  const hash = createHash('sha1').update(JSON.stringify(LOCAL ? [scene.text, 'local'] : [scene.text, voice, model, settings])).digest('hex');
  const mp3 = at('audio', `${scene.id}.mp3`);
  if (!only.size && manifest[scene.id] === hash && existsSync(mp3)) {
    log('voice', `${scene.id}: unchanged`);
    continue;
  }

  if (LOCAL) {
    const raw = at('audio', `${scene.id}.local.wav`);
    await speakLocally(scene.text, raw);
    await ffmpeg(['-i', raw, '-ar', '48000', '-ac', '1', at('audio', `${scene.id}.wav`)]);
    await ffmpeg(['-i', raw, '-b:a', '128k', mp3]);
    rmSync(raw, { force: true });
    durations[scene.id] = Number((await duration(mp3)).toFixed(3));
    writeJson(at('audio', `${scene.id}.words.json`), spreadWords(scene.text, durations[scene.id]));
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
        text: scene.text,
        model_id: model,
        voice_settings: settings,
        previous_text: scenes[i - 1]?.text,
        next_text: scenes[i + 1]?.text,
      }),
    },
  );
  if (!response.ok) {
    console.error(`ElevenLabs ${response.status} for "${scene.id}": ${await response.text()}`);
    process.exit(1);
  }
  const body = await response.json();
  writeFileSync(mp3, Buffer.from(body.audio_base64, 'base64'));
  writeJson(at('audio', `${scene.id}.words.json`), words(body.alignment));
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
