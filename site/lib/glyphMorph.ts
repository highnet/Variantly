// Outline morphing for the title's letters, shared by the 2D (canvas) and 3D
// words so both morph identically. The data (public/fonts/3d/morph.json, built
// by scripts/build-morph.mjs) holds every face's outline of each letter as
// contours resampled to the same point count, plus, per letter, which faces
// morph cleanly into which (same contours and holes, no fold, collapse or
// lost legibility at any point of the springy morph, overshoot included).
// Each letter walks a face sequence that leaves its final face and comes back
// to it through those compatible neighbours, so every step morphs. Once per
// step its track pairs the two faces' contours (outers with outers, holes with
// holes, by size), lines each pair up by shape and splits it into a frame
// (centre, size) and a normalised shape, so every frame is a plain lerp into
// preallocated arrays that never folds a contour through itself.
import { SPRING_PEAK, stepCount, type MorphPhase, type Timeline } from '@/lib/titleTiming';

// How far past the next face a morph may swing (the spring's overshoot).
export const OVERSHOOT_MAX = SPRING_PEAK;

type RawGlyph = { a: number; o: number; p: number[]; c: number[][] };
export type RawData = {
  n: number;
  faces: { b: number; g: Record<string, RawGlyph> }[];
  // Per letter, per face: the faces that morph cleanly into it, best first.
  k: Record<string, number[][]>;
};

type Glyph = {
  // Advance, em.
  adv: number;
  outers: Float32Array[];
  holes: Float32Array[];
  // The outer each hole sits in.
  parents: number[];
  // Per contour (outers, then holes) and point: how far the 3D bevel may
  // inset the outline there (em), filled in on first use.
  room: Float32Array[] | null;
};
export type MorphData = {
  // Points per contour.
  n: number;
  faces: number;
  // Baseline height per face in a 1em, line-height 1 box, from the bottom (em).
  base: number[];
  glyphs: Record<string, Glyph>[];
  // Most outers and holes any face has, per letter.
  most: Record<string, [number, number]>;
  // Compatible predecessors per letter and face, best first, and the same as
  // a matrix (from * faces + to).
  next: Record<string, number[][]>;
  ok: Record<string, Uint8Array>;
};

// Contour points: x from the advance centre, y up from the baseline, em.
export const decodeMorph = (raw: RawData): MorphData => {
  const most: Record<string, [number, number]> = {};
  const faces = raw.faces.length;
  const glyphs = raw.faces.map((f) => {
    const out: Record<string, Glyph> = {};
    for (const [ch, g] of Object.entries(f.g)) {
      const pts = g.c.map((d) => {
        const c = new Float32Array(d.length);
        let x = 0;
        let y = 0;
        for (let i = 0; i < d.length; i += 2) {
          x += d[i];
          y += d[i + 1];
          c[i] = x / 1000;
          c[i + 1] = y / 1000;
        }
        return c;
      });
      out[ch] = {
        adv: g.a / 1000,
        outers: pts.slice(0, g.o),
        holes: pts.slice(g.o),
        parents: g.p,
        room: null,
      };
      const m = (most[ch] ??= [0, 0]);
      m[0] = Math.max(m[0], g.o);
      m[1] = Math.max(m[1], g.p.length);
    }
    return out;
  });
  const ok: Record<string, Uint8Array> = {};
  for (const [ch, lists] of Object.entries(raw.k)) {
    const m = new Uint8Array(faces * faces);
    lists.forEach((from, to) => from.forEach((f) => (m[f * faces + to] = 1)));
    ok[ch] = m;
  }
  return { n: raw.n, faces, base: raw.faces.map((f) => f.b / 1000), glyphs, most, next: raw.k, ok };
};

let loading: Promise<MorphData> | null = null;
// Fetched once, by whichever word asks first.
export const loadMorph = () =>
  (loading ??= fetch('/fonts/3d/morph.json')
    .then((r) => {
      if (!r.ok) throw new Error(`morph data: ${r.status}`);
      return r.json() as Promise<RawData>;
    })
    .then(decodeMorph));

const hash = (k: number, i: number) => {
  let x = (Math.imul(k + 1, 2654435761) ^ Math.imul(i + 1, 40503)) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x2c1b3c6d) >>> 0;
  return (x ^ (x >>> 12)) >>> 0;
};

