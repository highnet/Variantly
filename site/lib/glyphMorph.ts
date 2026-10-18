// Outline morphing for the title's letters, shared by the 2D (SVG) and 3D
// words so both morph identically. The data (public/fonts/3d/morph.json, built
// by scripts/build-morph.mjs) holds every face's outline of each letter as
// contours resampled to the same point count, plus, per letter, which faces
// morph cleanly into which (same contours and holes, no fold or collapse
// mid-way). Each letter walks a face sequence picked backwards from its final
// face through those compatible neighbours. Once per step its track pairs the
// two faces' contours (outers with outers, holes with holes, by size), lines
// each pair up by shape and splits it into a frame (centre, size) and a
// normalised shape, so every frame is a plain lerp into preallocated arrays
// that never folds a contour through itself. A pair that still is not
// compatible does not point-morph: it pops (the old glyph shrinks away about
// the letter's centre and the new one grows in).
import { faceAt, scaleAt, stepCount, type MorphPhase } from '@/lib/titleTiming';

type RawGlyph = { a: number; o: number; p: number[]; c: number[][] };
type RawData = {
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
  // Compatible predecessors per letter and face, and the same as a matrix
  // (from * faces + to).
  next: Record<string, number[][]>;
  ok: Record<string, Uint8Array>;
};

// Contour points: x from the advance centre, y up from the baseline, em.
const decode = (raw: RawData): MorphData => {
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
      out[ch] = { adv: g.a / 1000, outers: pts.slice(0, g.o), holes: pts.slice(g.o), parents: g.p };
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
    .then(decode));

const hash = (k: number, i: number) => {
  let x = (Math.imul(k + 1, 2654435761) ^ Math.imul(i + 1, 40503)) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x2c1b3c6d) >>> 0;
  return (x ^ (x >>> 12)) >>> 0;
};

// A chain of `len` morphs ending on `last`, every link compatible: found by a
// depth-first search backwards from `last` (candidates in order of
// legibility, turned by a hash so letters differ), never repeating the face
// just after or the one after that. Some final faces sit in a small island of
// faces that only morph among themselves (Rye's t, Pacifico's l), or have no
// compatible neighbour at all (Great Vibes' r): then only the last link, into
// the final face, pops, and the rest of the chain morphs.
const chain = (data: MorphData, ch: string, index: number, len: number, last: number) => {
  const out = new Int16Array(len + 1);
  out[len] = last;
  const preds = data.next[ch];
  // Faces with the most compatible neighbours first: where a pop lands.
  const hubs = preds
    .map((p, f) => [f, p.length] as const)
    .filter(([, n]) => n)
    .sort((x, y) => y[1] - x[1])
    .map(([f]) => f);
  let popLast = false;
  const options = (k: number) => {
    const next = out[k + 1];
    const after = k + 2 <= len ? out[k + 2] : -1;
    const list =
      popLast && k === len - 1
        ? hubs.filter((f) => f !== next)
        : preds[next].filter((f) => f !== next && f !== after && preds[f].length);
    const top = list.slice(0, 6);
    const turn = hash(k, index) % Math.max(1, top.length);
    return [...top.slice(turn), ...top.slice(0, turn), ...list.slice(6)];
  };
  let tries = 0;
  const walk = (k: number): boolean => {
    if (k < 0) return true;
    if (++tries > 3000) return false;
    for (const f of options(k)) {
      out[k] = f;
      if (walk(k - 1)) return true;
    }
    return false;
  };
  if (walk(len - 1)) return out;
  popLast = true;
  tries = 0;
  if (walk(len - 1)) return out;
  // No compatible chain at all (not the case for the shipped faces): pops.
  for (let k = len - 1; k >= 0; k--) {
    const f = faceAt(k, index, data.faces);
    out[k] = f === out[k + 1] ? (f + 1) % data.faces : f;
  }
  return out;
};

