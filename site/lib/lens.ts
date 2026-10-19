'use client';

import type { ConceptId } from '@/concepts';
import type { GlitchFrame } from '@/lib/lensGlitch';
import { NO_GLITCH } from '@/lib/lensGlitch';
import type { Pt, Rect, Tilt } from '@/lib/lensDoor';
import { seekTime } from '@/lib/seek';

/*
 * The Lens: a doorway that follows the cursor over the hero and shows the
 * hero in another concept inside it; a click keeps that concept.
 *
 * This module is the shared, three-free state between the Lens's UI
 * (components/Lens.tsx, which owns input and the motion loop) and its 3D pass
 * inside the title's canvas (lib/lens3d.ts, attached by Letters3D). It holds
 * plain mutable values, written once per frame by the UI, read by the 3D pass
 * in the same frame (`lensTick` -> listeners), so following the cursor costs
 * no React renders.
 */

export type LensMode = 'drag' | 'fixed';

export type LensLive = {
  // The door is on screen.
  shown: boolean;
  mode: LensMode;
  // The concept inside it.
  id: ConceptId | null;
  // Door rect (untilted), px of the hero title card; its tilt toward the
  // cursor's motion; the clip outline actually drawn (tilted, with any
  // glitch slices) and its dropout holes, card px.
  rect: Rect;
  tilt: Tilt;
  outline: Pt[];
  holes: Pt[][];
  glitch: GlitchFrame;
  // Moving fast: the inner 3D scene pauses (the 2D art stands in).
  fast: boolean;
  // Set by the 3D pass: it is drawing the lens letters this frame, and the
  // lens concept's scene under them.
  gl: boolean;
  scene: boolean;
  // The lens hero's 2D word (inside the Lens's shadow root), laid out in the
  // lens concept: where the 3D pass places and colours its letters.
  word: HTMLElement | null;
  // The card's top-left on screen (viewport px), kept by the UI.
  card: { left: number; top: number };
  // Bumped each time the UI re-aligns the lens word (fonts landing, a word
  // resizing): the 3D pass measures both words again.
  rev: number;
};

export const lensLive: LensLive = {
  shown: false,
  mode: 'drag',
  id: null,
  rect: { x: 0, y: 0, w: 0, h: 0 },
  tilt: { rx: 0, ry: 0 },
  outline: [],
  holes: [],
  glitch: NO_GLITCH,
  fast: false,
  gl: false,
  scene: false,
  word: null,
  card: { left: 0, top: 0 },
  rev: 0,
};

const listeners = new Set<() => void>();

// Something about the door changed this frame: the 3D pass repaints.
export const lensTick = () => listeners.forEach((l) => l());
export const onLensTick = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

// The 3D pass started or stopped drawing the door (lensLive.gl / .scene):
// the UI moves its 2D layer over or under the canvas to match.
let glListener: (() => void) | null = null;
export const onLensGl = (cb: () => void) => {
  glListener = cb;
  return () => {
    if (glListener === cb) glListener = null;
  };
};
export const setLensGl = (gl: boolean, scene: boolean) => {
  if (lensLive.gl === gl && lensLive.scene === scene) return;
  lensLive.gl = gl;
  lensLive.scene = scene;
  glListener?.();
};

// A short glitch asked for by the 3D pass (a letter flipping across the
// rim) or the UI (cycling the concept). The UI's loop plays it.
type Kick = 'rim' | 'cycle';
let kicked: { kind: Kick; at: number } | null = null;
export const kickGlitch = (kind: Kick) => {
  kicked = { kind, at: performance.now() };
  kickListener?.();
};
let kickListener: (() => void) | null = null;
export const takeKick = (cb: () => void) => {
  kickListener = cb;
  return () => {
    if (kickListener === cb) kickListener = null;
  };
};
export const pendingKick = () => {
  const k = kicked;
  kicked = null;
  return k;
};

// `?lens=0` turns it off; seek renders (`?t=`) never show it.
export const lensEnabled = () => {
  if (typeof location === 'undefined') return false;
  if (seekTime() !== null) return false;
  return new URLSearchParams(location.search).get('lens') !== '0';
};

// `?lensperf=1`: the main-thread time of each door frame (the 2D layers and
// the 3D pass), for the perf check in the PR. Off otherwise.
export const lensPerf: number[] | null =
  typeof location !== 'undefined' && new URLSearchParams(location.search).has('lensperf')
    ? ((window as unknown as { __lensPerf: number[] }).__lensPerf = [])
    : null;
