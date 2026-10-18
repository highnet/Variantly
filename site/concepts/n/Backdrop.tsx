import { cn } from '@/lib/utils';

import SwatchPortal from './SwatchPortal';

/* ---- N · Orientation Reel: a black-and-white instructional film ----------
 * Coarse film grain on a gently weaving gate, a soft corner vignette, and the
 * odd vertical scratch and fleck of dust crossing the frame. All pre-made
 * pieces, moved with transform and opacity only. The mascot, Swatch, sits on
 * the hero's side card (a client island portals it there; decorative). */

// Park-Miller: the grain plate is the same on every load.
const seeded = (s: number) => () => (s = (s * 16807) % 2147483647) / 2147483647;
const specks = (n: number, seed: number, size: number) => {
  const r = seeded(seed);
  return Array.from(
    { length: n },
    () => `M${Math.floor(r() * 120)} ${Math.floor(r() * 120)}h${size}v${size}h-${size}z`,
  ).join('');
};
const GRAIN_D = specks(520, 23, 1.5);
const GRAIN_L = specks(360, 71, 1.5);

// Dust: little irregular flecks and hairs, each with its own moment on screen.
const DUST = [
  'M3 1C5 0 7 2 6 4 5 6 2 6 1 4 0 3 1 1 3 1Z',
  'M1 6C3 2 7 1 9 3M9 3C10 5 12 4 13 2',
  'M2 2C4 1 5 3 4 4 3 5 1 4 2 2Z',
  'M1 1C4 3 6 7 11 8',
  'M4 1C6 1 8 3 7 5 5 7 1 6 1 4 1 2 3 1 4 1Z',
];

const Reel = () => (
  <>
    <div className="r-weave absolute inset-[-12px]">
      <svg className="r-grain absolute inset-0 size-full">
        <defs>
          <pattern id="r-grain" width="120" height="120" patternUnits="userSpaceOnUse">
            <path d={GRAIN_D} className="fill-(--art-ink)" fillOpacity="0.11" />
            <path d={GRAIN_L} className="fill-(--art-hi)" fillOpacity="0.16" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#r-grain)" />
      </svg>
      <i className="r-scratch r-scratch-0" />
      <i className="r-scratch r-scratch-1" />
      <i className="r-scratch r-scratch-2" />
      {DUST.map((d, i) => (
        <svg key={i} viewBox="0 0 14 9" className={cn('r-dust', `r-dust-${i}`)}>
          <path d={d} className="fill-(--art-ink) stroke-(--art-ink)" strokeWidth="0.8" />
        </svg>
      ))}
    </div>
    <div className="r-vignette absolute inset-0" />
    <SwatchPortal />
  </>
);

export default Reel;
