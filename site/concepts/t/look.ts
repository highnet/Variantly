import { bsdf } from '@/lib/bsdf';
import { plain } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

/*
 * t · Stone & Linen: honed limestone. A matte BSDF face in the 2D letter's
 * colour with micro-relief in the normal (value noise, so the moving light
 * rakes across the grain), faint fossil flecks and a slow tonal drift; the
 * sides in the darker stone of its drop.
 */
const DECL = /* glsl */ `
uniform float uSeed; uniform float uBump; uniform float uFleck;
`;
const ALBEDO = /* glsl */ `
  vec2 p = vObj.xy * 6.0 + uSeed;
  float h0 = vyNoise(p) + 0.5 * vyNoise(p * 2.7);
  float fleck = step(1.0 - uFleck, vyHash(floor(vObj.xy * 90.0 + uSeed)));
  diffuseColor.rgb *= (0.94 + 0.1 * h0) * (1.0 - fleck * 0.18);
`;
const NORMAL = /* glsl */ `
  vec2 p = vObj.xy * 6.0 + uSeed;
  float e = 0.05;
  vec2 g = vec2(vyNoise(p + vec2(e, 0.0)) - vyNoise(p - vec2(e, 0.0)),
                vyNoise(p + vec2(0.0, e)) - vyNoise(p - vec2(0.0, e))) / (2.0 * e);
  normal = normalize(normal + vec3(g * uBump, 0.0) * abs(normal.z));
`;

const stone = (a: string, seed: number, bump: number, fleck: number) =>
  bsdf({
    key: 't-stone',
    color: a,
    roughness: 0.82,
    grain: 0.025,
    hooks: { decl: DECL, albedo: ALBEDO, normal: NORMAL },
    uniforms: { uSeed: { value: seed }, uBump: { value: bump }, uFleck: { value: fleck } },
  });

export const look: ConceptLook = {
  pool: (ink) =>
    (
      [
        [0.4, 0.05, 0.02],
        [3.1, 0.08, 0.035],
        [6.7, 0.03, 0.015],
        [1.9, 0.07, 0.03],
        [8.3, 0.05, 0.025],
        [5.2, 0.09, 0.02],
      ] as const
    ).map(([seed, bump, fleck]) =>
      plain(stone(ink.face, seed, bump, fleck), stone(ink.side, seed + 1, bump, fleck), true),
    ),
  shadow: (dark) => ({
    color: dark ? '#000000' : '#3b3026',
    opacity: dark ? 0.5 : 0.2,
    radius: 1,
    dir: [-0.55, 0.5, 0.75],
  }),
};
