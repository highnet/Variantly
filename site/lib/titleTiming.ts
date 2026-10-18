// Shared reveal timing for the 2D and 3D title cards.
const WORD = 'variantly';

// The reveal: each letter morphs out of its final face, through a run of
// other faces, and back into its final face. Each face holds long enough to be
// read (longer as the run goes on, so the reveal slows into the lockup), and
// each morph between faces is quick and springy. Letters start a little apart,
// in a loose, uneven order rather than left to right.
//
// One morph: its progress runs on a damped spring, so the outline (and its
// size and colour) swings just past the next face and settles onto it.
export const MORPH_MS = 460;
// How long a letter holds the face it starts from (its final face) before it
// first morphs, then each next face: HOLD_MS, growing by HOLD_GROW per step.
const FIRST_HOLD = 140;
const HOLD_MS = 480;
const HOLD_GROW = 50;
// Deterministic per-letter jitter, so a seeked frame is the same every time.
const jitter = (index: number, salt: number) => ((index * 37 + salt * 11) % 7) / 6;
// Morphs a letter makes: 4 to 6 (through 3 to 5 other faces).
const scheduleFor = (index: number) => {
  const morphs = 4 + Math.round(jitter(index, 1) * 2);
  return Array.from(
    { length: morphs },
    (_, k) => (k === 0 ? FIRST_HOLD : HOLD_MS + HOLD_GROW * k) + MORPH_MS,
  );
};
// A run of morphs for the whole word: per letter, its start delay and its
// steps (a step is one hold plus the morph after it), and when the last
// letter has landed.
export type Timeline = {
  kind: 'reveal' | 'swap';
  delays: number[];
  schedules: number[][];
  end: number;
};
const timeline = (kind: Timeline['kind'], delays: number[], schedules: number[][]) => ({
  kind,
  delays,
  schedules,
  end: Math.max(...schedules.map((s, i) => delays[i] + s.reduce((a, b) => a + b, 0))),
});
export const REVEAL: Timeline = timeline(
  'reveal',
  [...WORD].map((_, i) => 260 + Math.round(jitter(i, 2) * 360)),
  [...WORD].map((_, i) => scheduleFor(i)),
);
// When the concept changes, each letter morphs out to one neighbouring face
// and back onto its (new) final face, in a quick wave from left to right.
export const SWAP: Timeline = timeline(
  'swap',
  [...WORD].map((_, i) => 40 * i),
  [...WORD].map(() => [MORPH_MS, 120 + MORPH_MS]),
);
export const REVEAL_MS = REVEAL.end;
// How many morphs a letter makes before it locks in.
export const stepCount = (index: number, tl = REVEAL) => tl.schedules[index].length;
export const startDelay = (index: number, tl = REVEAL) => tl.delays[index];

// The step a letter is on `ms` after the run starts: -1 before it starts,
// null once locked.
export const stepAt = (ms: number, index: number, tl = REVEAL) => {
  let at = ms - tl.delays[index];
  if (at < 0) return -1;
  const schedule = tl.schedules[index];
  for (let k = 0; k < schedule.length; k++) {
    at -= schedule[k];
    if (at < 0) return k;
  }
  return null;
};

// Deterministic face for a letter at a step, spread across all n faces (an
// integer hash) and never the same face two steps running, so a seeked frame
// is reproducible and every change is visible. (The font-swapping reveal,
// without outline data, and the 3D surfaces use it.)
const hashFace = (step: number, index: number, n: number) => {
  let x = (Math.imul(step + 1, 73856093) ^ Math.imul(index + 1, 19349663)) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0x5bd1e995) >>> 0;
  return ((x ^ (x >>> 15)) >>> 0) % n;
};
export const faceAt = (step: number, index: number, n: number) => {
  // Walk the short sequence so each step is compared with the face actually shown before it.
  let prev = -1;
  let f = 0;
  for (let k = 0; k <= step; k++) {
    f = hashFace(k, index, n);
    if (f === prev) f = (f + 1) % n;
    prev = f;
  }
  return f;
};

// Milliseconds until a letter's next face change, `ms` after the reveal
// starts (so a letter wakes once per change instead of polling).
export const msToNextStep = (ms: number, index: number, tl = REVEAL) => {
  let at = ms - tl.delays[index];
  if (at < 0) return -at;
  for (const d of tl.schedules[index]) {
    at -= d;
    if (at < 0) return -at;
  }
  return 0;
};

// Surface ("look") of a letter at a step, out of the concept's n looks: the
// same hash as the faces on a shifted index; `step` null once locked, where
// neighbours never share a look.
export const lookAt = (step: number | null, index: number, n: number) =>
  step === null ? (index * 5 + 1) % n : faceAt(step, index + 11, n);

