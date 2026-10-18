import * as THREE from 'three';

import { plain } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';
import { LIGHT_TURN } from '@/lib/titleLight';

/*
 * p · Tenango Thread: each letter is one motif, filled with dense satin
 * stitch in its own thread colour. The stitches run in one direction per look
 * (as a Tenango embroiderer turns them per petal and limb), each thread a
 * round cord with an anisotropic sheen along its length, the stitch rows
 * staggered where one thread ends and the next begins.
 * Glyph units: 1em = 2, baseline y = 0, front face at z = 0.
 */

const VERT = /* glsl */ `
uniform vec4 uS;
varying vec3 vT;
varying vec3 vN;
varying vec3 vV;
varying vec3 vObj;
void main() {
  vObj = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vV = -mv.xyz;
  vN = normalize(normalMatrix * normal);
  vT = normalize((modelViewMatrix * vec4(cos(uS.x), sin(uS.x), 0.0, 0.0)).xyz);
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
uniform mat3 uLightTurn;
uniform vec3 uA;
uniform vec4 uS; // angle, thread pitch, stitch length, seed
varying vec3 vT;
varying vec3 vN;
varying vec3 vV;
varying vec3 vObj;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  vec3 v = normalize(vV);
  vec3 L = normalize(uLightTurn * vec3(-0.45, 0.6, 0.65));
  vec2 d = vec2(cos(uS.x), sin(uS.x));
  // across: which thread; along: where on its stitch
  float across = dot(vObj.xy, vec2(-d.y, d.x)) / uS.y;
  float row = floor(across);
  float along = dot(vObj.xy, d) / uS.z + hash(vec2(row, uS.w)) * 0.7;
  float f = fract(across) * 2.0 - 1.0;
  float cord = sqrt(max(0.0, 1.0 - f * f));
  float gap = smoothstep(0.0, 0.05, fract(along)) * smoothstep(1.0, 0.95, fract(along));
  // Kajiya-Kay sheen along the thread's tangent.
  vec3 T = normalize(vT);
  vec3 H = normalize(L + v);
  float th = dot(T, H);
  float sheen = pow(sqrt(max(0.0, 1.0 - th * th)), 60.0);
  float wrap = clamp((dot(n, L) + 0.5) / 1.5, 0.0, 1.0);
  float side = 1.0 - smoothstep(0.6, 0.95, abs(n.z));
  vec3 c = uA * (0.42 + 0.6 * wrap) * mix(0.55 + 0.45 * cord, 1.0, side) * mix(0.7, 1.0, gap);
  c += sheen * cord * gap * (1.0 - side) * 0.38 * (0.6 + 0.4 * uA);
  c *= 0.96 + 0.08 * hash(vec2(row, floor(along)) + uS.w);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

const mat = (a: string, angle: number, pitch: number, len: number, seed: number) =>
  new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uLightTurn: LIGHT_TURN,
      uA: { value: new THREE.Color(a) },
      uS: { value: new THREE.Vector4(angle, pitch, len, seed) },
    },
    toneMapped: false,
  });

// [stitch angle, thread pitch, stitch length]: one direction per look.
const STITCH: [number, number, number][] = [
  [1.15, 0.05, 0.62],
  [0.35, 0.055, 0.5],
  [1.57, 0.05, 0.7],
  [-0.6, 0.05, 0.56],
  [0.0, 0.06, 0.48],
  [2.2, 0.05, 0.6],
];

export const look: ConceptLook = {
  pool: (ink) =>
    STITCH.map(([angle, pitch, len], i) =>
      plain(
        mat(ink.face, angle, pitch, len, i + 1),
        mat(ink.side, angle + 1.57, pitch, len, i + 7),
      ),
    ),
  shadow: (dark) => ({
    color: dark ? '#000000' : '#5a2a14',
    opacity: dark ? 0.5 : 0.22,
    radius: 1,
    dir: [-0.25, 0.6, 1],
  }),
};
