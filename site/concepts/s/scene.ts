import * as THREE from 'three';

import { persp } from '@/components/backdrop/sceneKit';
import type { Built, ConceptScene } from '@/concepts/types';

/*
 * s · Lived-in Den: a shelf vignette (brass lamp, a stack of records with a
 * rotary phone on it, a plant in terracotta) standing on the Backdrop's walnut
 * shelf. Everything is lit by the lamp alone, which breathes; the phone's
 * handset hovers a hand's breadth above its cradle. 24s loop.
 */
const glowMat = (color: string) =>
  new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color(color) }, uK: { value: 1 } },
    vertexShader:
      'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uCol; uniform float uK; varying vec2 vUv;
void main(){ float d = length(vUv - 0.5) * 2.0; float a = pow(max(1.0 - d, 0.0), 2.2) * uK; gl_FragColor = vec4(uCol * a, a); }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

const contact = (w: number, d: number, op: number) => {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.ShaderMaterial({
      uniforms: { uOp: { value: op } },
      vertexShader:
        'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader:
        'uniform float uOp; varying vec2 vUv; void main(){ float d = length(vUv - 0.5) * 2.0; gl_FragColor = vec4(0.08, 0.04, 0.02, (1.0 - smoothstep(0.2, 1.0, d)) * uOp); }',
      transparent: true,
      depthWrite: false,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.004;
  return m;
};

const build = (scene: THREE.Scene, colors: string[]): Built => {
  const [wood, sienna, teal, amber, ink, paper] = colors;
  const camera = persp(12);
  const std = (color: string, o: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
  scene.add(new THREE.AmbientLight('#ffcf9a', 0.32));
  const den = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    den.add(m);
    return m;
  };
  // The lamp: brass foot and stem, a linen shade, the bulb and its light.
  const brass = std(amber, { metalness: 0.7, roughness: 0.32 });
  add(new THREE.CylinderGeometry(0.42, 0.48, 0.09, 40), brass, 1.7, 0.045);
  add(new THREE.CylinderGeometry(0.035, 0.035, 2.1, 12), brass, 1.7, 1.1);
  const shade = add(
    new THREE.CylinderGeometry(0.36, 0.78, 0.72, 40, 1, true),
    std(paper, {
      roughness: 0.9,
      side: THREE.DoubleSide,
      emissive: amber,
      emissiveIntensity: 0.35,
    }),
    1.7,
    2.32,
  );
  const bulb = add(
    new THREE.SphereGeometry(0.13, 20, 12),
    new THREE.MeshBasicMaterial({ color: '#fff1d0' }),
    1.7,
    2.06,
  );
  const lamp = new THREE.PointLight('#ffb862', 14, 0, 1.4);
  lamp.position.set(1.7, 2.0, 0.4);
  den.add(lamp);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), glowMat('#ffb052'));
  glow.position.set(1.7, 2.05, -0.3);
  den.add(glow);
  // Records lying in a stack, the rotary phone on top, its handset afloat.
  [sienna, ink, teal].forEach((c, i) => {
    const lp = add(
      new THREE.BoxGeometry(1.32, 0.05, 1.32),
      std(c, { roughness: 0.75 }),
      0.05 + i * 0.03,
      0.026 + i * 0.052,
      -0.1,
    );
    lp.rotation.y = i * 0.12 - 0.1;
  });
  const body = add(
    new THREE.CylinderGeometry(0.44, 0.56, 0.42, 6, 1),
    std(teal, { roughness: 0.25 }),
    0.05,
    0.37,
  );
  body.rotation.y = Math.PI / 6;
  body.scale.z = 0.8;
  const dial = add(
    new THREE.CylinderGeometry(0.24, 0.24, 0.04, 28),
    std(paper, { roughness: 0.4 }),
    0.05,
    0.6,
    0.2,
  );
  dial.rotation.x = 0.55;
  const handset = add(
    new THREE.CapsuleGeometry(0.11, 0.62, 6, 16),
    std(teal, { roughness: 0.25 }),
    0.05,
    0.9,
  );
  handset.rotation.z = Math.PI / 2;
  const hShadow = contact(1.1, 0.35, 0.35);
  hShadow.position.set(0.05, 0.585, 0);
  den.add(hShadow);
  // The plant: terracotta pot, long leaves fanning out.
  add(
    new THREE.CylinderGeometry(0.32, 0.24, 0.55, 28),
    std(sienna, { roughness: 0.85 }),
    -1.5,
    0.275,
  );
  const leaf = new THREE.SphereGeometry(1, 12, 8);
  const leafMat = std(teal, {
    roughness: 0.55,
    color: new THREE.Color(teal).multiplyScalar(0.7).getStyle(),
  });
  [-0.7, -0.35, 0, 0.35, 0.7, -0.15, 0.2].forEach((a, i) => {
    const l = add(
      leaf,
      leafMat,
      -1.5 + Math.sin(a) * 0.35,
      0.95 + (i % 3) * 0.08,
      Math.cos(a * 3) * 0.1,
    );
    l.scale.set(0.09, 0.5 + (i % 2) * 0.12, 0.05);
    l.rotation.z = -a;
  });
  [
    [1.7, 1.2, 0.5],
    [0.05, 1.6, 1.6],
    [-1.5, 0.9, 0.7],
  ].forEach(([x, w, d]) => {
    const c = contact(w, d, 0.55);
    c.position.x = x;
    den.add(c);
  });
  // A thin walnut lip so the objects sit on the shelf, not in front of it.
  add(new THREE.BoxGeometry(5.2, 0.02, 1.4), std(wood, { roughness: 0.7 }), 0.1, -0.01, 0);
  scene.add(den);
  const hh = 12 * Math.tan((20 * Math.PI) / 180);
  return {
    camera,
    update: (t) => {
      const aspect = (camera as THREE.PerspectiveCamera).aspect || 1.6;
      const wide = aspect > 1;
      const k = wide ? 0.78 : 0.28;
      den.scale.setScalar(k);
      // On the Backdrop's shelf: 62% down the screen, 32% on phones; under
      // the title card and above the headline, never behind either.
      den.position.set(
        wide ? hh * aspect * 0.64 : hh * aspect * 0.58,
        (wide ? -0.24 : 0.36) * hh,
        0,
      );
      den.rotation.y = -0.18;
      const p = (t / 24) * Math.PI * 2;
      // The lamp breathes (8s); the handset floats (6s), turning a little.
      const breath = 0.5 + 0.5 * Math.cos(p * 3);
      lamp.intensity = 12 + 4 * breath;
      (glow.material as THREE.ShaderMaterial).uniforms.uK.value = 0.32 + 0.12 * breath;
      (shade.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.28 + 0.14 * breath;
      bulb.scale.setScalar(0.95 + 0.08 * breath);
      const lift = 0.5 + 0.5 * Math.sin(p * 4);
      handset.position.y = 0.86 + 0.14 * lift;
      handset.rotation.set(
        Math.sin(p * 2) * 0.08,
        0.1 + Math.sin(p) * 0.12,
        Math.PI / 2 + Math.sin(p * 4) * 0.04,
      );
      (hShadow.material as THREE.ShaderMaterial).uniforms.uOp.value = 0.42 - 0.18 * lift;
      hShadow.scale.setScalar(1 + 0.25 * lift);
    },
  };
};

export const scene: ConceptScene = {
  colors: {
    light: ['#6b4128', '#a0522d', '#5b8a86', '#d9a441', '#2a1d15', '#efe1c6'],
    dark: ['#3e2516', '#c8693a', '#6fa39e', '#e6b450', '#120c08', '#d9c6a3'],
  },
  build,
};
