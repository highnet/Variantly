// Which voice read each narration line, so a film can't be published with the
// system's rehearsal voice (Windows SAPI, macOS say, espeak) in it.
//
// voice.mjs falls back to that voice when .env has no ElevenLabs keys, which
// is easy to miss: one line run without keys sounds robotic in the final cut.
// It records the voice of every line in audio/voices.json. Lines voiced before
// that file existed are recognised by their manifest hash, which for the local
// voice is localHash() of the line.
import { createHash } from 'node:crypto';
import { toSpoken } from './pronounce.mjs';

/** The manifest hash of a line read by the local rehearsal voice. */
export function localHash(spoken, text) {
  return createHash('sha1').update(JSON.stringify([spoken, text, 'local'])).digest('hex');
}

/**
 * The lines a final film must not carry: `robot` read by the local voice,
 * `missing` with no audio at all. `scenes` is script().scenes, `manifest`
 * audio/manifest.json, `voices` audio/voices.json and `hasAudio(id)` whether
 * audio/<id>.wav exists.
 */
export function unfitLines(scenes, { manifest = {}, voices = {}, hasAudio = () => true } = {}) {
  const robot = [];
  const missing = [];
  for (const scene of scenes) {
    if (!scene.text) continue;
    if (!manifest[scene.id] || !hasAudio(scene.id)) {
      missing.push(scene.id);
      continue;
    }
    const { spoken } = toSpoken(scene.text, scene.say);
    if (voices[scene.id] === 'local' || manifest[scene.id] === localHash(spoken, scene.text)) robot.push(scene.id);
  }
  return { robot, missing };
}

/** What to tell someone whose film would carry unfit lines; null when none. */
export function unfitMessage({ robot, missing }) {
  if (!robot.length && !missing.length) return null;
  const out = [];
  if (robot.length) out.push(`Read by the local rehearsal voice, not ElevenLabs: ${robot.join(', ')}`);
  if (missing.length) out.push(`No narration audio: ${missing.join(', ')}`);
  out.push(
    'Fill in ELEVEN_API_KEY and ELEVEN_VOICE_ID in demo/.env, run `npm run voice` (it re-voices only these lines), then `npm run edit` and build again.',
    'No re-recording needed. ALLOW_LOCAL_VOICE=1 builds anyway, as a rehearsal that cannot be uploaded.',
  );
  return out.join('\n');
}
