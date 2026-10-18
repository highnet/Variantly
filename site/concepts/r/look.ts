import { bsdf } from '@/lib/bsdf';
import { both } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

/*
 * r · Kinetic Type: print. Matte to satin inks on board, the sides the teal
 * of the 2D letter's drop, so the extrusion reads as a second ink. Faceted
 * and smooth letters alternate. The width of each letter comes from the
 * slot's own transform in concept.css, which the 3D word copies.
 */
// [roughness, flat-shaded]; phones take the first three.
const LOOKS: [number, boolean][] = [
  [0.85, false],
  [0.6, true],
  [0.45, false],
  [0.75, true],
  [0.55, false],
  [0.9, false],
];

export const look: ConceptLook = {
  pool: (raw, dark) => {
    // Dark: lift the signal red so it holds against near-black.
    const lift = (c: string) => (dark && c.toLowerCase() === '#c0392b' ? '#e0533f' : c);
    const ink = { face: lift(raw.face), side: lift(raw.side) };
    return LOOKS.map(([roughness, flatShading]) =>
      both(
        ink,
        (a) => bsdf({ key: 'r-print', color: a, roughness, flatShading, grain: 0.02 }),
        true,
      ),
    );
  },
  shadow: (dark) => ({
    color: dark ? '#000000' : '#0f0f0f',
    opacity: dark ? 0.35 : 0.22,
    radius: 1,
    dir: [-0.15, 0.3, 1],
  }),
};
