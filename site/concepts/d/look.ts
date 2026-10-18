import { shader, both } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

export const look: ConceptLook = {
  pool: (ink, _dark, phone) =>
    [0, 1, 0, 1, 0, 1].map((hatch) =>
      both(ink, (a) => shader('toon', { a, hatch: phone ? 0 : hatch, cell: 5, grain: 0.02 })),
    ),
  shadow: (dark) => ({
    color: dark ? '#ff3d00' : '#000000',
    opacity: dark ? 0.6 : 0.3,
    radius: 1,
    dir: [-0.35, 0.35, 1],
  }),
};
