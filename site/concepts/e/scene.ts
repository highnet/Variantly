import * as THREE from 'three';

import type { Built, ConceptScene } from '@/concepts/types';

/* Flat-shaded primitives in an orthographic still life. */
const bauhaus = (scene: THREE.Scene, colors: string[]): Built => {
  const camera = new THREE.OrthographicCamera(-8, 8, 5, -5, 0.1, 100);
  camera.position.set(0, 0, 20);
  scene.add(new THREE.AmbientLight('#ffffff', 1.4));
  const sun = new THREE.DirectionalLight('#ffffff', 2.2);
  sun.position.set(-3, 5, 6);
  scene.add(sun);
  const mat = (c: string) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
  const cube = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2.4), mat(colors[0]));
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1.5, 24, 16), mat(colors[1]));
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.8, 3), mat(colors[2]));
  cube.position.set(4.2, 1.8, 0);
  ball.position.set(6.4, -1.8, 0);
  cone.position.set(2.2, -2.4, 0);
  scene.add(cube, ball, cone);
  return {
    camera,
    update: (t, px) => {
      cube.rotation.set(t * 0.3, t * 0.4 + px, 0);
      ball.position.y = -1.8 + Math.sin(t * 0.8) * 0.5;
      cone.rotation.set(0.3, t * 0.5, Math.sin(t * 0.4) * 0.3);
    },
  };
};

export const scene: ConceptScene = {
  colors: { light: ['#e63946', '#1d4ed8', '#ffc300'], dark: ['#e63946', '#3b6cff', '#ffc300'] },
  build: bauhaus,
};
