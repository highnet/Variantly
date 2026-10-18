import type { ConceptMeta } from '@/concepts/types';

export const meta: ConceptMeta = {
  id: 'l',
  name: 'Inflated Chrome',
  // Hidden from the switcher until it meets the bar of the live concepts;
  // open it with ?v=l or ?drafts=1 to work on it.
  status: 'draft',
  family: 'Light & Illusion',
  swatch: { light: ['#c6ff00', '#9b9b9b', '#0a0a0a'], dark: ['#c6ff00', '#eaeaea', '#050505'] },
  font: 'var(--font-chrome)',
  grain: 0.05,
};
