import type { ConceptMeta } from '@/concepts/types';

// Placeholder from .impeccable/decision/concepts-13.json (scripts/scaffold-concept.mjs).
export const meta: ConceptMeta = {
  id: 'm',
  name: 'Uncanny Mirror',
  family: 'Light & Illusion',
  swatch: { light: ['#6f8fb8', '#a7a9b4', '#1f2229'], dark: ['#8fb4e6', '#3c3f4a', '#e3e8ef'] },
  font: "'Italiana', var(--font-martian)",
  grain: 0.12,
  // Hidden from the switcher until it is built; preview with ?drafts=1.
  status: 'draft',
};
