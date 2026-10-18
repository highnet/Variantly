import * as THREE from 'three';

import { both, patch } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

/*
 * q · Sticker Bomb: printed vinyl. Glossy faces under a clear coat, a holo
 * foil (a thin film) that throws a rainbow at grazing angles, and the white kiss-cut border
 * as the extruded sides (the 2D letter's white drop shadow).
 */
export const look: ConceptLook = {
  pool: (ink, _dark, phone) => {
    // (No fresnel rim: the foil is the thin-film material below.)
    const grain = patch('vinyl', false);
    const std = (o: THREE.MeshStandardMaterialParameters) => (a: string) =>
      new THREE.MeshStandardMaterial({ ...o, color: a });
    const phys = (o: THREE.MeshPhysicalMaterialParameters) => (a: string) =>
      new THREE.MeshPhysicalMaterial({ ...o, color: a });
    const looks: ((a: string) => THREE.Material)[] = [
      (a) => grain(std({ roughness: 0.16, metalness: 0 })(a)),
      (a) => grain(std({ roughness: 0.3, metalness: 0.15 })(a)),
      (a) => grain(std({ roughness: 0.42, metalness: 0 })(a)),
    ];
    // Phones: no clear coat or foil pass.
    if (!phone)
      looks.push(
        (a) =>
          grain(phys({ roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.04, metalness: 0 })(a)),
        // Holographic foil: a thin film over a metallic print.
        (a) =>
          grain(
            phys({
              roughness: 0.22,
              metalness: 0.7,
              iridescence: 1,
              iridescenceIOR: 1.7,
              iridescenceThicknessRange: [240, 900],
            })(a),
          ),
        (a) => grain(phys({ roughness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.1 })(a)),
      );
    return looks.map((make) => both(ink, make, true));
  },
  shadow: (dark) => ({
    color: '#111111',
    opacity: dark ? 0.4 : 0.3,
    radius: 1,
    dir: [-0.2, 0.5, 1],
  }),
};
