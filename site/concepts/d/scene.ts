import * as THREE from 'three';

import { persp } from '@/components/backdrop/sceneKit';
import type { Built, ConceptScene } from '@/concepts/types';

/* Nested wireframe solids spinning, zine-cover style. */
const wire = (scene: THREE.Scene, colors: string[]): Built => {
  const camera = persp(9);
  const outer = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(2.6, 1)),
    new THREE.LineBasicMaterial({ color: colors[0] }),
  );
  const inner = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.OctahedronGeometry(1.3)),
    new THREE.LineBasicMaterial({ color: colors[1] }),
  );
  const group = new THREE.Group();
  group.add(outer, inner);
  group.position.set(3.6, 0.4, 0);
  scene.add(group);
  return {
    camera,
    update: (t, px) => {
      outer.rotation.set(t * 0.3, t * 0.4 + px, 0);
      inner.rotation.set(-t * 0.6, -t * 0.5, t * 0.2);
    },
  };
};

export const scene: ConceptScene = {
  colors: { light: ['#0a0a0a', '#ff3d00'], dark: ['#c6ff00', '#ff3d00'] },
  build: wire,
};
