// Shared paths and helpers for the demo pipeline. Plain Node, so it runs the
// same on Windows, macOS and Linux.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

export const DEMO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REPO = path.resolve(DEMO, '..');
export const at = (...parts) => path.join(DEMO, ...parts);

/** The film's rate: the capture's, so app motion is never resampled. */
export const FPS = 60;
export const WIDTH = 1920;
export const HEIGHT = 1080;
/** Silence after each line before the next scene starts. */
export const PAD_MS = 700;
/** Where in its scene a line starts speaking. */
export const VOICE_LEAD = 0.25;

export function readJson(file, fallback) {
  if (!existsSync(file)) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing ${path.relative(DEMO, file)}. Run the earlier step first.`);
  }
  return JSON.parse(readFileSync(file, 'utf8'));
}

export function writeJson(file, value) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

// A scene marked pending waits on an unmerged feature: it is left out of the
// voice, the take and the cut until the flag is dropped.
//
// Lines can name facts that only the take knows, as {{name}}: {{runMinutes}}
// is how long the run really took, from the last take's raw-timeline.json
// (marks.runStart to marks.runEnd). Before any take it reads
// script.json `estimates`. After a take, `node voice.mjs lapse` re-voices
// that one line with the real number.
export function takeFacts(film = readJson(at('script.json'))) {
  const raw = readJson(at('video', 'raw-timeline.json'), {});
  const facts = { ...(film.estimates ?? {}) };
  const { runStart, runEnd } = raw.marks ?? {};
  if (runStart != null && runEnd > runStart) facts.runMinutes = String(Math.max(1, Math.round((runEnd - runStart) / 60)));
  return facts;
}

export const script = () => {
  const film = readJson(at('script.json'));
  const facts = takeFacts(film);
  const fill = (text) => (typeof text === 'string' ? text.replace(/\{\{(\w+)\}\}/g, (m, k) => facts[k] ?? m) : text);
  // Chapters are numbered in order over the scenes that are filmed, so a
  // pending chapter leaves no gap in the corner label or the YouTube list.
  let n = 0;
  const scenes = film.scenes
    .filter((s) => !s.pending)
    .map((s) => ({ ...s, text: fill(s.text), say: fill(s.say), ...(s.chapter ? { chapter: { ...s.chapter, n: ++n } } : {}) }));
  return { ...film, scenes };
};

/** ffmpeg/ffprobe: $FFMPEG/$FFPROBE, else the static builds from npm. */
export function ffmpegPath() {
  return process.env.FFMPEG || require('ffmpeg-static');
}
export function ffprobePath() {
  return process.env.FFPROBE || require('ffprobe-static').path;
}

export function run(cmd, args, { cwd = DEMO, env, quiet = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    });
    let out = '';
    let err = '';
    child.stdout?.on('data', (d) => (out += d));
    child.stderr?.on('data', (d) => (err += d));
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0 ? resolve(out) : reject(new Error(`${path.basename(cmd)} exited ${code}\n${err.slice(-2000)}`)),
    );
  });
}

export const ffmpeg = (args, opts) => run(ffmpegPath(), ['-hide_banner', '-loglevel', 'error', '-y', ...args], opts);

export async function duration(file) {
  const out = await run(
    ffprobePath(),
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file],
    { quiet: true },
  );
  return Number(out.trim());
}

/** Where SeekReel lives: $SEEKREEL_DIR, a sibling checkout, or the installer's ~/.seekreel. */
export function seekreelDir() {
  const home = process.env.USERPROFILE || process.env.HOME || '';
  const candidates = [process.env.SEEKREEL_DIR, path.join(REPO, '..', 'seekreel'), path.join(home, '.seekreel')];
  const found = candidates.find((dir) => dir && existsSync(path.join(dir, 'bin', 'seekreel.ts')));
  if (!found) {
    throw new Error('SeekReel not found. Clone https://github.com/highnet/seekreel next to this repo, or set SEEKREEL_DIR.');
  }
  return found;
}

export function log(step, message) {
  console.log(`[${step}] ${message}`);
}
