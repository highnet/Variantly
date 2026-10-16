#!/usr/bin/env node
// @ts-check
/*
 * The demo agent: a stand-in for Claude Code / Codex / Copilot that needs no
 * model and no account. Given a variantly brief, it restyles the app with one
 * of ten fixed looks by appending CSS to the project's main stylesheet (or a
 * <style> block in its HTML). It is crude on purpose. It exists so the whole
 * pipeline — worktrees, servers, proxy, picker, finalize — can be tested in
 * CI, tried by someone without an agent, and filmed.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { readBriefMeta } from './brief.mjs';

const LOOKS = [
  { name: 'Editorial', alt: '#ebe3d3', bg: '#f6f1e7', fg: '#1d1a16', accent: '#8a2c1b', font: 'Georgia, "Times New Roman", serif', head: 'Georgia, serif', radius: '0px', weight: 400, track: '-0.02em' },
  { name: 'Swiss precision', alt: '#f1f1f1', bg: '#ffffff', fg: '#111111', accent: '#e30613', font: '"Helvetica Neue", Arial, sans-serif', head: '"Helvetica Neue", Arial, sans-serif', radius: '0px', weight: 700, track: '-0.04em' },
  { name: 'Warm & tactile', alt: '#e3d3bf', bg: '#efe4d6', fg: '#3b2a20', accent: '#c4622d', font: '"Trebuchet MS", sans-serif', head: '"Palatino Linotype", Palatino, serif', radius: '18px', weight: 600, track: '0' },
  { name: 'Dark technical', alt: '#161b22', bg: '#0d1117', fg: '#d6dde6', accent: '#3fb950', font: 'ui-monospace, Consolas, monospace', head: 'ui-monospace, Consolas, monospace', radius: '4px', weight: 600, track: '0' },
  { name: 'Loud & bold', alt: '#ffffff', bg: '#ffe600', fg: '#0a0a0a', accent: '#ff2d55', font: 'Impact, "Arial Black", sans-serif', head: 'Impact, "Arial Black", sans-serif', radius: '0px', weight: 900, track: '-0.01em' },
  { name: 'Quiet minimal', alt: '#f0efed', bg: '#fafaf9', fg: '#44403c', accent: '#57534e', font: 'system-ui, sans-serif', head: 'system-ui, sans-serif', radius: '8px', weight: 300, track: '0' },
  { name: 'Playful', alt: '#ffe3f4', bg: '#fff4fb', fg: '#2d1b4e', accent: '#7c3aed', font: '"Comic Sans MS", "Chalkboard SE", sans-serif', head: '"Comic Sans MS", sans-serif', radius: '999px', weight: 700, track: '0' },
  { name: 'Refined luxury', alt: '#1f1a16', bg: '#14110f', fg: '#e9e1d3', accent: '#c9a45c', font: 'Garamond, Georgia, serif', head: 'Didot, "Bodoni MT", serif', radius: '0px', weight: 400, track: '0.04em' },
  { name: 'Brutalist', alt: '#ffffff', bg: '#d9d9d9', fg: '#000000', accent: '#0000ff', font: 'Arial, sans-serif', head: '"Courier New", monospace', radius: '0px', weight: 700, track: '0' },
  { name: 'Retro-futurist', alt: '#2b1450', bg: '#1a0b2e', fg: '#f2e9ff', accent: '#ff6ec7', font: 'Verdana, sans-serif', head: '"Lucida Console", monospace', radius: '12px', weight: 700, track: '0.08em' },
];

const briefPath = process.argv[2];
if (!briefPath) {
  console.error('usage: demo-agent <brief.md>');
  process.exit(2);
}
const meta = readBriefMeta(readFileSync(briefPath, 'utf8'));
if (!meta) {
  console.error('This brief has no variantly header.');
  process.exit(2);
}
const look = LOOKS[(meta.variant - 1) % LOOKS.length];
const appDir = path.resolve(process.cwd(), meta.appRel || '.');
console.log(`Demo agent: variant ${meta.variant} → ${look.name}`);
// Long enough to watch the progress view (about 10s per variant); tests set
// VARIANTLY_DEMO_DELAY=0.
const delay = Number(process.env.VARIANTLY_DEMO_DELAY ?? 10_000);
const pause = (/** @type {number} */ ms) => new Promise((r) => setTimeout(r, ms));
console.log('→ Read the site and pick a look');
await pause(delay / 2);

const css = `
/* variantly demo agent: ${look.name} */
:root { --variantly-accent: ${look.accent}; }
html, body { background: ${look.bg} !important; color: ${look.fg} !important; font-family: ${look.font} !important; }
h1, h2, h3, h4 { font-family: ${look.head} !important; font-weight: ${look.weight} !important; letter-spacing: ${look.track} !important; color: ${look.fg} !important; }
a { color: ${look.accent} !important; }
button, .button, .btn, [role="button"], input[type="submit"] { background: ${look.accent} !important; color: ${look.bg} !important; border-radius: ${look.radius} !important; border: 0 !important; box-shadow: none !important; }
header, .hero, [class*="hero"] { background: ${look.alt} !important; color: ${look.fg} !important; text-shadow: none !important; }
nav, .navbar, footer, [class*="topbar"] { background: ${look.fg} !important; color: ${look.bg} !important; box-shadow: none !important; }
nav a, nav *, footer, footer *, [class*="topbar"] { color: ${look.bg} !important; }
section, main, [class*="features"], [class*="newsletter"] { background: ${look.bg} !important; }
article, [class*="card"]:not([class*="card-"]) { background: ${look.alt} !important; border-radius: ${look.radius === '999px' ? '24px' : look.radius} !important; box-shadow: none !important; border: 1px solid color-mix(in srgb, ${look.fg} 20%, transparent) !important; }
[class*="card-img"], [class*="icon"] { background: ${look.accent} !important; border-radius: ${look.radius === '999px' ? '24px' : look.radius} !important; filter: none !important; }
[class*="price"] { color: ${look.accent} !important; }
`;

const CANDIDATES = [
  'app/globals.css', 'src/app/globals.css', 'styles/globals.css', 'src/app.css', 'src/index.css', 'src/Main.css', 'src/main.css', 'src/App.css', 'src/styles/global.css',
  'src/styles/globals.css', 'assets/css/main.css', 'app/assets/css/main.css', 'resources/css/app.css',
  'app/assets/tailwind/application.css', 'app/assets/stylesheets/application.css', 'static/css/main.css',
  'static/style.css', 'style.css', 'styles.css', 'css/style.css', 'main.css',
];

const target = CANDIDATES.map((rel) => path.join(appDir, rel)).find((p) => existsSync(p));
if (target) {
  appendFileSync(target, css);
  console.log(`→ Edit ${path.relative(appDir, target)}`);
} else {
  const html = readdirSync(appDir).filter((f) => f.endsWith('.html'));
  if (!html.length) {
    console.error('Found no stylesheet and no HTML file to restyle.');
    process.exit(1);
  }
  for (const file of html) {
    const p = path.join(appDir, file);
    const src = readFileSync(p, 'utf8');
    const block = `<style>${css}</style>`;
    writeFileSync(p, src.includes('</head>') ? src.replace('</head>', `${block}\n</head>`) : block + src);
    console.log(`→ Edit ${file}`);
  }
}
await pause(delay / 2);
console.log(`SUMMARY: ${look.name}. A demo restyle: ${look.font.split(',')[0].replace(/"/g, '')} type on ${look.bg} with ${look.accent} accents.`);
