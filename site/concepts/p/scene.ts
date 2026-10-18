import * as THREE from 'three';

import { persp } from '@/components/backdrop/sceneKit';
import type { Built, ConceptScene } from '@/concepts/types';

/*
 * p · Tenango Thread: the panel's birds and deer, flat satin-stitched motifs
 * (after Tenango de Doria embroidery), gently lift off the cloth, hover with
 * their loose threads swaying as if weightless, and settle back. Mirrored
 * pairs, one colour per motif, 24s loop.
 */

const W = (Math.PI * 2) / 24;

// [path in a 100-box (SVG, y down), satin direction in degrees]
type Part = [string, number];
const BIRD: Part[] = [
  ['M20 60C18 44 34 33 54 35C64 36 70 41 72 47C72 61 60 71 42 72C30 72 21 67 20 60Z', 15],
  ['M58 42C62 34 70 33 73 40L71 50L60 49Z', 60],
  ['M65 38C63 28 71 21 79 23C86 25 88 33 84 39C80 45 70 46 65 38Z', 100],
  ['M85 29L97 33L85 37Z', 0],
  ['M23 56L4 36L9 50L1 55L9 61L3 74L25 65Z', -35],
  ['M34 52C42 41 58 41 64 50C57 58 44 61 34 52Z', 55],
  ['M73 24L70 13L75 19L77 9L80 18L84 12L82 25Z', 80],
  ['M41 71L44 71L42 88L48 90L38 90L39 71Z', 90],
  ['M53 70L56 70L57 88L63 90L53 90Z', 90],
];
const DEER: Part[] = [
  ['M18 52C18 42 32 37 50 38C62 38 70 42 73 49C73 60 62 64 47 64C32 64 18 62 18 52Z', 8],
  ['M62 44L71 26C73 20 80 17 85 20L95 27L92 32L81 32L75 48Z', 65],
  ['M76 20L70 9L66 10L65 6L71 5L74 2L76 3L75 7L79 16Z', 70],
  ['M82 19L84 8L80 5L82 3L86 6L90 3L92 5L88 9L86 19Z', 110],
  ['M81 21L89 14L87 23Z', 20],
  ['M20 50L9 43L13 56Z', -20],
  ['M24 60L28 60L27 88L22 88Z', 92],
  ['M33 62L37 62L38 88L33 88Z', 88],
  ['M56 62L60 62L58 88L54 88Z', 92],
  ['M64 60L68 59L71 88L66 88Z', 85],
];
// Unstitched cotton left for the eye.
const EYES = { bird: [79, 31, 1.7], deer: [85, 25, 1.3] };

// M / L / C / Z, absolute, as written above.
const shapeOf = (d: string) => {
  const s = new THREE.Shape();
  const nums = (d.match(/-?\d*\.?\d+/g) ?? []).map(Number);
  const p = (i: number) => [nums[i] / 100 - 0.5, 0.5 - nums[i + 1] / 100] as const;
  let k = 0;
  for (const op of d.match(/[MLCZ]/g) ?? []) {
    if (op === 'M') s.moveTo(...p(k));
    else if (op === 'L') s.lineTo(...p(k));
    else if (op === 'C') s.bezierCurveTo(...p(k), ...p(k + 2), ...p(k + 4));
    k += op === 'C' ? 6 : op === 'Z' ? 0 : 2;
  }
  return s;
};

