// Builds the title's glyph-morph data from the 3D typefaces
// (public/fonts/3d/<face>.json, written by build-3d-fonts.mjs) into one
// compact file, public/fonts/3d/morph.json, so the 2D and 3D words morph each
// letter's outline from one face to the next by plain array lerps.
//
// Per face and letter: every contour flattened and resampled to N points by
// arc length, outers wound counter-clockwise and holes clockwise (y up), the
// outers sorted by area (largest first), then the holes, each hole tagged with
// the outer that contains it. Points are in thousandths of an em, x from the
// centre of the advance, y up from the baseline, delta-encoded. Contours are
// paired between faces at runtime (lib/glyphMorph.ts), where start points are
// aligned once per step.
// Usage (in site/): node scripts/build-morph.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const N = 72;
const CHARS = [...new Set('variantly')];
const dir = join(process.cwd(), 'public/fonts/3d');
const FACE_COUNT = 20;

// facetype.js outline to polylines (font units, y up), curves finely flattened.
const flatten = (o) => {
  const t = o.split(' ');
  const contours = [];
  let cur = null;
  let x = 0;
  let y = 0;
  const push = (px, py) => cur.push([px, py]);
  for (let i = 0; i < t.length;) {
    const c = t[i++];
    const n = () => Number(t[i++]);
    if (c === 'm') {
      cur = [];
      contours.push(cur);
      x = n();
      y = n();
      push(x, y);
    } else if (c === 'l') {
      x = n();
      y = n();
      push(x, y);
    } else if (c === 'q') {
      const ex = n();
      const ey = n();
      const cx = n();
      const cy = n();
      for (let s = 1; s <= 16; s++) {
        const u = s / 16;
        const v = 1 - u;
        push(v * v * x + 2 * v * u * cx + u * u * ex, v * v * y + 2 * v * u * cy + u * u * ey);
      }
      x = ex;
      y = ey;
    } else if (c === 'b') {
      const ex = n();
      const ey = n();
      const ax = n();
      const ay = n();
      const bx = n();
      const by = n();
      for (let s = 1; s <= 24; s++) {
        const u = s / 24;
        const v = 1 - u;
        push(
          v * v * v * x + 3 * v * v * u * ax + 3 * v * u * u * bx + u * u * u * ex,
          v * v * v * y + 3 * v * v * u * ay + 3 * v * u * u * by + u * u * u * ey,
        );
      }
      x = ex;
      y = ey;
    }
  }
  // Drop repeated points (and a closing point equal to the start).
  return contours
    .map((c) =>
      c.filter((p, k) => {
        const q = c[(k + c.length - 1) % c.length];
        return Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-6;
      }),
    )
    .filter((c) => c.length >= 3);
};

const area = (c) => {
  let a = 0;
  for (let i = 0; i < c.length; i++) {
    const [x0, y0] = c[i];
    const [x1, y1] = c[(i + 1) % c.length];
    a += x0 * y1 - x1 * y0;
  }
  return a / 2;
};

const inside = ([px, py], c) => {
  let hit = false;
  for (let i = 0, j = c.length - 1; i < c.length; j = i++) {
    const [xi, yi] = c[i];
    const [xj, yj] = c[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
};

// N points evenly spaced by arc length.
const resample = (c) => {
  const len = [0];
  for (let i = 1; i <= c.length; i++) {
    const [x0, y0] = c[i - 1];
    const [x1, y1] = c[i % c.length];
    len.push(len[i - 1] + Math.hypot(x1 - x0, y1 - y0));
  }
  const total = len[c.length];
  const out = [];
  let k = 0;
  for (let s = 0; s < N; s++) {
    const d = (s / N) * total;
    while (len[k + 1] < d) k++;
    const u = (d - len[k]) / Math.max(1e-9, len[k + 1] - len[k]);
    const [x0, y0] = c[k];
    const [x1, y1] = c[(k + 1) % c.length];
    out.push([x0 + (x1 - x0) * u, y0 + (y1 - y0) * u]);
  }
  return out;
};

const faces = [];
let totalContours = 0;
for (let f = 0; f < FACE_COUNT; f++) {
  const font = JSON.parse(readFileSync(join(dir, `${f}.json`), 'utf8'));
  const em = font.resolution;
  // Baseline height in a 1em, line-height 1 box (from the bottom, in em): the
  // ascender/descender split the half-leading evenly, as CSS does.
  const asc = font.ascender / em;
  const desc = -font.descender / em;
  const base = (1 - asc - desc) / 2 + desc;
  const glyphs = {};
  for (const ch of CHARS) {
    const g = font.glyphs[ch];
    const cx = g.ha / 2;
    const raw = flatten(g.o).filter((c) => Math.abs(area(c)) > em * em * 1e-5);
    // Nesting depth decides outer (even) or hole (odd), whatever the winding.
    const info = raw.map((c, i) => {
      const parents = raw.filter((d, j) => j !== i && inside(c[0], d));
      const depth = parents.length;
      return { c, a: Math.abs(area(c)), hole: depth % 2 === 1, parents };
    });
    const orient = (c, ccw) => (area(c) > 0 === ccw ? c : [...c].reverse());
    const outers = info.filter((k) => !k.hole).sort((p, q) => q.a - p.a);
    const holes = info.filter((k) => k.hole).sort((p, q) => q.a - p.a);
    // The smallest outer around each hole.
    const parentOf = (h) => {
      let best = 0;
      let bestA = Infinity;
      outers.forEach((o, i) => {
        if (h.parents.includes(o.c) && o.a < bestA) {
          best = i;
          bestA = o.a;
        }
      });
      return best;
    };
    const enc = (c) => {
      const pts = resample(c);
      const flat = [];
      let px = 0;
      let py = 0;
      for (const [x, y] of pts) {
        const qx = Math.round(((x - cx) / em) * 1000);
        const qy = Math.round((y / em) * 1000);
        flat.push(qx - px, qy - py);
        px = qx;
        py = qy;
      }
      return flat;
    };
    glyphs[ch] = {
      a: Math.round((g.ha / em) * 1000),
      o: outers.length,
      p: holes.map(parentOf),
      c: [
        ...outers.map((k) => enc(orient(k.c, true))),
        ...holes.map((k) => enc(orient(k.c, false))),
      ],
    };
    totalContours += outers.length + holes.length;
  }
  faces.push({ b: Math.round(base * 1000), g: glyphs });
}

const json = JSON.stringify({ n: N, faces });
const target = join(dir, 'morph.json');
writeFileSync(target, json);
const counts = CHARS.map(
  (ch) =>
    `${ch}: ${Math.max(...faces.map((f) => f.g[ch].o))} outers, ${Math.max(...faces.map((f) => f.g[ch].p.length))} holes`,
);
console.log(counts.join('\n'));
console.log(
  `${target}  ${totalContours} contours x ${N} points  ${(json.length / 1024).toFixed(1)} KB, ${(gzipSync(json, { level: 9 }).length / 1024).toFixed(1)} KB gzip`,
);
