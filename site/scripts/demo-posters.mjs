/*
 * Renders a still poster of the top of every Showcase demo page, so the
 * homepage can show the before/after demo without loading two live pages
 * (HTML, CSS, web fonts) while a phone is still scrolling. The live iframes
 * replace the posters once the visitor uses the demo or it sits idle in view.
 *
 *   npm run demo-posters
 *
 * Writes public/demo/<run>/vN/poster-<desktop|phone>-<light|dark>.webp, one
 * per site theme, since the site sets data-theme on the live pages too.
 * Needs Playwright (the `playwright` or `playwright-core` package, or the
 * one npx installs) and a Chromium; set CHROME_PATH to pick the browser.
 */
import { createReadStream, existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', 'public');
const demoRoot = path.join(root, 'demo');

/** Playwright from this project, npx's PATH, or a global install. */
const loadPlaywright = async () => {
  const bins = (process.env.PATH ?? '')
    .split(path.delimiter)
    .filter((p) => /node_modules[\\/]\.bin$/.test(p) || /[\\/]bin$/.test(p))
    .map((p) => (p.endsWith('.bin') ? path.dirname(p) : path.join(p, '..', 'lib', 'node_modules')));
  for (const base of [path.join(here, 'x.js'), ...bins.map((b) => path.join(b, 'x.js'))]) {
    for (const name of ['playwright-core', 'playwright']) {
      try {
        const mod = await import(pathToFileURL(createRequire(base).resolve(name)).href);
        return mod.chromium ?? mod.default.chromium;
      } catch {}
    }
  }
  throw new Error('Playwright is not available; run through `npx -p playwright-core`.');
};

const types = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
};
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname));
  if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile())
    return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = /** @type {import('node:net').AddressInfo} */ (server.address()).port;

// The stage's shape on each: a desktop at 1280 wide, a phone's 62svh split.
const SHAPES = [
  { name: 'desktop', file: 'index.html', width: 1280, height: 760, scale: 1, quality: 0.62 },
  { name: 'phone', file: 'phone.html', width: 390, height: 520, scale: 2, quality: 0.55 },
];

const chromium = await loadPlaywright();
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
});
try {
  const runs = readdirSync(demoRoot)
    .filter((d) => statSync(path.join(demoRoot, d)).isDirectory())
    .sort();
  for (const run of runs) {
    const pages = readdirSync(path.join(demoRoot, run)).filter((d) => /^v\d+$/.test(d));
    for (const shape of SHAPES) {
      for (const theme of ['light', 'dark']) {
        const ctx = await browser.newContext({
          viewport: { width: shape.width, height: shape.height },
          deviceScaleFactor: shape.scale,
          reducedMotion: 'no-preference',
          colorScheme: theme,
        });
        const page = await ctx.newPage();
        for (const v of pages) {
          const dir = path.join(demoRoot, run, v);
          const file = existsSync(path.join(dir, shape.file)) ? shape.file : 'index.html';
          await page.goto(`http://127.0.0.1:${port}/demo/${run}/${v}/${file}`, {
            waitUntil: 'networkidle',
            timeout: 60_000,
          });
          // The theme, as the site applies it, and no scrollbar.
          await page.evaluate(async (t) => {
            document.documentElement.dataset.theme = t;
            document.documentElement.style.setProperty('scrollbar-width', 'none');
            await document.fonts.ready;
          }, theme);
          // Entrance animations finish first: a poster shows the settled page.
          await page.waitForTimeout(2200);
          const png = await page.screenshot({ type: 'png' });
          // Chromium encodes WebP itself, so no image library is needed.
          const webp = await page.evaluate(
            async ({ b64, q }) => {
              const img = new Image();
              img.src = `data:image/png;base64,${b64}`;
              await img.decode();
              const c = document.createElement('canvas');
              c.width = img.naturalWidth;
              c.height = img.naturalHeight;
              c.getContext('2d')?.drawImage(img, 0, 0);
              return c.toDataURL('image/webp', q).split(',')[1];
            },
            { b64: png.toString('base64'), q: shape.quality },
          );
          const out = path.join(dir, `poster-${shape.name}-${theme}.webp`);
          writeFileSync(out, Buffer.from(webp, 'base64'));
          console.log(`${path.relative(root, out)}  ${Math.round(statSync(out).size / 1024)} KB`);
        }
        await ctx.close();
      }
    }
  }
} finally {
  await browser.close();
  server.close();
}
