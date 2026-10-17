import * as THREE from 'three';

import type { VariantKey } from '@/components/backdrop/variants';

/*
 * Per-concept surface shaders for the 3D title. Each concept gets a body
 * material and, where its look needs one, an "extra" layer drawn from the same
 * glyph: an ink outline hull (brutal), a misregistered second ink (riso) or a
 * pasted-paper drop shadow (cut & paste). All are cheap single-pass shaders
 * except the desktop candy clear-coat; phones get the cheap path everywhere.
 */

type Style = 'clay' | 'riso' | 'crt' | 'toon' | 'facet' | 'paper' | 'flat';

export type LetterLook = {
  body: THREE.Material;
  extra: THREE.Material | null;
  // Where the extra layer sits relative to the glyph (letter units).
  offset: [number, number, number];
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
  // Soft matte clay: wrapped diffuse, a warm subsurface-ish rim, faint sheen.
  clay: `
  float wrap = clamp((dot(n, L) + 0.6) / 1.6, 0.0, 1.0);
  float rim = pow(1.0 - abs(dot(n, v)), 3.0);
  c = uA * (0.32 + 0.78 * wrap) + uB * rim * 0.35
    + pow(max(dot(reflect(-L, n), v), 0.0), 8.0) * 0.06;`,
  // Riso: solid ink overprinted by a 45° halftone of a second ink in the shade.
  riso: `
  float t = 1.0 - clamp(dot(n, L) * 0.5 + 0.5, 0.0, 1.0);
  vec2 r = mat2(0.7071, -0.7071, 0.7071, 0.7071) * gl_FragCoord.xy / uCell;
  float rad = sqrt(clamp(t * 1.1 - 0.1, 0.0, 1.0)) * 0.62;
  float m = smoothstep(rad, rad - 0.12, length(fract(r) - 0.5));
  c = mix(uA, uB, m);`,
  // TVA terminal: phosphor glow with a hot fresnel edge and scanlines.
  crt: `
  float fres = pow(1.0 - abs(dot(n, v)), 2.0);
  float d = clamp(dot(n, L), 0.0, 1.0);
  c = uA * (0.55 + 0.45 * d) + uB * fres * 1.1;
  c *= 0.74 + 0.26 * step(0.5, fract(gl_FragCoord.y / uCell));`,
  // Brutal zine: hard three-band cel shading with a clipped highlight.
  toon: `
  float d = dot(n, L);
  float band = d > 0.5 ? 1.0 : d > -0.05 ? 0.74 : 0.5;
  c = uA * band + step(0.965, dot(reflect(-L, n), v)) * 0.55;`,
  // Bauhaus: per-triangle facet normals, two crisp tones.
  facet: `
  vec3 fn = normalize(cross(dFdx(-vV), dFdy(-vV)));
  float d = dot(fn, L);
  c = uA * (d > 0.4 ? 1.0 : d > 0.0 ? 0.82 : 0.66);`,
  // Cut & paste: matte paper with fibre speckle and slightly darker cut edges.
  paper: `
  float fibre = hash(floor(vObj.xy * 55.0) + uSeed);
  float d = clamp(dot(n, L) * 0.5 + 0.5, 0.0, 1.0);
  c = uA * (0.8 + 0.2 * d) * (0.93 + 0.07 * fibre) * mix(0.82, 1.0, abs(n.z));`,
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
    },
    transparent: (o.opacity ?? 1) < 1,
    depthWrite: (o.opacity ?? 1) >= 1,
    side: o.back ? THREE.BackSide : THREE.FrontSide,
    toneMapped: false,
  });

// Grain (and, on phones, a fresnel rim with an iridescent hue shift) patched
// into three's lit materials, appended after their colour-space conversion.
const candyPatch = (rim: boolean) => (s: THREE.WebGLProgramParametersWithUniforms) => {
  s.fragmentShader = s.fragmentShader.replace(
    '#include <dithering_fragment>',
    `#include <dithering_fragment>
    {
      ${
        rim
          ? `float f = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.2);
      vec3 irid = 0.5 + 0.5 * cos(6.2831 * (f * 1.3 + vec3(0.0, 0.33, 0.67)));
      gl_FragColor.rgb += irid * f * 0.5;`
          : ''
      }
      gl_FragColor.rgb += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.03;
    }`,
  );
};

