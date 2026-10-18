import * as THREE from 'three';

import { persp } from '@/components/backdrop/sceneKit';
import type { Built, ConceptScene } from '@/concepts/types';

/*
 * j · Instrument OS: an exploded view of a little synth. The screen, knobs
 * and keys lift off the aluminium body and settle back once per 24s (fully
 * apart at t=6, the poster); the knobs click round a detent every 3s.
 */
const TAU = Math.PI * 2;

// colors: [body, screen, rust, grey, teal, key]
const build = (scene: THREE.Scene, colors: string[]): Built => {
  const camera = persp(13);
  scene.add(new THREE.HemisphereLight('#ffffff', '#6b665e', 1.6));
  const sun = new THREE.DirectionalLight('#ffffff', 2.2);
  sun.position.set(-4, 8, 6);
  scene.add(sun);
  const mat = (c: string, rough = 0.55, metal = 0) =>
    new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal });

  const unit = new THREE.Group();
  scene.add(unit);
  const body = new THREE.Mesh(new THREE.BoxGeometry(6, 0.55, 3.4), mat(colors[0], 0.45, 0.35));
  unit.add(body);

  // Each part: mesh, its seat on the body, how far it lifts, and a drift.
  const parts: { m: THREE.Object3D; seat: THREE.Vector3; lift: number; drift: THREE.Vector3 }[] =
    [];
  const seat = (m: THREE.Object3D, x: number, z: number, lift: number, dx = 0, dz = 0) => {
    const s = new THREE.Vector3(x, 0.32, z);
    m.position.copy(s);
    unit.add(m);
    parts.push({ m, seat: s, lift, drift: new THREE.Vector3(dx, 0, dz) });
  };

  const screen = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.1, 1.15), mat(colors[1], 0.25));
  seat(screen, -1.5, -0.8, 2.4, -0.3, -0.4);
  const knobs = [2, 3, 4].map((c, i) => {
    const knob = new THREE.Group();
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.4, 0.38, 28),
      mat(colors[c], 0.8),
    );
    const mark = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.26), mat('#ffffff', 0.5));
    cap.position.y = 0.19;
    mark.position.set(0, 0.4, -0.18);
    knob.add(cap, mark);
    seat(knob, 0.55 + i * 1.05, -0.85, 3.1 - i * 0.35, 0.2 * i, -0.3);
    return knob;
  });
  for (let i = 0; i < 8; i++) {
    const key = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.22, 0.62),
      mat(i === 5 ? colors[2] : colors[i % 3 === 1 ? 3 : 5], 0.75),
    );
    seat(key, -2.45 + i * 0.7, 0.85, 1.1 + (i % 4) * 0.28, 0, 0.35);
  }

  return {
    camera,
    update: (t) => {
      // Apart at t=6, together at t=18.
      const e = 0.5 + 0.5 * Math.sin((TAU * t) / 24);
      for (const p of parts) {
        p.m.position.set(p.seat.x + p.drift.x * e, p.seat.y + p.lift * e, p.seat.z + p.drift.z * e);
      }
      // One detent per 3s with a short springy settle: 8 clicks = one turn.
      const k = t / 3;
      const f = k - Math.floor(k);
      const snap = f < 0.12 ? 1 + Math.sin((f / 0.12) * Math.PI) * 0.18 - (1 - f / 0.12) : 1;
      knobs.forEach((knob, i) => {
        knob.rotation.y = -(Math.floor(k) + snap) * (TAU / 8) * (i === 1 ? -1 : 1);
      });
      const narrow = camera instanceof THREE.PerspectiveCamera && camera.aspect < 1;
      // Desktop: up in the empty top-right corner, clear of the title. Phones:
      // smaller, in the band between the title card and the headline.
      unit.position.set(narrow ? 0.9 : 5.6, narrow ? 2.2 : 3.3, narrow ? -4 : -1);
      unit.scale.setScalar(narrow ? 0.24 : 0.42);
      unit.rotation.set(0.62, -0.55 + 0.18 * Math.sin((TAU * t) / 24), 0.08);
    },
  };
};

export const scene: ConceptScene = {
  colors: {
    light: ['#d4d1ca', '#1c1b19', '#c4462a', '#9a978f', '#3c6e71', '#2a2926'],
    dark: ['#4a4946', '#050505', '#e0583a', '#6a6863', '#5a9a9d', '#1f1e1c'],
  },
  build,
};
