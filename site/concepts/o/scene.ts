import * as THREE from 'three';

import type { Built, ConceptScene } from '@/concepts/types';

/*
 * o · Swiss Punk: monumental letter slabs (V A N T Y, squared grotesk cut from
 * polygons) standing on a hairline grid floor, cropping each other. Each one
 * holds, then makes a hard quarter turn: four per 24s, a full turn per loop.
 */
const TAU = Math.PI * 2;

// Glyphs on a 5-unit cap height, as "x y x y ..." outlines; "|" starts a counter.
const GLYPHS: Record<string, string> = {
  V: '0 5 1.5 5 2.3 1.8 3.1 5 4.6 5 3.05 0 1.55 0',
  A: '0 0 1.6 5 3 5 4.6 0 3.2 0 2.92 1 1.68 1 1.4 0 | 1.98 2.1 2.62 2.1 2.3 3.3',
  N: '0 0 0 5 1.3 5 2.5 2.3 2.5 5 3.8 5 3.8 0 2.5 0 1.3 2.7 1.3 0',
  T: '0 5 4.2 5 4.2 3.75 2.75 3.75 2.75 0 1.45 0 1.45 3.75 0 3.75',
  Y: '0 5 1.5 5 2.3 3.3 3.1 5 4.6 5 2.95 2.3 2.95 0 1.65 0 1.65 2.3',
};

const points = (s: string) => {
  const n = s.trim().split(/\s+/).map(Number);
  return Array.from({ length: n.length / 2 }, (_, i) => new THREE.Vector2(n[2 * i], n[2 * i + 1]));
};

const slab = (ch: string) => {
  const [outline, ...holes] = GLYPHS[ch].split('|');
  const shape = new THREE.Shape(points(outline));
  for (const h of holes) shape.holes.push(new THREE.Path(points(h)));
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 1.1,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.06,
    bevelSegments: 1,
  });
  geo.computeBoundingBox();
  const box = geo.boundingBox!;
  // Pivot about the slab's own vertical centre line, standing on y = 0.
  geo.translate(-(box.max.x + box.min.x) / 2, -box.min.y, -(box.max.z + box.min.z) / 2);
  return geo;
};

// [glyph, x, z, colour index, phase (s), turn direction]
const ROW: [string, number, number, number, number, number][] = [
  ['V', -7.5, -3, 0, 0, 1],
  ['A', -2.6, 0, 1, 1.5, -1],
  ['N', 2.2, -2, 2, 3, 1],
  ['T', 6.6, 1, 0, 4.5, -1],
  ['Y', 11, -1.5, 1, 0.75, 1],
];

// Quarter turn index at time t: hold, then a hard 0.5s turn at each 6s mark.
const turns = (t: number) => {
  const k = t / 6;
  const f = (k - Math.floor(k)) * 12;
  const e = f < 1 ? f * f * (3 - 2 * f) : 1;
  return Math.floor(k) + e;
};

const build = (scene: THREE.Scene, colors: string[]): Built => {
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);
  scene.add(new THREE.AmbientLight('#ffffff', 1.5));
  const sun = new THREE.DirectionalLight('#ffffff', 2);
  sun.position.set(-6, 10, 8);
  scene.add(sun);

  const mats = colors
    .slice(0, 2)
    .map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.62, flatShading: true }));
  const slabs = ROW.map(([ch, x, z, c]) => {
    const m = new THREE.Mesh(slab(ch), mats[Math.min(c, 1)]);
    m.position.set(x, 0, z);
    scene.add(m);
    return m;
  });
  const grid = new THREE.GridHelper(60, 30, colors[3], colors[3]);
  scene.add(grid);

  return {
    camera,
    update: (t) => {
      slabs.forEach((m, i) => {
        const [, , , , phase, dir] = ROW[i];
        m.rotation.y = (dir * (turns(t + phase) * TAU)) / 4 + 0.35 * dir;
      });
      const narrow = camera.aspect < 1;
      // Low and close: the slabs loom and crop each other at the right edge. Phones
      // see the row from further back, up behind the title, all in grey.
      // Wide: the row is pushed right, past the title's column, and kept grey;
      // the oxblood stays in the flat bars.
      // Both stay clear of the title: wide screens push the row further right
      // and down; phones see it small in the band under the title card.
      camera.position.set(narrow ? 2 : -9, narrow ? 1 : 1.6, narrow ? 110 : 18);
      camera.lookAt(narrow ? 2 : -13, narrow ? -12.5 : 5.4, 0);
    },
  };
};

export const scene: ConceptScene = {
  colors: {
    light: ['#d9d5cc', '#c7c2b8', '#8c1c13', '#c9c4ba'],
    dark: ['#2a2826', '#353330', '#c0392b', '#2e2c29'],
  },
  build,
};
