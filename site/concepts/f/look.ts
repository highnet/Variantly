import * as THREE from 'three';

import { bsdf } from '@/lib/bsdf';
import { both } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

/*
 * f · Cut & Paste: matte stock. Uncoated paper (rough, with a soft fibre
 * sheen at grazing angles), fibre speckle in the colour, and per look either
 * corrugation (real ridges in the normal, so they catch the light) or print
 * dots.
 */
const ALBEDO = /* glsl */ `
  float fibre = vyHash(floor(vObj.xy * 55.0) + uSeed);
  float dots = 1.0 - uDots * 0.25 * step(length(fract(gl_FragCoord.xy / uCell) - 0.5), 0.22);
  diffuseColor.rgb *= (0.93 + 0.07 * fibre) * dots;
`;
const NORMAL = /* glsl */ `
  normal = normalize(normal + vec3(0.0, cos(vObj.y * 56.5) * 0.22 * uStripe * abs(normal.z), 0.0));
`;

// [corrugated, print dots, dot cell, seed]
const LOOKS: [number, number, number, number][] = [
  [0, 0, 4, 1.3],
  [1, 0, 4, 2.1],
  [0, 1, 4, 3.7],
  [0, 0, 4, 4.2],
  [1, 0, 4, 5.9],
  [0, 1, 3, 6.4],
];

export const look: ConceptLook = {
  pool: (ink) =>
    LOOKS.map(([stripe, dots, cell, seed]) =>
      both(
        ink,
        (a) =>
          bsdf({
            key: 'f-paper',
            color: a,
            roughness: 0.92,
            sheen: 0.6,
            sheenColor: new THREE.Color('#fffaf0'),
            sheenRoughness: 0.85,
            grain: 0.05,
            hooks: {
              decl: 'uniform float uStripe; uniform float uDots; uniform float uCell; uniform float uSeed;',
              albedo: ALBEDO,
              normal: NORMAL,
            },
            uniforms: {
              uStripe: { value: stripe },
              uDots: { value: dots },
              uCell: { value: cell },
              uSeed: { value: seed },
            },
          }),
        true,
      ),
    ),
  shadow: (dark) => ({
    color: '#000000',
    opacity: dark ? 0.55 : 0.35,
    radius: 1,
    dir: [-0.3, 0.42, 1],
  }),
};
