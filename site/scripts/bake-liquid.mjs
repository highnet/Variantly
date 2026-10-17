// Prebakes the "How it works" numerals filling with liquid.
//
// For each numeral (1, 2, 3) this renders the real glyph in the site's numeral
// face (Martian Mono, 700, 75% width, the .figure style) in headless Chromium,
// reads it back as a container mask, and runs a small 2D liquid simulation
// inside it: liquid poured in at the top, a level that rises by the glyph's
// own cross-section (fast up the thin stem of a 1, slow across the foot of a
// 2), and a damped shallow-water heightfield along the surface that only
// propagates through the columns that are inside the glyph at that level, so
// waves reflect off the strokes. The pour stream digs into the surface, walls
// pull up a meniscus, and the last frames settle flat above the glyph top.
//
// The result is written as one tiny SVG sprite per numeral to
// public/liquid/step-<n>.svg: FRAMES tiles side by side, the liquid body in
// the top row and the meniscus line (a stroke along the surface) in the
// bottom row. The page uses it as a mask-image on a copy of the numeral, so
// the colour comes from the theme and the real glyph (in whatever face a
// concept uses) clips the liquid. Vector frames stay crisp at any DPR and are
// a few kB gzipped.
//
// Usage (in site/): node scripts/bake-liquid.mjs
// Needs Playwright with Chromium (a global install works: it is looked up in
// the global node_modules when it is not a local dependency).
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const site = join(here, '..');
const out = join(site, 'public/liquid');

// Must match LIQUID_FRAMES in components/HowItWorks.tsx.
export const FRAMES = 48;
const DIGITS = ['1', '2', '3'];
const PX = 400; // render size of the glyph for the container mask
const TILE = 200; // sprite units per tile width
const COLS = 56; // surface columns

const loadPlaywright = () => {
  const req = createRequire(import.meta.url);
  try {
    return req('playwright');
  } catch {
    const g = execSync('npm root -g').toString().trim();
    return req(join(g, 'playwright'));
  }
};

// Seeded noise so a re-bake gives the same frames.
const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

/** Renders each digit exactly as the page lays out the fill copy; returns alpha masks. */
const glyphMasks = async () => {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const font = readFileSync(join(site, 'app/fonts/martian-mono.woff2')).toString('base64');
  await page.setContent(`<!doctype html><style>
    @font-face { font-family: M; src: url(data:font/woff2;base64,${font}) format('woff2');
      font-weight: 100 800; font-stretch: 75% 112.5%; }
    body { margin: 0; background: #fff; }
    .num { display: inline-grid; font-size: ${PX}px; margin: 40px; }
    .f { font-family: M; font-stretch: 75%; font-weight: 700; font-variant-numeric: tabular-nums;
      letter-spacing: -0.02em; display: block; line-height: 0.8; padding: 0.15em 0; color: #000; }
  </style>${DIGITS.map((d) => `<span class="num"><span class="f">${d}</span></span>`).join('')}`);
  await page.evaluate(() => document.fonts.ready);
  const masks = [];
  for (const [i, el] of (await page.$$('.f')).entries()) {
    const png = (await el.screenshot()).toString('base64');
    masks.push(
      await page.evaluate(async (src) => {
        const img = new Image();
        img.src = `data:image/png;base64,${src}`;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const g = c.getContext('2d');
        g.drawImage(img, 0, 0);
        const { data } = g.getImageData(0, 0, c.width, c.height);
        const ink = [];
        for (let p = 0; p < data.length; p += 4) ink.push(data[p] < 128 ? 1 : 0);
        return { w: c.width, h: c.height, ink };
      }, png),
    );
    console.log(`glyph ${DIGITS[i]}: ${masks[i].w}×${masks[i].h}px`);
  }
  await browser.close();
  return masks;
};

