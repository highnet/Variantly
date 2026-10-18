import { shader, both, type Style } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

export const look: ConceptLook = {
  pool: (ink) =>
    (['facet', 'flat', 'facet', 'flat', 'facet', 'flat'] as Style[]).map((style) =>
      both(ink, (a) => shader(style, { a, grain: 0.02 })),
    ),
  shadow: (dark) => ({
    color: '#000000',
    opacity: dark ? 0.45 : 0.2,
    radius: 1,
    dir: [-0.35, 0.35, 1],
  }),
};
