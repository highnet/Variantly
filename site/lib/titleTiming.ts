// Shared reveal timing for the 2D and 3D title cards.
const WORD = 'variantly';

// Timing after the Loki title card: every letter flickers at once, a little over
// two typefaces a second, then the changes slow and each letter drops into its
// final face. Letters lock in a loose, uneven order rather than left to right.
const FLICKER_MS = 440;
const EASE_OUT = [520, 640, 780, 960, 1180, 1440];
// Deterministic per-letter jitter, so a seeked frame is the same every time.
const jitter = (index: number, salt: number) => ((index * 37 + salt * 11) % 7) / 6;
const scheduleFor = (index: number) => [
  ...Array(8 + Math.round(jitter(index, 1) * 3)).fill(FLICKER_MS),
  ...EASE_OUT,
];
const SCHEDULES = [...WORD].map((_, i) => scheduleFor(i));
// How many shifting steps a letter goes through before it locks in.
export const stepCount = (index: number) => SCHEDULES[index].length;
export const startDelay = (index: number) => 200 + Math.round(jitter(index, 2) * 120);

// The step a letter is on `ms` after the intro starts: -1 before it starts,
// null once locked.
export const stepAt = (ms: number, index: number) => {
  let at = ms - startDelay(index);
  if (at < 0) return -1;
  const schedule = SCHEDULES[index];
  for (let k = 0; k < schedule.length; k++) {
    at -= schedule[k];
    if (at < 0) return k;
  }
  return null;
};

// Deterministic face for a letter at a step, spread across all n faces (an
// integer hash) and never the same face two steps running, so a seeked frame
// is reproducible and every flicker visibly changes.
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
export const msToNextStep = (ms: number, index: number) => {
  let at = ms - startDelay(index);
  if (at < 0) return -at;
  for (const d of SCHEDULES[index]) {
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

// Mismatched sizes while shifting, like the title card's jumping glyphs,
// shared by the 2D and 3D words. Never above 1: a shifting glyph may shrink
// inside its slot but never spill.
export const scaleAt = (step: number, index: number) =>
  0.72 + (((step * 13 + index * 29) % 9) / 8) * 0.28;

// The lock-in pop (vy-lock in globals.css for the 2D word): 1.12x easing back
// to 1 over 0.35s.
export const lockPop = (sinceLock: number) => {
  const k = Math.min(1, Math.max(0, sinceLock / 0.35));
  return 1 + 0.12 * (1 - k) * (1 - k);
};

// Share of each step a letter spends morphing into its next face (the rest
// holds the face it reached), and the ease of that morph.
export const MORPH_SHARE = 0.7;
const easeInOut = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);

export type MorphPhase = { step: number; e: number };

// Where a letter's outline is `ms` into the reveal, written to `out` (no
// allocation per frame): on face `step` (0 before it starts), `e` (eased) of
// the way to the next step's face, the final face after its last step.
// Returns false once the letter has locked.
export const morphAt = (ms: number, index: number, out: MorphPhase) => {
  let at = ms - startDelay(index);
  out.step = 0;
  out.e = 0;
  if (at < 0) return true;
  const schedule = SCHEDULES[index];
  for (let k = 0; k < schedule.length; k++) {
    if (at < schedule[k]) {
      const hold = schedule[k] * (1 - MORPH_SHARE);
      out.step = k;
      out.e = at < hold ? 0 : easeInOut((at - hold) / (schedule[k] - hold));
      return true;
    }
    at -= schedule[k];
  }
  return false;
};
