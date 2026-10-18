import * as THREE from 'three';

import { persp } from '@/components/backdrop/sceneKit';
import type { Built, ConceptScene } from '@/concepts/types';

/*
 * q · Sticker Bomb: the page is the laptop lid. Glossy vinyl stickers sit
 * round its edges; in turn each one lifts off, tumbles and slaps back down
 * with a bounce, and one keeps peeling its corner. Every sticker is a plane
 * whose die-cut shape, white border, print and corner curl are drawn in its
 * shader. 24s loop (t = 6, the still frame, has every sticker down).
 */
const VERT = /* glsl */ `
uniform vec2 uSize; uniform float uPeel; uniform float uPad;
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main() {
  vUv = uv;
  vec3 p = position * vec3(uSize * uPad, 1.0);
  vec3 nrm = vec3(0.0, 0.0, 1.0);
  if (uPeel > 0.001) {
    // Curl the top-right corner back over a small roll.
    vec2 dir = normalize(uSize);
    float far = dot(uSize * 0.5, dir);
    float d = dot(p.xy, dir) - far * (1.0 - uPeel);
    if (d > 0.0) {
      float R = 0.1; float a = 2.7;
      float th = min(d / R, a);
      float rest = max(d - R * a, 0.0);
      vec2 base = p.xy - dir * d;
      p.xy = base + dir * (R * sin(th) + rest * cos(a));
      p.z += R * (1.0 - cos(th)) + rest * sin(a);
      nrm = vec3(-dir * sin(th), cos(th));
    }
  }
  vN = normalize(normalMatrix * nrm);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
uniform vec2 uSize; uniform float uShape; uniform float uFill; uniform float uPad;
uniform vec3 uA; uniform vec3 uB; uniform float uShadow; uniform float uBlur; uniform float uOp;
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
float star(vec2 p, float r) {
  const vec2 k1 = vec2(0.809016994, -0.587785252);
  const vec2 k2 = vec2(-k1.x, k1.y);
  p.x = abs(p.x);
  p -= 2.0 * max(dot(k1, p), 0.0) * k1;
  p -= 2.0 * max(dot(k2, p), 0.0) * k2;
  p.x = abs(p.x);
  p.y -= r;
  vec2 ba = 0.42 * vec2(-k1.y, k1.x) - vec2(0.0, 1.0);
  float h = clamp(dot(p, ba) / dot(ba, ba), 0.0, r);
  return length(p - ba * h) * sign(p.y * ba.x - p.x * ba.y);
}
void main() {
  vec2 q = (vUv - 0.5) * uSize * uPad;
  float bw = 0.085;
  vec2 hs = uSize * 0.5 - bw - 0.02;
  float rr = min(hs.x, hs.y) * (uShape > 2.5 ? 1.0 : 0.3);
  vec2 bq = abs(q) - hs + rr;
  float d = uShape < 0.5 || uShape > 2.5
    ? length(max(bq, 0.0)) + min(max(bq.x, bq.y), 0.0) - rr
    : uShape < 1.5 ? length(q) - min(hs.x, hs.y)
    : star(q * vec2(1.0, -1.0) - vec2(0.0, 0.06), min(hs.x, hs.y) * 1.05) - 0.06;
  float outer = d - bw;
  float fw = max(fwidth(outer), 0.004);
  if (uShadow > 0.5) {
    gl_FragColor = vec4(vec3(0.0), (1.0 - smoothstep(-uBlur, uBlur, outer)) * uOp);
    return;
  }
  float alpha = 1.0 - smoothstep(-fw, fw, outer);
  if (alpha < 0.01) discard;
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  vec3 v = normalize(vV);
  vec3 c = uA;
  if (uFill > 2.5) c = mix(uA, uB, step(d, -min(hs.x, hs.y) * 0.45));
  else if (uFill > 1.5) {
    float f = dot(n, v) * 1.6 + q.x * 0.35 + q.y * 0.25;
    c = mix(uA, 0.55 + 0.45 * cos(6.2831 * (f + vec3(0.0, 0.33, 0.67))), 0.7);
  } else if (uFill > 0.5) {
    vec2 g = floor(q * 4.0);
    c = mix(uA, uB, mod(g.x + g.y, 2.0));
  }
  c = mix(c, vec3(1.0), smoothstep(-fw, fw, d));
  if (!gl_FrontFacing) c = vec3(0.9, 0.9, 0.88);
  vec3 L = normalize(vec3(-0.4, 0.7, 0.6));
  float dif = 0.74 + 0.26 * max(dot(n, L), 0.0);
  float spec = pow(max(dot(reflect(-L, n), v), 0.0), 36.0) * 0.45;
  gl_FragColor = vec4(c * dif + spec, alpha);
  #include <colorspace_fragment>
}`;

