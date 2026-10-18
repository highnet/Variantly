import * as THREE from 'three';

import type { ConceptLook } from '@/concepts/types';
import { plain, type LetterInk } from '@/lib/lookKit';
import { LIGHT_TURN } from '@/lib/titleLight';

/*
 * o · Swiss Punk: enamel signs. Flat matte colour lit per facet (so the
 * chamfers read crisp), a hard glint on the edges that face the light, and
 * no environment or coloured rim: oxblood stays oxblood, black stays black.
 */
const VERT = /* glsl */ `
varying vec3 vV;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
uniform mat3 uLightTurn;
uniform vec3 uA; uniform float uGloss; uniform float uFlat;
varying vec3 vV;
void main() {
  vec3 n = normalize(cross(dFdx(-vV), dFdy(-vV)));
  vec3 v = normalize(vV);
  vec3 L = normalize(uLightTurn * vec3(-0.45, 0.6, 0.65));
  float d = clamp(dot(n, L), 0.0, 1.0);
  vec3 c = uA * mix(0.62 + 0.38 * d, 1.0, uFlat * step(0.98, abs(n.z)));
  c += step(0.9, dot(reflect(-L, n), v)) * uGloss;
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

const enamel = (a: string, gloss: number, flat: number) =>
  new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uLightTurn: LIGHT_TURN,
      uA: { value: new THREE.Color(a) },
      uGloss: { value: gloss },
      uFlat: { value: flat },
    },
    toneMapped: false,
  });

// [glint on the chamfers, how flat the face prints]; phones take the first three.
const LOOKS: [number, number][] = [
  [0.18, 1],
  [0.08, 0.6],
  [0.28, 1],
  [0, 1],
  [0.22, 0.4],
  [0.12, 1],
];

const pool = (ink: LetterInk) =>
  LOOKS.map(([gloss, flat]) =>
    plain(enamel(ink.face, gloss, flat), enamel(ink.side, gloss * 0.6, 0)),
  );

export const look: ConceptLook = {
  pool,
  shadow: (dark) => ({
    color: dark ? '#000000' : '#151412',
    opacity: dark ? 0.6 : 0.3,
    radius: 1,
    dir: [-0.42, 0.42, 1],
  }),
};
