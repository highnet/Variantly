// Render the films with SeekReel, then cut the GIFs.
//
//   node build.mjs probe [t,t,...] [--theme dark]   a few frames into probe/
//   node build.mjs wide     [--theme light|dark]    16:9 MP4 + silent MP4 + poster
//   node build.mjs vertical [--theme light|dark]    9:16 MP4
//   node build.mjs gif      [--theme light|dark]    GIF of the before/after slider
//   node build.mjs thumbnail [--theme light|dark]   1280×720 thumbnail
//   node build.mjs all      [--theme light|dark]    all of the above
//
// Without --theme, every theme that has been edited is built.
//
// A narrated film (wide, vertical, all) is built only when every line was
// read by ElevenLabs: a line in the system's rehearsal voice stops the build
// (lib/narration.mjs). ALLOW_LOCAL_VOICE=1 builds anyway, and the film is
// stamped as a rehearsal so the site's upload-demo-video refuses it.
//
// --no-captions (wide and vertical only): a silent picture with no burned-in
// captions, for the short cuts that carry their own lines and captions
// (SCRIPT-90s.md). Writes out/variantly-demo-<theme>-nocaptions*.mp4 next to
// the normal films, which keep their captions.
import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { at, ffmpeg, ffmpegPath, log, readJson, run, script, seekreelDir, writeJson } from './lib/common.mjs';
import { unfitLines, unfitMessage } from './lib/narration.mjs';

const args = process.argv.slice(2);
const themeAt = args.indexOf('--theme');
const asked = themeAt > -1 ? [args.splice(themeAt, 2)[1]] : null;
const noCaptionsAt = args.indexOf('--no-captions');
const NO_CAPTIONS = noCaptionsAt > -1;
if (NO_CAPTIONS) args.splice(noCaptionsAt, 1);
const [mode = 'wide', times] = args;
const themes = (asked ?? ['light', 'dark']).filter((theme) => existsSync(at(`timeline.${theme}.json`)));
if (!themes.length) {
  console.error('Nothing edited yet: run `npm run record` and `npm run edit` first.');
  process.exit(1);
}

// No robotic rehearsal voice in a narrated film. The silent cuts (probe,
// gif, thumbnail, --no-captions) carry no voice, so they skip this.
const NARRATED = !NO_CAPTIONS && ['wide', 'vertical', 'all'].includes(mode);
const unfit = unfitLines(script().scenes, {
  manifest: readJson(at('audio', 'manifest.json'), {}),
  voices: readJson(at('audio', 'voices.json'), {}),
  hasAudio: (id) => existsSync(at('audio', `${id}.wav`)),
});
const problem = unfitMessage(unfit);
const REHEARSAL = Boolean(problem);
if (NARRATED && problem) {
  console.error(problem);
  if (!process.env.ALLOW_LOCAL_VOICE) process.exit(1);
  log('build', 'ALLOW_LOCAL_VOICE is set: building a rehearsal. Do not publish this film.');
}

/**
 * Records which voice the 16:9 film carries, next to it: upload-demo-video
 * reads this and refuses a rehearsal, or a film with no stamp at all.
 */
function stamp(theme) {
  const film = at('out', `variantly-demo-${theme}.mp4`);
  writeJson(at('out', `variantly-demo-${theme}.voice.json`), {
    rehearsal: REHEARSAL,
    robot: unfit.robot,
    missing: unfit.missing,
    bytes: statSync(film).size,
  });
}

const SEEKREEL = seekreelDir();
const env = {
  // The cue engine needs Python 3; on Windows it is usually `python`.
  PYTHON: process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3'),
};
const seekreel = (...a) => run(process.execPath, [path.join(SEEKREEL, 'bin', 'seekreel.ts'), ...a], { env });

/**
 * YouTube loudness: -14 LUFS integrated, true peak at most -1 dBTP. Two
 * passes, so the second applies exactly what the first measured.
 */
async function loudnorm(wav) {
  const target = 'I=-14:TP=-1.5:LRA=11';
  // ffmpeg prints the measurement on stderr.
  const out = await new Promise((resolve) => {
    const child = spawn(ffmpegPath(), ['-hide_banner', '-i', wav, '-af', `loudnorm=${target}:print_format=json`, '-f', 'null', '-']);
    let err = '';
    child.stderr.on('data', (d) => (err += d));
    child.on('close', () => resolve(err));
  });
  const m = JSON.parse(out.slice(out.lastIndexOf('{'), out.lastIndexOf('}') + 1));
  const tmp = `${wav}.norm.wav`;
  await ffmpeg([
    '-i', wav,
    '-af', `loudnorm=${target}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=48000`,
    '-ar', '48000', tmp,
  ]);
  rmSync(wav, { force: true });
  renameSync(tmp, wav);
  log('build', `soundtrack normalised to -14 LUFS (was ${m.input_i} LUFS, peak ${m.input_tp} dBTP)`);
}

