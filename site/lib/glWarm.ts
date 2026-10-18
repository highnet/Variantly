import type * as THREE from 'three';

/*
 * Shader warm-up help for the three.js layers. renderer.compileAsync builds
 * a scene's programs without drawing; where the GPU compiles in parallel
 * (KHR_parallel_shader_compile) it resolves only once they have linked, so
 * the first draw costs nothing more. Where it cannot, a program's first draw
 * still waits for its whole link: firstDraw draws the scene once into a
 * single pixel (scissored), so that wait lands here, ahead of time.
 */

export const compilesInParallel = (renderer: THREE.WebGLRenderer) =>
  renderer.extensions.has('KHR_parallel_shader_compile');

// Draws `scene` into the canvas's bottom-left pixel, shadows untouched. The
// canvas must be repainted in full afterwards (in the same task), or the
// page shows a frame holding only that pixel.
export const firstDraw = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Object3D,
  camera: THREE.Camera,
) => {
  const shadows = renderer.shadowMap.autoUpdate;
  renderer.shadowMap.autoUpdate = false;
  renderer.setScissorTest(true);
  renderer.setScissor(0, 0, 1, 1);
  renderer.render(scene, camera);
  renderer.setScissorTest(false);
  renderer.shadowMap.autoUpdate = shadows;
};
