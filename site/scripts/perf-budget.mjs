// First-load JS budget for "/": sums the gzipped size of every script the
// prerendered home page loads, and fails if it is over budget or if three.js
// leaked into the shell (it must stay in lazily loaded chunks).
// Usage (in site/): npm run build && npm run perf-budget [-- budgetKB]
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = process.cwd();
const budget = Number(process.argv[2] ?? process.env.FIRST_LOAD_KB ?? 280) * 1024;
const html = readFileSync(join(root, '.next/server/app/index.html'), 'utf8');
const srcs = [
  ...new Set([...html.matchAll(/src="(\/_next\/static\/[^"]+\.js)"/g)].map((m) => m[1])),
];
let total = 0;
let leak = '';
for (const src of srcs) {
  const code = readFileSync(join(root, '.next', src.replace('/_next/', '')));
  total += gzipSync(code).length;
  if (/WebGLRenderer|WEBGL_lose_context.{0,80}shaderSource/.test(code.toString())) leak = src;
}
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
console.log(`/ first-load JS: ${srcs.length} scripts, ${kb(total)} gzipped (budget ${kb(budget)})`);
if (leak) console.error(`three.js found in a first-load chunk: ${leak}`);
if (leak || total > budget) process.exit(1);
