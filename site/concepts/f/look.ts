import { shader, both, type ShaderOpts } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

export const look: ConceptLook = {
  pool: (ink) =>
    (
      [
        { seed: 1.3 },
        { stripe: 1, seed: 2.1 },
        { noise: 1, cell: 4, seed: 3.7 },
        { seed: 4.2 },
        { stripe: 1, seed: 5.9 },
        { noise: 1, cell: 3, seed: 6.4 },
      ] as Omit<ShaderOpts, 'a'>[]
    ).map((o) => both(ink, (a) => shader('paper', { a, ...o }))),
  shadow: (dark) => ({
    color: '#000000',
    opacity: dark ? 0.55 : 0.35,
    radius: 1,
    dir: [-0.3, 0.42, 1],
  }),
};
