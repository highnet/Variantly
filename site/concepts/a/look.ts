import * as THREE from 'three';

import { patch, both } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

/*
 * a · Soft Clay: glazed ceramic on the Principled BSDF. Rough fired clay
 * through to a glossy glaze across the word, the glossier letters under a
 * clear coat; the studio light and the moving key give the glaze its
 * highlight. Phones: no clear-coat pass.
 */
// [roughness, clear coat]; phones take the first three.
const LOOKS: [number, number][] = [
  [0.78, 0],
  [0.42, 0.6],
  [0.62, 0.2],
  [0.3, 1],
  [0.55, 0.35],
  [0.24, 0.9],
];

export const look: ConceptLook = {
  pool: (ink, _dark, phone) => {
    const grain = patch('clay', false);
    return LOOKS.map(([roughness, clearcoat]) =>
      both(
        ink,
        (a) =>
          grain(
            phone
              ? new THREE.MeshStandardMaterial({ color: a, roughness })
              : new THREE.MeshPhysicalMaterial({
                  color: a,
                  roughness,
                  clearcoat,
                  clearcoatRoughness: 0.12,
                }),
          ),
        true,
      ),
    );
  },
  shadow: (dark) => ({
    color: dark ? '#1a0408' : '#8a3a1c',
    opacity: dark ? 0.5 : 0.3,
    radius: 1,
    dir: [-0.3, 0.6, 1],
  }),
};
