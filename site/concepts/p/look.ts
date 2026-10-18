import * as THREE from 'three';

import { bsdf } from '@/lib/bsdf';
import { plain } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

/*
 * p · Tenango Thread: each letter is one motif, filled with dense satin
 * stitch in its own thread colour. Silk on the BSDF: an anisotropic highlight
 * stretched along the stitch direction (one per look, as a Tenango
 * embroiderer turns them per petal and limb), a sheen in the thread's colour,
 * and each thread a round cord in the normal, the rows staggered where one
 * thread ends and the next begins.
 * Glyph units: 1em = 2, baseline y = 0, front face at z = 0.
 */
const DECL = /* glsl */ `
uniform vec4 uS; // angle, thread pitch, stitch length, seed
float vyAcross() {
  vec2 d = vec2(cos(uS.x), sin(uS.x));
  return dot(vObj.xy, vec2(-d.y, d.x)) / uS.y;
}
float vyAlong() {
  vec2 d = vec2(cos(uS.x), sin(uS.x));
  return dot(vObj.xy, d) / uS.z + vyHash(vec2(floor(vyAcross()), uS.w)) * 0.7;
}
`;
const ALBEDO = /* glsl */ `
  float f = fract(vyAcross()) * 2.0 - 1.0;
  float cord = sqrt(max(0.0, 1.0 - f * f));
  float al = fract(vyAlong());
  float gap = smoothstep(0.0, 0.05, al) * smoothstep(1.0, 0.95, al);
  float side = 1.0 - smoothstep(0.6, 0.95, abs(vNormal.z));
  diffuseColor.rgb *= mix(0.6 + 0.4 * cord, 1.0, side) * mix(0.72, 1.0, gap);
  diffuseColor.rgb *= 0.96 + 0.08 * vyHash(vec2(floor(vyAcross()), floor(vyAlong())) + uS.w);
`;
// The cord: the normal rolls across each thread.
const NORMAL = /* glsl */ `
  vec2 d = vec2(cos(uS.x), sin(uS.x));
  float f = fract(vyAcross()) * 2.0 - 1.0;
  normal = normalize(normal + vec3(vec2(-d.y, d.x) * f * 0.55, 0.0) * abs(normal.z));
`;

const mat = (a: string, angle: number, pitch: number, len: number, seed: number) =>
  bsdf({
    key: 'p-silk',
    color: a,
    roughness: 0.34,
    anisotropy: 0.85,
    anisotropyRotation: angle,
    sheen: 1,
    sheenColor: new THREE.Color(a).lerp(new THREE.Color('#ffffff'), 0.35),
    sheenRoughness: 0.35,
    grain: 0.02,
    hooks: { decl: DECL, albedo: ALBEDO, normal: NORMAL },
    uniforms: { uS: { value: new THREE.Vector4(angle, pitch, len, seed) } },
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
        true,
      ),
    ),
  shadow: (dark) => ({
    color: dark ? '#000000' : '#5a2a14',
    opacity: dark ? 0.5 : 0.22,
    radius: 1,
    dir: [-0.25, 0.6, 1],
  }),
};
