import * as THREE from 'three';

import type { VariantKey } from '@/components/backdrop/variants';

/*
 * Per-concept surface pools for the 3D title. Like the typefaces, the surface
 * is part of each letter's variance: a flickering letter steps through its
 * concept's pool, and the lockup is mismatched in material too (a ransom note
 * of surfaces). Each concept has at most six looks (phones three, all cheap),
 * built once and swapped by reference, so the animation never recompiles.
 * A look may add an "extra" layer drawn from the same glyph: an ink outline
 * hull, a misregistered second ink, or a pasted-paper drop shadow.
 */

type Style = 'clay' | 'riso' | 'crt' | 'toon' | 'facet' | 'paper' | 'flat';

export type LetterLook = {
  body: THREE.Material;
  extra: THREE.Material | null;
  // Where the extra layer sits relative to the glyph (letter units).
  offset: [number, number, number];
  // Lit by the studio environment (built only when a pool needs it).
  env?: boolean;
};

const VERT = /* glsl */ `
uniform float uPush;
varying vec3 vN;
varying vec3 vV;
varying vec3 vObj;
void main() {
  vObj = position;
  vec4 mv = modelViewMatrix * vec4(position + normal * uPush, 1.0);
  vV = -mv.xyz;
  vN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
}`;

const BODIES: Record<Style, string> = {
  // Clay: wrapped diffuse, a warm subsurface-ish rim, and a glaze sheen.
  clay: `
  float wrap = clamp((dot(n, L) + 0.6) / 1.6, 0.0, 1.0);
  float rim = pow(1.0 - abs(dot(n, v)), 3.0);
  c = uA * (0.32 + 0.78 * wrap) + uB * rim * 0.35
    + pow(max(dot(reflect(-L, n), v), 0.0), mix(8.0, 60.0, uSheen)) * mix(0.06, 0.5, uSheen);`,
  // Riso: solid ink overprinted by a 45° halftone of a second ink in the shade.
  riso: `
  float t = 1.0 - clamp(dot(n, L) * 0.5 + 0.5, 0.0, 1.0);
  vec2 r = mat2(0.7071, -0.7071, 0.7071, 0.7071) * gl_FragCoord.xy / uCell;
  float rad = sqrt(clamp(t * 1.1 - 0.1, 0.0, 1.0)) * 0.62;
  float m = smoothstep(rad, rad - 0.12, length(fract(r) - 0.5));
  c = mix(uA, uB, m);`,
  // TVA terminal: phosphor glow, hot fresnel edge, scanlines, optional static.
  crt: `
  float fres = pow(1.0 - abs(dot(n, v)), 2.0);
  float d = clamp(dot(n, L), 0.0, 1.0);
  c = uA * (0.55 + 0.45 * d) + uB * fres * 1.1;
  c *= 0.74 + 0.26 * step(0.5, fract(gl_FragCoord.y / uCell));
  c *= 1.0 + uNoise * (hash(floor(gl_FragCoord.xy / 2.0) + uSeed) - 0.5) * 1.4;`,
  // Brutal zine: hard cel bands, a clipped highlight, optional hatching.
  toon: `
  float d = dot(n, L);
  float band = d > 0.5 ? 1.0 : d > -0.05 ? 0.74 : 0.5;
  float hatch = step(0.5, fract((gl_FragCoord.x + gl_FragCoord.y) / uCell));
  band *= d > 0.5 ? 1.0 : mix(1.0, 0.55 + 0.45 * hatch, uHatch);
  c = uA * band + step(0.965, dot(reflect(-L, n), v)) * 0.55;`,
  // Bauhaus: per-triangle facet normals, crisp tones.
  facet: `
  vec3 fn = normalize(cross(dFdx(-vV), dFdy(-vV)));
  float d = dot(fn, L);
  c = uA * (d > 0.4 ? 1.0 : d > 0.0 ? 0.82 : 0.66);`,
  // Cut & paste: matte stock with fibre speckle, corrugation or print dots.
  paper: `
  float fibre = hash(floor(vObj.xy * 55.0) + uSeed);
  float d = clamp(dot(n, L) * 0.5 + 0.5, 0.0, 1.0);
  float stripe = 1.0 - uStripe * 0.12 * step(0.5, fract(vObj.y * 9.0));
  float dots = 1.0 - uNoise * 0.25 * step(length(fract(gl_FragCoord.xy / uCell) - 0.5), 0.22);
  c = uA * (0.8 + 0.2 * d) * (0.93 + 0.07 * fibre) * stripe * dots * mix(0.82, 1.0, abs(n.z));`,
  flat: `
  c = uA;`,
};

