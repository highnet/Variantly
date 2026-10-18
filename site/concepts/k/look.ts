import * as THREE from 'three';

import { plain, type LetterLook } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

/*
 * k · Ink & Stitch: matte cotton-paper letters, sewn. A running stitch of
 * rust thread pierces each face along its own seam (every look is one
 * editioned seam: height, angle, pitch); some letters wear a dry-brush ink
 * pass, and on a few the stitches have lifted off and hover in front of the
 * face, leaving their needle holes behind.
 * Glyph units: 1em = 2, baseline y = 0, front face at z = 0.
 */

const VERT = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
varying vec3 vObj;
varying float vFront;
void main() {
  vObj = position;
  vFront = normal.z;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vV = -mv.xyz;
  vN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
uniform vec3 uA;
uniform vec3 uT;
uniform vec3 uInk;
uniform vec4 uSeam;   // angle, height, pitch, thread on face (0/1)
uniform vec4 uMode;   // brush coverage, only thread (lifted layer), holes, seed
varying vec3 vN;
varying vec3 vV;
varying vec3 vObj;
varying float vFront;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
void main() {
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  vec3 L = normalize(vec3(-0.45, 0.6, 0.65));
  vec3 v = normalize(vV);
  float face = step(0.92, vFront);
  // The seam: s runs along it, a across it.
  vec2 d = vec2(cos(uSeam.x), sin(uSeam.x));
  float s = dot(vObj.xy, d) / uSeam.z;
  float a = (dot(vObj.xy, vec2(-d.y, d.x)) - uSeam.y) / 0.055;
  float k = fract(s);
  float dash = smoothstep(0.0, 0.08, k) * (1.0 - smoothstep(0.58, 0.66, k));
  float thread = face * dash * (1.0 - smoothstep(0.75, 1.0, abs(a)));
  // Needle holes where each stitch dives through the paper.
  float hole = face * (1.0 - smoothstep(0.3, 0.7, length(vec2((k - 0.62) * uSeam.z / 0.055, a))))
             + face * (1.0 - smoothstep(0.3, 0.7, length(vec2(min(k, 1.0 - k) * uSeam.z / 0.055, a))));
  if (uMode.y > 0.5) {
    // The lifted layer: only the thread itself.
    if (thread < 0.5) discard;
  }
  // Matte cotton paper: wrapped diffuse, fibre speckle, a slightly darker edge.
  float wrap = clamp((dot(n, L) + 0.55) / 1.55, 0.0, 1.0);
  float fibre = hash(floor(vObj.xy * 70.0) + uMode.w);
  vec3 c = uA * (0.52 + 0.55 * wrap) * (0.94 + 0.06 * fibre);
  // Dry-brush ink: bristle rows that break up along the stroke.
  if (uMode.x > 0.0) {
    float row = vnoise(vec2(vObj.x * 1.6 + uMode.w, vObj.y * 34.0));
    float drag = vnoise(vec2(vObj.x * 7.0, vObj.y * 9.0 + uMode.w));
    float edge = abs(vObj.y - 0.42 - 0.14 * sin(vObj.x * 1.7 + uMode.w)) - uMode.x;
    float band = 1.0 - smoothstep(-0.02, 0.02, edge + (row - 0.5) * 0.12);
    float ink = face * band * step(0.36, row * 0.75 + drag * 0.45);
    c = mix(c, uInk * (0.85 + 0.25 * wrap), ink);
  }
  // Holes darken the paper; the thread is a round cord with a sheen.
  c *= 1.0 - 0.55 * clamp(hole, 0.0, 1.0) * uMode.z * (1.0 - thread * uSeam.w);
  float lit = sqrt(max(0.0, 1.0 - a * a));
  vec3 cord = uT * (0.45 + 0.65 * lit) + pow(lit, 6.0) * 0.12;
  c = mix(c, cord, thread * max(uSeam.w, uMode.y));
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
  gl_FragColor.rgb += (hash(gl_FragCoord.xy + uMode.w) - 0.5) * 0.03;
}`;

type Seam = { angle: number; y: number; pitch: number; sewn: boolean };
type Opts = { seam: Seam; brush?: number; lifted?: boolean; holes?: boolean; seed: number };

const mat = (a: string, thread: string, ink: string, o: Opts, onlyThread = false) =>
  new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uA: { value: new THREE.Color(a) },
      uT: { value: new THREE.Color(thread) },
      uInk: { value: new THREE.Color(ink) },
      uSeam: {
        value: new THREE.Vector4(o.seam.angle, o.seam.y, o.seam.pitch, o.seam.sewn ? 1 : 0),
      },
      uMode: {
        value: new THREE.Vector4(o.brush ?? 0, onlyThread ? 1 : 0, o.holes ? 1 : 0, o.seed),
      },
    },
    toneMapped: false,
  });

export const look: ConceptLook = {
  pool: (ink, dark) => {
    const rust = dark ? '#e06a45' : '#a8432a';
    const ochre = dark ? '#e0ae48' : '#b9862a';
    const sumi = dark ? '#0f0d0b' : '#1d1a17';
    const paper = dark ? '#f1e8d8' : '#fbf6ec';
    const looks: [Opts, string][] = [
      [{ seam: { angle: 0, y: 0.62, pitch: 0.3, sewn: true }, holes: true, seed: 1 }, rust],
      [
        {
          seam: { angle: 0.32, y: 0.5, pitch: 0.28, sewn: true },
          brush: 0.16,
          holes: true,
          seed: 2,
        },
        rust,
      ],
      [
        {
          seam: { angle: -0.18, y: 0.72, pitch: 0.32, sewn: false },
          lifted: true,
          holes: true,
          seed: 3,
        },
        rust,
      ],
      [
        { seam: { angle: 0.0, y: 0.36, pitch: 0.3, sewn: true }, brush: 0.9, holes: true, seed: 4 },
        paper,
      ],
      [{ seam: { angle: 1.25, y: 0.1, pitch: 0.3, sewn: true }, holes: true, seed: 5 }, ochre],
      [
        {
          seam: { angle: 0.12, y: 0.9, pitch: 0.28, sewn: false },
          lifted: true,
          brush: 0.14,
          holes: true,
          seed: 6,
        },
        ochre,
      ],
    ];
    return looks.map(([o, thread]): LetterLook => {
      const l = plain(
        mat(ink.face, thread, sumi, o),
        mat(ink.side, thread, sumi, { ...o, brush: 0 }),
      );
      if (!o.lifted) return l;
      // The stitches have come loose: they hover in front of the face.
      return {
        ...l,
        extra: mat(ink.face, thread, sumi, { ...o, brush: 0 }, true),
        offset: [0.05, 0.08, 0.34],
      };
    });
  },
  shadow: (dark) => ({
    color: dark ? '#000000' : '#3a2a1c',
    opacity: dark ? 0.55 : 0.3,
    radius: 1,
    dir: [-0.3, 0.55, 1],
  }),
};
