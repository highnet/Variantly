/*
 * Scroll-aware scheduling for decorative motion. Phones drop frames when
 * text animates under an active scroll gesture, so motion that can wait
 * waits until the scroll has been still for IDLE_MS, and touch devices
 * mostly skip it. One shared passive listener, started on first use; while
 * a scroll is under way <html> carries data-scrolling.
 */

const IDLE_MS = 120;

let active = false;
let timer = 0;
let started = false;
const waiting = new Set<() => void>();
const onStart = new Set<() => void>();

const settle = () => {
  active = false;
  document.documentElement.removeAttribute('data-scrolling');
  const run = [...waiting];
  waiting.clear();
  run.forEach((f) => f());
};

const onScroll = () => {
  if (!active) {
    active = true;
    document.documentElement.setAttribute('data-scrolling', '');
    onStart.forEach((f) => f());
  }
  clearTimeout(timer);
  timer = window.setTimeout(settle, IDLE_MS);
};

const start = () => {
  if (started) return;
  started = true;
  // Wheel and touchmove arrive a frame before the scroll they cause, so
  // nothing starts in the gap between the gesture and its first scroll.
  ['scroll', 'wheel', 'touchmove'].forEach((t) => addEventListener(t, onScroll, { passive: true }));
};

/** Whether a scroll gesture is under way right now. */
export const scrolling = () => {
  start();
  return active;
};

/** Runs `fn` now if the page is not scrolling, otherwise once it settles. */
export const whenIdle = (fn: () => void) => {
  start();
  if (!active) {
    fn();
    return () => {};
  }
  waiting.add(fn);
  return () => void waiting.delete(fn);
};

/** Calls `fn` each time a scroll gesture begins. */
export const onScrollStart = (fn: () => void) => {
  start();
  onStart.add(fn);
  return () => void onStart.delete(fn);
};

/** A touch-first device: no hover, coarse pointer. */
export const touchUI = () =>
  typeof window !== 'undefined' && matchMedia('(hover: none) and (pointer: coarse)').matches;

/**
 * The page asked for less work: low-power mode or calm motion. Nothing sets
 * data-perf yet (a low-power detector is being added separately); until
 * then this follows calm motion only.
 */
export const lowPerf = () => {
  if (typeof document === 'undefined') return false;
  const d = document.documentElement.dataset;
  return d.perf === 'low' || d.motion === 'calm';
};