// The faces a face morphs cleanly into, for a letter, best first.
const successors = (data: MorphData, ch: string, from: number) => {
  const out: [number, number][] = [];
  data.next[ch].forEach((preds, to) => {
    const rank = preds.indexOf(from);
    if (rank >= 0) out.push([to, rank]);
  });
  return out.sort((a, b) => a[1] - b[1]).map(([to]) => to);
};

// A run of `len` morphs that leaves `home` and comes back to it, every link
// compatible: a depth-first search forward from `home` (candidates in order
// of legibility, turned by a hash so letters differ), never revisiting home
// midway, the face just left or the one before it. A final face in a small
// island (Rye's t, Pacifico's l) may have to go back and forth between two
// faces; one with no compatible neighbour at all holds still.
const loop = (data: MorphData, ch: string, index: number, len: number, home: number) => {
  const out = new Int16Array(len + 1).fill(home);
  const ok = data.ok[ch];
  const F = data.faces;
  let relaxed = false;
  let tries = 0;
  const options = (k: number) => {
    const prev = out[k - 1];
    const list = successors(data, ch, prev).filter(
      (f) =>
        f !== prev &&
        (f !== home || k === len) &&
        (relaxed || k < 2 || f !== out[k - 2]) &&
        // The last face before home must morph into it.
        (k !== len - 1 || ok[f * F + home]),
    );
    const top = list.slice(0, 6);
    const turn = hash(k, index) % Math.max(1, top.length);
    return [...top.slice(turn), ...top.slice(0, turn), ...list.slice(6)];
  };
  const walk = (k: number): boolean => {
    if (k === len) return ok[out[len - 1] * F + home] === 1;
    if (++tries > 4000) return false;
    for (const f of options(k)) {
      out[k] = f;
      if (walk(k + 1)) return true;
    }
    return false;
  };
  if (len < 2) return out;
  if (walk(1)) return out;
  relaxed = true;
  tries = 0;
  if (walk(1)) return out;
  out.fill(home);
  return out;
};

// A letter's faces through the reveal: one per step, then its final face; it
// starts on the final face too (the still word the reveal starts from).
// The low power tier morphs only from even steps to the step two on, so it
// gets its own run over those steps (odd steps repeat the even face).
// Deterministic, so a seeked frame is reproducible.
const sequences = new Map<string, Int16Array>();
export const faceSequence = (
  data: MorphData,
  ch: string,
  index: number,
  finalFace: number,
  count: number,
  low = false,
) => {
  const key = `r${index}:${finalFace}:${count}:${low ? 1 : 0}`;
  let seq = sequences.get(key);
  if (seq) return seq;
  if (!low) seq = loop(data, ch, index, count, finalFace);
  else {
    const half = Math.ceil(count / 2);
    const c = loop(data, ch, index, half, finalFace);
    seq = new Int16Array(count + 1);
    for (let s = 0; s <= count; s++) seq[s] = s === count ? finalFace : c[Math.floor(s / 2)];
  }
  sequences.set(key, seq);
  return seq;
};

// A letter's faces when the concept changes: from the old final face to the
// new one in `count` morphs. The same face both ends: out to a compatible
// neighbour and back. Different faces: the shortest compatible route (a
// direct morph if there is none), then it holds.
export const swapSequence = (
  data: MorphData,
  ch: string,
  index: number,
  from: number,
  to: number,
  count: number,
) => {
  const key = `s${index}:${from}:${to}:${count}`;
  let seq = sequences.get(key);
  if (seq) return seq;
  seq = new Int16Array(count + 1).fill(to);
  seq[0] = from;
  if (from === to) {
    const back = successors(data, ch, from).filter((f) => data.ok[ch][f * data.faces + from]);
    if (back.length && count >= 2) seq[1] = back[hash(7, index) % Math.min(4, back.length)];
  } else {
    // Breadth-first over compatible morphs.
    const prev = new Int16Array(data.faces).fill(-1);
    prev[from] = from;
    const queue = [from];
    while (queue.length && prev[to] < 0) {
      const f = queue.shift()!;
      for (const g of successors(data, ch, f))
        if (prev[g] < 0) {
          prev[g] = f;
          queue.push(g);
        }
    }
    const path = [to];
    if (prev[to] >= 0) while (path[0] !== from) path.unshift(prev[path[0]]);
    else path.unshift(from);
    if (path.length - 1 <= count) path.forEach((f, k) => (seq![k] = f));
  }
  sequences.set(key, seq);
  return seq;
};

