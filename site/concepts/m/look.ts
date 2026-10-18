import * as THREE from 'three';

import { bsdf } from '@/lib/bsdf';
import type { LetterLook } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

import { plaster } from './plaster';

/*
 * m · Uncanny Mirror. Every letter is a rough plaster cast (chalky BSDF with
 * a faint fibre sheen; fine tooth and hairline cracks in its colour), and
 * every letter carries its reflection: the glyph flipped under its baseline,
 * recoloured as another variant (the letter's own CSS colour), fading into
 * the floor. The object obeys; the reflection lies. (The reflection is a
 * mirrored second draw of the glyph, not a surface: it keeps its own shader.)
 */
const DECL = /* glsl */ `
uniform vec3 uShade; uniform float uCrack; uniform float uScale;
`;
const ALBEDO = /* glsl */ `
  vec2 q = vObj.xy * uScale;
  float tooth = vyNoise(q * 9.0) * 0.6 + vyNoise(q * 23.0) * 0.4;
  float k = vyNoise(q * 1.7 + 4.0);
  float crack = smoothstep(0.012, 0.0, abs(k - 0.5)) * step(0.45, vyNoise(q * 0.9 + 9.0));
  diffuseColor.rgb *= 0.9 + 0.12 * tooth;
  diffuseColor.rgb = mix(diffuseColor.rgb, uShade, crack * uCrack);
`;
const NORMAL = /* glsl */ `
  vec2 q = vObj.xy * uScale * 9.0;
  vec2 g = vec2(vyNoise(q + vec2(0.05, 0.0)) - vyNoise(q - vec2(0.05, 0.0)),
                vyNoise(q + vec2(0.0, 0.05)) - vyNoise(q - vec2(0.0, 0.05))) * 10.0;
  normal = normalize(normal + vec3(g * 0.05, 0.0) * abs(normal.z));
`;

const cast = (col: string, shade: string, crack: number, scale: number) =>
  bsdf({
    key: 'm-plaster',
    color: col,
    roughness: 0.94,
    sheen: 0.35,
    sheenColor: new THREE.Color('#ffffff'),
    sheenRoughness: 0.9,
    grain: 0.03,
    hooks: { decl: DECL, albedo: ALBEDO, normal: NORMAL },
    uniforms: {
      uShade: { value: new THREE.Color(shade) },
      uCrack: { value: crack },
      uScale: { value: scale },
    },
  });

const PLASTERS: [string, string, number][] = [
  // colour, shade, crack strength
  ['#f4f1ea', '#a9a5b0', 0.55],
  ['#ece6dc', '#9b958f', 0.75],
  ['#eef0f4', '#9ea4b4', 0.4],
  ['#f6f3ec', '#a49f98', 0.3],
  ['#e9e4da', '#958f88', 0.65],
  ['#f0f2f6', '#9aa0ae', 0.5],
];
// Light theme: the same casts in slate and violet stone, so the word holds
// against the pale sky (each face >= 4.5:1 on #e7ecf1).
const STONES: [string, string, number][] = [
  ['#545a6c', '#2a2e3a', 0.5],
  ['#5e5280', '#2c2640', 0.6],
  ['#4a5568', '#252b36', 0.4],
  ['#5a6072', '#2a2e3a', 0.35],
  ['#62578a', '#2c2640', 0.55],
  ['#4d586c', '#252b36', 0.45],
];

export const look: ConceptLook = {
  pool: (ink, dark) => {
    const lift = (c: string) => (dark ? new THREE.Color(c).multiplyScalar(0.86).getStyle() : c);
    const ghost = (c: string) =>
      plaster({
        col: c,
        shade: dark ? '#1c1830' : '#5b4a91',
        mirror: true,
        reflection: true,
        fade: 2.6,
        alpha: dark ? 0.55 : 0.5,
        crack: 0,
      });
    return (dark ? PLASTERS : STONES).map(([col, shade, crack], i): LetterLook => ({
      body: [
        cast(lift(col), shade, crack, 1.4 + (i % 3) * 0.3),
        cast(lift(col), ink.side, crack * 0.6, 1.4),
      ],
      extra: ghost(i % 3 === 1 ? (dark ? '#8fb4e6' : '#4a6a96') : i === 3 ? '#ffb59a' : ink.face),
      offset: [0, -0.02, 0],
      env: true,
    }));
  },
  shadow: (dark) => ({
    color: dark ? '#000000' : '#3a3550',
    opacity: dark ? 0.55 : 0.3,
    radius: 1,
    dir: [-0.45, 0.7, 0.9],
  }),
};
