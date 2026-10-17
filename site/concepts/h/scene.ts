import * as THREE from 'three';

import type { Built, ConceptScene } from '@/concepts/types';

/*
 * h · Dither Machine: a low-poly range printed 1-bit. Every fragment is one
 * ink or nothing, by an ordered Bayer 4×4 threshold on its facet's light, so
 * each facet reads as one tone of pattern; a light band steps across the
 * screen through the dither. An orthographic camera turns once around the
 * range per 24s, in 48 held frames.
 */
const FRAMES = 48;

// [x, z, radius, height, sides, turn]
const PEAKS: [number, number, number, number, number, number][] = [
  [0, 0, 1.9, 4.2, 6, 0.3],
  [-2.2, 0.8, 1.5, 2.8, 5, 1.1],
  [2.0, -0.6, 1.6, 3.2, 5, 0.6],
  [-0.9, -2.0, 1.3, 2.2, 6, 2.0],
  [1.2, 2.0, 1.2, 1.9, 5, 0.2],
  [-2.8, -1.4, 1.0, 1.5, 5, 0.9],
  [3.0, 1.6, 0.9, 1.3, 6, 1.7],
];

const VERT = /* glsl */ `
varying vec3 vW; varying vec3 vV;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vec4 mv = viewMatrix * w; vV = mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
uniform vec3 uCol; uniform float uSweep; uniform float uCell; uniform float uDark; uniform float uGround;
varying vec3 vW; varying vec3 vV;
float b2(vec2 a){ a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bayer(vec2 a){ return b2(0.5 * a) * 0.25 + b2(a); }
void main(){
  vec3 n = normalize(cross(dFdx(vW), dFdy(vW)));
  float lit = clamp(dot(n, normalize(vec3(-0.6, 0.55, 0.45))), 0.0, 1.0);
  float tone = 0.22 + 0.9 * lit;
  // The light band, in screen space.
  float band = vV.x - uSweep;
  tone += 0.6 * exp(-band * band * 0.7);
  // Light theme inks the shade; dark theme inks the light.
  float dens = clamp(mix(1.0 - tone, tone * 0.58, uDark), 0.07, 0.78);
  // The ground: a sparse tone fading out at its rim.
  dens = mix(dens, 0.1 * (1.0 - smoothstep(2.6, 4.4, length(vW.xz))), uGround);
  if (dens <= bayer(gl_FragCoord.xy / uCell) + 0.01) discard;
  gl_FragColor = vec4(uCol, 1.0);
  #include <colorspace_fragment>
}`;

const build = (scene: THREE.Scene, colors: string[]): Built => {
  const dark = new THREE.Color(colors[0]).getHSL({ h: 0, s: 0, l: 0 }).l > 0.5;
  const camera = new THREE.OrthographicCamera(-8, 8, 5, -5, 0.1, 200);
  const sweep = { value: 0 };
  const mat = (ground: number) =>
    new THREE.ShaderMaterial({
      uniforms: {
        uCol: { value: new THREE.Color(colors[0]) },
        uSweep: sweep,
        uCell: { value: 2 },
        uDark: { value: dark ? 1 : 0 },
        uGround: { value: ground },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
    });

  const rock = mat(0);
  for (const [x, z, r, h, sides, turn] of PEAKS) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, sides, 1), rock);
    m.position.set(x, h / 2, z);
    m.rotation.y = turn;
    scene.add(m);
  }
  const ground = new THREE.Mesh(new THREE.CircleGeometry(4.4, 40), mat(1));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  // The one rust pixel, hovering over the summit.
  const beacon = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.32, 0.32),
    new THREE.MeshBasicMaterial({ color: colors[1] }),
  );
  beacon.position.set(0, 4.75, 0);
  scene.add(beacon);

  const centre = new THREE.Vector3(0, 1.6, 0);
  return {
    camera,
    update: (t) => {
      const aspect = camera.right / 5;
      const narrow = aspect < 1;
      camera.zoom = narrow ? 0.3 : 0.8;
      camera.top = 5;
      camera.bottom = -5;
      camera.updateProjectionMatrix();
      const step = Math.floor(((t % 24) / 24) * FRAMES);
      const a = (step / FRAMES) * Math.PI * 2 + 0.6;
      camera.position.set(Math.cos(a) * 40, centre.y + 22, Math.sin(a) * 40);
      camera.lookAt(centre);
      // The range sits in front of the sun: right of centre on wide screens,
      // under the title on phones.
      const halfW = (5 * aspect) / camera.zoom;
      const halfH = 5 / camera.zoom;
      camera.translateX(narrow ? -halfW * 0.4 : -halfW * 0.57);
      camera.translateY(narrow ? -halfH * 0.4 : halfH * 0.09);
      const span = halfW + 4;
      sweep.value = -span + (((2 * span * step) / FRAMES + span * 0.6) % (2 * span));
    },
  };
};

export const scene: ConceptScene = {
  colors: { light: ['#1b1915', '#b5482a'], dark: ['#e9e2cf', '#d0623f'] },
  build,
};
