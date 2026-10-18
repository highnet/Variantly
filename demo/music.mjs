#!/usr/bin/env node
/**
 * Renders a Strudel pattern (music/*.strudel) to a WAV.
 *
 *   node music.mjs music/cut-90s.strudel 94 build/music/cut-90s.wav
 *
 * Strudel plays in real time through Web Audio, so this plays the pattern in
 * headless Chromium (Playwright's, the same one record.mjs uses) and records
 * everything sent to the speakers for that many seconds, plus a tail for the
 * reverb. Uses only Strudel's built-in synths: nothing is downloaded.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { at, ffmpeg, log } from './lib/common.mjs';

const require = createRequire(import.meta.url);

export async function renderMusic(file, seconds, out) {
  const code = readFileSync(file, 'utf8');
  const bundle = require.resolve('@strudel/web/dist/index.js');
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.setContent('<!doctype html><title>music</title>');
    // Tap the speakers before Strudel builds its graph: every connection to
    // the destination is mirrored into a recorder.
    await page.evaluate(() => {
      const connect = AudioNode.prototype.connect;
      AudioNode.prototype.connect = function (target, ...rest) {
        if (target instanceof AudioDestinationNode) {
          const ctx = target.context;
          ctx.__tap ??= ctx.createMediaStreamDestination();
          connect.call(this, ctx.__tap, ...rest);
        }
        return connect.call(this, target, ...rest);
      };
    });
    await page.addScriptTag({ path: bundle });
    const b64 = await page.evaluate(
      async ({ code, ms }) => {
        await initStrudel();
        const ctx = getAudioContext();
        await ctx.resume();
        ctx.__tap ??= ctx.createMediaStreamDestination();
        const recorder = new MediaRecorder(ctx.__tap.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 256000 });
        const chunks = [];
        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.start(1000);
        await evaluate(code);
        await new Promise((r) => setTimeout(r, ms));
        hush();
        await new Promise((r) => setTimeout(r, 2500));
        await new Promise((r) => ((recorder.onstop = r), recorder.stop()));
        const buf = await new Blob(chunks, { type: 'audio/webm' }).arrayBuffer();
        let s = '';
        const bytes = new Uint8Array(buf);
        for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        return btoa(s);
      },
      { code, ms: Math.round(seconds * 1000) },
    );
    if (errors.length) throw new Error(`Strudel: ${errors.join(' | ')}`);
    mkdirSync(path.dirname(out), { recursive: true });
    const webm = out.replace(/\.wav$/, '.webm');
    writeFileSync(webm, Buffer.from(b64, 'base64'));
    // Trim the start-up silence, then a 48 kHz stereo WAV of exactly that length.
    await ffmpeg(['-i', webm, '-af', `silenceremove=start_periods=1:start_threshold=-60dB,apad,atrim=0:${seconds + 2}`, '-ar', '48000', '-ac', '2', out]);
    log('music', `${path.basename(file)} → ${path.relative(at(), out)} (${seconds.toFixed(1)}s)`);
  } finally {
    await browser.close();
  }
}

/** A pattern rendered for at least `seconds`, cached under build/music by code and length. */
export async function musicFor(file, seconds) {
  const code = readFileSync(file, 'utf8');
  const length = Math.ceil(seconds) + 1;
  const hash = createHash('sha1').update(JSON.stringify([code, length])).digest('hex').slice(0, 10);
  const out = at('build', 'music', `${path.basename(file, '.strudel')}-${hash}.wav`);
  if (!existsSync(out)) await renderMusic(file, length, out);
  return out;
}

/**
 * Lays music under a voice soundtrack: the music is levelled well below the
 * voice, ducks further whenever the voice sounds, and fades in and out.
 */
export async function duckUnder(voiceWav, musicWav, out, seconds) {
  const fadeOut = Math.max(0, seconds - 3).toFixed(2);
  await ffmpeg([
    '-i', voiceWav, '-i', musicWav, '-filter_complex',
    [
      '[0:a]aresample=48000,aformat=channel_layouts=stereo,asplit=2[v][key]',
      `[1:a]aresample=48000,aformat=channel_layouts=stereo,loudnorm=I=-27:TP=-6:LRA=7,atrim=0:${seconds},afade=t=in:d=1.2,afade=t=out:st=${fadeOut}:d=3[m]`,
      '[m][key]sidechaincompress=threshold=0.015:ratio=5:attack=120:release=700:makeup=1[md]',
      '[v][md]amix=inputs=2:normalize=0:duration=first[out]',
    ].join(';'),
    '-map', '[out]', '-ar', '48000', '-c:a', 'pcm_s16le', out,
  ]);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [file, seconds, out] = process.argv.slice(2);
  if (!file || !seconds || !out) {
    console.error('usage: node music.mjs <pattern.strudel> <seconds> <out.wav>');
    process.exit(1);
  }
  await renderMusic(path.resolve(file), Number(seconds), path.resolve(out));
}
