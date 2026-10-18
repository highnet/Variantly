import * as THREE from 'three';

import { bsdf } from '@/lib/bsdf';
import { plain } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

/*
 * s · Lived-in Den: oiled walnut faces (procedural grain and pores in the 2D
 * letter's colour, a hand-rubbed oil finish as a clear coat, the pores duller
 * than the wood around them) with polished brass inlay sides (the 2D letter's
 * brass drop shadow, real metal). Lit warm, from the lamp's side.
 */
const DECL = /* glsl */ `
uniform float uScale; uniform float uSeed;
float vyPore() {
  vec2 p = vObj.xy * uScale + uSeed;
  return step(0.93, vyHash(floor(vec2(p.x * 40.0, p.y * 140.0))));
}
`;
const ALBEDO = /* glsl */ `
  vec2 p = vObj.xy * uScale + uSeed;
  float g = p.y * 11.0 + vyNoise(p * vec2(0.8, 3.0)) * 2.4 + sin(p.x * 0.9) * 0.7;
  float band = smoothstep(0.15, 0.85, abs(fract(g) - 0.5) * 2.0);
  diffuseColor.rgb *= mix(0.78, 1.1, band) * (1.0 - vyPore() * 0.28);
`;
const ROUGH = /* glsl */ `
  roughnessFactor = mix(roughnessFactor, 0.9, vyPore());
`;

const walnut = (a: string, scale: number, seed: number, gloss: number) =>
  bsdf({
    key: 's-walnut',
    color: a,
    roughness: 0.55,
    clearcoat: gloss,
    clearcoatRoughness: 0.12,
    sheen: 0.2,
    sheenColor: new THREE.Color('#ffd9a8'),
    sheenRoughness: 0.5,
    grain: 0.03,
    hooks: { decl: DECL, albedo: ALBEDO, rough: ROUGH },
    uniforms: { uScale: { value: scale }, uSeed: { value: seed } },
  });

const brass = (a: string) =>
  bsdf({ key: 's-brass', color: a, metalness: 1, roughness: 0.24, grain: 0.02 });

export const look: ConceptLook = {
  pool: (ink) =>
    (
      [
        [1, 0.3, 0.6],
        [1.4, 4.1, 0.35],
        [0.8, 7.7, 0.8],
        [1.2, 2.2, 0.45],
        [0.9, 5.3, 0.7],
        [1.6, 9.4, 0.5],
      ] as const
    ).map(([scale, seed, gloss]) =>
      plain(walnut(ink.face, scale, seed, gloss), brass(ink.side), true),
    ),
  shadow: (dark) => ({
    color: dark ? '#050201' : '#4a2410',
    opacity: dark ? 0.55 : 0.3,
    radius: 1,
    dir: [0.45, 0.6, 1],
  }),
};
