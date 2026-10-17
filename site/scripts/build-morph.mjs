// Builds the title's glyph-morph data from the 3D typefaces
// (public/fonts/3d/<face>.json, written by build-3d-fonts.mjs) into one
// compact file, public/fonts/3d/morph.json, so the 2D and 3D words morph each
// letter's outline from one face to the next by plain array lerps.
//
// Per face and letter: the filled outline (overlapping contours merged), every
// contour flattened and resampled to N points by arc length, outers wound counter-clockwise and holes clockwise (y up), the
// outers sorted by area (largest first), then the holes, each hole tagged with
// the outer that contains it. Points are in thousandths of an em, x from the
// centre of the advance, y up from the baseline, delta-encoded. Contours are
// paired between faces at runtime (lib/glyphMorph.ts), where start points are
// aligned once per step. Also, per letter, which faces morph cleanly into
// which (see below), for the runtime's face sequences.
// Usage (in site/): node scripts/build-morph.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

import clip from 'polygon-clipping';

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
    // The filled shape, overlaps removed (some faces, Cinzel among them, draw
    // a letter from overlapping contours): the contours wound like the largest
    // one, merged, minus the ones wound the other way.
    const biggest = raw.reduce((p, c) => (Math.abs(area(c)) > Math.abs(area(p)) ? c : p), raw[0]);
    const sign = Math.sign(area(biggest));
    const ring = (c) => [[...c, c[0]]];
    const pos = raw.filter((c) => Math.sign(area(c)) === sign).map(ring);
    const neg = raw.filter((c) => Math.sign(area(c)) !== sign).map(ring);
    let filled = pos.length ? clip.union(...pos) : [];
    if (neg.length) filled = clip.difference(filled, ...neg);
    const open = (r) => r.slice(0, -1);
    const minA = em * em * 1e-4;
    const polys = filled
      .map((poly) => ({ outer: open(poly[0]), holes: poly.slice(1).map(open) }))
      .filter((p) => Math.abs(area(p.outer)) > minA)
      .sort((p, q) => Math.abs(area(q.outer)) - Math.abs(area(p.outer)));
    const orient = (c, ccw) => (area(c) > 0 === ccw ? c : [...c].reverse());
    const outers = polys.map((p) => p.outer);
    const holeList = polys
      .flatMap((p, i) => p.holes.map((h) => ({ h, parent: i })))
      .filter(({ h }) => Math.abs(area(h)) > minA)
      .sort((p, q) => Math.abs(area(q.h)) - Math.abs(area(p.h)));
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
      p: holeList.map((k) => k.parent),
      c: [
        ...outers.map((c) => enc(orient(c, true))),
        ...holeList.map((k) => enc(orient(k.h, false))),
      ],
    };
    totalContours += outers.length + holeList.length;
  }
  faces.push({ b: Math.round(base * 1000), g: glyphs });
}

// ---- Which faces morph cleanly into which, per letter ---------------------
// Mirrors lib/glyphMorph.ts: contours paired by rank, each split into a frame
// (centre, RMS size) and a unit shape whose start point is aligned by the
// least summed squared distance over every offset. A pair is compatible when
// both faces have the same outers and holes and, at a quarter, half and
// three quarters of the way, no contour folds (crosses itself or another) or
// shrinks below 60% of its endpoints' mean area (crossings the faces
// already have do not count). Monoton (stacked stripes)
// morphs into nothing: it stays out of the morph wardrobe.
const decodeC = (d) => {
  const c = new Float64Array(d.length);
  let x = 0;
  let y = 0;
  for (let i = 0; i < d.length; i += 2) {
    x += d[i];
    y += d[i + 1];
    c[i] = x / 1000;
    c[i + 1] = y / 1000;
  }
  return c;
};
const frameOf = (c) => {
  let x = 0;
  let y = 0;
  for (let i = 0; i < N; i++) {
    x += c[i * 2];
    y += c[i * 2 + 1];
  }
  x /= N;
  y /= N;
  let d = 0;
  for (let i = 0; i < N; i++) d += (c[i * 2] - x) ** 2 + (c[i * 2 + 1] - y) ** 2;
  return [x, y, Math.sqrt(d / N) || 1e-6];
};
const norm = (c, [x, y, r]) => c.map((v, i) => (i % 2 ? (v - y) / r : (v - x) / r));
const align = (a, b) => {
  let best = 0;
  let bestD = Infinity;
  for (let s = 0; s < N; s++) {
    let d = 0;
    for (let i = 0; i < N && d < bestD; i++) {
      const j = ((i + s) % N) * 2;
      d += (a[i * 2] - b[j]) ** 2 + (a[i * 2 + 1] - b[j + 1]) ** 2;
    }
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  const out = new Float64Array(N * 2);
  for (let i = 0; i < N; i++) {
    out[i * 2] = b[((i + best) % N) * 2];
    out[i * 2 + 1] = b[((i + best) % N) * 2 + 1];
  }
  return [out, bestD / N];
};
const flatArea = (c) => {
  let a = 0;
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    a += c[i * 2] * c[j * 2 + 1] - c[j * 2] * c[i * 2 + 1];
  }
  return a / 2;
};
const crosses = (p, q, r, s) => {
  const o = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  return o(p, q, r) * o(p, q, s) < 0 && o(r, s, p) * o(r, s, q) < 0;
};
const segs = (c) =>
  Array.from({ length: N }, (_, i) => [
    [c[i * 2], c[i * 2 + 1]],
    [c[((i + 1) % N) * 2], c[((i + 1) % N) * 2 + 1]],
  ]);