export type MorphTrack = {
  ch: string;
  n: number;
  // Slots: the letter's most outers, then its most holes.
  slots: number;
  outerSlots: number;
  // Contours of the face left (a) and the face reached (b), and the blend:
  // normalised shapes in a/b and each slot's frame (centre x, y, size) in fa/fb.
  a: Float32Array;
  b: Float32Array;
  fa: Float32Array;
  fb: Float32Array;
  out: Float32Array;
  // Per point: the 3D bevel's room to inset (em) at either end, and blended.
  ia: Float32Array;
  ib: Float32Array;
  room: Float32Array;
  // Whether a slot is drawn, and each hole slot's outer.
  live: Uint8Array;
  parent: Int16Array;
  from: number;
  to: number;
};

export const morphTrack = (data: MorphData, ch: string): MorphTrack => {
  const [o, h] = data.most[ch];
  const slots = o + h;
  const size = slots * data.n * 2;
  return {
    ch,
    n: data.n,
    slots,
    outerSlots: o,
    a: new Float32Array(size),
    b: new Float32Array(size),
    fa: new Float32Array(slots * 3),
    fb: new Float32Array(slots * 3),
    out: new Float32Array(size),
    ia: new Float32Array(slots * data.n),
    ib: new Float32Array(slots * data.n),
    room: new Float32Array(slots * data.n),
    live: new Uint8Array(slots),
    parent: new Int16Array(slots),
    from: -1,
    to: -1,
  };
};

// The room the 3D bevel has to inset a glyph's outline at each point: under
// half the distance from the point, straight inward, to the far side of the
// stroke (any contour), so the inset outline of a thin stroke (a hairline, a
// serif, a sharp notch) never crosses itself or a neighbour. Without it, the
// caps' triangulation of a crossed outline throws slabs across the letter.
const MAX_ROOM = 0.05;
const roomOf = (g: Glyph) => {
  if (g.room) return g.room;
  const all = [...g.outers, ...g.holes];
  g.room = all.map((c, ci) => {
    const n = c.length / 2;
    const r = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const p = (i + n - 1) % n;
      const q = (i + 1) % n;
      const x = c[i * 2];
      const y = c[i * 2 + 1];
      // Outward normal (outers run counter-clockwise, holes clockwise): the
      // mean of the two edges' (dy, -dx); inward is its opposite.
      let ax = y - c[p * 2 + 1];
      let ay = c[p * 2] - x;
      let l = Math.hypot(ax, ay) || 1;
      ax /= l;
      ay /= l;
      let bx = c[q * 2 + 1] - y;
      let by = x - c[q * 2];
      l = Math.hypot(bx, by) || 1;
      bx /= l;
      by /= l;
      let dx = -(ax + bx);
      let dy = -(ay + by);
      l = Math.hypot(dx, dy) || 1;
      dx /= l;
      dy /= l;
      let best = MAX_ROOM * 2.5;
      all.forEach((d, di) => {
        const m = d.length / 2;
        for (let j = 0; j < m; j++) {
          const k = (j + 1) % m;
          // Skip the point's own two edges.
          if (di === ci && (j === i || k === i)) continue;
          const ex = d[k * 2] - d[j * 2];
          const ey = d[k * 2 + 1] - d[j * 2 + 1];
          const den = dx * ey - dy * ex;
          if (Math.abs(den) < 1e-12) continue;
          const wx = d[j * 2] - x;
          const wy = d[j * 2 + 1] - y;
          const t = (wx * ey - wy * ex) / den;
          const s = (wx * dy - wy * dx) / den;
          if (t > 1e-6 && s >= 0 && s <= 1 && t < best) best = t;
        }
      });
      // Where the outline turns toward its material (a convex corner, the
      // material always on the left), insetting further than the curve's
      // radius there folds the inset outline over itself: stay inside the
      // circle through this point and its neighbours, 1 to 3 points away.
      for (let w = 1; w <= 3; w++) {
        const u = (((i - w) % n) + n) % n;
        const v = (i + w) % n;
        const ux = c[u * 2] - x;
        const uy = c[u * 2 + 1] - y;
        const vx = c[v * 2] - x;
        const vy = c[v * 2 + 1] - y;
        const turn = uy * vx - ux * vy;
        if (turn <= 0) continue;
        const abc = Math.hypot(ux, uy) * Math.hypot(vx, vy) * Math.hypot(vx - ux, vy - uy);
        best = Math.min(best, (0.8 * abc) / (2 * turn) / 0.4);
      }
      r[i] = Math.min(MAX_ROOM, best * 0.4);
    }
    return r;
  });
  untangle(all, g.room);
  return g.room;
};

