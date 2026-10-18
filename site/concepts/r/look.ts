import * as THREE from 'three';

import { both, shader } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

/*
 * r · Kinetic Type: flat ink. The face is solid colour with no shading at
 * all (print, not material); the sides are the teal of the 2D letter's drop,
 * so the extrusion reads as a second ink. The width of each letter comes from
 * the slot's own transform in concept.css, which the 3D word copies.
 */
export const look: ConceptLook = {
  pool: (ink, _dark, phone) => {
    const looks: ((a: string) => THREE.Material)[] = [
      (a) => shader('flat', { a, grain: 0.02 }),
      (a) => shader('facet', { a, grain: 0.02 }),
      (a) => shader('toon', { a, grain: 0.02 }),
    ];
    if (!phone)
      looks.push(
        (a) => shader('toon', { a, hatch: 1, cell: 5, grain: 0.02 }),
        (a) => new THREE.MeshStandardMaterial({ color: a, roughness: 0.9, flatShading: true }),
        (a) => shader('flat', { a, grain: 0.05 }),
      );
    return looks.map((make) => both(ink, make));
  },
  shadow: (dark) => ({
    color: dark ? '#000000' : '#0f0f0f',
    opacity: dark ? 0.5 : 0.22,
    radius: 1,
    dir: [-0.15, 0.3, 1],
  }),
};