async function thumbnail(theme) {
  await seekreel('probe', '0', '--config', at(`seekreel.${theme}.thumb.json`));
  copyFileSync(at('build', theme, 'thumb', 't0.png'), at('out', `variantly-demo-${theme}-thumbnail.png`));
  log('build', `out/variantly-demo-${theme}-thumbnail.png`);
}

async function gif(theme) {
  const film = at('out', `variantly-demo-${theme}.mp4`);
  if (!existsSync(film)) throw new Error(`Build the 16:9 ${theme} film first (npm run build).`);
  const tl = readJson(at(`timeline.${theme}.json`));
  const compare = tl.scenes.find((s) => s.id === 'compare') ?? tl.scenes[0];
  const filter = 'fps=12,scale=800:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=160[p];[b][p]paletteuse=dither=sierra2_4a';
  await ffmpeg(['-ss', (compare.start + 0.5).toFixed(2), '-t', '6', '-i', film, '-filter_complex', filter, '-loop', '0', at('out', `variantly-demo-${theme}.gif`)]);
  log('build', `out/variantly-demo-${theme}.gif`);
}

/**
 * The same render with captions left out: the stage skips them when the
 * timeline says `burnCaptions: false`. The flag is set only for this render
 * and the timeline is put back afterwards, so the next build has captions.
 */
async function withoutCaptions(theme) {
  if (!['wide', 'vertical', 'all'].includes(mode)) throw new Error('--no-captions renders the wide and vertical films only.');
  const file = at(`timeline.${theme}.json`);
  const original = readFileSync(file, 'utf8');
  const configs = [];
  if (mode !== 'vertical') {
    const wide = readJson(at(`seekreel.${theme}.json`));
    configs.push({ ...wide, name: `${wide.name}-nocaptions`, out: `${wide.out}-nocaptions`, variants: [{ name: '', audio: false }] });
  }
  if (mode !== 'wide') {
    const tall = readJson(at(`seekreel.${theme}.vertical.json`));
    configs.push({ ...tall, name: `${tall.name}-nocaptions`, out: `${tall.out}-nocaptions`, variants: [{ name: 'vertical', audio: false }] });
  }
  try {
    writeFileSync(file, JSON.stringify({ ...JSON.parse(original), burnCaptions: false }, null, 2) + '\n');
    for (const [i, config] of configs.entries()) {
      const path_ = at(`seekreel.${theme}.nocaptions${i}.json`);
      writeJson(path_, config);
      await seekreel('render', '--config', path_);
      await seekreel('encode', '--config', path_);
      rmSync(path_, { force: true });
    }
  } finally {
    writeFileSync(file, original);
  }
  log('build', `${theme}: films without captions in out/ (*-nocaptions*)`);
}

const started = Date.now();
for (const theme of themes) {
  if (NO_CAPTIONS) {
    await withoutCaptions(theme);
    continue;
  }
  const wide = at(`seekreel.${theme}.json`);
  const tall = at(`seekreel.${theme}.vertical.json`);
  if (mode === 'probe') {
    const tl = readJson(at(`timeline.${theme}.json`));
    const pick = (id, offset) => tl.scenes.find((s) => s.id === id)?.start + offset;
    const fallback = [pick('cold', 1.5), pick('cold', 5), pick('hi', 6), pick('need', 3), pick('make', 12), pick('worktrees', 3), pick('lapse', 3), pick('walk', 3), pick('scores', 4), pick('keep', 3), pick('sitewide', 6), pick('wrap', 9)]
      .filter((v) => Number.isFinite(v))
      .map((v) => v.toFixed(2));
    await seekreel('probe', times ?? fallback.join(','), '--config', wide);
    log('build', `${theme}: frames in probe/`);
    continue;
  }
  // `build` would re-cut the footage; it is already cut, so render and encode.
  if (mode === 'wide' || mode === 'all') {
    await seekreel('audio', '--config', wide);
    await loudnorm(at('build', theme, 'soundtrack.wav'));
    // A failed render must not leave the last film's stamp vouching for it.
    rmSync(at('out', `variantly-demo-${theme}.voice.json`), { force: true });
    await seekreel('render', '--config', wide);
    await seekreel('encode', '--config', wide);
    stamp(theme);
  }
  if (mode === 'vertical' || mode === 'all') {
    await seekreel('render', '--config', tall);
    await seekreel('encode', '--config', tall);
  }
  if (mode === 'gif' || mode === 'all') await gif(theme);
  if (mode === 'thumbnail' || mode === 'all') await thumbnail(theme);
}
log('build', `done in ${((Date.now() - started) / 60000).toFixed(1)} min`);
