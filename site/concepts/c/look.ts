import { shader, both } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

export const look: ConceptLook = {
  pool: (ink, dark, phone) => {
    const px = phone ? 1 : Math.min(devicePixelRatio, 1.5);
    const tubes: [number, number][] = [
      [3, 0],
      [4, 0.5],
      [2, 0],
      [5, 0.6],
      [3, 0.3],
      [4, 0],
    ];
    // Flat phosphor ink and scanlines: no glow hull.
    return tubes.map(([cell, noise], k) =>
      both(ink, (a) =>
        shader('crt', { a, cell: cell * px, noise, seed: k * 3.7, grain: dark ? 0.05 : 0.04 }),
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