const pick = (list: string[], i: number) => list[i % list.length];

const CLAY = ['#d9785c', '#6fa585', '#d9a933', '#7f95cf', '#c76f98'];
const RISO = ['#ff48b0', '#0078bf', '#ffe800', '#00a95c', '#ff6c2f'];
const BRUTAL = ['#ffe600', '#ff3b00', '#ffffff', '#00c2ff', '#ff3b00'];
const PAPER = ['#f4d35e', '#ee964b', '#f95738', '#83c5be', '#fdfdf7', '#d9d4c7', '#b8b8ff'];
export const CANDY = ['#ff2d87', '#6a3dff', '#00b4e6', '#ff9a00', '#13c27a'];

export const letterLook = (
  variant: VariantKey,
  dark: boolean,
  phone: boolean,
  i: number,
): LetterLook => {
  const none = { extra: null, offset: [0, 0, 0] as [number, number, number] };
  // Halftone and scanline cells in device pixels.
  const px = phone ? 1 : Math.min(devicePixelRatio, 1.5);
  switch (variant) {
    case 'a':
      return {
        body: shader('clay', { a: pick(CLAY, i), b: dark ? '#ff9f80' : '#ffd9c4', grain: 0.045 }),
        ...none,
      };
    case 'b':
      return {
        body: shader('riso', { a: pick(RISO, i), b: pick(RISO, i + 2), cell: 5 * px }),
        extra: shader('flat', { a: pick(RISO, i + 1), opacity: 0.55, grain: 0.06 }),
        offset: [0.09, -0.07, -0.08],
      };
    case 'c': {
      const green = dark && i % 4 === 3;
      return {
        body: shader('crt', {
          a: green ? '#1fd873' : dark ? '#ff9e1f' : '#c2560e',
          b: green ? '#a6ffcf' : dark ? '#ffd27a' : '#ff9d3c',
          cell: 3 * px,
          grain: 0.05,
        }),
        ...none,
      };
    }
    case 'd':
      return {
        body: shader('toon', { a: pick(BRUTAL, i), grain: 0.02 }),
        // Inverted hull: back faces pushed out along the normals read as ink.
        extra: shader('flat', {
          a: dark ? '#f1ece2' : '#000000',
          push: 0.07,
          back: true,
          grain: 0,
        }),
        offset: [0, 0, 0],
      };
    case 'e':
      return {
        body: shader('facet', {
          a: pick(['#e1261c', '#1f4fa3', '#f2c400', dark ? '#f0ebe0' : '#111111'], i),
          grain: 0.02,
        }),
        ...none,
      };
    case 'f': {
      // Ransom note: a scrambled but stable colour per letter.
      const k = (i * 5 + 3) % PAPER.length;
      return {
        body: shader('paper', { a: PAPER[k], seed: i * 7.1, grain: 0.04 }),
        extra: shader('flat', { a: '#000000', opacity: dark ? 0.55 : 0.28, grain: 0 }),
        offset: [0.14, -0.14, -0.35],
      };
    }
    default: {
      const color = pick(CANDY, i);
      // Desktop: iridescent clear-coat whose thin film shifts hue with angle.
      // Phones skip the second (clearcoat) lighting pass and fake the sheen.
      const body = phone
        ? new THREE.MeshStandardMaterial({ color, roughness: 0.2, metalness: 0.05 })
        : new THREE.MeshPhysicalMaterial({
            color,
            roughness: 0.22,
            metalness: 0.05,
            clearcoat: 1,
            clearcoatRoughness: 0.06,
            iridescence: 1,
            iridescenceIOR: 1.35,
            iridescenceThicknessRange: [180, 720],
          });
      body.onBeforeCompile = candyPatch(phone);
      body.customProgramCacheKey = () => (phone ? 'candy-rim' : 'candy');
      return { body, ...none };
    }
  }
};
