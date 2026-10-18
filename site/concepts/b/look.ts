import * as THREE from 'three';

import { bsdf } from '@/lib/bsdf';
import { both } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

/*
 * b · Riso Poster: soy ink on uncoated stock, overprinted. The letter is lit
 * as satin ink; wherever it turns from the light, a 45° halftone of the
 * second ink (the concept's offset blue) prints over it, so the halftone
 * moves as the light does.
 */
const POST = /* glsl */ `
  float t = clamp(1.0 - vyLit, 0.0, 1.0);
  vec2 r = mat2(0.7071, -0.7071, 0.7071, 0.7071) * gl_FragCoord.xy / uCell;
  float rad = sqrt(clamp(t * 1.25 - 0.08, 0.0, 1.0)) * 0.64;
  float dots = smoothstep(rad, rad - 0.12, length(fract(r) - 0.5));
  gl_FragColor.rgb = mix(gl_FragColor.rgb, sRGBTransferOETF(vec4(uInk2, 1.0)).rgb, dots);
`;

export const look: ConceptLook = {
  pool: (ink, _dark, phone) => {
    const px = phone ? 1 : Math.min(devicePixelRatio, 1.5);
    const ink2 = new THREE.Color('#2f5bff');
    return [4, 6, 5, 8, 3, 7].map((cell, k) =>
      both(
        ink,
        (a) =>
          bsdf({
            key: 'b-riso',
            color: a,
            roughness: 0.62 + (k % 3) * 0.08,
            sheen: 0.35,
            sheenColor: new THREE.Color('#ffffff'),
            sheenRoughness: 0.7,
            grain: 0.05,
            hooks: { decl: 'uniform vec3 uInk2; uniform float uCell;', post: POST },
            uniforms: { uInk2: { value: ink2 }, uCell: { value: cell * px } },
          }),
        true,
      ),
    );
  },
  shadow: () => ({ color: '#2f5bff', opacity: 0.6, radius: 1, dir: [-0.42, 0.3, 1] }),
};