// Inset each contour as the 3D mesh does (every `stride`-th point, along the
// mean of its edges' inward normals, by its room) and count the crossings
// between inset edges; with `cut`, halve the room around every crossing.
const insetPts = (c: Float32Array, r: Float32Array, stride: number) => {
  const n = c.length / 2;
  const m = Math.floor(n / stride);
  const out = new Float64Array(m * 2);
  for (let i = 0; i < m; i++) {
    const p = ((i + m - 1) % m) * stride;
    const q = ((i + 1) % m) * stride;
    const at = i * stride;
    const x = c[at * 2];
    const y = c[at * 2 + 1];
    let ax = y - c[p * 2 + 1];
    let ay = c[p * 2] - x;
    let l = Math.hypot(ax, ay) || 1;
    ax /= l;
    ay /= l;
    let bx = c[q * 2 + 1] - y;
    let by = x - c[q * 2];
    l = Math.hypot(bx, by) || 1;
    bx /= l;
    by /= l;
    const sx = ax + bx;
    const sy = ay + by;
    l = Math.hypot(sx, sy) || 1;
    out[i * 2] = x - (sx / l) * r[at];
    out[i * 2 + 1] = y - (sy / l) * r[at];
  }
  return out;
};
const crosses = (a: Float64Array, i: number, b: Float64Array, j: number) => {
  const ma = a.length / 2;
  const mb = b.length / 2;
  const i2 = (i + 1) % ma;
  const j2 = (j + 1) % mb;
  const o = (px: number, py: number, qx: number, qy: number, rx: number, ry: number) =>
    (qx - px) * (ry - py) - (qy - py) * (rx - px);
  const [p1x, p1y, p2x, p2y] = [a[i * 2], a[i * 2 + 1], a[i2 * 2], a[i2 * 2 + 1]];
  const [q1x, q1y, q2x, q2y] = [b[j * 2], b[j * 2 + 1], b[j2 * 2], b[j2 * 2 + 1]];
  return (
    o(p1x, p1y, p2x, p2y, q1x, q1y) * o(p1x, p1y, p2x, p2y, q2x, q2y) < 0 &&
    o(q1x, q1y, q2x, q2y, p1x, p1y) * o(q1x, q1y, q2x, q2y, p2x, p2y) < 0
  );
};
// Shrink the room wherever an inset outline (at full and at phone detail)
// still crosses itself or another contour, until none does.
const untangle = (all: Float32Array[], room: Float32Array[]) => {
  for (const stride of [1, 2])
    for (let pass = 0; pass < 12; pass++) {
      const pts = all.map((c, k) => insetPts(c, room[k], stride));
      let found = false;
      pts.forEach((a, u) => {
        const ma = a.length / 2;
        for (let v = u; v < pts.length; v++) {
          const b = pts[v];
          const mb = b.length / 2;
          for (let i = 0; i < ma; i++)
            for (let j = u === v ? i + 2 : 0; j < mb; j++) {
              if (u === v && i === 0 && j === ma - 1) continue;
              if (!crosses(a, i, b, j)) continue;
              found = true;
              for (const [k, at, m] of [
                [u, i, ma],
                [v, j, mb],
              ])
                for (let d = -1; d <= 2; d++) {
                  const p = (((at + d) % m) + m) % m;
                  for (let s = 0; s < stride; s++) room[k][p * stride + s] *= 0.5;
                }
            }
        }
      });
      if (!found) break;
    }
};

