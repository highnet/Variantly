import * as THREE from 'three';

import { persp } from '@/components/backdrop/sceneKit';
import type { Built, ConceptScene } from '@/concepts/types';

/*
 * i · Liquid Glass: rounded glass capsules that merge and separate, drawn as
 * one full-screen pass. The capsules are a smooth-union distance field with a
 * pillowed edge profile; each pixel refracts the page's own colour field
 * (the same gradients and hairlines as .vy-li-field in concept.css) through
 * the edge normal, with a little dispersion, a specular rim and a soft shadow.
 * No raymarching and no transmission pass: three distance lookups a pixel.
 */
const FRAG = /* glsl */ `
uniform vec2 uRes;
uniform float uT;
uniform vec3 uTop, uBot, uC1, uC2, uC3, uLine, uHi, uShadow;
uniform float uLineA, uDark;
varying vec2 vUv;
const float TAU = 6.2831853;

float capsule(vec2 p, vec2 a, vec2 b, float r) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}
// The capsules, in CSS px (y down). Every period divides 24s.
float field(vec2 p) {
  float vm = max(uRes.x, uRes.y) / 100.0;
  float a = TAU * uT / 24.0;
  float sep = 0.5 - 0.5 * cos(a);
  vec2 ca = vec2(uRes.x * 0.72 + vm * 1.2 * sin(a), uRes.y * 0.58);
  float d = capsule(p, ca - vec2(vm * 7.0, 0.0), ca + vec2(vm * 7.0, 0.0), vm * 5.2);
  vec2 cb = ca - vec2(vm * (15.0 + 9.0 * sep), vm * (1.5 * sin(a * 2.0)));
  d = smin(d, length(p - cb) - vm * 3.6, vm * 3.0);
  vec2 cc = vec2(uRes.x * 0.06, uRes.y * 0.42);
  vec2 ax = vec2(sin(0.14 * sin(a)), cos(0.14 * sin(a))) * vm * 5.0;
  float c = capsule(p, cc - ax, cc + ax, vm * 4.4);
  vec2 cd = cc + vec2(cos(-a), sin(-a)) * vm * (10.5 - 2.5 * cos(a * 3.0));
  c = smin(c, length(p - cd) - vm * 2.2, vm * 2.6);
  return min(d, c);
}
// The page's colour field (see .vy-li-field): base, hairlines, three soft fields.
vec3 over(vec3 under, vec3 col, float a) { return mix(under, col, clamp(a, 0.0, 1.0)); }
vec3 ground(vec2 p) {
  float vm = max(uRes.x, uRes.y) / 100.0;
  vec3 c = mix(uTop, uBot, clamp(p.y / uRes.y, 0.0, 1.0));
  c = over(c, uLine, uLineA * step(mod(p.y, 32.0), 1.0));
  c = over(c, uC3, 0.45 * (1.0 - length(p - uRes * vec2(0.5, 1.05)) / (vm * 36.0 * 0.7)));
  c = over(c, uC2, 0.5 * (1.0 - length(p - uRes * vec2(0.12, 0.78)) / (vm * 50.0 * 0.7)));
  c = over(c, uC1, 0.55 * (1.0 - length(p - uRes * vec2(0.82, 0.18)) / (vm * 60.0 * 0.7)));
  return c;
}
void main() {
  vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uRes;
  float vm = max(uRes.x, uRes.y) / 100.0;
  float d = field(p);
  if (d > vm * 4.0) { gl_FragColor = vec4(0.0); return; }
  // Outside: a soft contact shadow, thrown down.
  if (d > 0.0) {
    float s = field(p - vec2(0.0, vm * 1.2));
    float a = (1.0 - smoothstep(-vm * 0.5, vm * 3.0, s)) * mix(0.1, 0.35, uDark);
    gl_FragColor = vec4(uShadow, a * smoothstep(0.0, 1.5, d));
    return;
  }
  // Pillowed glass: flat on top, a quarter-round bevel at the rim.
  float bevel = vm * 2.6;
  float e = 1.5;
  float s0 = clamp(-d / bevel, 0.0, 1.0);
  float hx = clamp(-field(p + vec2(e, 0.0)) / bevel, 0.0, 1.0);
  float hy = clamp(-field(p + vec2(0.0, e)) / bevel, 0.0, 1.0);
  float h0 = sqrt(1.0 - (1.0 - s0) * (1.0 - s0));
  float h1 = sqrt(1.0 - (1.0 - hx) * (1.0 - hx));
  float h2 = sqrt(1.0 - (1.0 - hy) * (1.0 - hy));
  vec3 n = normalize(vec3(-(h1 - h0) * bevel / e, -(h2 - h0) * bevel / e, 1.0));
  // Refraction: the bevel bends far ground inward (red a touch less than
  // blue); the flat top magnifies slightly about the slab.
  vec2 off = -n.xy * vm * 12.0 + (p - uRes * 0.5) * -0.015;
  vec3 col = vec3(ground(p + off * 0.9).r, ground(p + off).g, ground(p + off * 1.12).b);
  col = mix(col, uHi, mix(0.05, 0.03, uDark));
  // Light focused through the bevel: a caustic on the far (bottom right) side,
  // a darker refracted band on the near side.
  float rimBand = smoothstep(0.0, 0.5, 1.0 - n.z);
  // Specular rim lit from the top left, a dimmer kick on the far edge.
  vec2 g = normalize(n.xy + 1e-4);
  float rim = pow(1.0 - n.z, 1.6);
  float lit = max(dot(g, normalize(vec2(-0.6, -0.8))), 0.0);
  float back = max(dot(g, normalize(vec2(0.6, 0.8))), 0.0);
  col += uHi * rim * (lit * 0.9 + back * 0.45);
  col = mix(col, uShadow, rimBand * lit * mix(0.06, 0.2, uDark));
  // A crisp specular line along the rim, strongest top left.
  float edge = smoothstep(2.5, 0.5, -d);
  col = mix(col, uHi, edge * (0.35 + 0.6 * lit + 0.3 * back));
  gl_FragColor = vec4(col, smoothstep(0.0, -1.2, d) * 0.97 + 0.03);
}`;

