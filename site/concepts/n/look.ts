import * as THREE from 'three';

import { plain } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';
import { LIGHT_TURN } from '@/lib/titleLight';

/*
 * n · Orientation Reel: matte white title letters with soft grey sides, lit
 * like a projected frame. The projector's lamp flickers slightly: every
 * letter reads one shared luminance from the page clock, stepped at 12
 * frames a second, set in onBeforeRender (no allocation per frame).
 * Strictly neutral: no hue, no glow.
 */

const flick = { value: 1 };
const hash = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const VERT = /* glsl */ `
varying vec3 vN;
varying vec3 vObj;
void main() {
  vObj = position;
  vN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = /* glsl */ `
uniform mat3 uLightTurn;
uniform vec3 uA;
uniform float uFlick;
uniform float uSeed;
varying vec3 vN;
varying vec3 vObj;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  // one hard key from the projector, a dim fill
  float d = max(dot(n, normalize(uLightTurn * vec3(-0.35, 0.5, 0.8))), 0.0);
  vec3 c = uA * (0.5 + 0.55 * d) * uFlick;
  c *= 0.95 + 0.05 * hash(floor(vObj.xy * 40.0) + uSeed);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
  gl_FragColor.rgb += (hash(gl_FragCoord.xy + uSeed) - 0.5) * 0.06;
}`;

const mat = (a: string, seed: number) => {
  const m = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uLightTurn: LIGHT_TURN,
      uA: { value: new THREE.Color(a) },
      uFlick: flick,
      uSeed: { value: seed },
    },
    toneMapped: false,
  });
  m.onBeforeRender = () => {
    flick.value = 1 - 0.05 * hash(Math.floor(performance.now() / 83) % 288);
  };
  return m;
};

export const look: ConceptLook = {
  pool: (ink) =>
    [1, 2, 3, 4, 5, 6].map((seed) => plain(mat(ink.face, seed), mat(ink.side, seed + 9))),
  // A hard projector shadow, cast down and to the right.
  shadow: (dark) => ({
    color: '#000000',
    opacity: dark ? 0.6 : 0.42,
    radius: 1,
    dir: [-0.35, 0.5, 1],
  }),
};
