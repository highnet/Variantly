import * as THREE from 'three';

import { bsdf } from '@/lib/bsdf';
import { plain, type LetterInk } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

/*
 * h · Dither Machine: dithered voxels. The letter is lit physically (a satin
 * body), then reduced to two inks by a Bayer 4×4 threshold on how lit each
 * fragment is: faces are the letter's ink, holed by paper where the light
 * blows out (light theme) or where the shade falls (dark theme); the sides
 * are the rust, dithered into ink as they turn from the light. As the light
 * moves, the dither pattern crawls across the letters with it.
 */
const POST = /* glsl */ `
  vec2 a = floor(gl_FragCoord.xy / uCell);
  float b2a = fract(dot(floor(0.5 * a), vec2(0.5, floor(0.5 * a).y * 0.75)));
  float b2b = fract(dot(a, vec2(0.5, a.y * 0.75)));
  float bayer = b2a * 0.25 + b2b;
  float amt = clamp(vyLit * uK + uC, 0.0, 1.0);
  vec3 inkA = sRGBTransferOETF(vec4(uA, 1.0)).rgb;
  vec3 inkB = sRGBTransferOETF(vec4(uB, 1.0)).rgb;
  gl_FragColor.rgb = mix(inkA, inkB, step(bayer + 0.001, amt));
`;

const dither = (a: string, b: string, cell: number, k: number, c: number) =>
  bsdf({
    key: 'h-dither',
    color: a,
    roughness: 0.42,
    clearcoat: 0.3,
    grain: 0,
    hooks: {
      decl: 'uniform vec3 uA; uniform vec3 uB; uniform float uCell; uniform float uK; uniform float uC;',
      post: POST,
    },
    uniforms: {
      uA: { value: new THREE.Color(a) },
      uB: { value: new THREE.Color(b) },
      uCell: { value: cell },
      uK: { value: k },
      uC: { value: c },
    },
  });

// [extra paper in the face, cell size in CSS px]; phones take the first three.
const LOOKS: [number, number][] = [
  [0, 2],
  [0.14, 2],
  [0.06, 3],
  [0.22, 2],
  [0.1, 3],
  [0.18, 2],
];

const pool = (ink: LetterInk, dark: boolean) => {
  const px = Math.min(devicePixelRatio || 1, 3);
  const paper = dark ? '#0e0e0e' : '#efe7d6';
  return LOOKS.map(([bias, cell]) => {
    const c = Math.round(cell * px);
    // Light: paper where the light is strongest (lit past the ink). Dark:
    // paper where it is weakest.
    const face = dark
      ? dither(ink.face, paper, c, -1.6, 1.25 + bias)
      : dither(ink.face, paper, c, 1.8, -1.75 + bias);
    const side = dither(ink.side, dark ? paper : ink.face, c, -1.1, 1.0);
    return plain(face, side, true);
  });
};

export const look: ConceptLook = {
  pool,
  shadow: (dark) => ({
    color: dark ? '#000000' : '#1b1915',
    opacity: dark ? 0.7 : 0.26,
    radius: 1,
    dir: [-0.35, 0.5, 1],
  }),
};
