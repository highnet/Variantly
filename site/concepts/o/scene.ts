import * as THREE from 'three';

import { persp } from '@/components/backdrop/sceneKit';
import type { Built, ConceptScene } from '@/concepts/types';

/* o · Swiss Punk: placeholder scene (two nested wireframe solids). */
const build = (scene: THREE.Scene, colors: string[]): Built => {
  const camera = persp(9);
  const outer = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(2.4, 1)),
    new THREE.LineBasicMaterial({ color: colors[0] }),
  );
  const inner = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.OctahedronGeometry(1.2)),
    new THREE.LineBasicMaterial({ color: colors[1] }),
  );
  const group = new THREE.Group();
  group.add(outer, inner);
  group.position.set(3.6, 0.4, 0);
  scene.add(group);
  return {
    camera,
    update: (t, px) => {
      // 24s loop: one full turn of the outer solid.
      const a = (t / 24) * Math.PI * 2;
      outer.rotation.set(a, a + px, 0);
      inner.rotation.set(-a * 2, -a, 0);
    },
  };
};

export const scene: ConceptScene = {
  colors: { light: ['#8c1c13', '#bdb8ae'], dark: ['#c0392b', '#3a3835'] },
  build,
};