const frag = (style: Style) => /* glsl */ `
uniform vec3 uA;
uniform vec3 uB;
uniform float uCell;
uniform float uSeed;
uniform float uGrain;
uniform float uOpacity;
uniform float uSheen;
uniform float uNoise;
uniform float uHatch;
uniform float uStripe;
varying vec3 vN;
varying vec3 vV;
varying vec3 vObj;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  vec3 v = normalize(vV);
  vec3 L = normalize(vec3(-0.45, 0.6, 0.65));
  vec3 c = vec3(0.0);
  ${BODIES[style]}
  gl_FragColor = vec4(c, uOpacity);
  #include <colorspace_fragment>
  // Film grain to match the page's grain overlay.
  gl_FragColor.rgb += (hash(gl_FragCoord.xy + uSeed) - 0.5) * uGrain;
}`;

type ShaderOpts = {
  a: string;
  b?: string;
  cell?: number;
  seed?: number;
  grain?: number;
  opacity?: number;
  push?: number;
  back?: boolean;
  sheen?: number;
  noise?: number;
  hatch?: number;
  stripe?: number;
};

const shader = (style: Style, o: ShaderOpts) =>
  new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: frag(style),
    uniforms: {
      uA: { value: new THREE.Color(o.a) },
      uB: { value: new THREE.Color(o.b ?? o.a) },
      uCell: { value: o.cell ?? 6 },
      uSeed: { value: o.seed ?? 0 },
      uGrain: { value: o.grain ?? 0.035 },
      uOpacity: { value: o.opacity ?? 1 },
      uPush: { value: o.push ?? 0 },
      uSheen: { value: o.sheen ?? 0 },
      uNoise: { value: o.noise ?? 0 },
      uHatch: { value: o.hatch ?? 0 },
      uStripe: { value: o.stripe ?? 0 },
    },
    transparent: (o.opacity ?? 1) < 1,
    depthWrite: (o.opacity ?? 1) >= 1,
    side: o.back ? THREE.BackSide : THREE.FrontSide,
    toneMapped: false,
  });

// Patches three's lit materials after their colour-space conversion: film
// grain always, plus a fresnel rim with an iridescent hue shift (the cheap
// stand-in for thin-film iridescence) or sugar-glitter sparkles.
const patch = (key: string, rim: boolean, glitter: boolean) => (m: THREE.Material) => {
  m.onBeforeCompile = (s) => {
    s.fragmentShader = s.fragmentShader.replace(
      '#include <dithering_fragment>',
      `#include <dithering_fragment>
      {
        float h = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
        ${
          rim
            ? `float f = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.2);
        vec3 irid = 0.5 + 0.5 * cos(6.2831 * (f * 1.3 + vec3(0.0, 0.33, 0.67)));
        gl_FragColor.rgb += irid * f * 0.5;`
            : ''
        }
        ${
          glitter
            ? `float g = fract(sin(dot(floor(vViewPosition.xy * 90.0), vec2(41.3, 289.1))) * 15731.7);
        gl_FragColor.rgb += step(0.975, g) * 0.35;`
            : ''
        }
        gl_FragColor.rgb += (h - 0.5) * 0.03;
      }`,
    );
  };
  m.customProgramCacheKey = () => key;
  return m;
};

