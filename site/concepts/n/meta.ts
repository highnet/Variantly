import type { ConceptMeta } from '@/concepts/types';

export const meta: ConceptMeta = {
  id: 'n',
  name: 'Orientation Reel',
  family: 'Light & Illusion',
  swatch: { light: ['#f4f2ee', '#8f8b85', '#141312'], dark: ['#eeebe6', '#5c5954', '#0f0e0d'] },
  font: 'var(--font-reel)',
  grain: 0.16,
  // Hidden from the switcher until it is built; preview with ?drafts=1.
  status: 'draft',
};
