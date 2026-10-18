import { shader, both } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

export const look: ConceptLook = {
  pool: (ink, _dark, phone) => {
    const px = phone ? 1 : Math.min(devicePixelRatio, 1.5);
    // The overprint's second ink is the concept's offset blue.
    return [4, 6, 5, 8, 3, 7].map((cell) =>
      both(ink, (a) => shader('riso', { a, b: '#2f5bff', cell: cell * px })),
    );
  },
  shadow: () => ({ color: '#2f5bff', opacity: 0.6, radius: 1, dir: [-0.42, 0.3, 1] }),
};