const plain = (body: THREE.Material, env = false): LetterLook => ({
  body,
  extra: null,
  offset: [0, 0, 0],
  env,
});

// Cheap pool entries come first: phones use the first three.
const pools: Record<VariantKey, (dark: boolean, phone: boolean) => LetterLook[]> = {
  a: (dark) => {
    const rim = dark ? '#ff9f80' : '#ffd9c4';
    const clays: [string, number][] = [
      ['#d9785c', 0],
      ['#6fa585', 0.6],
      ['#d9a933', 0],
      ['#7f95cf', 0.8],
      ['#c76f98', 0.3],
      ['#e8e0d0', 0.9],
    ];
    return clays.map(([a, sheen]) => plain(shader('clay', { a, b: rim, sheen, grain: 0.045 })));
  },
  b: (_dark, phone) => {
    const px = phone ? 1 : Math.min(devicePixelRatio, 1.5);
    const inks: [string, string, number][] = [
      ['#ff48b0', '#0078bf', 4],
      ['#0078bf', '#ff48b0', 6],
      ['#ffe800', '#ff6c2f', 5],
      ['#00a95c', '#1d1d5c', 8],
      ['#ff6c2f', '#765ba7', 4],
      ['#765ba7', '#ffe800', 7],
    ];
    return inks.map(([a, b, cell], k) => ({
      body: shader('riso', { a, b, cell: cell * px }),
      extra: shader('flat', { a: b, opacity: 0.55, grain: 0.06, seed: k }),
      offset: [0.06 + (k % 3) * 0.03, -0.05 - (k % 2) * 0.04, -0.08],
    }));
  },
  c: (dark, phone) => {
    const px = phone ? 1 : Math.min(devicePixelRatio, 1.5);
    const amber = dark ? ['#ff9e1f', '#ffd27a'] : ['#c2560e', '#ff9d3c'];
    const green = dark ? ['#1fd873', '#a6ffcf'] : ['#0f8a48', '#3fd78a'];
    const ice = dark ? ['#9fd9ff', '#e4f5ff'] : ['#2c6c9c', '#7fc4f2'];
    const tubes: [string[], number, number][] = [
      [amber, 3, 0],
      [green, 3, 0],
      [amber, 5, 0.6],
      [green, 4, 0.6],
      [amber, 2, 0],
      [ice, 3, 0.3],
    ];
    return tubes.map(([[a, b], cell, noise], k) =>
      plain(shader('crt', { a, b, cell: cell * px, noise, seed: k * 3.7, grain: 0.05 })),
    );
  },
  d: (dark) => {
    const ink = dark ? '#f1ece2' : '#000000';
    const cels: [string, number, number][] = [
      ['#ffe600', 0.07, 0],
      ['#ff3b00', 0.05, 1],
      ['#ffffff', 0.1, 0],
      ['#00c2ff', 0.06, 1],
      ['#ff3b00', 0.12, 0],
      ['#ffe600', 0.04, 1],
    ];
    return cels.map(([a, push, hatch]) => ({
      body: shader('toon', { a, hatch, cell: 5, grain: 0.02 }),
      // Inverted hull: back faces pushed out along the normals read as ink.
      extra: shader('flat', { a: ink, push, back: true, grain: 0 }),
      offset: [0, 0, 0],
    }));
  },
  e: (dark) => [
    plain(shader('facet', { a: '#e1261c', grain: 0.02 })),
    plain(shader('facet', { a: '#1f4fa3', grain: 0.02 })),
    plain(shader('facet', { a: '#f2c400', grain: 0.02 })),
    plain(shader('flat', { a: '#e1261c', grain: 0.015 })),
    plain(shader('facet', { a: dark ? '#f0ebe0' : '#111111', grain: 0.02 })),
    plain(shader('flat', { a: '#1f4fa3', grain: 0.015 })),
  ],
  f: (dark, phone) => {
    const shadow = () => shader('flat', { a: '#000000', opacity: dark ? 0.55 : 0.28, grain: 0 });
    const offset: [number, number, number] = [0.14, -0.14, -0.35];
    const paper = (o: ShaderOpts): LetterLook => ({
      body: shader('paper', o),
      extra: shadow(),
      offset,
    });
    const foil = (): LetterLook => ({
      body: patch(
        'foil',
        false,
        false,
      )(new THREE.MeshStandardMaterial({ color: '#d8b45a', metalness: 1, roughness: 0.32 })),
      extra: shadow(),
      offset,
      env: true,
    });
    return [
      paper({ a: '#fdfdf7', seed: 1.3 }),
      paper({ a: '#b98c5a', stripe: 1, seed: 2.1 }),
      paper({ a: '#d9d4c7', noise: 1, cell: 4, seed: 3.7 }),
      paper({ a: '#f95738', seed: 4.2 }),
      phone ? paper({ a: '#83c5be', seed: 5.9 }) : foil(),
      paper({ a: '#f4d35e', seed: 6.4 }),
    ];
  },
  g: (_dark, phone) => {
    const colours = ['#ff2d87', '#6a3dff', '#00b4e6', '#ff9a00', '#13c27a', '#ff5fa2'];
    const rim = patch('candy-rim', true, false);
    const glitter = patch('candy-glitter', false, true);
    // Phones: no clearcoat pass; the rim shader fakes the thin-film sheen.
    if (phone)
      return [
        rim(new THREE.MeshStandardMaterial({ color: colours[0], roughness: 0.2, metalness: 0.05 })),
        glitter(new THREE.MeshStandardMaterial({ color: colours[1], roughness: 0.45 })),
        rim(
          new THREE.MeshStandardMaterial({ color: colours[2], roughness: 0.15, metalness: 0.05 }),
        ),
      ].map((m) => plain(m, true));
    const grain = patch('candy', false, false);
    return [
      // Iridescent clear-coat: a thin film whose hue shifts with the angle.
      grain(
        new THREE.MeshPhysicalMaterial({
          color: colours[0],
          roughness: 0.22,
          metalness: 0.05,
          clearcoat: 1,
          clearcoatRoughness: 0.06,
          iridescence: 1,
          iridescenceIOR: 1.35,
          iridescenceThicknessRange: [180, 720],
        }),
      ),
      // Jelly: soft and sheeny.
      grain(
        new THREE.MeshPhysicalMaterial({
          color: colours[1],
          roughness: 0.35,
          sheen: 1,
          sheenColor: new THREE.Color('#ffd1f0'),
          sheenRoughness: 0.4,
          clearcoat: 0.6,
        }),
      ),
      // Hard candy gloss.
      grain(
        new THREE.MeshPhysicalMaterial({
          color: colours[2],
          roughness: 0.08,
          clearcoat: 1,
          clearcoatRoughness: 0.02,
        }),
      ),
      // Sugar glitter.
      glitter(new THREE.MeshStandardMaterial({ color: colours[3], roughness: 0.5 })),
      grain(
        new THREE.MeshPhysicalMaterial({
          color: colours[4],
          roughness: 0.2,
          clearcoat: 1,
          iridescence: 0.8,
          iridescenceIOR: 1.6,
          iridescenceThicknessRange: [300, 900],
        }),
      ),
      rim(new THREE.MeshStandardMaterial({ color: colours[5], roughness: 0.18 })),
    ].map((m) => plain(m, true));
  },
};

export const lookPool = (variant: VariantKey, dark: boolean, phone: boolean) => {
  const pool = pools[variant](dark, phone);
  return phone ? pool.slice(0, 3) : pool;
};

export const disposePool = (pool: LetterLook[]) =>
  pool.forEach((l) => {
    l.body.dispose();
    l.extra?.dispose();
  });
