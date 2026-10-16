// Narration: one ElevenLabs line per scene, with character timings for captions.
//
//   ELEVEN_API_KEY=... ELEVEN_VOICE_ID=... node voice.mjs [sceneId ...]
//
// Writes audio/<id>.mp3, audio/<id>.wav (48 kHz, what SeekReel mixes),
// audio/<id>.words.json (word timings) and audio/durations.json.
// A scene whose text has not changed since its last render is skipped, so
// editing one line costs one request.
import { createHash } from 'node:crypto';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { at, duration, ffmpeg, log, readJson, script, writeJson } from './lib/common.mjs';

const key = process.env.ELEVEN_API_KEY;
const voice = process.env.ELEVEN_VOICE_ID;
if (!key || !voice) {
  console.error('Set ELEVEN_API_KEY and ELEVEN_VOICE_ID (see .env.example).');
  process.exit(1);
}

const model = process.env.ELEVEN_MODEL || 'eleven_multilingual_v2';
const settings = {
  stability: Number(process.env.ELEVEN_STABILITY ?? 0.5),
  similarity_boost: Number(process.env.ELEVEN_SIMILARITY ?? 0.8),
  style: Number(process.env.ELEVEN_STYLE ?? 0.15),
  use_speaker_boost: true,
};

const only = new Set(process.argv.slice(2));
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
  const hash = createHash('sha1').update(JSON.stringify([scene.text, voice, model, settings])).digest('hex');
  const mp3 = at('audio', `${scene.id}.mp3`);
  if (!only.size && manifest[scene.id] === hash && existsSync(mp3)) {
    log('voice', `${scene.id}: unchanged`);
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
