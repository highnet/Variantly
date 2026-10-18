import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { Font, type FontData } from 'three/examples/jsm/loaders/FontLoader.js';

import { persp } from '@/components/backdrop/sceneKit';
import type { Built, ConceptScene } from '@/concepts/types';

import ribbon from './ribbon.json';

/*
 * r · Kinetic Type: "variantly" twice round a turning drum, extruded in
 * Climate Crisis (the title's own outline file, letters of the word only).
 * The drum steps an eighth of a turn every 3s, on the beat, and each letter
 * stretches wide as it swings past the front. 24s loop, one full turn.
 */
const WORD = 'variantly';
const STEPS = 8;
const BEAT = 24 / STEPS;

const build = (scene: THREE.Scene, colors: string[]): Built => {
  const camera = persp(12);
  scene.add(new THREE.AmbientLight('#ffffff', 1.7));
  const sun = new THREE.DirectionalLight('#ffffff', 1.6);
  sun.position.set(-3, 5, 8);
  scene.add(sun);
  const font = new Font(ribbon as unknown as FontData);
  const glyphs = new Map<string, { geo: THREE.BufferGeometry; adv: number }>();
  const glyph = (ch: string) => {
    let g = glyphs.get(ch);
    if (!g) {
      const geo = new TextGeometry(ch, { font, size: 1, depth: 0.28, curveSegments: 5 });
      geo.computeBoundingBox();
      const b = geo.boundingBox!;
      const adv = b.max.x - b.min.x + 0.12;
      geo.translate(-(b.min.x + b.max.x) / 2, -0.5, 0);
      g = { geo, adv };
      glyphs.set(ch, g);
    }
    return g;
  };
  const mat = (c: string) =>
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true });
  const ink = mat(colors[0]);
  const side = mat(colors[1]);
  const red = mat(colors[2]);
  const chars = [...WORD, ' ', ...WORD, ' '];
  const advs = chars.map((c) => (c === ' ' ? 0.7 : glyph(c).adv));
  const total = advs.reduce((a, b) => a + b, 0);
  const R = total / (Math.PI * 2);
  const drum = new THREE.Group();
  const letters: { mesh: THREE.Mesh; th: number }[] = [];
  let at = 0;
  chars.forEach((c, i) => {
    const th = ((at + advs[i] / 2) / total) * Math.PI * 2;
    at += advs[i];
    if (c === ' ') return;
    const mesh = new THREE.Mesh(glyph(c).geo, [i % 10 === 4 ? red : ink, side]);
    const holder = new THREE.Group();
    holder.rotation.y = th;
    mesh.position.z = R;
    holder.add(mesh);
    drum.add(holder);
    letters.push({ mesh, th });
  });
  // The ribbon's two rails.
  const railGeo = new THREE.TorusGeometry(R + 0.02, 0.025, 6, 96);
  const rail = new THREE.MeshBasicMaterial({ color: colors[1] });
  [-0.68, 0.68].forEach((y) => {
    const r = new THREE.Mesh(railGeo, rail);
    r.rotation.x = Math.PI / 2;
    r.position.y = y;
    drum.add(r);
  });
  const rig = new THREE.Group();
  rig.add(drum);
  rig.rotation.set(0.32, 0, -0.16);
  scene.add(rig);
  const hh = 12 * Math.tan((20 * Math.PI) / 180);
  return {
    camera,
    update: (t) => {
      const aspect = (camera as THREE.PerspectiveCamera).aspect || 1.6;
      const wide = aspect > 1;
      rig.position.set(wide ? hh * aspect * 0.5 : 0, wide ? -1.5 : -2.9, 0);
      rig.scale.setScalar(wide ? 1.15 : 0.62);
      // Step on the beat: a quick eased turn, then hold.
      const s = (((t % 24) + 24) % 24) / BEAT;
      const k = Math.floor(s);
      const f = Math.min(1, (s - k) / 0.32);
      const turn = ((k + 1 - (1 - f) ** 3) / STEPS) * Math.PI * 2;
      drum.rotation.y = -turn;
      letters.forEach(({ mesh, th }) => {
        const c = Math.cos(th - turn);
        // Only the near half of the ribbon: the far side would read mirrored.
        mesh.visible = c > -0.2;
        const front = Math.max(0, c);
        mesh.scale.set(1 + 0.75 * front ** 6, 1 - 0.12 * front ** 6, 1);
      });
    },
  };
};

export const scene: ConceptScene = {
  colors: {
    light: ['#0f0f0f', '#3c6e71', '#8c1c13'],
    dark: ['#efece6', '#5a9a9d', '#c0392b'],
  },
  build,
};
