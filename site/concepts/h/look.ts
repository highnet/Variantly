import { both, shader } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

/* h · Dither Machine: placeholder look (soft clay sheen in the letter's colour). */
export const look: ConceptLook = {
  pool: (ink, dark) => {
    const b = dark ? '#d0623f' : '#b5482a';
    return [0, 0.6, 0.2, 0.8, 0.35, 0.9].map((sheen) =>
      both(ink, (a) => shader('clay', { a, b, sheen, grain: 0.04 })),
    );
  },
  shadow: (dark) => ({
    color: dark ? '#000000' : '#1b1915',
    opacity: dark ? 0.45 : 0.22,
    radius: 1,
    dir: [-0.3, 0.55, 1],
  }),
};
