import * as THREE from 'three';

export type { Built } from '@/concepts/types';

/* Shared helpers for concept scenes (concepts/<id>/scene.ts). */

export const NOISE = /* glsl */ `
float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }
float n(vec3 p){
  vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);
}`;

export const persp = (z = 8) => {
  const c = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  c.position.set(0, 0, z);
  return c;
};
