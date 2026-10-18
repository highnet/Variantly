import * as THREE from 'three';

import { persp } from '@/components/backdrop/sceneKit';
import type { Built, ConceptScene } from '@/concepts/types';

/*
 * k · Ink & Stitch: a deckle-edged cotton sheet breathing on a slow wave. Its
 * two running-stitch seams come loose one stitch after another, hover above
 * the paper as thread loops (casting soft shadows), then pull taut and re-sew.
 * Everything is a function of t on a 24s loop.
 */

const W = (Math.PI * 2) / 24;
// The sheet's wave, shared by the shader and the stitches that ride on it.
const WAVE = /* glsl */ `
float wave(vec2 p, float t) {
  return 0.09 * sin(p.x * 1.3 + p.y * 0.5 + t * ${W}) + 0.05 * sin(p.y * 2.1 - t * ${W * 2});
}`;
const wave = (x: number, y: number, t: number) =>
  0.09 * Math.sin(x * 1.3 + y * 0.5 + t * W) + 0.05 * Math.sin(y * 2.1 - t * W * 2);

const SHEET_W = 3.4;
const SHEET_H = 2.5;
const SEAMS = [
  { y: 0.62, n: 12, phase: 0 },
  { y: -0.5, n: 12, phase: 0.5 },
];
const PITCH = 0.25;

const smooth = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

