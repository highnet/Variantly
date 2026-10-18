import * as THREE from 'three';

/*
 * The title's photo studio: the environment every BSDF letter reflects. A
 * seamless sweep (a dark floor rising to a bright ceiling) with soft boxes:
 * a large key box in front and above the word, a broad fill behind the
 * camera (what flat, mirror-like fronts show), strip lights at either side,
 * a ceiling panel and a dim kicker below. Glossy letters (chrome, glass,
 * lacquer, candy) pick up the boxes as clean bright bars, the way product
 * photography lights type; rough ones just take the soft fill. Emitters run
 * above 1 so the prefiltered map keeps their punch (no tone mapping here).
 * Built once into a PMREM by the title (Letters3D) and disposed with it.
 */
export const studioScene = () => {
  const scene = new THREE.Scene();
  const disposables: { dispose: () => void }[] = [];

  // The sweep: a sphere seen from inside, coloured by height.
  const sweep = new THREE.SphereGeometry(20, 48, 24);
  const pos = sweep.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const floor = new THREE.Color('#25262b');
  const horizon = new THREE.Color('#8b8f97');
  const ceiling = new THREE.Color('#dfe2e7');
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getY(i) / 20;
    if (t < 0) c.copy(horizon).lerp(floor, Math.min(1, -t * 1.6));
    else c.copy(horizon).lerp(ceiling, Math.min(1, t * 1.3));
    c.toArray(colors, i * 3);
  }
  sweep.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const sweepMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide });
  scene.add(new THREE.Mesh(sweep, sweepMat));
  disposables.push(sweep, sweepMat);

  // Soft boxes: [width, height, position, intensity].
  const box = (w: number, h: number, at: [number, number, number], k: number) => {
    const g = new THREE.PlaneGeometry(w, h);
    const m = new THREE.MeshBasicMaterial({
      color: new THREE.Color(1, 1, 1).multiplyScalar(k),
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(...at);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
    disposables.push(g, m);
  };
  box(9, 5, [-3, 6, 11], 6); // key: in front, above, a little left
  // Fill behind the camera: flat letter fronts reflect straight back, so this
  // is what a mirror face shows (bright silver, not the grey sweep).
  box(18, 5, [0, -0.5, 14], 1.7);
  box(2.2, 12, [-12, 1, 4], 3.5); // strip, left
  box(2.2, 12, [12, 0, 5], 2.5); // strip, right
  box(10, 6, [0, 15, 0], 2.2); // ceiling
  box(14, 1.2, [0, -6, 10], 0.9); // kicker below

  return { scene, dispose: () => disposables.forEach((d) => d.dispose()) };
};
