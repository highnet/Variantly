// Render the film with SeekReel, then cut the GIF.
//
//   node build.mjs probe [t,t,...]   a few frames into probe/ (fast check)
//   node build.mjs                   16:9 MP4 + silent MP4 + poster
//   node build.mjs vertical          9:16 MP4
//   node build.mjs gif               GIF of the before/after slider
//   node build.mjs all               everything above except probe
import { existsSync } from 'node:fs';
import path from 'node:path';
import { at, ffmpeg, log, readJson, run, seekreelDir } from './lib/common.mjs';

const [mode = 'wide', times] = process.argv.slice(2);
const SEEKREEL = seekreelDir();
const env = {
  // The cue engine needs Python 3; on Windows it is usually `python`.
  PYTHON: process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3'),
};
const seekreel = (...args) => run(process.execPath, [path.join(SEEKREEL, 'bin', 'seekreel.ts'), ...args], { env });

if (!existsSync(at('timeline.json'))) {
  console.error('No timeline.json yet: run `npm run record` and `npm run edit` first.');
  process.exit(1);
}
const tl = readJson(at('timeline.json'));

async function gif() {
  const film = at('out', 'variantly-demo.mp4');
  if (!existsSync(film)) throw new Error('Build the 16:9 film first (npm run build).');
  const compare = tl.scenes.find((s) => s.id === 'compare') ?? tl.scenes[0];
  const start = compare.start + 0.5;
  const filter = 'fps=12,scale=800:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=160[p];[b][p]paletteuse=dither=sierra2_4a';
  await ffmpeg(['-ss', start.toFixed(2), '-t', '6', '-i', film, '-filter_complex', filter, '-loop', '0', at('out', 'variantly-demo.gif')]);
  log('build', 'out/variantly-demo.gif');
}

const started = Date.now();
if (mode === 'probe') {
  // Default probes: the title card, the terminal, a timelapse frame, the slider, the outro.
  const pick = (id, offset) => tl.scenes.find((s) => s.id === id)?.start + offset;
  const fallback = [pick('hook', 1), pick('launch', 1.5), pick('generate', 2), pick('compare', 3), pick('outro', 2)]
    .filter((v) => Number.isFinite(v))
    .map((v) => v.toFixed(2));
  await seekreel('probe', times ?? fallback.join(','), '--config', at('seekreel.config.json'));
  log('build', 'frames in probe/');
} else {
  if (mode === 'wide' || mode === 'all') await seekreel('build', '--config', at('seekreel.config.json'));
  if (mode === 'vertical' || mode === 'all') await seekreel('build', '--config', at('seekreel.vertical.json'));
  if (mode === 'gif' || mode === 'all') await gif();
}
log('build', `done in ${((Date.now() - started) / 60000).toFixed(1)} min`);
