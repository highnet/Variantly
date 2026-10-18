import { bsdf } from '@/lib/bsdf';
import { both } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

/*
 * e · Bauhaus: enamelled sheet metal. Alternate letters are faceted
 * (flat-shaded, so every chamfer is its own plane) and smooth; a satin enamel
 * over a little metal, under a clear coat, so the moving key light sweeps a
 * clean highlight plane by plane.
 */
// [flat-shaded, roughness, clear coat]; phones take the first three.
const LOOKS: [boolean, number, number][] = [
  [true, 0.36, 0.8],
  [false, 0.28, 1],
  [true, 0.3, 0.6],
  [false, 0.42, 0.9],
  [true, 0.24, 1],
  [false, 0.34, 0.7],
];

export const look: ConceptLook = {
  pool: (ink) =>
    LOOKS.map(([flatShading, roughness, clearcoat]) =>
      both(
        ink,
        (a) =>
          bsdf({
            key: 'e-enamel',
            color: a,
            roughness,
            metalness: 0.12,
            clearcoat,
            clearcoatRoughness: 0.06,
            flatShading,
            grain: 0.03,
          }),
        true,
      ),
    ),
  shadow: (dark) => ({
    color: '#000000',
    opacity: dark ? 0.45 : 0.2,
    radius: 1,
    dir: [-0.35, 0.35, 1],
  }),
};
