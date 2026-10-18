import * as THREE from 'three';

/*
 * Per-concept surface pools for the 3D title. Like the typefaces, the surface
 * is part of each letter's variance: a flickering letter steps through its
 * concept's pool, and the lockup is mismatched in material too (a ransom note
 * of surfaces). Each concept has at most six looks (phones three, all cheap),
 * built once and swapped by reference, so the animation never recompiles.
 * No look glows: no phosphor halo, emissive or fresnel rim, additive layer or
 * blurred shadow; each concept's character is its colour and material.
 * Every look takes its colours from the 2D letter it stands in for (its CSS
 * colour on the face, the concept's stacked text-shadow on the extruded sides),
 * so looks differ in surface and light only and the colour scheme matches.
 */

export type Style = 'clay' | 'riso' | 'crt' | 'toon' | 'facet' | 'paper' | 'flat';

export type LetterLook = {
  // Front/back faces, then the extruded sides and bevel (TextGeometry groups).
  body: [THREE.Material, THREE.Material];
  // A second layer drawn from the same glyph (Uncanny Mirror's reflection,
  // Ink & Stitch's lifted stitches), where it sits (letter units). Never a glow.
  extra?: THREE.Material | null;
  offset?: [number, number, number];
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
  // Clay: wrapped diffuse and a glaze sheen (matte edges, no glowing rim).
  clay: `
  float wrap = clamp((dot(n, L) + 0.6) / 1.6, 0.0, 1.0);
  c = uA * (0.32 + 0.78 * wrap)
    + pow(max(dot(reflect(-L, n), v), 0.0), mix(8.0, 60.0, uSheen)) * mix(0.06, 0.5, uSheen);`,
  // Riso: solid ink overprinted by a 45° halftone of a second ink in the shade.
  riso: `
  float t = 1.0 - clamp(dot(n, L) * 0.5 + 0.5, 0.0, 1.0);
  vec2 r = mat2(0.7071, -0.7071, 0.7071, 0.7071) * gl_FragCoord.xy / uCell;
  float rad = sqrt(clamp(t * 1.1 - 0.1, 0.0, 1.0)) * 0.62;
  float m = smoothstep(rad, rad - 0.12, length(fract(r) - 0.5));
  c = mix(uA, uB, m);`,
  // Amber terminal: flat phosphor ink, crisp scanlines, optional static (no
  // glow, no hot edge).
  crt: `
  float d = clamp(dot(n, L), 0.0, 1.0);
  c = uA * (0.55 + 0.45 * d);
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

export type ShaderOpts = {
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
  additive?: boolean;
};

export const shader = (style: Style, o: ShaderOpts) =>
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
    transparent: (o.opacity ?? 1) < 1 || !!o.additive,
    depthWrite: (o.opacity ?? 1) >= 1,
    side: o.back ? THREE.BackSide : THREE.FrontSide,
    blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    toneMapped: false,
  });

// Patches three's lit materials after their colour-space conversion: film
// grain always, plus sugar-glitter sparkles.
export const patch = (key: string, glitter: boolean) => (m: THREE.Material) => {
  m.onBeforeCompile = (s) => {
    s.fragmentShader = s.fragmentShader.replace(
      '#include <dithering_fragment>',
      `#include <dithering_fragment>
      {
        float h = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
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

export const plain = (face: THREE.Material, side: THREE.Material, env = false): LetterLook => ({
  body: [face, side],
  env,
});

// Colours of the 2D letter a 3D letter stands in for.
export type LetterInk = { face: string; side: string };

// One material per (look, face/side): `make` builds it for a colour.
export const both = (ink: LetterInk, make: (colour: string) => THREE.Material, env = false) =>
  plain(make(ink.face), make(ink.side), env);

/*
 * The shadow the 3D letters cast on a backdrop plane just behind them, in
 * each concept's manner, always a crisp, unblurred offset (radius 1).
 * `dir` points from the word toward the light (x right, y up, z toward the
 * viewer); smaller z throws the shadow further from the letters.
 */
export type LetterShadow = {
  color: string;
  opacity: number;
  // Filter radius in shadow-map texels: 1, a hard edge (no blurred shadows).
  radius: number;
  dir: [number, number, number];
};

export type Pool = (ink: LetterInk, dark: boolean, phone: boolean) => LetterLook[];
