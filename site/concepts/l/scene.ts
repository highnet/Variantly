import * as THREE from 'three';

import { persp } from '@/components/backdrop/sceneKit';
import type { Built, ConceptScene } from '@/concepts/types';

import { chrome } from './chrome';

/*
 * l · Inflated Chrome: puffy chrome starbursts and a fat chrome ring orbiting
 * the title, over the backdrop's wireframe floor (which they reflect). Every
 * motion is a whole number of turns per 24s; glints pulse on a 120bpm grid.
 */

// A sphere squeezed into a four-point balloon star (built once, on the CPU).
const starGeo = (spikes: number) => {
  const g = new THREE.SphereGeometry(1, 64, 40);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const a = Math.atan2(v.y, v.x);
    const k = 0.42 + 0.58 * Math.pow(Math.abs(Math.cos((a * spikes) / 2)), 5);
    v.x *= k;
    v.y *= k;
    v.z *= 0.42 + 0.2 * k;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
};

type Orbiter = {
  mesh: THREE.Mesh;
  at: [number, number, number];
  r: number;
  turns: number;
  phase: number;
};

const build = (scene: THREE.Scene, colors: string[]): Built => {
  const camera = persp(10);
  const dark = colors[0] === 'dark';
  const mat = chrome({ dark, grid: 1.1 });
  const star4 = starGeo(4);
  const ring = new THREE.TorusGeometry(0.62, 0.34, 32, 72);
  const orbiters: Orbiter[] = [
    { mesh: new THREE.Mesh(star4, mat), at: [-6.4, 0.6, -1], r: 0.3, turns: 1, phase: 0 },
    { mesh: new THREE.Mesh(ring, mat), at: [6.6, 2.2, -1.5], r: 0.35, turns: -1, phase: 2 },
    { mesh: new THREE.Mesh(star4, mat), at: [1.6, -1.15, 0.5], r: 0.2, turns: 2, phase: 4 },
    { mesh: new THREE.Mesh(star4, mat), at: [-2.4, 2.9, -2], r: 0.25, turns: -1, phase: 1 },
  ];
  const sizes = [1.05, 0.8, 0.42, 0.55];
  orbiters.forEach((o, i) => {
    o.mesh.scale.setScalar(sizes[i]);
    scene.add(o.mesh);
  });
  return {
    camera,
    update: (t) => {
      const a = (t / 24) * Math.PI * 2;
      orbiters.forEach((o, i) => {
        const [x, y, z] = o.at;
        o.mesh.position.set(
          x + Math.cos(a * o.turns + o.phase) * o.r,
          y + Math.sin(a * o.turns + o.phase) * o.r,
          z,
        );
        // Bouncy inflation: a squash on every other beat (120bpm, 0.5s).
        const beat = Math.pow(Math.max(0, Math.cos(t * Math.PI * 2)), 8) * 0.06;
        o.mesh.scale.set(sizes[i] * (1 + beat), sizes[i] * (1 - beat), sizes[i]);
        o.mesh.rotation.set(Math.sin(a + i) * 0.5, a * o.turns, a * o.turns * (i % 2 ? 1 : 0));
      });
    },
  };
};

export const scene: ConceptScene = {
  // The chrome reads the theme from the first entry; the world is in chrome.ts.
  colors: { light: ['light', '#c6ff00'], dark: ['dark', '#c6ff00'] },
  build,
};
