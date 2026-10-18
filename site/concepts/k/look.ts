import * as THREE from 'three';

import { bsdf } from '@/lib/bsdf';
import { plain, type LetterLook } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

/*
 * k · Ink & Stitch: inked letterforms, sewn. Each face is a solid pass of
 * brush ink (bristle streaks in the colour and the gloss: wet ink shines along
 * the stroke, never gaps); the walls are matte cotton (a soft fibre sheen) and
 * a running stitch of thread follows the rim, so every glyph reads as an
 * appliqué sewn down around its own outline.
 * Glyph units: 1em = 2, baseline y = 0, front face at z = 0, walls to -0.4.
 */
const DECL = /* glsl */ `
uniform vec3 uFace; uniform vec3 uWall; uniform vec3 uT;
uniform vec4 uStitch; // pitch, bristle strength, seed, stroke angle
float vyStreak() {
  vec2 d = vec2(cos(uStitch.w), sin(uStitch.w));
  vec2 q = vec2(dot(vObj.xy, d), dot(vObj.xy, vec2(-d.y, d.x)));
  return vyNoise(vec2(q.x * 1.2 + uStitch.z, q.y * 42.0));
}
float vyRim() { return 1.0 - smoothstep(0.1, 0.14, -vObj.z); }
float vyDash() {
  float k = fract((vObj.x + vObj.y) / uStitch.x);
  return smoothstep(0.0, 0.06, k) * (1.0 - smoothstep(0.56, 0.62, k));
}
`;

const ALBEDO = /* glsl */ `
  if (vyFront > 0.5) {
    diffuseColor.rgb = uFace * (1.0 - uStitch.y * (vyStreak() - 0.5));
  } else {
    float fibre = vyHash(floor(vObj.xy * 70.0) + uStitch.z);
    vec3 wall = uWall * (0.95 + 0.05 * fibre);
    float k = fract((vObj.x + vObj.y) / uStitch.x);
    float hole = (1.0 - smoothstep(0.0, 0.05, abs(k - 0.78))) * vyRim();
    wall *= 1.0 - 0.45 * hole;
    diffuseColor.rgb = mix(wall, uT, vyRim() * vyDash());
  }
`;

const ROUGH = /* glsl */ `
  roughnessFactor = vyFront > 0.5
    ? mix(0.55, 0.22, smoothstep(0.45, 0.8, vyStreak()))
    : mix(0.95, 0.5, vyRim() * vyDash());
`;

// The thread's cord: the stitch dash bends the normal up into a rounded strand.
const NORMAL = /* glsl */ `
  if (vyFront < 0.5) {
    float k = fract((vObj.x + vObj.y) / uStitch.x);
    float f = (k / 0.6) * 2.0 - 1.0;
    normal = normalize(normal + vec3(0.0, 0.0, 0.6) * vyRim() * vyDash() * sqrt(max(0.0, 1.0 - f * f)));
  }
`;

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
  bsdf({
    key: 'k-stitch',
    color: '#ffffff',
    roughness: 0.6,
    sheen: 0.7,
    sheenColor: new THREE.Color(o.wall),
    sheenRoughness: 0.7,
    grain: 0.025,
    hooks: { decl: DECL, albedo: ALBEDO, rough: ROUGH, normal: NORMAL },
    uniforms: {
      uFace: { value: new THREE.Color(o.face) },
      uWall: { value: new THREE.Color(o.wall) },
      uT: { value: new THREE.Color(o.thread) },
      uStitch: { value: new THREE.Vector4(o.pitch, o.bristle, o.seed, o.angle) },
    },
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
      return { body: [m, m], env: true };
    });
  },
  shadow: (dark) => ({
    color: dark ? '#000000' : '#3a2a1c',
    opacity: dark ? 0.55 : 0.3,
    radius: 1,
    dir: [-0.3, 0.55, 1],
  }),
};
