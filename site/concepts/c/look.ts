import { shader, both } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

export const look: ConceptLook = {
  pool: (ink, dark, phone) => {
    const px = phone ? 1 : Math.min(devicePixelRatio, 1.5);
    const hot = dark ? '#ffe2a8' : '#5fd6cc';
    const tubes: [number, number][] = [
      [3, 0],
      [4, 0.5],
      [2, 0],
      [5, 0.6],
      [3, 0.3],
      [4, 0],
    ];
    return tubes.map(([cell, noise], k) => ({
      ...both(ink, (a) =>
        shader('crt', { a, b: hot, cell: cell * px, noise, seed: k * 3.7, grain: 0.05 }),
      ),
      // The phosphor glow: a pushed-out back-face hull, added to the screen.
      extra: shader('flat', {
        a: ink.face,
        opacity: dark ? 0.3 : 0.18,
        push: 0.08,
        back: true,
        additive: true,
        grain: 0,
      }),
    }));
  },
  shadow: (dark) => ({
    color: '#000000',
    opacity: dark ? 0.4 : 0.2,
    radius: 10,
    dir: [0, 0.45, 1],
  }),
};
