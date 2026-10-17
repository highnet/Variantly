import * as THREE from 'three';

import { NOISE, persp } from '@/components/backdrop/sceneKit';
import type { Built, ConceptScene } from '@/concepts/types';

/* Glossy noise-displaced blobs drifting like soft clay. */
const clay = (scene: THREE.Scene, colors: string[]): Built => {
  const camera = persp(9);
  const mats = colors.map(
    (c) =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uCol: { value: new THREE.Color(c) } },
        vertexShader: `${NOISE}
uniform float uTime; varying vec3 vN; varying vec3 vV;
void main(){
  float d = n(normal*1.6 + uTime*0.25)*0.45;
  vec3 p = position + normal*d;
  vN = normalize(normalMatrix*normal);
  vec4 mv = modelViewMatrix*vec4(p,1.0); vV = -mv.xyz;
  gl_Position = projectionMatrix*mv;
}`,
        fragmentShader: `
uniform vec3 uCol; varying vec3 vN; varying vec3 vV;
void main(){
  vec3 N=normalize(vN); vec3 V=normalize(vV); vec3 L=normalize(vec3(-0.4,0.8,0.6));
  float dif = max(dot(N,L),0.0)*0.6+0.5;
  float spec = pow(max(dot(reflect(-L,N),V),0.0), 24.0)*0.6;
  float rim = pow(1.0-max(dot(N,V),0.0), 2.5)*0.35;
  gl_FragColor = vec4(uCol*dif + spec + rim, 1.0);
}`,
      }),
  );
  const spots: [number, number, number, number][] = [
    [-4.2, 1.4, 0, 1.5],
    [4.4, 1.9, -1, 1.2],
    [2.2, -2.2, 0.5, 0.9],
  ];
  const meshes = spots.map(([x, y, z, r], i) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 48), mats[i % mats.length]);
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  });
  return {
    camera,
    update: (t, px) => {
      meshes.forEach((m, i) => {
        (m.material as THREE.ShaderMaterial).uniforms.uTime.value = t + i * 3;
        m.position.y = spots[i][1] + Math.sin(t * 0.5 + i * 2) * 0.35;
        m.rotation.set(t * 0.1 + i, t * 0.13, 0);
      });
      camera.position.x = px * 0.8;
      camera.lookAt(0, 0, 0);
    },
  };
};

export const scene: ConceptScene = {
  colors: { light: ['#c4b5fd', '#99f6e4', '#fbcfe8'], dark: ['#7c5cff', '#22c3ee', '#ff5fa2'] },
  build: clay,
};
