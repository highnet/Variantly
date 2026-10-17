import type { ConceptMeta } from '@/concepts/types';

// Placeholder from .impeccable/decision/concepts-13.json (scripts/scaffold-concept.mjs).
export const meta: ConceptMeta = {
  id: 'n',
  name: 'Noir Velvet',
  family: 'Light & Illusion',
  swatch: { light: ['#6e1420', '#c79a5b', '#140d0c'], dark: ['#9b1c2c', '#d4a96a', '#f1e6d8'] },
  font: "'Bodoni Moda', var(--font-martian)",
  grain: 0.12,
  // Hidden from the switcher until it is built; preview with ?drafts=1.
  status: 'draft',
};
