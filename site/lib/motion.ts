/*
 * The site's motion vocabulary for script-driven animation (WAAPI). Mirrors
 * the tokens on :root in globals.css (--ease-*, --dur-*, --stagger), so a
 * JS animation and a CSS transition of the same kind feel the same.
 */
export const EASE = {
  /** Entrances and settles. */
  outExpo: 'cubic-bezier(0.16, 1, 0.3, 1)',
  /** Things that land: a gentle overshoot. */
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  /** Pops and presses: a bigger overshoot. */
  springPop: 'cubic-bezier(0.34, 1.7, 0.5, 1)',
  /** Full-page and pane swaps. */
  wipe: 'cubic-bezier(0.7, 0, 0.2, 1)',
} as const;

export const DUR = { fast: 200, base: 420, slow: 700 } as const;

/** Delay between siblings in a cascade, in ms. */
export const STAGGER = 45;
