import * as THREE from 'three';

import { bsdf } from '@/lib/bsdf';
import { both } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

/*
 * a · Soft Clay: glazed ceramic. Fired clay through to a wet glaze across the
 * word: roughness and clear coat vary letter by letter, and the glaze pools
 * warm (toward the concept's blush) where it runs thick.
 */
// [roughness, clear coat, glaze pooling]; phones take the first three.
const LOOKS: [number, number, number][] = [
  [0.62, 0.35, 0.12],
  [0.28, 1, 0.2],
  [0.45, 0.7, 0.08],
  [0.2, 1, 0.25],
  [0.38, 0.85, 0.15],
  [0.7, 0.2, 0.05],
];

const ALBEDO = /* glsl */ `
  float pool = vyNoise(vObj.xy * 1.6 + 3.0);
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * uBlush, uPool * pool);
`;

export const look: ConceptLook = {
  pool: (ink, dark) => {
    const blush = new THREE.Color(dark ? '#ff9f80' : '#ffd9c4');
    return LOOKS.map(([roughness, clearcoat, pool]) =>
      both(
        ink,
        (a) =>
          bsdf({
            key: 'a-clay',
            color: a,
            roughness,
            clearcoat,
            clearcoatRoughness: 0.08,
            sheen: 0.25,
            sheenColor: blush,
            sheenRoughness: 0.6,
            grain: 0.06,
            hooks: { decl: 'uniform vec3 uBlush; uniform float uPool;', albedo: ALBEDO },
            uniforms: { uBlush: { value: blush }, uPool: { value: pool } },
          }),
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
