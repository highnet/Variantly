import type { ConceptLoaders } from '@/concepts/types';

import { CONCEPT_IDS, type ConceptId } from './metas';

export * from './metas';
export { FAMILIES, groupByFamily } from './families';

/*
 * The concept registry. Everything heavy is a lazy import, so only the active
 * concept's backdrop, scene and 3D look are ever downloaded and run; the
 * switcher prefetches a concept on hover/focus. Add a concept: see README.md.
 */
export const CONCEPT_LOADERS: Record<ConceptId, ConceptLoaders> = {
  a: {
    backdrop: () => import('./a/Backdrop'),
    scene: () => import('./a/scene'),
    look: () => import('./a/look'),
  },
  b: {
    backdrop: () => import('./b/Backdrop'),
    scene: () => import('./b/scene'),
    look: () => import('./b/look'),
  },
  c: {
    backdrop: () => import('./c/Backdrop'),
    scene: () => import('./c/scene'),
    look: () => import('./c/look'),
  },
  d: {
    backdrop: () => import('./d/Backdrop'),
    scene: () => import('./d/scene'),
    look: () => import('./d/look'),
  },
  e: {
    backdrop: () => import('./e/Backdrop'),
    scene: () => import('./e/scene'),
    look: () => import('./e/look'),
  },
  f: {
    backdrop: () => import('./f/Backdrop'),
    scene: () => import('./f/scene'),
    look: () => import('./f/look'),
  },
  g: {
    backdrop: () => import('./g/Backdrop'),
    scene: () => import('./g/scene'),
    look: () => import('./g/look'),
  },
  h: {
    backdrop: () => import('./h/Backdrop'),
    scene: () => import('./h/scene'),
    look: () => import('./h/look'),
  },
  i: {
    backdrop: () => import('./i/Backdrop'),
    scene: () => import('./i/scene'),
    look: () => import('./i/look'),
  },
  j: {
    backdrop: () => import('./j/Backdrop'),
    scene: () => import('./j/scene'),
    look: () => import('./j/look'),
  },
  k: {
    backdrop: () => import('./k/Backdrop'),
    scene: () => import('./k/scene'),
    look: () => import('./k/look'),
  },
  l: {
    backdrop: () => import('./l/Backdrop'),
    scene: () => import('./l/scene'),
    look: () => import('./l/look'),
  },
  m: {
    backdrop: () => import('./m/Backdrop'),
    scene: () => import('./m/scene'),
    look: () => import('./m/look'),
  },
  n: {
    backdrop: () => import('./n/Backdrop'),
    scene: () => import('./n/scene'),
    look: () => import('./n/look'),
  },
  o: {
    backdrop: () => import('./o/Backdrop'),
    scene: () => import('./o/scene'),
    look: () => import('./o/look'),
  },
  p: {
    backdrop: () => import('./p/Backdrop'),
    scene: () => import('./p/scene'),
    look: () => import('./p/look'),
  },
  q: {
    backdrop: () => import('./q/Backdrop'),
    scene: () => import('./q/scene'),
    look: () => import('./q/look'),
  },
  r: {
    backdrop: () => import('./r/Backdrop'),
    scene: () => import('./r/scene'),
    look: () => import('./r/look'),
  },
  s: {
    backdrop: () => import('./s/Backdrop'),
    scene: () => import('./s/scene'),
    look: () => import('./s/look'),
  },
  t: {
    backdrop: () => import('./t/Backdrop'),
    scene: () => import('./t/scene'),
    look: () => import('./t/look'),
  },
};

const warm = new Map<string, Promise<unknown>>();

// Fetches (once) a concept's backdrop and look; with `scene`, its three.js
// scene too. Resolves when they are ready; never rejects.
export const prefetchConcept = (id: ConceptId, scene = false): Promise<unknown> => {
  const parts: [string, () => Promise<unknown>][] = [
    ['backdrop', CONCEPT_LOADERS[id].backdrop],
    ['look', CONCEPT_LOADERS[id].look],
  ];
  if (scene) parts.push(['scene', CONCEPT_LOADERS[id].scene]);
  return Promise.all(
    parts.map(([part, load]) => {
      const key = `${id}:${part}`;
      if (!warm.has(key))
        warm.set(
          key,
          load().catch(() => warm.delete(key)),
        );
      return warm.get(key);
    }),
  );
};

export const conceptAt = (id: ConceptId, by: number) => {
  const at = CONCEPT_IDS.indexOf(id);
  return CONCEPT_IDS[(at + by + CONCEPT_IDS.length * 4) % CONCEPT_IDS.length];
};
