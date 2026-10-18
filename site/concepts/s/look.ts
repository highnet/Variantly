import * as THREE from 'three';

import { plain } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

/*
 * s · Lived-in Den: oiled walnut faces (procedural grain and pores in the 2D
 * letter's colour, under a clear-coat glint) with brass inlay sides (the 2D
 * letter's brass drop shadow, polished). Lit warm, from the lamp's side.
 */
const VERT = /* glsl */ `
varying vec3 vN; varying vec3 vV; varying vec3 vObj;
void main() {
  vObj = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vV = -mv.xyz;
  vN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
uniform vec3 uA; uniform float uMetal; uniform float uScale; uniform float uSeed; uniform float uGloss;
varying vec3 vN; varying vec3 vV; varying vec3 vObj;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + 1.0), f.x), f.y);
}
void main() {
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  vec3 v = normalize(vV);
  vec3 L = normalize(vec3(0.55, 0.65, 0.6));
  float d = max(dot(n, L), 0.0);
  vec3 h = normalize(L + v);
  vec3 c;
  if (uMetal > 0.5) {
    float fres = pow(1.0 - abs(dot(n, v)), 3.0);
    c = uA * (0.42 + 0.7 * d) + uA * pow(max(dot(n, h), 0.0), 28.0) * 1.1 + vec3(1.0, 0.86, 0.6) * fres * 0.35;
  } else {
    vec2 p = vObj.xy * uScale + uSeed;
    float g = p.y * 11.0 + noise(p * vec2(0.8, 3.0)) * 2.4 + sin(p.x * 0.9) * 0.7;
    float band = smoothstep(0.15, 0.85, abs(fract(g) - 0.5) * 2.0);
    float pores = step(0.93, hash(floor(vec2(p.x * 40.0, p.y * 140.0))));
    vec3 wood = uA * mix(0.8, 1.08, band) * (1.0 - pores * 0.25);
    c = wood * (0.4 + 0.75 * d) + vec3(1.0, 0.88, 0.7) * pow(max(dot(n, h), 0.0), 90.0) * uGloss;
  }
  c += (hash(gl_FragCoord.xy + uSeed) - 0.5) * 0.03;
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

const mat = (a: string, metal: boolean, scale = 1, seed = 0, gloss = 0.55) =>
  new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uA: { value: new THREE.Color(a) },
      uMetal: { value: metal ? 1 : 0 },
      uScale: { value: scale },
      uSeed: { value: seed },
      uGloss: { value: gloss },
    },
    toneMapped: false,
  });

export const look: ConceptLook = {
  pool: (ink, _dark, phone) =>
    (
      [
        [1, 0.3, 0.6],
        [1.4, 4.1, 0.35],
        [0.8, 7.7, 0.8],
        [1.2, 2.2, 0.45],
        [0.9, 5.3, 0.7],
        [1.6, 9.4, 0.5],
      ] as const
    )
      .slice(0, phone ? 3 : 6)
      .map(([scale, seed, gloss]) =>
        plain(mat(ink.face, false, scale, seed, gloss), mat(ink.side, true)),
      ),
  shadow: (dark) => ({
    color: dark ? '#050201' : '#4a2410',
    opacity: dark ? 0.55 : 0.3,
    radius: 10,
    dir: [0.45, 0.6, 1],
  }),
};
