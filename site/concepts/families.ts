import type { ConceptMeta } from '@/concepts/types';

// Switcher column order. A family named in a meta.ts but missing here is
// appended after these, so a concept can never be hidden by its family.
export const FAMILIES = ['Print & Type', 'Hand & Material', 'Screen & Signal', 'Light & Illusion'];

export const groupByFamily = (concepts: ConceptMeta[]) => {
  const names = [...FAMILIES, ...concepts.map((c) => c.family)].filter(
    (f, i, all) => all.indexOf(f) === i,
  );
  return names
    .map((family) => ({ family, concepts: concepts.filter((c) => c.family === family) }))
    .filter((g) => g.concepts.length > 0);
};