// Crossing segment pairs within and between contours (some faces overlap
// their own contours already, so a morph may not add crossings, not none).
const folds = (contours) => {
  let n = 0;
  const all = contours.map(segs);
  for (let u = 0; u < all.length; u++)
    for (let v = u; v < all.length; v++)
      for (let i = 0; i < N; i++)
        for (let j = u === v ? i + 2 : 0; j < N; j++) {
          if (u === v && i === 0 && j === N - 1) continue;
          if (crosses(all[u][i][0], all[u][i][1], all[v][j][0], all[v][j][1])) n++;
        }
  return n;
};
const monoton = [...Array(FACE_COUNT).keys()].find(
  (f) => JSON.parse(readFileSync(join(dir, `${f}.json`), 'utf8')).familyName === 'Monoton',
);
const k = {};
for (const ch of CHARS) {
  const contours = faces.map((f) => f.g[ch].c.map(decodeC));
  const shape = (f) => [faces[f].g[ch].o, faces[f].g[ch].p.length];
  const lists = Array.from({ length: FACE_COUNT }, () => []);
  for (let a = 0; a < FACE_COUNT; a++)
    for (let b = 0; b < FACE_COUNT; b++) {
      if (a === b || a === monoton || b === monoton) continue;
      const [oa, ha] = shape(a);
      const [ob, hb] = shape(b);
      if (oa !== ob || ha !== hb) continue;
      let score = 0;
      const pairs = contours[a].map((ca, s) => {
        const cb = contours[b][s];
        const fa = frameOf(ca);
        const fb = frameOf(cb);
        const na = norm(ca, fa);
        const [nb, d] = align(na, norm(cb, fb));
        score += d;
        return { fa, fb, na, nb, area: (Math.abs(flatArea(ca)) + Math.abs(flatArea(cb))) / 2 };
      });
      const ends = Math.max(folds(contours[a]), folds(contours[b]));
      const clean = [0.25, 0.5, 0.75].every((e) => {
        const mid = pairs.map(({ fa, fb, na, nb }) => {
          const cx = fa[0] + (fb[0] - fa[0]) * e;
          const cy = fa[1] + (fb[1] - fa[1]) * e;
          const r = fa[2] + (fb[2] - fa[2]) * e;
          return na.map((v, i) => (i % 2 ? cy : cx) + (v + (nb[i] - v) * e) * r);
        });
        if (mid.some((c, s) => Math.abs(flatArea(c)) < 0.6 * pairs[s].area)) return false;
        return folds(mid) <= ends;
      });
      if (clean) lists[b].push([a, score / pairs.length]);
    }
  k[ch] = lists.map((l) => l.sort((p, q) => p[1] - q[1]).map(([f]) => f));
  const pairsOk = lists.reduce((n, l) => n + l.length, 0);
  console.log(
    `${ch}: ${pairsOk} clean pairs; faces nothing morphs into: ${
      k[ch].flatMap((l, f) => (l.length || f === monoton ? [] : [f])).join(',') || 'none'
    }`,
  );
}

const json = JSON.stringify({ n: N, faces, k });
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
