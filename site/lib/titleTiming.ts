// Shared reveal timing for the 2D and 3D title cards.
const WORD = 'variantly';

// Timing after the Loki title card: every letter flickers at once, about four
// typefaces a second, then the changes slow and each letter drops into its
// final face. Letters lock in a loose, uneven order rather than left to right.
const FLICKER_MS = 260;
const EASE_OUT = [320, 400, 500, 640, 820, 1040];
// Deterministic per-letter jitter, so a seeked frame is the same every time.
const jitter = (index: number, salt: number) => ((index * 37 + salt * 11) % 7) / 6;
const scheduleFor = (index: number) => [
  ...Array(12 + Math.round(jitter(index, 1) * 4)).fill(FLICKER_MS),
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
