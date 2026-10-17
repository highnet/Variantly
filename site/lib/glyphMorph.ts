// Outline morphing for the title's letters, shared by the 2D (SVG) and 3D
// words so both morph identically. The data (public/fonts/3d/morph.json, built
// by scripts/build-morph.mjs) holds every face's outline of each letter as
// contours resampled to the same point count. Once per step a letter's track
// pairs the contours of the face it leaves with those of the face it goes to
// (outers with outers and holes with holes, by size; a contour with no partner
// shrinks to, or grows from, a point at its own centre) and turns each pair to
// line up, so every frame is a plain lerp into preallocated arrays.
import { faceAt, scaleAt, stepCount, type MorphPhase } from '@/lib/titleTiming';

const lowPerf = () =>
  typeof document !== 'undefined' && document.documentElement.dataset.perf === 'low';

type RawGlyph = { a: number; o: number; p: number[]; c: number[][] };
type RawData = { n: number; faces: { b: number; g: Record<string, RawGlyph> }[] };

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
  // Baseline height per face in a 1em, line-height 1 box, from the bottom (em).
  base: number[];
  glyphs: Record<string, Glyph>[];
  // Most outers and holes any face has, per letter.
  most: Record<string, [number, number]>;
};

// Contour points: x from the advance centre, y up from the baseline, em.
const decode = (raw: RawData): MorphData => {
  const most: Record<string, [number, number]> = {};
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
  return { n: raw.n, base: raw.faces.map((f) => f.b / 1000), glyphs, most };
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

export type MorphTrack = {
  ch: string;
  n: number;
  // Slots: the letter's most outers, then its most holes.
  slots: number;
  outerSlots: number;
  // Contours of the face left (a) and the face reached (b), and the blend.
  a: Float32Array;
  b: Float32Array;
  out: Float32Array;
  // Whether a slot has a contour in either face, and each hole slot's outer.
  live: Uint8Array;
  // 0 a matched pair, 1 a contour that vanishes, 2 one that appears.
  kind: Uint8Array;
  parent: Int16Array;
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
    out: new Float32Array(size),
    live: new Uint8Array(slots),
    kind: new Uint8Array(slots),
    parent: new Int16Array(slots),
    from: -1,
    to: -1,
    fromStep: 0,
    toStep: 1,
  };
};

const centre = (c: Float32Array, n: number) => {
  let x = 0;
  let y = 0;
  for (let i = 0; i < n; i++) {
    x += c[i * 2];
    y += c[i * 2 + 1];
  }
  return [x / n, y / n] as const;
};

// Root-mean-square distance of a contour's points from (x, y): its size.
const spread = (c: Float32Array, n: number, x: number, y: number) => {
  let d = 0;
  for (let i = 0; i < n; i++) d += (c[i * 2] - x) ** 2 + (c[i * 2 + 1] - y) ** 2;
  return Math.sqrt(d / n) || 1;
};

// Copy one contour pair into slot `s`: `ca` as is, `cb` turned to the start
// point that lines up best with `ca` (both about their own centres).
const pair = (t: MorphTrack, s: number, ca?: Float32Array, cb?: Float32Array) => {
  const n = t.n;
  const at = s * n * 2;
  t.live[s] = ca || cb ? 1 : 0;
  t.kind[s] = ca && cb ? 0 : ca ? 1 : 2;
  if (!ca && !cb) return;
  if (!ca || !cb) {
    // No partner: the contour shrinks to (or grows from) its own centre.
    const real = (ca ?? cb)!;
    const [x, y] = centre(real, n);
    const into = ca ? t.b : t.a;
    (ca ? t.a : t.b).set(real, at);
    for (let i = 0; i < n; i++) {
      into[at + i * 2] = x;
      into[at + i * 2 + 1] = y;
    }
    return;
  }
  const [ax, ay] = centre(ca, n);
  const [bx, by] = centre(cb, n);
  // Compared at the same size, so a small contour lines up with a large one
  // by shape rather than by its nearest edge (which twists the morph).
  const ra = 1 / spread(ca, n, ax, ay);
  const rb = 1 / spread(cb, n, bx, by);
  let best = 0;
  let bestD = Infinity;
  for (let shift = 0; shift < n; shift++) {
    let d = 0;
    for (let i = 0; i < n && d < bestD; i++) {
      const j = ((i + shift) % n) * 2;
      const dx = (ca[i * 2] - ax) * ra - (cb[j] - bx) * rb;
      const dy = (ca[i * 2 + 1] - ay) * ra - (cb[j + 1] - by) * rb;
      d += dx * dx + dy * dy;
    }
    if (d < bestD) {
      bestD = d;
      best = shift;
    }
  }
  t.a.set(ca, at);
  for (let i = 0; i < n; i++) {
    const j = ((i + best) % n) * 2;
    t.b[at + i * 2] = cb[j];
    t.b[at + i * 2 + 1] = cb[j + 1];
  }
};

// Set a track to morph from face `from` to face `to` (once per step).
export const planMorph = (data: MorphData, t: MorphTrack, from: number, to: number) => {
  if (t.from === from && t.to === to) return;
  t.from = from;
  t.to = to;
  const ga = data.glyphs[from][t.ch];
  const gb = data.glyphs[to][t.ch];
  for (let s = 0; s < t.outerSlots; s++) pair(t, s, ga.outers[s], gb.outers[s]);
  for (let s = 0; s < t.slots - t.outerSlots; s++) {
    const slot = t.outerSlots + s;
    pair(t, slot, ga.holes[s], gb.holes[s]);
    t.parent[slot] = ga.holes[s] ? ga.parents[s] : (gb.parents[s] ?? 0);
  }
};

// Plan a letter's morph for a step of the reveal: from that step's face to
// the next step's, or to `finalFace` after the last. True when heading into
// the final face.
export const planStep = (
  data: MorphData,
  t: MorphTrack,
  phase: MorphPhase,
  index: number,
  finalFace: number,
) => {
  const n = data.glyphs.length;
  const count = stepCount(index);
  let from = phase.step;
  let to = from + 1;
  // Low power tier (html[data-perf='low']): half the morphs, each from an even
  // step's face to the one two steps on, flowing through the odd step.
  if (lowPerf()) {
    from -= from % 2;
    to = Math.min(from + 2, count);
    if (phase.step === from && to > from + 1) phase.e = 0;
  }
  const last = to >= count;
  t.fromStep = from;
  t.toStep = to;
  planMorph(data, t, faceAt(from, index, n), last ? finalFace : faceAt(to, index, n));
  return last;
};

// Write the outline `e` (0..1) of the way through the planned morph to t.out.
export const blendMorph = (t: MorphTrack, e: number) => {
  const { a, b, out } = t;
  const len = t.n * 2;
  for (let s = 0; s < t.slots; s++) {
    if (!t.live[s]) continue;
    // A contour with no partner shrinks away in the first half of the morph
    // or grows in the second, so it never smears across the whole of it.
    const k = t.kind[s];
    const u = k === 0 ? e : k === 1 ? Math.min(1, e * 2) : Math.max(0, e * 2 - 1);
    const eu = k === 0 ? u : u * u * (3 - 2 * u);
    for (let i = s * len, end = i + len; i < end; i++) out[i] = a[i] + (b[i] - a[i]) * eu;
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
