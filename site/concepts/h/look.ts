import * as THREE from 'three';

import type { ConceptLook } from '@/concepts/types';
import { plain, type LetterInk } from '@/lib/lookKit';
import { LIGHT_TURN } from '@/lib/titleLight';

/*
 * h · Dither Machine: dithered voxels. Unlit; each fragment is one of two
 * inks, picked by a Bayer 4×4 threshold on how much light its facet takes.
 * Faces are the letter's ink, holed by paper where the light blows out (light
 * theme) or where the shade falls (dark theme); the extruded sides are the
 * rust, dithered into ink as they turn from the light.
 */
const VERT = /* glsl */ `
varying vec3 vN;
void main() {
  vN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = /* glsl */ `
uniform mat3 uLightTurn;
uniform vec3 uA; uniform vec3 uB; uniform float uCell; uniform float uK; uniform float uC;
varying vec3 vN;
float b2(vec2 a){ a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bayer(vec2 a){ return b2(0.5 * a) * 0.25 + b2(a); }
void main() {
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  float d = dot(n, normalize(uLightTurn * vec3(-0.45, 0.6, 0.65)));
  float amt = clamp(d * uK + uC, 0.0, 1.0);
  gl_FragColor = vec4(mix(uA, uB, step(bayer(gl_FragCoord.xy / uCell) + 0.001, amt)), 1.0);
  #include <colorspace_fragment>
}`;

const dither = (a: string, b: string, cell: number, k: number, c: number) =>
  new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uLightTurn: LIGHT_TURN,
      uA: { value: new THREE.Color(a) },
      uB: { value: new THREE.Color(b) },
      uCell: { value: cell },
      uK: { value: k },
      uC: { value: c },
    },
    toneMapped: false,
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
    // Light theme: paper where the light is strongest. Dark: where it is weakest.
    const face = dark
      ? dither(ink.face, paper, c, -2.4, 0.9 + bias)
      : dither(ink.face, paper, c, 2.2, -1.75 + bias);
    const side = dither(ink.side, dark ? paper : ink.face, c, -0.9, 0.45);
    return plain(face, side);
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
