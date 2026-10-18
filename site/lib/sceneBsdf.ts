import * as THREE from 'three';

import { studioScene } from '@/lib/studioEnv';

/*
 * Background scenes in the title's light world. A concept scene's lit meshes
 * (MeshStandardMaterial, MeshLambertMaterial) are rebuilt as the Principled
 * BSDF (MeshPhysicalMaterial) after the scene is built, keeping their colour,
 * maps, opacity, sides and shading, with a faint clear coat so the studio's
 * soft boxes catch on them; the scene then reflects the same photo studio as
 * the 3D title (lib/studioEnv). Hand-written shaders (most scenes' stylised
 * art) are left exactly as authored. Returns a disposer, or null when the
 * scene has nothing lit to upgrade (no environment is built then).
 */
const physical = (m: THREE.MeshStandardMaterial | THREE.MeshLambertMaterial) => {
  const std = m instanceof THREE.MeshStandardMaterial ? m : null;
  const p = new THREE.MeshPhysicalMaterial({
    color: m.color,
    map: m.map,
    vertexColors: m.vertexColors,
    transparent: m.transparent,
    opacity: m.opacity,
    side: m.side,
    flatShading: m.flatShading,
    emissive: m.emissive,
    emissiveMap: m.emissiveMap,
    emissiveIntensity: m.emissiveIntensity,
    alphaTest: m.alphaTest,
    depthWrite: m.depthWrite,
    wireframe: m.wireframe,
    fog: m.fog,
    roughness: std ? std.roughness : 0.72,
    metalness: std ? std.metalness : 0,
    roughnessMap: std?.roughnessMap ?? null,
    normalMap: std?.normalMap ?? null,
    clearcoat: std ? 0.25 : 0.15,
    clearcoatRoughness: 0.35,
  });
  p.name = m.name;
  return p;
};

export const sceneBsdf = (renderer: THREE.WebGLRenderer, scene: THREE.Scene) => {
  const swapped: THREE.Material[] = [];
  const done = new Map<THREE.Material, THREE.Material>();
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const swap = (m: THREE.Material) => {
      if (!(m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshLambertMaterial))
        return m;
      // MeshPhysicalMaterial extends MeshStandardMaterial: already upgraded.
      if (m instanceof THREE.MeshPhysicalMaterial) return m;
      let p = done.get(m);
      if (!p) {
        p = physical(m);
        done.set(m, p);
        swapped.push(m);
      }
      return p;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
  });
  if (!done.size) return null;
  swapped.forEach((m) => m.dispose());
  const pmrem = new THREE.PMREMGenerator(renderer);
  const studio = studioScene();
  const env = pmrem.fromScene(studio.scene, 0.02).texture;
  studio.dispose();
  pmrem.dispose();
  scene.environment = env;
  scene.environmentIntensity = 0.6;
  return () => {
    env.dispose();
    done.forEach((p) => p.dispose());
  };
};