// The spring a morph rides: a damped oscillator released from 0 toward 1,
// over u in 0..1 (the morph's share of time). Damping 0.6 overshoots by about
// 9% once, dips back by under 1%, and is within 0.2% of 1 by the end; the
// last bit is blended out so the morph ends exactly on its face.
const ZETA = 0.6;
const OMEGA = 4.6 / ZETA / 0.82;
const OMEGA_D = OMEGA * Math.sqrt(1 - ZETA * ZETA);
export const spring = (u: number) => {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const x =
    1 -
    Math.exp(-ZETA * OMEGA * u) *
      (Math.cos(OMEGA_D * u) + ((ZETA * OMEGA) / OMEGA_D) * Math.sin(OMEGA_D * u));
  // Land exactly on 1 at the end (the residue is under 0.2%).
  const tail = Math.max(0, (u - 0.85) / 0.15);
  return x + (1 - x) * tail * tail;
};
// The spring's peak: how far past the next face (as a share of the morph) a
// letter swings. lib/glyphMorph and scripts/build-morph.mjs check the shapes
// out to here.
export const SPRING_PEAK = (() => {
  let peak = 1;
  for (let u = 0; u <= 1; u += 0.002) peak = Math.max(peak, spring(u));
  return peak - 1;
})();

export type MorphPhase = {
  step: number;
  // Spring progress of the morph after this step's hold (0 holding; may pass 1).
  e: number;
  // The same, clamped to 0..1 (for colour, which never overshoots).
  c: number;
};

// Where a letter's outline is `ms` into the reveal, written to `out` (no
// allocation per frame): on face `step` (0 before it starts), `e` of the way
// to the next step's face, the final face after its last step. Returns false
// once the letter has locked.
export const morphAt = (ms: number, index: number, out: MorphPhase, tl = REVEAL) => {
  let at = ms - tl.delays[index];
  out.step = 0;
  out.e = 0;
  out.c = 0;
  if (at < 0) return true;
  const schedule = tl.schedules[index];
  for (let k = 0; k < schedule.length; k++) {
    if (at < schedule[k]) {
      const hold = schedule[k] - MORPH_MS;
      out.step = k;
      out.e = at < hold ? 0 : spring((at - hold) / MORPH_MS);
      out.c = Math.min(1, out.e);
      return true;
    }
    at -= schedule[k];
  }
  return false;
};

// Switches for the owner's experiments, both on by default: the letters'
// colour walking the concept's palette as they morph (`?titlecolor=0` turns it
// off), and a short glitch accent on one face change per letter (`?glitch=0`).
export const TITLE_COLOR = true;
export const TITLE_GLITCH = true;
const flag = (name: string, on: boolean) => {
  if (typeof location === 'undefined') return on;
  const q = new URLSearchParams(location.search).get(name);
  return q === null ? on : q !== '0';
};
export const titleColorOn = () => flag('titlecolor', TITLE_COLOR);
export const titleGlitchOn = () => flag('glitch', TITLE_GLITCH);

// The glitch: once per letter per reveal, at the moment one morph lands (a
// step picked per letter, never the lockup), for GLITCH_MS. Returns its
// strength 0..1 (0 outside it) and fills `out` with its bands: the outline
// sliced into `bands` horizontal strips, each nudged sideways by `shift[k]`
// (em), plus a channel split of `split` em. Hard on, hard off: no easing, no blur.
export const GLITCH_MS = 110;
export type Glitch = { bands: number; shift: Float32Array; split: number; seed: number };
export const glitchBuffer = (): Glitch => ({
  bands: 0,
  shift: new Float32Array(4),
  split: 0,
  seed: 0,
});
const unit = (a: number, b: number) => {
  let x = (Math.imul(a + 7, 0x27d4eb2d) ^ Math.imul(b + 3, 0x165667b1)) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x85ebca6b) >>> 0;
  return ((x ^ (x >>> 13)) >>> 0) / 4294967296;
};
export const glitchAt = (ms: number, index: number, out: Glitch, tl = REVEAL) => {
  if (tl.kind !== 'reveal') return 0;
  const schedule = tl.schedules[index];
  // The step whose morph lands into the glitch: one of the middle ones.
  const k = 1 + Math.floor(unit(index, 1) * (schedule.length - 2));
  let land = tl.delays[index];
  for (let s = 0; s <= k; s++) land += schedule[s];
  // Just after the spring's first swing past the face.
  const at = ms - (land - MORPH_MS * 0.55);
  if (at < 0 || at >= GLITCH_MS) return 0;
  // Two flickers inside the burst, each with its own slicing.
  const beat = at < GLITCH_MS * 0.55 ? 0 : 1;
  out.seed = index * 2 + beat;
  out.bands = 2 + Math.floor(unit(out.seed, 2) * 3);
  for (let b = 0; b < 4; b++) out.shift[b] = (unit(out.seed, 10 + b) - 0.5) * 0.16;
  out.split = 0.025 + unit(out.seed, 20) * 0.03;
  return 1;
};