const satin = (colour: string, angle: number) =>
  new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: {
      uA: { value: new THREE.Color(colour) },
      uD: { value: new THREE.Vector2(Math.cos(angle), Math.sin(angle)) },
    },
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 uA; uniform vec2 uD; varying vec2 vP;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
void main(){
  float a = dot(vP, vec2(-uD.y, uD.x)) * 110.0; float row = floor(a);
  float f = fract(a) * 2.0 - 1.0; float cord = sqrt(max(0.0, 1.0 - f * f));
  float al = dot(vP, uD) * 9.0 + h(vec2(row, 3.0)) * 0.8;
  float gap = smoothstep(0.0, 0.06, fract(al)) * smoothstep(1.0, 0.94, fract(al));
  vec3 c = uA * (0.62 + 0.42 * cord) * mix(0.75, 1.0, gap) + pow(cord, 8.0) * gap * 0.12;
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`,
  });

// A motif: its satin parts, its shadow on the cloth, and a loose thread.
const motif = (
  parts: Part[],
  eye: number[],
  colour: string,
  cloth: string,
  shade: THREE.Material,
) => {
  const g = new THREE.Group();
  const body = new THREE.Group();
  const shadow = new THREE.Group();
  for (const [d, deg] of parts) {
    const geo = new THREE.ShapeGeometry(shapeOf(d), 10);
    body.add(new THREE.Mesh(geo, satin(colour, (-deg * Math.PI) / 180)));
    shadow.add(new THREE.Mesh(geo, shade));
  }
  const pupil = new THREE.Mesh(
    new THREE.CircleGeometry(eye[2] / 100, 16),
    new THREE.MeshBasicMaterial({ color: cloth }),
  );
  pupil.position.set(eye[0] / 100 - 0.5, 0.5 - eye[1] / 100, 0.002);
  body.add(pupil);
  // A loose end of thread trailing from the motif, swaying in zero gravity.
  const uT = { value: 0 };
  const thread = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(
        [
          [-0.47, -0.05, 0],
          [-0.53, -0.12, 0.05],
          [-0.5, -0.2, 0.08],
          [-0.57, -0.26, 0.06],
          [-0.55, -0.34, 0.1],
        ].map(([x, y, z]) => new THREE.Vector3(x, y, z)),
      ),
      48,
      0.006,
      5,
    ),
    new THREE.ShaderMaterial({
      uniforms: { uT, uA: { value: new THREE.Color(colour) } },
      vertexShader: `uniform float uT; varying float vS;
void main(){ vS = uv.x; vec3 p = position;
  float w = ${W};
  p.x += sin(uT * w * 2.0 + uv.x * 5.0) * 0.07 * uv.x;
  p.z += cos(uT * w * 3.0 + uv.x * 4.0) * 0.06 * uv.x;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
      fragmentShader: `uniform vec3 uA; void main(){ gl_FragColor = vec4(uA * 0.9, 1.0);
  #include <colorspace_fragment>
}`,
    }),
  );
  body.add(thread);
  shadow.position.z = -0.01;
  g.add(shadow, body);
  return { g, body, shadow, uT };
};

const build = (scene: THREE.Scene, colors: string[]): Built => {
  const [bird, deer, cloth, ink] = colors;
  const camera = persp(9);
  const shade = new THREE.MeshBasicMaterial({
    color: ink,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
  });
  const all = [
    { ...motif(BIRD, EYES.bird, bird, cloth, shade), kind: 'bird', side: -1, phase: 0 },
    { ...motif(BIRD, EYES.bird, bird, cloth, shade), kind: 'bird', side: 1, phase: 0.5 },
    { ...motif(DEER, EYES.deer, deer, cloth, shade), kind: 'deer', side: -1, phase: 0.25 },
    { ...motif(DEER, EYES.deer, deer, cloth, shade), kind: 'deer', side: 1, phase: 0.75 },
  ];
  all.forEach((m) => scene.add(m.g));
  const halfH = 9 * Math.tan((20 * Math.PI) / 180);

  return {
    camera,
    update: (t) => {
      const aspect = (camera as THREE.PerspectiveCamera).aspect || 1.6;
      const halfW = halfH * aspect;
      const narrow = aspect < 1;
      for (const m of all) {
        const isBird = m.kind === 'bird';
        // Lift off, hover, settle: a soft bump once per loop.
        const u = (((t / 24 + m.phase) % 1) + 1) % 1;
        const lift = 0.5 - 0.5 * Math.cos(u * Math.PI * 2);
        const s = narrow ? 0.62 : isBird ? 2.1 : 1.6;
        m.g.visible = isBird || !narrow;
        m.g.scale.set(-m.side * s, s, s);
        m.g.position.set(
          m.side * (halfW - (narrow ? 0.38 : isBird ? 1.45 : 0.75)),
          narrow ? halfH - 0.95 : isBird ? halfH - 1.3 : -halfH + 0.5,
          -0.5,
        );
        m.body.position.set(0.03 * lift, 0.05 * lift, 0.28 * lift);
        m.body.rotation.set(
          0.25 * lift * Math.sin(t * W * 2),
          -0.2 * lift,
          0.06 * lift * Math.sin(t * W + m.phase * 6),
        );
        // The shadow on the cloth softens and slips away as the motif rises.
        m.shadow.position.set(0.012 + 0.03 * lift, -0.015 - 0.035 * lift, -0.01);
        m.uT.value = t;
      }
    },
  };
};

export const scene: ConceptScene = {
  colors: {
    light: ['#c2263a', '#1b8a7f', '#fbf8f2', '#3a1a10'],
    dark: ['#ef476f', '#2ec4b6', '#14110f', '#000000'],
  },
  build,
};