// Centre and root-mean-square size of a contour, into frame slot `s`.
const frame = (c: Float32Array, n: number, f: Float32Array, s: number) => {
  let x = 0;
  let y = 0;
  for (let i = 0; i < n; i++) {
    x += c[i * 2];
    y += c[i * 2 + 1];
  }
  x /= n;
  y /= n;
  let d = 0;
  for (let i = 0; i < n; i++) d += (c[i * 2] - x) ** 2 + (c[i * 2 + 1] - y) ** 2;
  f[s * 3] = x;
  f[s * 3 + 1] = y;
  f[s * 3 + 2] = Math.sqrt(d / n) || 1e-6;
};

// A matched pair into slot `s`: both normalised (about their centres, at
// unit size), `cb` turned to the start point closest in shape to `ca`'s (the
// same as scripts/build-morph.mjs, which vetted the pair this way).
const pair = (
  t: MorphTrack,
  s: number,
  ca: Float32Array,
  cb: Float32Array,
  ra: Float32Array,
  rb: Float32Array,
) => {
  const n = t.n;
  const at = s * n * 2;
  frame(ca, n, t.fa, s);
  frame(cb, n, t.fb, s);
  const [ax, ay, ar] = [t.fa[s * 3], t.fa[s * 3 + 1], 1 / t.fa[s * 3 + 2]];
  const [bx, by, br] = [t.fb[s * 3], t.fb[s * 3 + 1], 1 / t.fb[s * 3 + 2]];
  for (let i = 0; i < n; i++) {
    t.a[at + i * 2] = (ca[i * 2] - ax) * ar;
    t.a[at + i * 2 + 1] = (ca[i * 2 + 1] - ay) * ar;
    t.ia[s * n + i] = ra[i];
  }
  let best = 0;
  let bestD = Infinity;
  for (let shift = 0; shift < n; shift++) {
    let d = 0;
    for (let i = 0; i < n && d < bestD; i++) {
      const j = ((i + shift) % n) * 2;
      const dx = t.a[at + i * 2] - (cb[j] - bx) * br;
      const dy = t.a[at + i * 2 + 1] - (cb[j + 1] - by) * br;
      d += dx * dx + dy * dy;
    }
    if (d < bestD) {
      bestD = d;
      best = shift;
    }
  }
  for (let i = 0; i < n; i++) {
    const j = (i + best) % n;
    t.b[at + i * 2] = (cb[j * 2] - bx) * br;
    t.b[at + i * 2 + 1] = (cb[j * 2 + 1] - by) * br;
    t.ib[s * n + i] = rb[j];
  }
};

// Set a track to go from face `from` to face `to` (once per step). Compatible
// faces have the same contours; a hold is a face to itself. (An incompatible
// pair, never planned by the sequences above for the shipped faces, morphs
// the slots both faces have and drops the rest.)
export const planMorph = (data: MorphData, t: MorphTrack, from: number, to: number) => {
  if (t.from === from && t.to === to) return;
  t.from = from;
  t.to = to;
  const ga = data.glyphs[from][t.ch];
  const gb = data.glyphs[to][t.ch];
  const ra = roomOf(ga);
  const rb = roomOf(gb);
  const holeSlots = t.slots - t.outerSlots;
  t.live.fill(0);
  for (let s = 0; s < t.outerSlots; s++) {
    if (!ga.outers[s] || !gb.outers[s]) continue;
    pair(t, s, ga.outers[s], gb.outers[s], ra[s], rb[s]);
    t.live[s] = 1;
  }
  for (let s = 0; s < holeSlots; s++) {
    if (!ga.holes[s] || !gb.holes[s]) continue;
    const slot = t.outerSlots + s;
    pair(t, slot, ga.holes[s], gb.holes[s], ra[ga.outers.length + s], rb[gb.outers.length + s]);
    t.live[slot] = 1;
    t.parent[slot] = ga.parents[s];
  }
};

