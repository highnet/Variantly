import * as THREE from 'three';

import { bsdf } from '@/lib/bsdf';
import { both } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

/*
 * g · Candy 3D: boiled sugar. Hard-candy gloss under a clear coat, sugar
 * glitter that sparkles where the light catches it, a jelly with a velvet
 * sheen, and an iridescent thin film. Phones get the clear coat too.
 */
// Sugar glitter: a few cells catch the light and flare (only in the light).
const POST = /* glsl */ `
  float g = vyHash(floor(vObj.xy * 90.0) + 7.0);
  gl_FragColor.rgb += uGlitter * step(0.972, g) * smoothstep(0.7, 1.3, vyLit) * 0.45;
`;

type Candy = THREE.MeshPhysicalMaterialParameters & { glitter?: number };

const LOOKS: Candy[] = [
  { roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.03 },
  { roughness: 0.4, clearcoat: 0.6, glitter: 1 },
  {
    roughness: 0.3,
    sheen: 1,
    sheenColor: new THREE.Color('#ffd1f0'),
    sheenRoughness: 0.4,
    clearcoat: 0.6,
  },
  {
    roughness: 0.2,
    metalness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    iridescence: 0.8,
    iridescenceIOR: 1.35,
    iridescenceThicknessRange: [180, 720],
  },
  { roughness: 0.45, clearcoat: 0.4, glitter: 1 },
  { roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.02 },
];

export const look: ConceptLook = {
  pool: (ink) =>
    LOOKS.map(({ glitter = 0, ...o }) =>
      both(
        ink,
        (a) =>
          bsdf({
            key: 'g-candy',
            ...o,
            color: a,
            grain: 0.04,
            hooks: { decl: 'uniform float uGlitter;', post: POST },
            uniforms: { uGlitter: { value: glitter } },
          }),
        true,
      ),
    ),
  shadow: (dark) => ({
    color: dark ? '#05010f' : '#5b2fd6',
    opacity: dark ? 0.55 : 0.25,
    radius: 1,
    dir: [-0.25, 0.6, 1],
  }),
};
