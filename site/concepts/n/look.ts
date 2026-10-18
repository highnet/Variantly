import { bsdf } from '@/lib/bsdf';
import { both } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

/*
 * n · Orientation Reel: matte title letters, lit like a projected frame. A
 * soft matte screen material (the faintest sheen, a little speckle), and the
 * projector's lamp flickers slightly: every letter reads one shared
 * luminance from the page clock, stepped at 12 frames a second, set in
 * onBeforeRender (no allocation per frame). Strictly neutral: no hue, no glow.
 */
const flick = { value: 1 };
const hash = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const ALBEDO = /* glsl */ `
  diffuseColor.rgb *= 0.95 + 0.05 * vyHash(floor(vObj.xy * 40.0) + uSeed);
`;
const POST = /* glsl */ `
  gl_FragColor.rgb *= uFlick;
`;

export const look: ConceptLook = {
  pool: (ink) =>
    [1, 2, 3, 4, 5, 6].map((seed) =>
      both(
        ink,
        (a) => {
          const m = bsdf({
            key: 'n-reel',
            color: a,
            roughness: 0.68 + (seed % 3) * 0.06,
            sheen: 0.2,
            sheenRoughness: 0.8,
            grain: 0.06,
            hooks: {
              decl: 'uniform float uFlick; uniform float uSeed;',
              albedo: ALBEDO,
              post: POST,
            },
            uniforms: { uFlick: flick, uSeed: { value: seed } },
          });
          m.onBeforeRender = () => {
            flick.value = 1 - 0.05 * hash(Math.floor(performance.now() / 83) % 288);
          };
          return m;
        },
        true,
      ),
    ),
  // A hard projector shadow, cast down and to the right.
  shadow: (dark) => ({
    color: '#000000',
    opacity: dark ? 0.6 : 0.42,
    radius: 1,
    dir: [-0.35, 0.5, 1],
  }),
};
