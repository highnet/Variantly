import * as THREE from 'three';

import { persp } from '@/components/backdrop/sceneKit';
import type { Built, ConceptScene } from '@/concepts/types';

/* A torus knot printed as screen-space halftone dots in one ink. */
const halftone = (scene: THREE.Scene, colors: string[]): Built => {
  const camera = persp(10);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { uCol: { value: new THREE.Color(colors[0]) } },
    vertexShader: `varying vec3 vN; void main(){ vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
uniform vec3 uCol; varying vec3 vN;
void main(){
  float l = max(dot(normalize(vN), normalize(vec3(-0.5,0.7,0.6))),0.0);
  vec2 g = gl_FragCoord.xy / 7.0;
  mat2 r = mat2(0.966,-0.259,0.259,0.966); g = r*g;
  float d = length(fract(g)-0.5);
  float rad = (1.0-l)*0.62 + 0.08;
  if (d > rad) discard;
  gl_FragColor = vec4(uCol, 0.9);
}`,
  });
  const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(2.1, 0.62, 260, 40, 2, 3), mat);
  knot.position.set(3.2, 0.6, 0);
  scene.add(knot);
  return {
    camera,
    update: (t, px) => {
      knot.rotation.set(t * 0.15, t * 0.22 + px * 0.6, 0);
    },
  };
};

export const scene: ConceptScene = {
  colors: { light: ['#2f5bff'], dark: ['#ff4f9a'] },
  build: halftone,
};
