import * as THREE from 'three';

import { persp } from '@/components/backdrop/sceneKit';
import type { Built, ConceptScene } from '@/concepts/types';

/*
 * n · Orientation Reel: the projector beam. A soft cone of light comes down
 * from the booth behind the audience (top right) onto the title frame; dust
 * drifts through it, catching the light, and the lamp flickers on the shared
 * clock. Neutral greys only; a 24s loop (every drift is a whole number of
 * laps).
 */

const W = (Math.PI * 2) / 24;
const DUST = 260;

const build = (scene: THREE.Scene, colors: string[]): Built => {
  const [beam, mote, strength] = colors;
  const camera = persp(9);
  const uT = { value: 0 };
  const uA = { value: Number(strength) };
  // The title's box in NDC (minX, minY, maxX, maxY), kept clear of dust.
  const uClear = { value: new THREE.Vector4(2, 2, 2, 2) };
  const clearOfTitle = () => {
    const title = document.querySelector('[data-hero-title] .vy-title');
    const gl = [...document.querySelectorAll('canvas')].find(
      (c) => !c.closest('[data-hero-title]'),
    );
    if (!title || !gl) return;
    const r = title.getBoundingClientRect();
    const c = gl.getBoundingClientRect();
    if (!c.width || !c.height) return;
    const nx = (x: number) => ((x - c.left) / c.width) * 2 - 1;
    const ny = (y: number) => 1 - ((y - c.top) / c.height) * 2;
    uClear.value.set(nx(r.left), ny(r.bottom), nx(r.right), ny(r.top));
  };

  // The beam: a flat fan from the lens to the frame, soft at its edges, fading
  // toward the lens, flickering a little.
  const fan = new THREE.BufferGeometry();
  fan.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([0, 0, 0, -1, 1, 0, -1, -1, 0, 0, 0, 0], 3),
  );
  fan.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0.5, 1, 1, 1, 0, 0, 0.5], 2));
  fan.setIndex([0, 1, 2]);
  const cone = new THREE.Mesh(
    fan,
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uT, uA, uC: { value: new THREE.Color(beam) } },
      vertexShader: `varying vec2 vU; void main(){ vU = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uT; uniform float uA; uniform vec3 uC; varying vec2 vU;
float h(float n){ return fract(sin(n * 12.9898) * 43758.5453); }
void main(){
  float across = abs(vU.y - 0.5) * 2.0 / max(vU.x, 0.001);
  float edge = 1.0 - smoothstep(0.55, 1.0, across);
  float along = smoothstep(0.0, 0.5, vU.x) * (1.0 - smoothstep(0.85, 1.0, vU.x) * 0.4);
  float flick = 1.0 - 0.18 * h(floor(mod(uT, 24.0) * 12.0));
  float a = edge * along * uA * flick;
  gl_FragColor = vec4(uC, a);
  #include <colorspace_fragment>
}`,
    }),
  );
  scene.add(cone);

  // Dust: each mote drifts a whole number of laps through the beam per loop.
  const seed = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) {
    const r = (k: number) => {
      const x = Math.sin((i + 1) * 91.17 + k * 17.3) * 43758.5453;
      return x - Math.floor(x);
    };
    seed.set([r(1), r(2), r(3)], i * 3);
  }
  const pts = new THREE.BufferGeometry();
  pts.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(DUST * 3), 3));
  pts.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 3));
  const dust = new THREE.Points(
    pts,
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uT, uC: { value: new THREE.Color(mote) }, uClear },
      vertexShader: `attribute vec3 aSeed; uniform float uT; uniform vec4 uClear; varying float vA;
void main(){
  float laps = 1.0 + floor(aSeed.z * 2.0);
  float s = fract(aSeed.x + uT / 24.0 * laps * (aSeed.z > 0.5 ? 1.0 : -1.0));
  // along the beam (x 0..1) and across it, inside the fan
  float x = 0.08 + 0.9 * s;
  float y = (aSeed.y * 2.0 - 1.0) * x * 0.85 + sin(uT * ${W} * 2.0 + aSeed.x * 40.0) * 0.03;
  vec3 p = vec3(-x, y, 0.02);
  vA = (0.35 + 0.65 * fract(aSeed.y * 7.0 + aSeed.x * 3.0))
     * (0.5 + 0.5 * sin(uT * ${W} * 3.0 + aSeed.z * 30.0)) * smoothstep(0.0, 0.15, s) * (1.0 - smoothstep(0.85, 1.0, s));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = 1.5 + 2.5 * aSeed.z;
  gl_Position = projectionMatrix * mv;
  // No mote crosses the title: they fade out over its box (uClear, in NDC).
  vec2 nd = gl_Position.xy / gl_Position.w;
  vec2 m = vec2(0.04, 0.06);
  float inX = smoothstep(uClear.x - m.x, uClear.x, nd.x) * (1.0 - smoothstep(uClear.z, uClear.z + m.x, nd.x));
  float inY = smoothstep(uClear.y - m.y, uClear.y, nd.y) * (1.0 - smoothstep(uClear.w, uClear.w + m.y, nd.y));
  vA *= 1.0 - inX * inY;
}`,
      fragmentShader: `uniform vec3 uC; varying float vA;
void main(){ float r = length(gl_PointCoord - 0.5); if (r > 0.5) discard;
  gl_FragColor = vec4(uC, vA * (1.0 - smoothstep(0.2, 0.5, r)));
  #include <colorspace_fragment>
}`,
    }),
  );
  dust.frustumCulled = false;
  scene.add(dust);
  const halfH = 9 * Math.tan((20 * Math.PI) / 180);

  return {
    camera,
    update: (t) => {
      uT.value = t;
      clearOfTitle();
      const aspect = (camera as THREE.PerspectiveCamera).aspect || 1.6;
      const halfW = halfH * aspect;
      // From the booth (just off the top right corner) down to the frame.
      for (const o of [cone, dust]) {
        o.position.set(halfW + 0.6, halfH + 0.8, -1);
        o.rotation.z = Math.atan2(halfH + 0.8 - 0.6, halfW + 0.6) - 0.02 * Math.sin(t * W);
        o.scale.set(Math.hypot(halfW + 0.6, halfH + 0.2) * 1.05, aspect < 1 ? 1.4 : 2.2, 1);
      }
    },
  };
};

export const scene: ConceptScene = {
  colors: {
    light: ['#ffffff', '#3a3734', '0.55'],
    dark: ['#f2efe9', '#f2efe9', '0.16'],
  },
  build,
};
