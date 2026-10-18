import { bsdf } from '@/lib/bsdf';
import { both } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

/*
 * c · Amber Terminal: phosphor behind tube glass. A satin phosphor body under
 * a hard clear coat (the tube's curved glass), so the key light glints across
 * the glass while scanlines and a little static cross the phosphor. No glow.
 */
const POST = /* glsl */ `
  gl_FragColor.rgb *= 0.76 + 0.24 * step(0.5, fract(gl_FragCoord.y / uCell));
  gl_FragColor.rgb *= 1.0 + uNoise * (vyHash(floor(gl_FragCoord.xy / 2.0) + uSeed) - 0.5) * 1.2;
`;

export const look: ConceptLook = {
  pool: (ink, dark, phone) => {
    const px = phone ? 1 : Math.min(devicePixelRatio, 1.5);
    // [scanline cell, static, roughness]
    const tubes: [number, number, number][] = [
      [3, 0, 0.5],
      [4, 0.5, 0.35],
      [2, 0, 0.6],
      [5, 0.6, 0.4],
      [3, 0.3, 0.45],
      [4, 0, 0.55],
    ];
    return tubes.map(([cell, noise, roughness], k) =>
      both(
        ink,
        (a) =>
          bsdf({
            key: 'c-crt',
            color: a,
            roughness,
            clearcoat: 1,
            clearcoatRoughness: 0.04,
            grain: dark ? 0.08 : 0.06,
            hooks: {
              decl: 'uniform float uCell; uniform float uNoise; uniform float uSeed;',
              post: POST,
            },
            uniforms: {
              uCell: { value: cell * px },
              uNoise: { value: noise },
              uSeed: { value: k * 3.7 },
            },
          }),
        true,
      ),
    );
  },
  shadow: (dark) => ({
    color: '#000000',
    opacity: dark ? 0.4 : 0.2,
    radius: 1,
    dir: [0, 0.45, 1],
  }),
};
