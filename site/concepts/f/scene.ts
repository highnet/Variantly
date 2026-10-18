import * as THREE from 'three';

import { persp } from '@/components/backdrop/sceneKit';
import type { Built, ConceptScene } from '@/concepts/types';

/* Paper scraps (sheets, folded corners, triangles) drifting and turning. */
const paper = (scene: THREE.Scene, colors: string[]): Built => {
  const camera = persp(12);
  scene.add(new THREE.AmbientLight('#ffffff', 1.6));
  const sun = new THREE.DirectionalLight('#ffffff', 1.8);
  sun.position.set(-4, 6, 8);
  scene.add(sun);
  // A sheet folded once down its middle, so it catches light on two faces.
  const folded = (w: number, h: number, fold: number) => {
    const g = new THREE.BufferGeometry();
    const x = w / 2;
    const v = [
      -x,
      -h / 2,
      0,
      0,
      -h / 2,
      fold,
      0,
      h / 2,
      fold,
      -x,
      h / 2,
      0,
      x,
      -h / 2,
      0,
      x,
      h / 2,
      0,
    ];
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    g.setIndex([0, 1, 2, 0, 2, 3, 1, 4, 5, 1, 5, 2]);
    g.computeVertexNormals();
    return g;
  };
  const tri = new THREE.BufferGeometry();
  tri.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([-1, -0.8, 0, 1.1, -0.6, 0, 0, 1, 0], 3),
  );
  tri.computeVertexNormals();
  // Wide screens: scraps frame the title from the sides, above and below it,
  // clear of the headline.
  const shapes: [THREE.BufferGeometry, number, number, number, number][] = [
    [folded(2.6, 3.4, 0.5), -7.6, 2.2, -1, 0],
    [folded(2, 2.6, -0.4), 7.6, 2.8, -2, 1],
    [tri, 4.8, -2.6, 0, 2],
    [folded(1.6, 2, 0.3), -6.6, -0.6, 0.5, 3],
    [tri, -1.5, 4.6, -3, 1],
    [folded(1.2, 1.6, -0.3), 1.8, -3.8, -1, 0],
  ];
  // Phones: a small row in the band between the title card and the headline
  // (x as a share of the half-width).
  const hh = 12 * Math.tan((20 * Math.PI) / 180);
  const row = [-0.8, 0.8, 0.48, -0.48, 0.16, -0.16];
  const meshes = shapes.map(([geo, x, y, z, c]) => {
    const m = new THREE.Mesh(
      geo,
      new THREE.MeshLambertMaterial({
        color: colors[c % colors.length],
        side: THREE.DoubleSide,
        flatShading: true,
      }),
    );
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  });
  return {
    camera,
    update: (t, px) => {
      const aspect = (camera as THREE.PerspectiveCamera).aspect || 1.6;
      const wide = aspect > 1;
      meshes.forEach((m, i) => {
        const [, x, y, z] = shapes[i];
        const sx = wide ? x : row[i] * hh * aspect;
        const sy = wide ? y : 0.45 * hh;
        const k = wide ? 1 : 0.26;
        m.scale.setScalar(k);
        m.position.z = wide ? z : 0;
        m.position.x = sx + Math.sin(t * 0.2 + i) * 0.3 * k;
        m.position.y = sy + Math.sin(t * 0.35 + i * 1.7) * 0.4 * k;
        m.rotation.set(
          0.4 + Math.sin(t * 0.3 + i) * 0.5,
          t * 0.25 + i,
          Math.sin(t * 0.2 + i * 2) * 0.4,
        );
      });
      camera.position.x = px * 1.2;
      camera.lookAt(0, 0, 0);
    },
  };
};

export const scene: ConceptScene = {
  colors: {
    light: ['#fbf7ee', '#e5322d', '#2346c8', '#f2c94c'],
    dark: ['#f3ead6', '#ff5a4f', '#4a6cf0', '#f2c94c'],
  },
  build: paper,
};
