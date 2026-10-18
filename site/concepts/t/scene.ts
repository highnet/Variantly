import * as THREE from 'three';

import { persp } from '@/components/backdrop/sceneKit';
import type { Built, ConceptScene } from '@/concepts/types';

/*
 * t · Stone & Linen: a few pebbles lying on the linen, seen from above, in
 * the corner the Backdrop leaves them. The light turns slowly (24s there and
 * back) and their shadows swing with it; one pebble hangs a little above the
 * cloth, its shadow loose and soft. Shadows are drawn by one transparent
 * plane's shader, no shadow maps.
 */
const N = 4;
// [x, y] offset from the cluster centre, radii, colour, lift above the cloth.
const STONES: [number, number, number, number, number, number][] = [
  [0, 0, 0.62, 0.44, 0, 0],
  [0.95, 0.42, 0.36, 0.28, 1, 0],
  [-0.78, 0.56, 0.3, 0.22, 2, 0],
  [0.52, 1.25, 0.34, 0.26, 3, 0.45],
];

const SHADOW_FRAG = /* glsl */ `
uniform vec4 uS[${N}]; uniform vec3 uL; uniform float uOp;
varying vec2 vP;
void main() {
  float a = 0.0;
  for (int i = 0; i < ${N}; i++) {
    vec4 s = uS[i];
    float lift = s.w;
    vec2 c = s.xy - uL.xy * (0.25 + lift) * 1.6;
    vec2 r = vec2(s.z, s.z * 0.72) * (1.0 + lift * 0.5);
    float d = length((vP - c) / r);
    float soft = 0.5 + lift * 1.5;
    a = max(a, (1.0 - smoothstep(1.0 - soft, 1.0 + soft, d)) * (1.0 - lift * 0.9));
    // Contact: a tight dark rim where a resting stone meets the cloth.
    if (lift < 0.01) a = max(a, (1.0 - smoothstep(0.82, 1.04, length((vP - s.xy) / r))) * 0.9);
  }
  gl_FragColor = vec4(0.16, 0.12, 0.08, a * uOp);
}`;

const pebble = (seed: number) => {
  const g = new THREE.IcosahedronGeometry(1, 4);
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n =
      Math.sin(v.x * 2.1 + seed) * Math.sin(v.y * 1.7 + seed * 2) * 0.05 +
      Math.sin(v.x * 5.3 + v.y * 4.1 + seed) * 0.012;
    v.multiplyScalar(1 + n);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
};

const build = (scene: THREE.Scene, colors: string[]): Built => {
  const camera = persp(12);
  // The last colour names the theme: night is a dimmer room.
  const dark = colors[4] === 'dark';
  scene.add(new THREE.HemisphereLight('#fff8ee', '#b8ab98', dark ? 0.55 : 1.1));
  const sun = new THREE.DirectionalLight('#fff3e2', dark ? 1.5 : 2.2);
  scene.add(sun);
  const cluster = new THREE.Group();
  const stones = STONES.map(([x, y, rx, ry, c], i) => {
    const m = new THREE.Mesh(
      pebble(i * 1.7 + 0.4),
      new THREE.MeshStandardMaterial({ color: colors[c], roughness: 0.92 }),
    );
    m.scale.set(rx, ry, Math.min(rx, ry) * 0.62);
    m.position.set(x, y, Math.min(rx, ry) * 0.62);
    m.rotation.z = i * 0.9;
    cluster.add(m);
    return m;
  });
  const uS = STONES.map(([x, y, rx, , , lift]) => new THREE.Vector4(x, y, rx, lift));
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 6),
    new THREE.ShaderMaterial({
      uniforms: {
        uS: { value: uS },
        uL: { value: new THREE.Vector3() },
        uOp: { value: dark ? 0.5 : 0.3 },
      },
      vertexShader:
        'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: SHADOW_FRAG,
      transparent: true,
      depthWrite: false,
    }),
  );
  shadow.position.set(0, 0.4, 0);
  shadow.geometry.translate(0, -0.4, 0);
  cluster.add(shadow);
  scene.add(cluster);
  const hh = 12 * Math.tan((20 * Math.PI) / 180);
  const L = new THREE.Vector3();
  return {
    camera,
    update: (t) => {
      const aspect = (camera as THREE.PerspectiveCamera).aspect || 1.6;
      const wide = aspect > 1;
      const hw = hh * aspect;
      // In the empty field right of the word, where the Backdrop's pebble lies.
      cluster.position.set(hw * (wide ? 0.66 : 0.42), -hh * (wide ? 0.04 : 0.24), 0);
      cluster.scale.setScalar(wide ? 0.72 : 0.5);
      const p = (t / 24) * Math.PI * 2;
      // The sun swings from upper left toward the top and back.
      const ang = 2.3 - 0.45 * (0.5 - 0.5 * Math.cos(p));
      L.set(Math.cos(ang), Math.sin(ang), 0.9).normalize();
      sun.position.copy(L).multiplyScalar(10).add(cluster.position);
      sun.target = cluster;
      (shadow.material as THREE.ShaderMaterial).uniforms.uL.value.copy(L);
      const f = stones[3];
      const lift = STONES[3][5] + 0.05 * Math.sin(p * 4);
      f.position.z = Math.min(STONES[3][2], STONES[3][3]) * 0.62 + lift;
      f.rotation.set(Math.sin(p * 2) * 0.08, Math.sin(p) * 0.1, 2.7 + Math.sin(p) * 0.05);
      uS[3].w = lift;
    },
  };
};

export const scene: ConceptScene = {
  colors: {
    light: ['#b9a48a', '#8f9c94', '#cfc5b6', '#a8957d', 'light'],
    dark: ['#7e6c58', '#77867c', '#5e554b', '#8a7862', 'dark'],
  },
  build,
};
