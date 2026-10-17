import * as THREE from 'three';

import { persp } from '@/components/backdrop/sceneKit';
import type { Built, ConceptScene } from '@/concepts/types';

/*
 * n · Noir Velvet: a stage. Two oxblood velvet drapes and a valance frame the
 * page; one spotlight from above throws venetian-blind bars across the
 * velvet, sweeping on the same 24s loop as the wall. Once per loop the drapes
 * draw in (theatrical, slow) and part again: the one cut per change.
 */

const W = (Math.PI * 2) / 24;

const velvet = (colour: string, hi: string, uT: { value: number }) =>
  new THREE.ShaderMaterial({
    uniforms: { uT, uC: { value: new THREE.Color(colour) }, uH: { value: new THREE.Color(hi) } },
    vertexShader: `uniform float uT; varying vec3 vN; varying vec3 vV; varying vec3 vW;
void main(){
  vec3 p = position;
  // folds: deep regular pleats that sway a little at the hem
  float hem = clamp(-p.y / 8.0 + 0.5, 0.0, 1.0);
  float ph = p.x * 5.2 + sin(uT * ${W * 2} + p.x) * 0.25 * hem;
  p.z += sin(ph) * 0.22;
  vec3 n = normalize(vec3(-cos(ph) * 0.22 * 5.2, 0.0, 1.0));
  vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz;
  vec4 mv = viewMatrix * w; vV = -mv.xyz;
  vN = normalize(normalMatrix * n);
  gl_Position = projectionMatrix * mv;
}`,
    fragmentShader: `uniform float uT; uniform vec3 uC; uniform vec3 uH; varying vec3 vN; varying vec3 vV; varying vec3 vW;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
void main(){
  vec3 N = normalize(vN); vec3 V = normalize(vV);
  // the spotlight: a pool centred high on the stage
  vec2 q = (vW.xy - vec2(0.0, 1.2)) / vec2(6.5, 4.2);
  float spot = 0.25 + 0.75 * (1.0 - smoothstep(0.35, 1.0, length(q)));
  // venetian blinds: bars in light space, sweeping 4 periods per loop
  float bar = fract((vW.y * 0.94 + vW.x * 0.34) * 1.35 + uT / 6.0);
  float blind = mix(0.42, 1.0, smoothstep(0.38, 0.46, bar) * (1.0 - smoothstep(0.92, 1.0, bar)));
  float lit = max(dot(N, normalize(vec3(0.2, 0.6, 0.8))), 0.0);
  // velvet: dark where it faces you, a soft bloom where it turns away
  float rim = pow(1.0 - max(dot(N, V), 0.0), 2.0);
  vec3 c = uC * (0.35 + 0.65 * lit) * spot * blind + uH * rim * 0.55 * spot * blind;
  c *= 0.94 + 0.06 * h(floor(gl_FragCoord.xy));
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`,
  });

const smooth = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

const build = (scene: THREE.Scene, colors: string[]): Built => {
  const [cloth, hi, gold] = colors;
  const camera = persp(9);
  const uT = { value: 0 };
  const mat = velvet(cloth, hi, uT);
  const drape = new THREE.PlaneGeometry(2.4, 9, 72, 18);
  const left = new THREE.Mesh(drape, mat);
  const right = new THREE.Mesh(drape, mat);
  const valance = new THREE.Mesh(new THREE.PlaneGeometry(16, 1.1, 160, 2), mat);
  const fringe = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 0.07),
    new THREE.MeshBasicMaterial({ color: gold }),
  );
  scene.add(left, right, valance, fringe);
  const halfH = 9 * Math.tan((20 * Math.PI) / 180);

  return {
    camera,
    update: (t) => {
      uT.value = t;
      const aspect = (camera as THREE.PerspectiveCamera).aspect || 1.6;
      const halfW = halfH * aspect;
      const narrow = aspect < 1;
      // Drapes rest open; at 18-21s they draw in, then part by 24s.
      const u = ((t % 24) + 24) % 24;
      const close = smooth(17, 20, u) * (1 - smooth(20.5, 23.5, u));
      const edge = narrow ? 0.12 : 0.85;
      const x = halfW + 1.2 - edge - close * (narrow ? 0.5 : 1.6);
      left.position.set(-x, 0.2, -0.5);
      right.position.set(x, 0.2, -0.5);
      left.rotation.y = 0.18;
      right.rotation.y = -0.18;
      valance.position.set(0, halfH - (narrow ? 0.15 : 0.28), -0.3);
      fringe.position.set(0, valance.position.y - 0.57, -0.25);
    },
  };
};

export const scene: ConceptScene = {
  colors: {
    light: ['#6e1420', '#e0727c', '#c79a5b'],
    dark: ['#5c0f1b', '#c4404f', '#a07a45'],
  },
  build,
};
