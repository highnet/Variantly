import type { ConceptMeta } from '@/concepts/types';

// Placeholder from .impeccable/decision/concepts-13.json (scripts/scaffold-concept.mjs).
export const meta: ConceptMeta = {
  id: 'q',
  name: 'Sticker Bomb',
  family: 'Print & Type',
  swatch: { light: ['#ff3ea5', '#00c2ff', '#111111'], dark: ['#ff3ea5', '#00c2ff', '#fafafa'] },
  font: "'Rubik Mono One', var(--font-martian)",
  grain: 0.12,
  // Hidden from the switcher until it is built; preview with ?drafts=1.
  status: 'draft',
};
