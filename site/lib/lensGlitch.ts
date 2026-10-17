'use client';

import { CONCEPT_BY_ID, type ConceptId } from '@/concepts';
import { perfTier } from '@/lib/perfTier';
import { calmMotion } from '@/lib/prefs';
import { seekTime } from '@/lib/seek';

/*
 * A crisp, deterministic glitch for the Lens: horizontal band slices offset
 * sideways, an offset colour split (two flat copies in the concept's palette,
 * no blend modes), a one-frame face flicker and scanline dropouts. No glow, no
 * blur. Kept rare and short: it accents a flip, it never loops.
 *
 * This is the Lens's minimal stand-in, shaped like the title's glitch
 * (feat/title-morph-tune): `glitchOn()`, a per-concept `glitchIntensity(id)`
 * and a pure `glitchFrame(seed, amount, height)`. When that lands, these
 * three swap over to it without touching the callers.
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

export const glitchOn = () => {
  if (typeof location === 'undefined') return false;
  if (new URLSearchParams(location.search).get('glitch') === '0') return false;
  return !calmMotion() && seekTime() === null;
};

// Signal and print concepts glitch a little harder than the soft ones.
const STRONG: Partial<Record<string, number>> = {
  'Screen & Signal': 1,
  'Light & Illusion': 0.85,
  'Print & Type': 0.7,
  'Hand & Material': 0.55,
};
export const glitchIntensity = (id: ConceptId) =>
  (STRONG[CONCEPT_BY_ID[id]?.family] ?? 0.6) * (perfTier() === 'low' ? 0.5 : 1);

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
  const count = 2 + Math.floor(rand(seed, 1) * 3);
  for (let i = 0; i < count; i++) {
    const y0 = rand(seed, 10 + i) * height * 0.92;
    const tall = 6 + rand(seed, 20 + i) * 26;
    const dx = (rand(seed, 30 + i) - 0.5) * 2 * (6 + 14 * amount);
    bands.push({ y0, y1: Math.min(height, y0 + tall), dx: Math.round(dx) });
  }
  const dropouts: GlitchFrame['dropouts'] = [];
  const lines = Math.floor(rand(seed, 40) * 3 * amount);
  for (let i = 0; i < lines; i++) {
    const y0 = Math.round(rand(seed, 50 + i) * height);
    dropouts.push({ y0, y1: y0 + 2 });
  }
  return {
    bands,
    dropouts,
    split: Math.round(2 + 4 * amount),
    flicker: rand(seed, 60) < 0.35,
  };
};