/** Runs the pour for one glyph; returns FRAMES surface profiles in sprite units. */
const simulate = ({ w, h, ink }, seed) => {
  const at = (x, y) => (x >= 0 && x < w && y >= 0 && y < h ? ink[y * w + x] : 0);
  const area = new Float64Array(h);
  let top = h;
  let bottom = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) area[y] += at(x, y);
    if (area[y]) {
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  // Above the glyph the level keeps rising as if through a full-width box.
  for (let y = 0; y < top; y++) area[y] = w;
  // Volume of liquid below a surface at row y (rows y..bottom).
  const below = new Float64Array(h + 1);
  for (let y = bottom; y >= 0; y--) below[y] = below[y + 1] + area[y];
  const full = top - 0.06 * h; // settled level: clear of the glyph top
  const vFull = below[Math.floor(full)];
  const levelFor = (v) => {
    let y = bottom + 1;
    while (y > 0 && below[y - 1] <= v) y--;
    // Fractional row inside the next row up.
    const a = area[y - 1] || w;
    return y - (v - below[y]) / a;
  };

  const cx = (i) => Math.min(w - 1, Math.round(((i + 0.5) / COLS) * w));
  // A column is wet at level L when the glyph has ink there within a few rows.
  const wetAt = (i, L) => {
    const x = cx(i);
    for (let d = -6; d <= 10; d++) if (at(x, Math.round(L) + d)) return true;
    return false;
  };

  const rand = rng(seed);
  const eta = new Float64Array(COLS); // surface height above the level, px
  const vel = new Float64Array(COLS);
  const wet = new Array(COLS).fill(false);
  // Where the stream lands: the middle of the glyph's top stroke.
  let pour = 0;
  let n = 0;
  for (let i = 0; i < COLS; i++)
    if (at(cx(i), top + 8)) {
      pour += i;
      n++;
    }
  pour = n ? pour / n : COLS / 2;

  const pourEnd = 0.8; // share of the sequence spent pouring; the rest settles
  // A steady pour, so the level tracks scroll progress, easing off at the brim.
  const volumeAt = (t) => {
    const u = Math.min(1, t / pourEnd);
    return vFull * (u < 0.85 ? u : 0.85 + 0.15 * (1 - (1 - (u - 0.85) / 0.15) ** 2));
  };
  const sub = 24; // simulation steps per frame
  const dt = 1 / sub;
  const c2 = 0.8; // wave speed², columns²/step²
  const amp = h * 0.035; // cap on wave height
  const frames = [];
  let prevV = 0;
  for (let f = 0; f < FRAMES; f++) {
    for (let s = 0; s < sub; s++) {
      const t = (f + s / sub) / (FRAMES - 1);
      const v = volumeAt(t);
      const rate = (v - prevV) / vFull; // inflow this step, 0..~0.002
      prevV = v;
      const L = levelFor(v);
      for (let i = 0; i < COLS; i++) {
        const now = wetAt(i, L);
        if (!now) {
          eta[i] *= 0.6;
          vel[i] = 0;
        }
        wet[i] = now;
      }
      // Linear shallow water: d²η/dt² = c²∇²η − damping, walls where dry.
      const lap = new Float64Array(COLS);
      for (let i = 0; i < COLS; i++) {
        if (!wet[i]) continue;
        const l = i > 0 && wet[i - 1] ? eta[i - 1] : eta[i];
        const r = i < COLS - 1 && wet[i + 1] ? eta[i + 1] : eta[i];
        lap[i] = l + r - 2 * eta[i];
      }
      const settling = t > pourEnd;
      const damp = settling ? 0.12 + (t - pourEnd) * 0.8 : 0.06;
      for (let i = 0; i < COLS; i++) {
        if (!wet[i]) continue;
        vel[i] += dt * (c2 * lap[i] - damp * vel[i]);
        // The stream digs a dimple and pushes rings out; a little jitter
        // keeps the surface alive while it pours.
        const d = i - pour;
        vel[i] -= dt * rate * h * 55 * Math.exp(-(d * d) / 10);
        // The pour wavers from side to side, rocking the whole surface.
        vel[i] += dt * rate * h * 30 * Math.sin(2 * Math.PI * 2.5 * t) * ((i - pour) / COLS);
        if (!settling) vel[i] += dt * (rand() - 0.5) * rate * h * 6;
      }
      // Keep the volume: the mean over wet columns stays zero.
      let sum = 0;
      let k = 0;
      for (let i = 0; i < COLS; i++)
        if (wet[i]) {
          eta[i] += dt * vel[i];
          eta[i] = Math.max(-amp, Math.min(amp, eta[i]));
          sum += eta[i];
          k++;
        }
      if (k) for (let i = 0; i < COLS; i++) if (wet[i]) eta[i] -= sum / k;
    }
    // Profile for this frame, in sprite units (y down).
    const t = f / (FRAMES - 1);
    const L = f === 0 ? h + 4 : levelFor(volumeAt(t));
    const calm = f >= FRAMES - 3; // the last frames are flat: a full numeral is solid
    // A light 1-2-1 pass over the wet columns: the surface tension that
    // rounds off the grid-scale chop.
    const e = Float64Array.from(eta);
    for (let pass = 0; pass < 3; pass++)
      for (let i = 1; i < COLS - 1; i++)
        if (wet[i - 1] && wet[i] && wet[i + 1]) e[i] = (e[i - 1] + 2 * e[i] + e[i + 1]) / 4;
    const ys = [];
    for (let i = 0; i < COLS; i++) {
      let y = L - (calm ? 0 : e[i]);
      if (wet[i] && !calm && f > 0) {
        // Meniscus: the surface climbs the wall it meets.
        let dist = COLS;
        for (let j = 0; j < COLS; j++) if (!wet[j]) dist = Math.min(dist, Math.abs(j - i));
        y -= h * 0.012 * Math.exp(-(dist - 1) / 1.4);
      }
      ys.push(y);
    }
    frames.push(ys.map((y) => (y / w) * TILE));
  }
  return { frames, hu: (h / w) * TILE };
};