// [x, y] as a fraction of the half-screen, w, h, shape (0 rect, 1 circle,
// 2 star, 3 pill), fill (0 solid, 1 checker, 2 holo, 3 bullseye), colours,
// rotation, the second the sticker lifts off (-1: never).
type Spec = [number, number, number, number, number, number, number, number, number, number];
const SPECS: Spec[] = [
  [-0.84, 0.5, 1.7, 1.7, 1, 2, 0, 1, 0.1, 1],
  [-0.88, -0.2, 1.9, 1.25, 0, 1, 2, 3, 0.22, 13],
  [-0.68, -0.76, 1.7, 1.7, 2, 0, 1, 1, -0.2, -1],
  [0.84, 0.58, 1.55, 1.55, 0, 3, 0, 2, -0.28, -1],
  [0.9, -0.1, 1.35, 1.35, 1, 3, 2, 0, 0, 8],
  [0.72, -0.72, 1.6, 1.6, 2, 2, 1, 1, 0.3, 19],
  [-0.4, 0.9, 0.85, 0.85, 1, 0, 1, 1, 0, -1],
  [0.42, -0.9, 1.5, 0.75, 3, 1, 0, 3, -0.12, -1],
];
const PEEL = 3;

const ease = (x: number) => 1 - (1 - x) ** 3;

const build = (scene: THREE.Scene, colors: string[]): Built => {
  const camera = persp(12);
  const hh = 12 * Math.tan((20 * Math.PI) / 180);
  const geo = new THREE.PlaneGeometry(1, 1, 24, 24);
  const items = SPECS.map(([, , w, h, shape, fill, a, b, , lift], i) => {
    const uniforms = {
      uSize: { value: new THREE.Vector2(w, h) },
      uPeel: { value: 0 },
      uPad: { value: 1 },
      uShape: { value: shape },
      uFill: { value: fill },
      uA: { value: new THREE.Color(colors[a]) },
      uB: { value: new THREE.Color(colors[b]) },
      uShadow: { value: 0 },
      uBlur: { value: 0.05 },
      uOp: { value: 0.3 },
    };
    const mat = (shadow: boolean) =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: shadow
          ? {
              ...uniforms,
              uShadow: { value: 1 },
              uBlur: { value: 0.05 },
              uOp: { value: 0.3 },
              uPeel: { value: 0 },
              uPad: { value: 1.7 },
            }
          : uniforms,
        transparent: true,
        depthWrite: !shadow,
        side: THREE.DoubleSide,
      });
    const body = new THREE.Mesh(geo, mat(false));
    body.renderOrder = 2 + i;
    const shadow = new THREE.Mesh(geo, mat(true));
    shadow.renderOrder = 1;
    scene.add(shadow, body);
    return { body, shadow, lift };
  });
  return {
    camera,
    update: (t) => {
      const aspect = (camera as THREE.PerspectiveCamera).aspect || 1.6;
      const hw = hh * aspect;
      const k = Math.min(1, Math.max(0.55, hw / 6.5));
      items.forEach(({ body, shadow, lift }, i) => {
        const [nx, ny, , , , , , , rot] = SPECS[i];
        let z = 0;
        let tilt = 0;
        let spin = 0;
        let squash = 1;
        if (lift >= 0) {
          // Lift off (0.45s), hang and turn (0.55s), drop (0.3s), slap and bounce.
          const u = (((t - lift) % 24) + 24) % 24;
          if (u < 0.45) z = 3.2 * ease(u / 0.45);
          else if (u < 1) z = 3.2 + Math.sin(((u - 0.45) / 0.55) * Math.PI) * 0.3;
          else if (u < 1.3) z = 3.2 * (1 - ((u - 1) / 0.3) ** 2);
          else if (u < 2.1) {
            const b = (u - 1.3) / 0.8;
            z = Math.abs(Math.sin(b * Math.PI * 2)) * 0.22 * (1 - b);
            squash = 1 + Math.sin(b * Math.PI * 3) * 0.05 * (1 - b);
          }
          const air = Math.min(1, z / 3.2);
          tilt = Math.sin((Math.min(u, 1.3) / 1.3) * Math.PI) * 0.7 * air;
          spin = Math.sin((Math.min(u, 1.3) / 1.3) * Math.PI) * 0.6;
        }
        const x = nx * hw - Math.sign(nx) * (1 - k) * 0.6;
        const y = ny * hh;
        body.position.set(x, y, 0.02 + z);
        body.rotation.set(tilt, tilt * 0.6, rot + spin);
        body.scale.set(k * squash, k * squash, 1);
        shadow.position.set(x + 0.08 + z * 0.35, y - 0.12 - z * 0.4, 0);
        shadow.rotation.z = rot + spin;
        shadow.scale.setScalar(k * (1.04 + z * 0.08));
        const su = (shadow.material as THREE.ShaderMaterial).uniforms;
        su.uBlur.value = 0.05 + z * 0.12;
        su.uOp.value = 0.3 - z * 0.06;
      });
      const peel = items[PEEL].body.material as THREE.ShaderMaterial;
      peel.uniforms.uPeel.value = 0.2 + 0.16 * (0.5 - 0.5 * Math.cos((t / 12) * Math.PI * 2));
    },
  };
};

export const scene: ConceptScene = {
  colors: {
    light: ['#ff3ea5', '#00c2ff', '#c4f000', '#111111'],
    dark: ['#ff3ea5', '#00c2ff', '#c4f000', '#111111'],
  },
  build,
};
