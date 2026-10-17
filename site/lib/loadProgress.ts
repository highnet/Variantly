// Heavy visuals stream in after first paint; this counts them so the load bar
// (components/LoadBar.tsx) shows real progress. No React, no deps: anything can
// call markLoaded without pulling UI code in.

export const LOAD_STEPS = ['fonts', 'scene', 'demo'] as const;
export type LoadStep = (typeof LOAD_STEPS)[number];

const EVENT = 'vy:load';
const done = new Set<LoadStep>();

export const markLoaded = (step: LoadStep) => {
  if (typeof window === 'undefined' || done.has(step)) return;
  done.add(step);
  window.dispatchEvent(new Event(EVENT));
};

/** 0..1 share of the heavy assets that have arrived. */
export const loadProgress = () => done.size / LOAD_STEPS.length;

export const onLoadProgress = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
};
