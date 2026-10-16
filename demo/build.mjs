// Render the films with SeekReel, then cut the GIFs.
//
//   node build.mjs probe [t,t,...] [--theme dark]   a few frames into probe/
//   node build.mjs wide     [--theme light|dark]    16:9 MP4 + silent MP4 + poster
//   node build.mjs vertical [--theme light|dark]    9:16 MP4
//   node build.mjs gif      [--theme light|dark]    GIF of the before/after slider
//   node build.mjs all      [--theme light|dark]    all of the above
//
// Without --theme, every theme that has been edited is built.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { at, ffmpeg, log, readJson, run, seekreelDir } from './lib/common.mjs';

const args = process.argv.slice(2);
const themeAt = args.indexOf('--theme');
const asked = themeAt > -1 ? [args.splice(themeAt, 2)[1]] : null;
const [mode = 'wide', times] = args;
const themes = (asked ?? ['light', 'dark']).filter((theme) => existsSync(at(`timeline.${theme}.json`)));
if (!themes.length) {
  console.error('Nothing edited yet: run `npm run record` and `npm run edit` first.');
  process.exit(1);
}

const SEEKREEL = seekreelDir();
const env = {
  // The cue engine needs Python 3; on Windows it is usually `python`.
  PYTHON: process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3'),
};
const seekreel = (...a) => run(process.execPath, [path.join(SEEKREEL, 'bin', 'seekreel.ts'), ...a], { env });

async function gif(theme) {
  const film = at('out', `variantly-demo-${theme}.mp4`);
  if (!existsSync(film)) throw new Error(`Build the 16:9 ${theme} film first (npm run build).`);
  const tl = readJson(at(`timeline.${theme}.json`));
  const compare = tl.scenes.find((s) => s.id === 'compare') ?? tl.scenes[0];
  const filter = 'fps=12,scale=800:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=160[p];[b][p]paletteuse=dither=sierra2_4a';
  await ffmpeg(['-ss', (compare.start + 0.5).toFixed(2), '-t', '6', '-i', film, '-filter_complex', filter, '-loop', '0', at('out', `variantly-demo-${theme}.gif`)]);
  log('build', `out/variantly-demo-${theme}.gif`);
}

const started = Date.now();
for (const theme of themes) {
  const wide = at(`seekreel.${theme}.json`);
  const tall = at(`seekreel.${theme}.vertical.json`);
  if (mode === 'probe') {
    const tl = readJson(at(`timeline.${theme}.json`));
    const pick = (id, offset) => tl.scenes.find((s) => s.id === id)?.start + offset;
    const fallback = [pick('hook', 1), pick('hook', 4.5), pick('launch', 1.5), pick('generate', 2), pick('compare', 3), pick('outro', 2)]
      .filter((v) => Number.isFinite(v))
      .map((v) => v.toFixed(2));
    await seekreel('probe', times ?? fallback.join(','), '--config', wide);
    log('build', `${theme}: frames in probe/`);
    continue;
  }
  // `build` would re-cut the footage; it is already cut, so render and encode.
  if (mode === 'wide' || mode === 'all') {
    await seekreel('audio', '--config', wide);
    await seekreel('render', '--config', wide);
    await seekreel('encode', '--config', wide);
  }
  if (mode === 'vertical' || mode === 'all') {
    await seekreel('render', '--config', tall);
    await seekreel('encode', '--config', tall);
  }
  if (mode === 'gif' || mode === 'all') await gif(theme);
}
log('build', `done in ${((Date.now() - started) / 60000).toFixed(1)} min`);