const build = (scene: THREE.Scene, colors: string[]): Built => {
  const camera = persp(9);
  // Raw sRGB components: the shader mixes exactly as the CSS field does.
  const [top, bot, c1, c2, c3, line, hi, shadow] = colors.map((c) =>
    new THREE.Color(c).convertLinearToSRGB(),
  );
  const dark = top.r + top.g + top.b < 1.5;
  const uniforms = {
    uRes: { value: new THREE.Vector2(1, 1) },
    uT: { value: 0 },
    uTop: { value: top },
    uBot: { value: bot },
    uC1: { value: c1 },
    uC2: { value: c2 },
    uC3: { value: c3 },
    uLine: { value: line },
    uHi: { value: hi },
    uShadow: { value: shadow },
    uLineA: { value: dark ? 0.06 : 0.08 },
    uDark: { value: dark ? 1 : 0 },
  };
  const quad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader:
        'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }),
  );
  quad.frustumCulled = false;
  scene.add(quad);
  return {
    camera,
    update: (t) => {
      // The canvas covers the viewport: measure in CSS px like the CSS field.
      uniforms.uRes.value.set(innerWidth, innerHeight);
      uniforms.uT.value = t % 24;
    },
  };
};

export const scene: ConceptScene = {
  colors: {
    light: ['#f3f6f9', '#e3e9f0', '#8fb4e6', '#a6e0e8', '#f2cdbd', '#0b0c10', '#ffffff', '#23364d'],
    dark: ['#070a10', '#0b0f17', '#2b4f80', '#1d5560', '#4a3550', '#f2f5f9', '#dfe9f7', '#000000'],
  },
  build,
};
