import * as THREE from 'three';

import { NOISE } from '@/components/backdrop/sceneKit';
import type { Built, ConceptScene } from '@/concepts/types';

/* A wireframe landscape, like a 1970s vector display. */
const terrain = (scene: THREE.Scene, colors: string[]): Built => {
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, -9, 2.6);
  camera.lookAt(0, 2, 0);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { uTime: { value: 0 }, uCol: { value: new THREE.Color(colors[0]) } },
    vertexShader: `${NOISE}
uniform float uTime; varying vec2 vUv; varying float vD;
void main(){
  vUv = uv; vec3 p = position;
  float e = n(vec3(p.x*0.3, p.y*0.3 - uTime*0.25, 0.0))*2.2 * smoothstep(0.0,6.0,abs(p.x));
  p.z += e;
  vec4 mv = modelViewMatrix*vec4(p,1.0); vD = -mv.z;
  gl_Position = projectionMatrix*mv;
}`,
    fragmentShader: `
uniform vec3 uCol; varying vec2 vUv; varying float vD;
void main(){
  vec2 g = abs(fract(vUv*vec2(48.0,36.0))-0.5);
  float line = 1.0 - smoothstep(0.0, 0.06, min(g.x,g.y));
  float fade = 1.0 - smoothstep(6.0, 24.0, vD);
  if (line*fade < 0.02) discard;
  gl_FragColor = vec4(uCol, line*fade);
}`,
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(30, 30, 120, 120), mat);
  plane.position.y = 8;
  scene.add(plane);
  return {
    camera,
    update: (t, px) => {
      mat.uniforms.uTime.value = t;
      camera.position.x = px * 1.2;
    },
  };
};

export const scene: ConceptScene = {
  colors: { light: ['#1f6f6a'], dark: ['#ffb000'] },
  build: terrain,
};
