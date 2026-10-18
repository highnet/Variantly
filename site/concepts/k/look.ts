import * as THREE from 'three';

import { plain, type LetterLook } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';
import { LIGHT_TURN } from '@/lib/titleLight';

/*
 * k · Ink & Stitch: inked letterforms, sewn. Each face is a solid pass of
 * brush ink (bristle streaks inside it, never gaps), and a running stitch of
 * thread follows the letter's rim (the bevel and the top of its wall), so
 * every glyph reads as an appliqué sewn down around its own outline.
 * Glyph units: 1em = 2, baseline y = 0, front face at z = 0, walls to -0.4.
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
uniform mat3 uLightTurn;
uniform vec3 uFace;
uniform vec3 uWall;
uniform vec3 uT;
uniform vec4 uStitch; // pitch, bristle strength, seed, stroke angle
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
  vec3 L = normalize(uLightTurn * vec3(-0.45, 0.6, 0.65));
  float wrap = clamp((dot(n, L) + 0.55) / 1.55, 0.0, 1.0);
  float face = step(0.92, vFront);
  vec3 c;
  if (face > 0.5) {
    // Brush ink: bristle streaks along one stroke direction, a gentle sheen.
    vec2 d = vec2(cos(uStitch.w), sin(uStitch.w));
    vec2 q = vec2(dot(vObj.xy, d), dot(vObj.xy, vec2(-d.y, d.x)));
    float streak = vnoise(vec2(q.x * 1.2 + uStitch.z, q.y * 42.0));
    c = uFace * (0.82 + 0.22 * wrap) * (1.0 - uStitch.y * (streak - 0.5));
  } else {
    // The wall: matte cotton with a running stitch around the rim.
    float fibre = hash(floor(vObj.xy * 70.0) + uStitch.z);
    c = uWall * (0.55 + 0.5 * wrap) * (0.95 + 0.05 * fibre);
    float rim = 1.0 - smoothstep(0.1, 0.14, -vObj.z);
    float s = (vObj.x + vObj.y) / uStitch.x;
    float k = fract(s);
    float dash = smoothstep(0.0, 0.06, k) * (1.0 - smoothstep(0.56, 0.62, k));
    float hole = (1.0 - smoothstep(0.0, 0.05, abs(k - 0.78))) * rim;
    c *= 1.0 - 0.45 * hole;
    vec3 cord = uT * (0.6 + 0.5 * wrap);
    c = mix(c, cord, rim * dash);
  }
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
  gl_FragColor.rgb += (hash(gl_FragCoord.xy + uStitch.z) - 0.5) * 0.025;
}`;

type Opts = {
  face: string;
  wall: string;
  thread: string;
  pitch: number;
  bristle: number;
  seed: number;
  angle: number;
};

const mat = (o: Opts) =>
  new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uLightTurn: LIGHT_TURN,
      uFace: { value: new THREE.Color(o.face) },
      uWall: { value: new THREE.Color(o.wall) },
      uT: { value: new THREE.Color(o.thread) },
      uStitch: { value: new THREE.Vector4(o.pitch, o.bristle, o.seed, o.angle) },
    },
    toneMapped: false,
  });

export const look: ConceptLook = {
  pool: (_ink, dark) => {
    // Light: sumi ink on cream paper. Dark: chalk-white ink on the dark sheet.
    const ink = dark ? '#f1e8d8' : '#1d1a17';
    const rustInk = dark ? '#e3825f' : '#9c3c25';
    const wall = dark ? '#cfc4b1' : '#e9dfcc';
    const rust = dark ? '#e06a45' : '#a8432a';
    const ochre = dark ? '#e0ae48' : '#b9862a';
    const thread = dark ? '#1d1a17' : '#f3ecdf';
    const looks: Opts[] = [
      { face: ink, wall, thread: rust, pitch: 0.16, bristle: 0.22, seed: 1, angle: 0.2 },
      { face: rustInk, wall, thread, pitch: 0.14, bristle: 0.18, seed: 2, angle: -0.3 },
      { face: ink, wall, thread: ochre, pitch: 0.18, bristle: 0.3, seed: 3, angle: 1.2 },
      { face: ink, wall, thread: rust, pitch: 0.12, bristle: 0.12, seed: 4, angle: 0.0 },
      { face: rustInk, wall, thread: ochre, pitch: 0.16, bristle: 0.24, seed: 5, angle: 0.6 },
      { face: ink, wall, thread: rust, pitch: 0.2, bristle: 0.35, seed: 6, angle: -0.9 },
    ];
    return looks.map((o): LetterLook => {
      const m = mat(o);
      return plain(m, m);
    });
  },
  shadow: (dark) => ({
    color: dark ? '#000000' : '#3a2a1c',
    opacity: dark ? 0.55 : 0.3,
    radius: 1,
    dir: [-0.3, 0.55, 1],
  }),
};
