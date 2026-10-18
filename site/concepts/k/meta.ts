import type { ConceptMeta } from '@/concepts/types';

export const meta: ConceptMeta = {
  id: 'k',
  name: 'Ink & Stitch',
  family: 'Hand & Material',
  swatch: { light: ['#f3ecdf', '#a8432a', '#1d1a17'], dark: ['#efe6d6', '#d0623f', '#15120f'] },
  font: 'var(--font-brush)',
  grain: 0.08,
  // Hidden from the switcher until it is built; preview with ?drafts=1.
  status: 'draft',
};
