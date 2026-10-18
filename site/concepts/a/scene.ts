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
  /* Where each pebble sits, as a share of the half-width/half-height seen at
     z = 0, and its scale. Wide screens: two pebbles frame the title from the
     sides, a third sits low right beside the headline. Phones: a small row in
     the band between the title card and the headline. Never behind either. */
  const hh = 9 * Math.tan((20 * Math.PI) / 180);
  const layout = (wide: boolean): [number, number, number][] =>
    wide
      ? [
          [-1.16, 0.32, 1],
          [1.12, 0.62, 1],
          [0.72, -0.62, 1],
        ]
      : [
          [-0.7, 0.42, 0.15],
          [0.72, 0.41, 0.16],
          [0.02, 0.4, 0.18],
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
      const aspect = (camera as THREE.PerspectiveCamera).aspect || 1.6;
      const wide = aspect > 1;
      const spot = layout(wide);
      meshes.forEach((m, i) => {
        const [fx, fy, k] = spot[i];
        (m.material as THREE.ShaderMaterial).uniforms.uTime.value = t + i * 3;
        m.scale.setScalar(k);
        m.position.x = fx * hh * aspect;
        m.position.z = wide ? spots[i][2] : 0;
        m.position.y = fy * hh + Math.sin(t * 0.5 + i * 2) * (wide ? 0.35 : 0.04);
        m.rotation.set(t * 0.1 + i, t * 0.13, 0);
      });
      camera.position.x = px * 0.8;
      camera.lookAt(0, 0, 0);
    },
  };
};

export const scene: ConceptScene = {
  colors: { light: ['#ff9a76', '#ffd166', '#a78bfa'], dark: ['#ff7a59', '#ffb84d', '#8b6cff'] },
  build: clay,
};
