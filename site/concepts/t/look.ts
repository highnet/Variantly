import * as THREE from 'three';

import { plain } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

/*
 * t · Stone & Linen: honed limestone. A matte face in the 2D letter's colour
 * with soft micro-normals (value noise bent into the normal), faint fossil
 * flecks and a slow tonal drift; the sides in the darker stone of its drop.
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
uniform vec3 uA; uniform float uSeed; uniform float uBump; uniform float uFleck;
varying vec3 vN; varying vec3 vV; varying vec3 vObj;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + 1.0), f.x), f.y);
}
void main() {
  vec2 p = vObj.xy * 6.0 + uSeed;
  float e = 0.05;
  float h0 = noise(p) + 0.5 * noise(p * 2.7);
  vec2 grad = vec2(noise(p + vec2(e, 0.0)) - noise(p - vec2(e, 0.0)), noise(p + vec2(0.0, e)) - noise(p - vec2(0.0, e))) / (2.0 * e);
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  n = normalize(n + vec3(grad * uBump, 0.0) * abs(n.z));
  vec3 v = normalize(vV);
  vec3 L = normalize(vec3(-0.55, 0.6, 0.6));
  float wrap = clamp((dot(n, L) + 0.35) / 1.35, 0.0, 1.0);
  float fleck = step(1.0 - uFleck, hash(floor(vObj.xy * 90.0 + uSeed)));
  vec3 c = uA * (0.62 + 0.5 * wrap) * (0.94 + 0.1 * h0) * (1.0 - fleck * 0.18);
  c += vec3(1.0, 0.97, 0.92) * pow(max(dot(reflect(-L, n), v), 0.0), 10.0) * 0.06;
  c += (hash(gl_FragCoord.xy + uSeed) - 0.5) * 0.025;
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

const stone = (a: string, seed: number, bump: number, fleck: number) =>
  new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uA: { value: new THREE.Color(a) },
      uSeed: { value: seed },
      uBump: { value: bump },
      uFleck: { value: fleck },
    },
    toneMapped: false,
  });

export const look: ConceptLook = {
  pool: (ink, _dark, phone) =>
    (
      [
        [0.4, 0.05, 0.02],
        [3.1, 0.08, 0.035],
        [6.7, 0.03, 0.015],
        [1.9, 0.07, 0.03],
        [8.3, 0.05, 0.025],
        [5.2, 0.09, 0.02],
      ] as const
    )
      .slice(0, phone ? 3 : 6)
      .map(([seed, bump, fleck]) =>
        plain(stone(ink.face, seed, bump, fleck), stone(ink.side, seed + 1, bump, fleck)),
      ),
  shadow: (dark) => ({
    color: dark ? '#000000' : '#3b3026',
    opacity: dark ? 0.5 : 0.2,
    radius: 1,
    dir: [-0.55, 0.5, 0.75],
  }),
};