// Plan a letter's morph for a step of its face sequence: from that step's
// face to the next step's.
export const planStep = (
  data: MorphData,
  t: MorphTrack,
  phase: MorphPhase,
  seq: Int16Array,
  // The low power tier, fixed for the whole reveal by the caller.
  low: boolean,
) => {
  const count = seq.length - 1;
  let from = phase.step;
  let to = from + 1;
  // Low power tier (html[data-perf='low']): half the morphs, each from an even
  // step's face to the one two steps on, flowing through the odd step.
  if (low) {
    from -= from % 2;
    to = Math.min(from + 2, count);
    if (phase.step === from && to > from + 1) {
      phase.e = 0;
      phase.c = 0;
    }
  }
  planMorph(data, t, seq[from], seq[Math.min(to, count)]);
};

// Write the outline `e` of the way through the planned morph to t.out (e may
// pass 1 a little: the spring's overshoot carries the shape on past the face).
export const blendMorph = (t: MorphTrack, e: number) => {
  const { a, b, out, fa, fb, ia, ib, room } = t;
  const n = t.n;
  const len = n * 2;
  const k = Math.min(1, Math.max(0, e));
  const mid = 4 * k * (1 - k);
  const over = 1 - 0.8 * Math.min(1, Math.max(0, e - 1) / Math.max(1e-6, OVERSHOOT_MAX));
  for (let s = 0; s < t.slots; s++) {
    if (!t.live[s]) continue;
    // Frame and shape blend apart: the contour glides and resizes while its
    // shape flows, instead of its points cutting straight across.
    const cx = fa[s * 3] + (fb[s * 3] - fa[s * 3]) * e;
    const cy = fa[s * 3 + 1] + (fb[s * 3 + 1] - fa[s * 3 + 1]) * e;
    const r = fa[s * 3 + 2] + (fb[s * 3 + 2] - fa[s * 3 + 2]) * e;
    for (let i = s * len, end = i + len; i < end; i += 2) {
      out[i] = cx + (a[i] + (b[i] - a[i]) * e) * r;
      out[i + 1] = cy + (a[i + 1] + (b[i + 1] - a[i + 1]) * e) * r;
    }
    // The bevel's room: each end's own, narrowing midway (an in-between
    // stroke can be thinner than either end's) and through the overshoot.
    for (let i = s * n, end = i + n; i < end; i++) {
      const l = ia[i] + (ib[i] - ia[i]) * k;
      room[i] = (l - (l - Math.min(ia[i], ib[i]) * 0.5) * mid) * over;
    }
  }
};

export type MorphPose = { k: number; y: number };

// Size and baseline of a morphing letter, in px of its 2D slot (w wide, the
// type fontPx): k the scale, y the scaled baseline below the slot centre. A
// face is bottom-aligned in its slot and shrunk to fit the slot's width (by
// its advance, in whole px); the final face sits on its own baseline
// (`finalBase`, measured from the 2D letter) at full size, so leaving it and
// landing on it are seamless. The springy `e` carries the size and baseline
// a little past the next face too.
export const morphPose = (
  data: MorphData,
  t: MorphTrack,
  e: number,
  finalFace: number,
  w: number,
  h: number,
  fontPx: number,
  finalBase: number,
  out: MorphPose,
) => {
  const fit = (face: number) =>
    Math.min(1, w / Math.max(1, Math.round(data.glyphs[face][t.ch].adv * fontPx)));
  const ka = t.from === finalFace ? 1 : fit(t.from);
  const ya = t.from === finalFace ? finalBase : (h / 2 - data.base[t.from] * fontPx) * ka;
  const kb = t.to === finalFace ? 1 : fit(t.to);
  const yb = t.to === finalFace ? finalBase : (h / 2 - data.base[t.to] * fontPx) * kb;
  out.k = ka + (kb - ka) * e;
  out.y = ya + (yb - ya) * e;
  return out;
};

// A letter's faces for a run of the title: the reveal's tour, or the quick
// out-and-back of a concept change.
export const runSequence = (
  data: MorphData,
  ch: string,
  index: number,
  finalFace: number,
  tl: Timeline,
  low = false,
) =>
  tl.kind === 'swap'
    ? swapSequence(data, ch, index, finalFace, finalFace, stepCount(index, tl))
    : faceSequence(data, ch, index, finalFace, stepCount(index, tl), low);
