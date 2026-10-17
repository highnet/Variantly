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
