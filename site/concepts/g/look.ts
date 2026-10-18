import * as THREE from 'three';

import { patch, both } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

export const look: ConceptLook = {
  pool: (ink, _dark, phone) => {
    const rim = patch('candy-rim', true, false);
    const glitter = patch('candy-glitter', false, true);
    const grain = patch('candy', false, false);
    const std = (o: THREE.MeshStandardMaterialParameters) => (a: string) =>
      new THREE.MeshStandardMaterial({ ...o, color: a });
    const phys = (o: THREE.MeshPhysicalMaterialParameters) => (a: string) =>
      new THREE.MeshPhysicalMaterial({ ...o, color: a });
    const looks: ((a: string) => THREE.Material)[] = [
      (a) => rim(std({ roughness: 0.2, metalness: 0.05 })(a)),
      (a) => glitter(std({ roughness: 0.45 })(a)),
      (a) => rim(std({ roughness: 0.12, metalness: 0.05 })(a)),
    ];
    // Phones: no clearcoat pass; the rim shader fakes the thin-film sheen.
    if (!phone)
      looks.push(
        // Iridescent clear-coat: a thin film whose hue shifts with the angle.
        (a) =>
          grain(
            phys({
              roughness: 0.22,
              metalness: 0.05,
              clearcoat: 1,
              clearcoatRoughness: 0.06,
              iridescence: 0.7,
              iridescenceIOR: 1.35,
              iridescenceThicknessRange: [180, 720],
            })(a),
          ),
        // Jelly: soft and sheeny.
        (a) =>
          grain(
            phys({
              roughness: 0.35,
              sheen: 1,
              sheenColor: new THREE.Color('#ffd1f0'),
              sheenRoughness: 0.4,
              clearcoat: 0.6,
            })(a),
          ),
        // Hard candy gloss.
        (a) => grain(phys({ roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.02 })(a)),
      );
    return looks.map((make) => both(ink, make, true));
  },
  shadow: (dark) => ({
    color: dark ? '#05010f' : '#5b2fd6',
    opacity: dark ? 0.55 : 0.25,
    radius: 8,
    dir: [-0.25, 0.6, 1],
  }),
};
