/*
 * Re-measures the Showcase demo pages with variantly's own axe-core and
 * Lighthouse check and writes lib/demo-scores.json, so the scores on the
 * page always match the pages it shows. Run after changing any page in
 * public/demo/oak-and-iron:
 *
 *   npm run score-demo
 *
 * With --check it writes nothing and exits 1 when the file is out of date
 * (CI runs it this way whenever a demo page changes).
 */
import {
  createReadStream,
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAudit } from '../../src/checks.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', 'public');
const demo = path.join(root, 'demo', 'oak-and-iron');
const out = path.join(here, '..', 'lib', 'demo-scores.json');

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

const pages = readdirSync(demo)
  .filter((d) => /^v\d+$/.test(d))
  .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
/** @type {Record<string, { a11y: number, axe: number }>} */
const scores = {};
try {
  for (const v of pages) {
    const a = await runAudit(`http://127.0.0.1:${port}/demo/oak-and-iron/${v}/index.html`);
    if (typeof a.lighthouse.accessibility !== 'number')
      throw new Error(`${v}: Lighthouse gave no accessibility score`);
    scores[v] = { a11y: a.lighthouse.accessibility, axe: a.axe.total };
    console.log(`${v}  a11y ${scores[v].a11y}  axe ${scores[v].axe}`);
  }
} finally {
  server.close();
}
const json = `${JSON.stringify(scores, null, 2)}\n`;
if (process.argv.includes('--check')) {
  if (!existsSync(out) || readFileSync(out, 'utf8') !== json) {
    console.error(
      'lib/demo-scores.json is out of date. Run `npm run score-demo` in site/ and commit the result.',
    );
    process.exit(1);
  }
  console.log('lib/demo-scores.json is up to date.');
} else {
  writeFileSync(out, json);
  console.log(`Wrote ${path.relative(process.cwd(), out)}`);
}
