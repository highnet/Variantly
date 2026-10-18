import * as THREE from 'three';

import { bsdf } from '@/lib/bsdf';
import { plain } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

/*
 * l · Inflated Chrome: mirror-silver, all real metal. Polished chrome
 * (metalness 1, near-zero roughness) reflecting the studio, satin and
 * lacquered variants across the word, and one with a faint oil-slick film.
 * The moving key light runs a hot highlight along every curve.
 */
// [roughness, tint, clear coat, iridescence]; phones take the first three.
const LOOKS: [number, string, number, number][] = [
  [0.04, '#ffffff', 0, 0],
  [0.12, '#e6e8ec', 1, 0],
  [0.07, '#cfd3d9', 0, 0.35],
  [0.2, '#f2f3f5', 0.6, 0],
  [0.03, '#dfe3e8', 1, 0],
  [0.1, '#ffffff', 0, 0.2],
];

export const look: ConceptLook = {
  pool: (_ink, dark) =>
    LOOKS.map(([roughness, tint, clearcoat, iridescence]) => {
      const color = new THREE.Color(tint).multiplyScalar(dark ? 0.92 : 1);
      const metal = (sideRough: number) =>
        bsdf({
          key: 'l-chrome',
          color,
          metalness: 1,
          roughness: sideRough,
          clearcoat,
          clearcoatRoughness: 0.02,
          // Chrome is only what it reflects: the studio, turned up.
          envMapIntensity: 1.4,
          iridescence,
          iridescenceIOR: 1.6,
          iridescenceThicknessRange: [200, 600],
          grain: 0.02,
        });
      return plain(metal(roughness), metal(roughness + 0.08), true);
    }),
  shadow: (dark) => ({
    color: dark ? '#c6ff00' : '#0a0a0a',
    opacity: dark ? 0.16 : 0.28,
    radius: 1,
    dir: [-0.25, 0.55, 1],
  }),
};
