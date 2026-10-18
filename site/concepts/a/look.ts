import { shader, both } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

export const look: ConceptLook = {
  pool: (ink, dark) => {
    const b = dark ? '#ff9f80' : '#ffd9c4';
    return [0, 0.6, 0.2, 0.8, 0.35, 0.9].map((sheen) =>
      both(ink, (a) => shader('clay', { a, b, sheen, grain: 0.045 })),
    );
  },
  shadow: (dark) => ({
    color: dark ? '#1a0408' : '#8a3a1c',
    opacity: dark ? 0.5 : 0.3,
    radius: 1,
    dir: [-0.3, 0.6, 1],
  }),
};
