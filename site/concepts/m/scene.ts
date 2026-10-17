import * as THREE from 'three';

import { persp } from '@/components/backdrop/sceneKit';
import type { Built, ConceptScene } from '@/concepts/types';

import { plaster } from './plaster';

/*
 * m · Uncanny Mirror: oversized plaster forms (a cracked sphere, a broken
 * column) standing on the backdrop's mirror floor. Each has a reflection: the same body flipped
 * under the floor, recoloured as another variant and turning half a second
 * (a beat at 120bpm) behind the object. The camera is pitched so the floor's
 * horizon lands on the backdrop's (58% down).
 */
const FLOOR = -1;
// Pitch that puts the horizon at `h` (fraction of the height from the top),
// matching --lm-h in concept.css: 58%, or 36% under 640px.
const pitchFor = (h: number) => Math.atan((2 * h - 1) * Math.tan((20 * Math.PI) / 180));

type Form = {
  body: THREE.Object3D;
  ghost: THREE.Object3D;
  x: number;
  spin: number;
};

const build = (scene: THREE.Scene, colors: string[]): Built => {
  const [col, shade, lie, lie2, lieShade] = colors;
  const camera = persp(12);
  const solid = plaster({ col, shade, scale: 0.8 });
  const ghostMat = (c: string) =>
    plaster({
      col: c,
      shade: lieShade,
      scale: 0.8,
      reflection: true,
      world: true,
      floor: FLOOR,
      fade: 0.55,
      alpha: 0.75,
    });
  const liar = ghostMat(lie);
  const liar2 = ghostMat(lie2);

  // Each form is built standing on y = 0, then lifted onto the floor.
  const sphere = new THREE.Mesh(new THREE.IcosahedronGeometry(2.6, 14), solid);
  sphere.position.y = 2.6;
  const column = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 3.6, 40, 1), solid);
  shaft.position.y = 2.2;
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.4, 1.7), solid);
  plinth.position.y = 0.2;
  // A broken top: tilted slab.
  const cap = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.35, 1.5), solid);
  cap.position.set(0.1, 4.15, 0);
  cap.rotation.z = 0.12;
  column.add(shaft, plinth, cap);
  column.scale.setScalar(1.4);
  const mirrored = (o: THREE.Object3D, mat: THREE.Material) => {
    const g = o.clone(true);
    g.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) (c as THREE.Mesh).material = mat;
    });
    return g;
  };
  const forms: Form[] = [
    { body: sphere, ghost: mirrored(sphere, liar), x: -12, spin: 1 },
    { body: column, ghost: mirrored(column, liar2), x: 14, spin: -1 },
  ];
  const depth = [-14, -18];
  forms.forEach((f, i) => {
    // A ghost is its body flipped about the floor.
    const wrapB = new THREE.Group();
    wrapB.add(f.body);
    wrapB.position.set(f.x, FLOOR, depth[i]);
    const wrapG = new THREE.Group();
    wrapG.add(f.ghost);
    wrapG.scale.y = -1;
    wrapG.position.set(f.x, FLOOR, depth[i]);
    wrapG.renderOrder = -1;
    scene.add(wrapB, wrapG);
    f.body = wrapB;
    f.ghost = wrapG;
  });
  return {
    camera,
    update: (t) => {
      // Narrow screens pull the forms in toward the middle.
      camera.rotation.x = pitchFor(innerWidth < 640 ? 0.36 : 0.58);
      const aspect = (camera as THREE.PerspectiveCamera).aspect || 1.6;
      const spread = Math.min(1, Math.max(0.42, aspect / 1.6));
      const turn = (s: number) => ((s % 24) / 24) * Math.PI * 2;
      forms.forEach((f, i) => {
        const x = f.x * spread;
        f.body.position.x = f.ghost.position.x = x;
        // Portrait phones keep only the sphere: the column would be cut off.
        f.body.visible = f.ghost.visible = i === 0 || aspect > 0.9;
        // Slow and dreamlike; the reflection lags by one beat.
        f.body.rotation.y = turn(t) * f.spin + i;
        f.ghost.rotation.y = turn(t - 0.5) * f.spin + i;
      });
    },
  };
};

export const scene: ConceptScene = {
  // plaster, plaster shade, reflection (lie), second lie, reflection shade
  colors: {
    light: ['#f4f1ea', '#a9a7b4', '#9a82e0', '#ffb59a', '#5b4a91'],
    dark: ['#c9cdd6', '#3c3f4a', '#9a82e0', '#ff9a76', '#2a2244'],
  },
  build,
};