const r = (v) => Math.round(v);

/** One SVG: liquid bodies in the top row, meniscus lines in the bottom row. */
const sprite = ({ frames, hu }) => {
  const H = r(hu);
  const xs = Array.from({ length: COLS }, (_, i) => ((i + 0.5) / COLS) * TILE);
  const line = (ys, ox, oy) => {
    // Smooth with quadratic midpoints so the surface reads as liquid, not a polyline.
    let d = `M${ox},${r(ys[0] + oy)}`;
    for (let i = 0; i < COLS - 1; i++) {
      const mx = (xs[i] + xs[i + 1]) / 2;
      const my = (ys[i] + ys[i + 1]) / 2;
      d += `Q${r(ox + xs[i])},${r(ys[i] + oy)} ${r(ox + mx)},${r(my + oy)}`;
    }
    return `${d}L${ox + TILE},${r(ys[COLS - 1] + oy)}`;
  };
  const stroke = r(TILE * 0.035);
  const body = [];
  const lines = [];
  frames.forEach((ys, f) => {
    const ox = f * TILE;
    if (f === 0) return; // empty
    if (Math.max(...ys) <= 0) {
      body.push(`M${ox},0h${TILE}v${H}h-${TILE}z`);
      return;
    }
    body.push(`${line(ys, ox, 0)}V${H}H${ox}Z`);
    if (f < FRAMES - 1) lines.push(line(ys, ox, H + stroke / 2));
  });
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FRAMES * TILE} ${2 * H}" preserveAspectRatio="none">` +
    `<path d="${body.join('')}"/>` +
    `<path d="${lines.join('')}" fill="none" stroke="#000" stroke-width="${stroke}"/>` +
    `</svg>`
  );
};

const masks = await glyphMasks();
mkdirSync(out, { recursive: true });
let total = 0;
DIGITS.forEach((d, i) => {
  const svg = sprite(simulate(masks[i], 7 + i));
  writeFileSync(join(out, `step-${d}.svg`), svg);
  const gz = gzipSync(svg).length;
  total += gz;
  console.log(`step-${d}.svg: ${(svg.length / 1024).toFixed(1)} kB, ${(gz / 1024).toFixed(1)} kB gzipped`);
});
console.log(`all numerals: ${(total / 1024).toFixed(1)} kB gzipped`);