const build = (scene: THREE.Scene, colors: string[]): Built => {
  const [paper, thread, ink] = colors;
  const camera = persp(9);
  scene.add(new THREE.AmbientLight('#ffffff', 1.3));
  const sun = new THREE.DirectionalLight('#ffffff', 2.2);
  sun.position.set(-3, 5, 6);
  scene.add(sun);

  const sheet = new THREE.Group();
  scene.add(sheet);

  // The paper: deckled edges cut in the shader, a dry-brush ink sweep, fibres.
  const uT = { value: 0 };
  const paperMat = new THREE.ShaderMaterial({
    uniforms: {
      uT,
      uPaper: { value: new THREE.Color(paper) },
      uInk: { value: new THREE.Color(ink) },
    },
    side: THREE.DoubleSide,
    vertexShader: `${WAVE}
uniform float uT; varying vec2 vP; varying vec3 vN;
void main(){
  vP = position.xy;
  vec3 p = position; p.z += wave(p.xy, uT);
  float e = 0.01;
  vec3 tx = vec3(e, 0.0, wave(p.xy + vec2(e, 0.0), uT) - wave(p.xy, uT));
  vec3 ty = vec3(0.0, e, wave(p.xy + vec2(0.0, e), uT) - wave(p.xy, uT));
  vN = normalize(normalMatrix * cross(tx, ty));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`,
    fragmentShader: `
uniform vec3 uPaper; uniform vec3 uInk; varying vec2 vP; varying vec3 vN;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
float vn(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
void main(){
  vec2 q = abs(vP) - vec2(${SHEET_W / 2 - 0.08}, ${SHEET_H / 2 - 0.08});
  float deckle = vn(vP * 9.0) * 0.07 + vn(vP * 31.0) * 0.03;
  if (max(q.x, q.y) > deckle - 0.04) discard;
  vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
  float d = clamp(dot(N, normalize(vec3(-0.4, 0.6, 0.7))) * 0.5 + 0.62, 0.0, 1.1);
  vec3 c = uPaper * d * (0.95 + 0.05 * h(floor(vP * 90.0)));
  // a dry-brush sweep of ink across the sheet
  float y = vP.y - 0.05 - 0.25 * sin(vP.x * 1.1 + 0.6);
  float band = 1.0 - smoothstep(0.17, 0.26, abs(y));
  float dry = step(0.42, vn(vec2(vP.x * 1.4, vP.y * 30.0)) * 0.7 + vn(vP * vec2(6.0, 3.0)) * 0.45);
  float reach = 1.0 - smoothstep(0.6, 1.5, vP.x + vn(vec2(vP.y * 20.0, 1.0)) * 0.5);
  c = mix(c, uInk * d, band * dry * reach * 0.92);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`,
  });
  sheet.add(new THREE.Mesh(new THREE.PlaneGeometry(SHEET_W, SHEET_H, 48, 34), paperMat));

  // One stitch: a short arc of thread; scaled in z, it opens into a loop.
  const arc = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-0.5, 0, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0.5, 0, 0),
  );
  const count = SEAMS.reduce((a, s) => a + s.n, 0);
  const stitches = new THREE.InstancedMesh(
    new THREE.TubeGeometry(arc, 14, 0.09, 6, false),
    new THREE.MeshLambertMaterial({ color: thread }),
    count,
  );
  sheet.add(stitches);

  // Soft shadows on the paper under each stitch, darker as it lifts close.
  const lift = new Float32Array(count);
  const liftAttr = new THREE.InstancedBufferAttribute(lift, 1);
  const shadowGeo = new THREE.PlaneGeometry(1, 1);
  shadowGeo.setAttribute('aLift', liftAttr);
  const shadows = new THREE.InstancedMesh(
    shadowGeo,
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uInk: { value: new THREE.Color(ink) } },
      vertexShader: `attribute float aLift; varying vec2 vU; varying float vL;
void main(){ vU = uv; vL = aLift;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 uInk; varying vec2 vU; varying float vL;
void main(){ float r = length((vU - 0.5) * vec2(2.0, 2.0));
  gl_FragColor = vec4(uInk, (1.0 - smoothstep(0.2, 1.0, r)) * 0.28 * vL);
  #include <colorspace_fragment>
}`,
    }),
    count,
  );
  sheet.add(shadows);

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const halfH = 9 * Math.tan((20 * Math.PI) / 180);

  return {
    camera,
    update: (t) => {
      uT.value = t;
      const aspect = (camera as THREE.PerspectiveCamera).aspect || 1.6;
      const halfW = halfH * aspect;
      const narrow = aspect < 1;
      // The sheet hangs in the top corner, clear of the title.
      sheet.scale.setScalar(narrow ? 0.5 : 0.78);
      sheet.position.set(halfW - (narrow ? 0.45 : 1.15), halfH - (narrow ? 0.55 : 0.95), -1);
      sheet.rotation.set(-0.38 + 0.04 * Math.sin(t * W), -0.5 + 0.05 * Math.sin(t * W * 2), 0.14);

      let i = 0;
      for (const seam of SEAMS) {
        for (let j = 0; j < seam.n; j++, i++) {
          const x = (j - (seam.n - 1) / 2) * PITCH * 1.05;
          // A wave of loosening runs along the seam, holds, then re-sews.
          const u = (((t / 24 + seam.phase - j * 0.018) % 1) + 1) % 1;
          const l = smooth(0.12, 0.32, u) * (1 - smooth(0.62, 0.82, u));
          const bob = Math.sin((t / 6 + j * 0.37) * Math.PI * 2);
          const z = wave(x, seam.y, t) + 0.012 + l * (0.42 + 0.06 * bob);
          e.set(
            l * (0.5 + 0.2 * bob),
            l * 0.25 * Math.sin(j * 1.7),
            l * 0.5 * Math.sin(j * 2.3 + bob),
          );
          q.setFromEuler(e);
          pos.set(x, seam.y + l * 0.08 * bob, z);
          scl.set(PITCH * 0.62 * (1 + l * 0.35), 0.28, 0.035 + l * 0.42);
          stitches.setMatrixAt(i, m.compose(pos, q, scl));
          // The shadow falls down-right of the light and spreads as it rises.
          q.identity();
          pos.set(x + l * 0.18, seam.y - l * 0.16, wave(x, seam.y, t) + 0.01);
          const s = PITCH * (0.8 + l * 0.9);
          scl.set(s, s * 0.45, 1);
          shadows.setMatrixAt(i, m.compose(pos, q, scl));
          lift[i] = 0.35 + l;
        }
      }
      stitches.instanceMatrix.needsUpdate = true;
      shadows.instanceMatrix.needsUpdate = true;
      liftAttr.needsUpdate = true;
    },
  };
};

export const scene: ConceptScene = {
  colors: {
    light: ['#fbf6ec', '#a8432a', '#1d1a17'],
    dark: ['#e9dfcd', '#d0623f', '#1d1a17'],
  },
  build,
};
