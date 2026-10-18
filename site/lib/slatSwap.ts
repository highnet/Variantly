'use client';

import { slatCount, SLAT_GAP, SLAT_TURN, turnAngle } from '@/lib/slatTurn';

/*
 * The concept swap is the demo's split-flap turn (components/SlatFlip) at page
 * size: the screen splits into vertical slats that turn over one after
 * another in the direction of travel, from the old concept to the new one.
 * Driven with the View Transitions API, which gives one picture of each page,
 * not one per slat, so the turn is drawn in 2D: each slat's picture narrows
 * to its centre line as it turns edge on (its width follows cos of the same
 * angle the demo's slats rotate through) and the other page widens out of it,
 * over the dark board (`::view-transition`'s background, globals.css
 * "Concept swap"). The title card is its own group, shown live, so its morph
 * carries on through the turn.
 */

// Keyframes for the whole board; enough that each slat's turn reads smooth.
const FRAMES = 48;

// A set of rects as one clip path; an empty set is a zero-size rect.
const rectsPath = (rects: [number, number][], h: number) =>
  rects.length
    ? `path('${rects.map(([x, w]) => `M${x.toFixed(1)} 0h${w.toFixed(1)}v${h}h${(-w).toFixed(1)}Z`).join('')}')`
    : `path('M0 0h0v0h0Z')`;

/** Runs the turn once the transition's pseudo-elements exist. */
export const turnSlats = (dir: 1 | -1) => {
  const vw = innerWidth;
  const vh = innerHeight;
  const phone = matchMedia('(max-width: 639px)').matches;
  const count = slatCount(phone);
  const dur = SLAT_TURN.normal;
  const gap = SLAT_GAP.normal;
  const total = dur + gap * (count - 1);
  const edges = Array.from({ length: count + 1 }, (_, i) => Math.round((i * vw) / count));
  const before: Keyframe[] = [];
  const after: Keyframe[] = [];
  for (let f = 0; f <= FRAMES; f++) {
    const t = (f / FRAMES) * total;
    const out: [number, number][] = [];
    const inn: [number, number][] = [];
    for (let i = 0; i < count; i++) {
      const order = dir === 1 ? i : count - 1 - i;
      const deg = turnAngle((t - order * gap) / dur);
      const x0 = edges[i];
      // One extra pixel overlaps the next slat, so no seam shows.
      const sw = edges[i + 1] - x0 + 1;
      const w = sw * Math.abs(Math.cos((deg * Math.PI) / 180));
      const x = x0 + (sw - w) / 2;
      (deg < 90 ? out : inn).push([x, w]);
    }
    before.push({ clipPath: rectsPath(out, vh), offset: f / FRAMES });
    after.push({ clipPath: rectsPath(inn, vh), offset: f / FRAMES });
  }
  const html = document.documentElement;
  const opts = { duration: total, easing: 'linear', fill: 'both' } as const;
  html.animate(before, { ...opts, pseudoElement: '::view-transition-old(root)' });
  return html
    .animate(after, { ...opts, pseudoElement: '::view-transition-new(root)' })
    .finished.then(() => undefined);
};
