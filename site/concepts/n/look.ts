import * as THREE from 'three';

import { patch, plain } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

/*
 * n · Noir Velvet: velvet lacquer letters. The face is crushed velvet (a
 * sheen that blooms at grazing angles, oxblood in the light theme, ivory on
 * the dark stage) or a deep lacquer; the bevel and sides are a polished gold
 * rim. Phones get MeshStandard approximations; desktops the physical sheen.
 */
export const look: ConceptLook = {
  pool: (ink, dark, phone) => {
    const grain = patch('noir', false, false);
    const sheen = new THREE.Color(dark ? '#ffd6c4' : '#d24a5a');
    const gold = (rough: number) =>
      grain(new THREE.MeshStandardMaterial({ color: '#c79a5b', metalness: 1, roughness: rough }));
    const std = (rough: number, metal = 0) =>
      grain(
        new THREE.MeshStandardMaterial({ color: ink.face, roughness: rough, metalness: metal }),
      );
    const phys = (o: THREE.MeshPhysicalMaterialParameters) =>
      grain(new THREE.MeshPhysicalMaterial({ color: ink.face, ...o }));
    const looks: [THREE.Material, THREE.Material][] = [
      [std(0.85), gold(0.28)],
      [std(0.35, 0.1), gold(0.2)],
      [std(0.7), gold(0.4)],
    ];
    if (!phone)
      looks.push(
        // crushed velvet: the sheen blooms where the surface turns away
        [phys({ roughness: 0.9, sheen: 1, sheenColor: sheen, sheenRoughness: 0.35 }), gold(0.25)],
        // black lacquer under a clear coat
        [phys({ roughness: 0.4, clearcoat: 1, clearcoatRoughness: 0.08 }), gold(0.18)],
        [phys({ roughness: 0.75, sheen: 1, sheenColor: sheen, sheenRoughness: 0.6 }), gold(0.32)],
      );
    return looks.map(([face, side]) => plain(face, side, true));
  },
  // One hard spotlight, high and to the right.
  shadow: (dark) => ({
    color: '#000000',
    opacity: dark ? 0.7 : 0.38,
    radius: 2,
    dir: [0.3, 0.75, 0.9],
  }),
};
