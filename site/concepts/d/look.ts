import { bsdf } from '@/lib/bsdf';
import { both } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

/*
 * d · Brutal Zine: gloss ink, photocopied. The letter is lit as glossy ink,
 * then the copier posterises it: three hard tone bands from how lit it is,
 * hatching in the shade (desktop), and the specular blown out to a clipped
 * white highlight that slides with the light.
 */
const POST = /* glsl */ `
  vec3 base = sRGBTransferOETF(vec4(vyBase, 1.0)).rgb;
  float band = vyLit > 0.82 ? 1.0 : vyLit > 0.42 ? 0.74 : 0.5;
  float hatch = step(0.5, fract((gl_FragCoord.x + gl_FragCoord.y) / 5.0));
  band *= band < 1.0 ? mix(1.0, 0.55 + 0.45 * hatch, uHatch) : 1.0;
  // The highlight: how far the lit ink rose above the ink itself (absolute,
  // so black ink's gloss blows out too).
  float hi = step(0.26, vyLum(gl_FragColor.rgb) - vyLum(base));
  gl_FragColor.rgb = base * band + hi * 0.55;
`;

export const look: ConceptLook = {
  pool: (ink, _dark, phone) =>
    [0, 1, 0, 1, 0, 1].map((hatch, k) =>
      both(
        ink,
        (a) =>
          bsdf({
            key: 'd-zine',
            color: a,
            roughness: 0.22 + (k % 3) * 0.06,
            clearcoat: 0.6,
            clearcoatRoughness: 0.05,
            grain: 0.05,
            hooks: { decl: 'uniform float uHatch;', post: POST },
            uniforms: { uHatch: { value: phone ? 0 : hatch } },
          }),
        true,
      ),
    ),
  shadow: (dark) => ({
    color: dark ? '#ff3d00' : '#000000',
    opacity: dark ? 0.6 : 0.3,
    radius: 1,
    dir: [-0.35, 0.35, 1],
  }),
};
