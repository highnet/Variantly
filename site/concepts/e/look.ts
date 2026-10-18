import * as THREE from 'three';

import { patch, both } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

/*
 * e · Bauhaus: painted sheet metal on the Principled BSDF. Alternate letters
 * are faceted (flat-shaded, so every chamfer reads as its own plane) and
 * smooth; the paint is a satin dielectric over a hint of metal, so the moving
 * key slides a broad, clean highlight across the planes.
 */
// [flat-shaded, roughness]; phones take the first three.
const LOOKS: [boolean, number][] = [
  [true, 0.48],
  [false, 0.36],
  [true, 0.4],
  [false, 0.52],
  [true, 0.32],
  [false, 0.44],
];

export const look: ConceptLook = {
  pool: (ink) => {
    const grain = patch('bauhaus', false);
    return LOOKS.map(([flatShading, roughness]) =>
      both(
        ink,
        (a) =>
          grain(
            new THREE.MeshStandardMaterial({ color: a, roughness, metalness: 0.08, flatShading }),
          ),
        true,
      ),
    );
  },
  shadow: (dark) => ({
    color: '#000000',
    opacity: dark ? 0.45 : 0.2,
    radius: 1,
    dir: [-0.35, 0.35, 1],
  }),
};
