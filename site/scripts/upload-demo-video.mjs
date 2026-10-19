/*
 * Uploads the narrated demo films to Vercel Blob and records their URLs in
 * lib/demo-video.json, which the homepage reads. Build the films first
 * (demo/: `npm run build:all`), then:
 *
 *   BLOB_READ_WRITE_TOKEN=... npm run upload-demo-video
 *   BLOB_READ_WRITE_TOKEN=... npm run upload-demo-video -- --theme dark
 *   BLOB_READ_WRITE_TOKEN=... npm run upload-demo-video -- --cut 90s
 *
 * Takes ../demo/out/variantly-demo-<theme>.mp4 (16:9, captions burned in)
 * and its poster (-poster.png, else -thumbnail.png) for each theme that has
 * a film. With --cut 90s it takes the 90-second cut instead
 * (variantly-demo-<theme>-90s.mp4 and -90s-poster.png) and records it under
 * `short`, which the homepage plays first, next to the full run. Set DEMO_OUT to read them from somewhere else. The token comes from
 * the Blob store in the Vercel dashboard (Storage → the store → .env.local),
 * or from `vercel env pull` once the store is connected to the project.
 *
 * Every upload gets a fresh URL (random suffix), so a re-cut film is never
 * hidden behind a cached old one. Old files stay in the store until deleted
 * in the dashboard. Commit lib/demo-video.json and deploy to publish.
 */
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { put } from '@vercel/blob';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(process.env.DEMO_OUT ?? path.join(here, '..', '..', 'demo', 'out'));
const manifest = path.join(here, '..', 'lib', 'demo-video.json');

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('Set BLOB_READ_WRITE_TOKEN (Vercel dashboard → Storage → your Blob store).');
  process.exit(1);
}

const args = process.argv.slice(2);
const themeAt = args.indexOf('--theme');
const themes = themeAt > -1 ? [args[themeAt + 1]] : ['light', 'dark'];
const cutAt = args.indexOf('--cut');
const cut = cutAt > -1 ? args[cutAt + 1] : null;
if (cut !== null && cut !== '90s') throw new Error(`--cut must be 90s, got ${cut}`);
const suffix = cut ? `-${cut}` : '';
for (const theme of themes) {
  if (theme !== 'light' && theme !== 'dark')
    throw new Error(`--theme must be light or dark, got ${theme}`);
}

const upload = async (file, name, contentType) => {
  const mb = (statSync(file).size / 1e6).toFixed(1);
  console.log(`  ${path.basename(file)} (${mb} MB)`);
  const blob = await put(`demo/${name}`, readFileSync(file), {
    access: 'public',
    addRandomSuffix: true,
    contentType,
    // Each URL is unique, so browsers and the CDN may keep it for a year.
    cacheControlMaxAge: 60 * 60 * 24 * 365,
    multipart: true,
  });
  return blob.url;
};

const current = JSON.parse(readFileSync(manifest, 'utf8'));
let uploaded = 0;
for (const theme of themes) {
  const name = `variantly-demo-${theme}${suffix}`;
  const film = path.join(outDir, `${name}.mp4`);
  if (!existsSync(film)) {
    console.log(`${theme}: no ${path.relative(process.cwd(), film)}, skipped`);
    continue;
  }
  console.log(`${theme}:`);
  const poster = [`${name}-poster.png`, `${name}-thumbnail.png`]
    .map((f) => path.join(outDir, f))
    .find(existsSync);
  const entry = {
    mp4: await upload(film, `${name}.mp4`, 'video/mp4'),
    poster: poster ? await upload(poster, `${name}-poster.png`, 'image/png') : null,
  };
  if (cut) current.short = { light: null, dark: null, ...current.short, [theme]: entry };
  else current[theme] = entry;
  uploaded++;
}

if (!uploaded) {
  console.error(`No films found in ${outDir}. Build them in demo/ first (npm run build:all).`);
  process.exit(1);
}
writeFileSync(manifest, JSON.stringify(current, null, 2) + '\n');
console.log(`Wrote ${path.relative(process.cwd(), manifest)}. Commit it and deploy.`);