// A letter's faces through the reveal: one per step, then its final face.
// The low power tier morphs only from even steps to the step two on, so it
// gets its own chain over those steps (odd steps repeat the even face).
// Deterministic, so a seeked frame is reproducible.
const sequences = new Map<number, Int16Array>();
export const faceSequence = (
  data: MorphData,
  ch: string,
  index: number,
  finalFace: number,
  low = false,
) => {
  const key = (index * 64 + finalFace) * 2 + (low ? 1 : 0);
  let seq = sequences.get(key);
  if (seq) return seq;
  const count = stepCount(index);
  if (!low) seq = chain(data, ch, index, count, finalFace);
  else {
    const half = Math.ceil(count / 2);
    const c = chain(data, ch, index, half, finalFace);
    seq = new Int16Array(count + 1);
    for (let s = 0; s <= count; s++) seq[s] = s === count ? finalFace : c[Math.floor(s / 2)];
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
  // Contours of the face left (a) and the face reached (b), and the blend.
  // A morph keeps normalised shapes in a/b and each slot's frame (centre x,
  // y, size) in fa/fb; a pop keeps both glyphs as they are.
  a: Float32Array;
  b: Float32Array;
  fa: Float32Array;
  fb: Float32Array;
  out: Float32Array;
  // Whether a slot is drawn, and each hole slot's outer; per face for pops.
  live: Uint8Array;
  parent: Int16Array;
  liveA: Uint8Array;
  liveB: Uint8Array;
  parentA: Int16Array;
  parentB: Int16Array;
  pop: boolean;
  from: number;
  to: number;
  // The reveal steps those faces belong to (sizes follow them).
  fromStep: number;
  toStep: number;
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
    live: new Uint8Array(slots),
    parent: new Int16Array(slots),
    liveA: new Uint8Array(slots),
    liveB: new Uint8Array(slots),
    parentA: new Int16Array(slots),
    parentB: new Int16Array(slots),
    pop: false,
    from: -1,
    to: -1,
    fromStep: 0,
    toStep: 1,
  };
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
// unit size), `cb` turned to the start point closest in shape to `ca`'s.
const pair = (t: MorphTrack, s: number, ca: Float32Array, cb: Float32Array) => {
  const n = t.n;
  const at = s * n * 2;
  frame(ca, n, t.fa, s);
  frame(cb, n, t.fb, s);
  const [ax, ay, ar] = [t.fa[s * 3], t.fa[s * 3 + 1], 1 / t.fa[s * 3 + 2]];
  const [bx, by, br] = [t.fb[s * 3], t.fb[s * 3 + 1], 1 / t.fb[s * 3 + 2]];
  for (let i = 0; i < n; i++) {
    t.a[at + i * 2] = (ca[i * 2] - ax) * ar;
    t.a[at + i * 2 + 1] = (ca[i * 2 + 1] - ay) * ar;
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
    const j = ((i + best) % n) * 2;
    t.b[at + i * 2] = (cb[j] - bx) * br;
    t.b[at + i * 2 + 1] = (cb[j + 1] - by) * br;
  }
};

// Set a track to go from face `from` to face `to` (once per step).
export const planMorph = (data: MorphData, t: MorphTrack, from: number, to: number) => {
  if (t.from === from && t.to === to) return;
  t.from = from;
  t.to = to;
  const ga = data.glyphs[from][t.ch];
  const gb = data.glyphs[to][t.ch];
  const holeSlots = t.slots - t.outerSlots;
  t.pop = from !== to && !data.ok[t.ch][from * data.faces + to];
  if (t.pop) {
    // Both glyphs as they are, slot by slot.
    const n2 = t.n * 2;
    const put = (g: Glyph, into: Float32Array, live: Uint8Array, parent: Int16Array) => {
      live.fill(0);
      g.outers.forEach((c, s) => {
        into.set(c, s * n2);
        live[s] = 1;
      });
      g.holes.forEach((c, s) => {
        into.set(c, (t.outerSlots + s) * n2);
        live[t.outerSlots + s] = 1;
        parent[t.outerSlots + s] = g.parents[s];
      });
    };
    put(ga, t.a, t.liveA, t.parentA);
    put(gb, t.b, t.liveB, t.parentB);
    return;
  }
  // Compatible faces have the same contours (or this is a hold on one face).
  t.live.fill(0);
  for (let s = 0; s < t.outerSlots; s++) {
    if (!ga.outers[s] || !gb.outers[s]) continue;
    pair(t, s, ga.outers[s], gb.outers[s]);
    t.live[s] = 1;
  }
  for (let s = 0; s < holeSlots; s++) {
    if (!ga.holes[s] || !gb.holes[s]) continue;
    const slot = t.outerSlots + s;
    pair(t, slot, ga.holes[s], gb.holes[s]);
    t.live[slot] = 1;
    t.parent[slot] = ga.parents[s];
  }
};

// Plan a letter's morph for a step of the reveal: from that step's face to
// the next step's (its face sequence ends on `finalFace`). True when heading
// into the final face.
export const planStep = (
  data: MorphData,
  t: MorphTrack,
  phase: MorphPhase,
  index: number,
  finalFace: number,
  // The low power tier, fixed for the whole reveal by the caller.
  low: boolean,
) => {
  const seq = faceSequence(data, t.ch, index, finalFace, low);
  const count = seq.length - 1;
  let from = phase.step;
  let to = from + 1;
  // Low power tier (html[data-perf='low']): half the morphs, each from an even
  // step's face to the one two steps on, flowing through the odd step.
  if (low) {
    from -= from % 2;
    to = Math.min(from + 2, count);
    if (phase.step === from && to > from + 1) phase.e = 0;
  }
  t.fromStep = from;
  t.toStep = to;
  planMorph(data, t, seq[from], seq[to]);
  return to >= count;
};

// Where a pop's glyphs shrink to and grow from: the letter's middle (em).
const PIVOT_Y = 0.35;
const smooth = (u: number) => {
  const v = Math.min(1, Math.max(0, u));
  return v * v * (3 - 2 * v);
};

// Write the outline `e` (0..1) of the way through the planned morph to t.out.
export const blendMorph = (t: MorphTrack, e: number) => {
  const { a, b, out, fa, fb } = t;
  const len = t.n * 2;
  if (t.pop) {
    // The old glyph shrinks away over the middle of the morph, the new one
    // grows in straight after.
    const first = e < 0.5;
    // Never below 55%: the glyph swaps at that size, no blank frame.
    const k = first ? 1 - smooth((e - 0.3) / 0.2) : smooth((e - 0.5) / 0.2);
    const src = first ? a : b;
    t.live.set(first ? t.liveA : t.liveB);
    t.parent.set(first ? t.parentA : t.parentB);
    const s = 0.55 + 0.45 * k;
    for (let i = 0; i < out.length; i += 2) {
      out[i] = src[i] * s;
      out[i + 1] = PIVOT_Y + (src[i + 1] - PIVOT_Y) * s;
    }
    return;
  }
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
  }
};

