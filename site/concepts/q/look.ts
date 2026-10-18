import { both, shader } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

/* q · Sticker Bomb: placeholder look (soft clay sheen in the letter's colour). */
export const look: ConceptLook = {
  pool: (ink, dark) => {
    const b = dark ? '#00c2ff' : '#00c2ff';
    return [0, 0.6, 0.2, 0.8, 0.35, 0.9].map((sheen) =>
      both(ink, (a) => shader('clay', { a, b, sheen, grain: 0.04 })),
    );
  },
  shadow: (dark) => ({
    color: dark ? '#000000' : '#111111',
    opacity: dark ? 0.45 : 0.22,
    radius: 1,
    dir: [-0.3, 0.55, 1],
  }),
};
