'use client';

import type { ConceptId } from '@/concepts';
import { perfTier } from '@/lib/perfTier';
import { calmMotion } from '@/lib/prefs';
import { seekTime } from '@/lib/seek';
import { glitchStrength, titleGlitchOn } from '@/lib/titleTiming';

/*
 * The Lens's glitch, on the title's glitch API (lib/titleTiming: the
 * `?glitch=0` switch and each concept's strength, 0 = never): horizontal band
 * slices offset sideways, an offset colour split (two flat copies in the
 * concept's palette, no blend modes), a one-frame face flicker and scanline
 * dropouts. No glow, no blur. Kept rare and short: it accents a flip (a letter
 * crossing the door's edge, a new concept in the door, the door opening), it
 * never loops. The title's own `glitchAt` is tied to its reveal's timeline;
 * the door's frames come from `glitchFrame` here, seeded so a frame is
 * reproducible.
 *
 * Off with `?glitch=0`, calm / reduced motion and seek renders.
 */

export type GlitchFrame = {
  // Slices of the region (px from its top) shifted sideways by dx px.
  bands: { y0: number; y1: number; dx: number }[];
  // Thin full-width lines that drop out (show what is behind).
  dropouts: { y0: number; y1: number }[];
  // The colour split's horizontal offset, px (two copies at -split, +split).
  split: number;
  // Show the previous face for this one frame.
  flicker: boolean;
};

export const NO_GLITCH: GlitchFrame = { bands: [], dropouts: [], split: 0, flicker: false };

export const glitchOn = () => titleGlitchOn() && !calmMotion() && seekTime() === null;

// The concept's own strength (its look's), halved at the low perf tier.
export const glitchIntensity = (id: ConceptId) =>
  glitchStrength(id) * (perfTier() === 'low' ? 0.5 : 1);

// Small integer hash -> [0, 1).
const rand = (seed: number, k: number) => {
  let x = (Math.imul(seed + 1, 2654435761) ^ Math.imul(k + 7, 40503)) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x2c1b3c6d) >>> 0;
  return ((x ^ (x >>> 12)) >>> 0) / 4294967296;
};

// One glitch frame for a region `height` px tall; the same seed always gives
// the same frame (seek-safe, reproducible captures).
export const glitchFrame = (seed: number, amount: number, height: number): GlitchFrame => {
  if (amount <= 0) return NO_GLITCH;
  const bands: GlitchFrame['bands'] = [];
  const count = 1 + Math.floor(rand(seed, 1) * 3);
  for (let i = 0; i < count; i++) {
    const y0 = rand(seed, 10 + i) * height * 0.92;
    const tall = 4 + rand(seed, 20 + i) * 16;
    const dx = (rand(seed, 30 + i) - 0.5) * 2 * (3 + 7 * amount);
    bands.push({ y0, y1: Math.min(height, y0 + tall), dx: Math.round(dx) });
  }
  const dropouts: GlitchFrame['dropouts'] = [];
  const lines = Math.floor(rand(seed, 40) * 2 * amount);
  for (let i = 0; i < lines; i++) {
    const y0 = Math.round(rand(seed, 50 + i) * height);
    dropouts.push({ y0, y1: y0 + 2 });
  }
  return {
    bands,
    dropouts,
    split: Math.round(1 + 2 * amount),
    flicker: rand(seed, 60) < 0.15,
  };
};