// The blended outline as an SVG path in thousandths of an em, y down.
export const morphPath = (t: MorphTrack) => {
  let d = '';
  const n = t.n;
  for (let s = 0; s < t.slots; s++) {
    if (!t.live[s]) continue;
    const at = s * n * 2;
    d += 'M';
    for (let i = 0; i < n; i++) {
      d += `${Math.round(t.out[at + i * 2] * 1000)} ${-Math.round(t.out[at + i * 2 + 1] * 1000)} `;
    }
    d += 'Z';
  }
  return d;
};

export type MorphPose = { k: number; y: number };

// Size and baseline of a morphing letter, in px of its 2D slot (w wide, the
// type fontPx): k the scale, y the scaled baseline below the slot centre. As
// the font-swapping word did: a shifting glyph is bottom-aligned in its slot,
// shrunk to fit the slot's width (by its advance, in whole px) and jumps in
// size about the slot centre; heading into the final face it lands on that
// face's own baseline (`finalBase`) at full size, so the lock is seamless.
export const morphPose = (
  data: MorphData,
  t: MorphTrack,
  index: number,
  e: number,
  toFinal: boolean,
  w: number,
  h: number,
  fontPx: number,
  finalBase: number,
  out: MorphPose,
) => {
  const fit = (face: number) =>
    Math.min(1, w / Math.max(1, Math.round(data.glyphs[face][t.ch].adv * fontPx)));
  const ka = fit(t.from) * scaleAt(t.fromStep, index);
  const ya = (h / 2 - data.base[t.from] * fontPx) * ka;
  const kb = toFinal ? 1 : fit(t.to) * scaleAt(t.toStep, index);
  const yb = toFinal ? finalBase : (h / 2 - data.base[t.to] * fontPx) * kb;
  out.k = ka + (kb - ka) * e;
  out.y = ya + (yb - ya) * e;
  return out;
};
