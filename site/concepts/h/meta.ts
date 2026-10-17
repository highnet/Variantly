import type { ConceptMeta } from '@/concepts/types';

// Placeholder from .impeccable/decision/concepts-13.json (scripts/scaffold-concept.mjs).
export const meta: ConceptMeta = {
  id: 'h',
  name: 'Dither Machine',
  family: 'Screen & Signal',
  swatch: { light: ['#b5482a', '#efe7d6', '#1b1915'], dark: ['#d0623f', '#0e0e0e', '#e9e2cf'] },
  font: "'Silkscreen', var(--font-martian)",
  grain: 0.12,
  // Hidden from the switcher until it is built; preview with ?drafts=1.
  status: 'draft',
};
