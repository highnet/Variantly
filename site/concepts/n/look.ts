import { both, shader } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

/* n · Noir Velvet: placeholder look (soft clay sheen in the letter's colour). */
export const look: ConceptLook = {
  pool: (ink, dark) => {
    const b = dark ? '#d4a96a' : '#c79a5b';
    return [0, 0.6, 0.2, 0.8, 0.35, 0.9].map((sheen) =>
      both(ink, (a) => shader('clay', { a, b, sheen, grain: 0.04 })),
    );
  },
  shadow: (dark) => ({
    color: dark ? '#000000' : '#140d0c',
    opacity: dark ? 0.45 : 0.22,
    radius: 6,
    dir: [-0.3, 0.55, 1],
  }),
};
