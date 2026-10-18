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
  /** A damped spring: ~9% past the target, back, settled (--ease-spring-settle). */
  settle:
    'linear(0, 0.065, 0.217, 0.406, 0.596, 0.763, 0.896, 0.992, 1.053, 1.085, 1.095, 1.09, 1.076, 1.058, 1.04, 1.024, 1.011, 1.001, 0.995, 0.992, 0.991, 0.992, 0.994, 0.997, 1)',
  /** Full-page and pane swaps. */
  wipe: 'cubic-bezier(0.7, 0, 0.2, 1)',
} as const;

export const DUR = { fast: 200, base: 420, slow: 700 } as const;

/** Delay between siblings in a cascade, in ms. */
export const STAGGER = 45;
