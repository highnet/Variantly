import * as THREE from 'three';

/*
 * The title's Principled BSDF. Every concept's letters are a
 * MeshPhysicalMaterial (base colour, metallic, roughness, IOR, transmission,
 * clear coat, sheen, iridescence) lit by the scene's moving key light and the
 * studio environment, so highlights and reflections are physically placed and
 * glide with the pointer. A concept's character rides on top as small GLSL
 * hooks spliced into three's own shader, never replacing its lighting:
 *
 * - albedo: the base colour before lighting (wood grain, stone, brush ink,
 *   paper fibre, plaster cracks). Writes `diffuseColor.rgb`.
 * - rough: per-pixel roughness (brushed metal, wet ink). Writes
 *   `roughnessFactor`.
 * - normal: micro-surface (stone tooth, thread cords, corrugation). Bends
 *   `normal` (view space).
 * - post: a print/screen treatment of the lit result (halftone, scanlines,
 *   dither, cel bands, projector flicker). Writes `gl_FragColor` in display
 *   space; `vyLit` is how lit the fragment is relative to its base colour
 *   (1 = as bright as the ink, above 1 = in the highlight).
 *
 * Hooks see `vObj` (object-space position: glyph units, 1em = 2, front face
 * at z = 0), `vyFront` (1 on the front cap), `vyHash` and `vyNoise`, plus the
 * material's own uniforms. Programs are shared per `key`; uniforms are per
 * material. No glow: no emission, no additive layer.
 */
export type BsdfHooks = {
  albedo?: string;
  rough?: string;
  normal?: string;
  post?: string;
  // GLSL declarations the hooks use (uniforms, helpers).
  decl?: string;
};

export type BsdfOpts = THREE.MeshPhysicalMaterialParameters & {
  // Shared program per key: one key per distinct set of hooks.
  key: string;
  hooks?: BsdfHooks;
  uniforms?: Record<string, THREE.IUniform>;
  // Film grain to match the backdrop's, in display space.
  grain?: number;
};

const COMMON = /* glsl */ `
varying vec3 vObj;
varying float vyFront;
float vyHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float vyNoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(vyHash(i), vyHash(i + vec2(1.0, 0.0)), f.x),
             mix(vyHash(i + vec2(0.0, 1.0)), vyHash(i + 1.0), f.x), f.y);
}
float vyLum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
uniform float uGrain;
vec3 vyBase;
`;

export const bsdf = ({ key, hooks = {}, uniforms = {}, grain = 0.04, ...params }: BsdfOpts) => {
  const m = new THREE.MeshPhysicalMaterial(params);
  const own = { ...uniforms, uGrain: { value: grain } };
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, own);
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObj;\nvarying float vyFront;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvObj = position;\nvyFront = step(0.92, normal.z);',
      );
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>\n${COMMON}\n${hooks.decl ?? ''}`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>\n{\n${hooks.albedo ?? ''}\n}\nvyBase = diffuseColor.rgb;`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>\n{\n${hooks.rough ?? ''}\n}`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>\n{\n${hooks.normal ?? ''}\n}`,
      )
      .replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
        {
          float vyLit = vyLum(gl_FragColor.rgb) / max(vyLum(sRGBTransferOETF(vec4(vyBase, 1.0)).rgb), 0.02);
          ${hooks.post ?? ''}
        }
        gl_FragColor.rgb += (vyHash(gl_FragCoord.xy) - 0.5) * uGrain;`,
      );
  };
  m.customProgramCacheKey = () => `vy-bsdf-${key}`;
  return m;
};
