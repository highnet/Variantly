'use client';

import type { ConceptId } from '@/concepts';
import { glitchIntensity, glitchOn } from '@/lib/lensGlitch';
import {
  DOOR_RADIUS,
  doorSize,
  growRect,
  lerpRect,
  roundRectPath,
  springAt,
  type Rect,
} from '@/lib/lensDoor';

/*
 * The concept swap is a doorway opening: the new page shows through a
 * door-sized rounded rect at the trigger point, which springs open (a slight
 * overshoot, then it settles) until its edges sweep past the screen's, with
 * the Lens's amber frame riding the edge and one sharp glitch frame at the
 * start. Driven with the View Transitions API: `::view-transition-new(root)`
 * gets an animated `clip-path: inset(... round)`, and the frame is three
 * fixed layers (the 2px rim and two faint bands of light) added in the new
 * state with their own transition names, each clipped to a thin rounded ring
 * on the same keyframes. The title canvas is its own group (shown live, so its
 * morph carries on through the opening). See globals.css "Concept swap".
 */

export type SwapOrigin = {
  // Centre of the door the new concept opens from, viewport px.
  x: number;
  y: number;
  // Its size; a door sized for the screen when left out.
  w?: number;
  h?: number;
};

export const swapDuration = () => (matchMedia('(pointer: coarse)').matches ? 450 : 700);

// The hero title's centre (for `[` / `]`, shuffle), else the screen's.
export const heroOrigin = (): SwapOrigin => {
  const r = document.querySelector('[data-hero-title]')?.getBoundingClientRect();
  if (r && r.bottom > 0 && r.top < innerHeight)
    return {
      x: r.left + r.width / 2,
      y: (Math.max(0, r.top) + Math.min(r.bottom, innerHeight)) / 2,
    };
  return { x: innerWidth / 2, y: innerHeight / 2 };
};

type PressLike = { clientX: number; clientY: number; detail: number; currentTarget: unknown };

// Where a press came from: the pointer, or for a keyboard press (no pointer,
// detail 0) the centre of the focused control.
export const pressOrigin = (e: PressLike): SwapOrigin => {
  if (e.detail > 0 && (e.clientX || e.clientY)) return { x: e.clientX, y: e.clientY };
  const el = (
    e.currentTarget instanceof Element ? e.currentTarget : document.activeElement
  ) as Element | null;
  const r = el?.getBoundingClientRect();
  return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : heroOrigin();
};

const RINGS = [
  // [inner offset, outer offset] from the door's edge, px.
  [0, 2],
  [2, 7],
  [7, 18],
] as const;

// Adds the frame layers to the page (in the transition's update callback, so
// they exist only in the new state). Each is a full-screen amber layer that
// only ever shows through its clipped view-transition snapshot: it must be
// gone before the transition's pseudo-elements are torn down, or the raw
// layer paints for a frame (a full-screen amber flash, seen in iOS Safari).
// globals.css also hides them whenever no transition is active.
export const mountSwapFrame = () => {
  const els = RINGS.map((_, i) => {
    const el = document.createElement('div');
    el.className = 'vy-swap-frame';
    el.dataset.ring = String(i);
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
    return el;
  });
  return () => els.forEach((el) => el.remove());
};

const insetOf = (r: Rect, vw: number, vh: number, rad: number) =>
  `inset(${r.y.toFixed(1)}px ${(vw - r.x - r.w).toFixed(1)}px ${(vh - r.y - r.h).toFixed(1)}px ${r.x.toFixed(1)}px round ${rad}px)`;

const ringOf = (r: Rect, a: number, b: number) =>
  `path(evenodd, '${roundRectPath(growRect(r, b), DOOR_RADIUS + b)}${roundRectPath(growRect(r, a), DOOR_RADIUS + a)}')`;

// Runs the opening once the transition's pseudo-elements exist.
export const openDoor = (origin: SwapOrigin, duration: number, concept?: ConceptId) => {
  const vw = innerWidth;
  const vh = innerHeight;
  const size = doorSize(vw);
  const w = origin.w ?? size.w;
  const h = origin.h ?? size.h;
  const from: Rect = { x: origin.x - w / 2, y: origin.y - h / 2, w, h };
  // Past every screen edge by more than the frame, so it leaves cleanly.
  const pad = RINGS[RINGS.length - 1][1] + 4;
  const to: Rect = { x: -pad, y: -pad, w: vw + 2 * pad, h: vh + 2 * pad };
  const steps = 30;
  const clip: Keyframe[] = [];
  const rings: Keyframe[][] = RINGS.map(() => []);
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const r = lerpRect(from, to, springAt(u));
    clip.push({ clipPath: insetOf(r, vw, vh, DOOR_RADIUS), offset: u });
    RINGS.forEach(([a, b], k) => rings[k].push({ clipPath: ringOf(r, a, b), offset: u }));
  }
  const html = document.documentElement;
  const opts = { duration, easing: 'linear', fill: 'both' } as const;
  html.animate(clip, { ...opts, pseudoElement: '::view-transition-new(root)' });
  const ringAnims = RINGS.map((_, k) =>
    html.animate(rings[k], { ...opts, pseudoElement: `::view-transition-new(vy-swap-frame-${k})` }),
  );
  // One sharp glitch frame as it starts: the new page and its frame jump
  // sideways in opposite directions for a frame, then snap back.
  const amount = concept ? glitchIntensity(concept) : 0.5;
  if (glitchOn() && amount > 0) {
    const jump = (dx: number, pseudoElement: string) =>
      html.animate(
        [
          { transform: `translateX(${dx}px)` },
          { transform: `translateX(${dx}px)`, offset: 0.99 },
          { transform: 'none' },
        ],
        { duration: 50, pseudoElement },
      );
    jump(Math.round(4 + 8 * amount), '::view-transition-new(root)');
    jump(-Math.round(3 + 5 * amount), '::view-transition-new(vy-swap-frame-0)');
  }
  // Settles once the rings have swept past every edge: the frame layers can
  // go then, before the transition ends (see mountSwapFrame).
  return Promise.all(ringAnims.map((a) => a.finished)).then(() => undefined);
};
