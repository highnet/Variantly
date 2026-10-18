import type { ConceptMeta } from '@/concepts/types';

export const meta: ConceptMeta = {
  id: 'm',
  name: 'Uncanny Mirror',
  // Hidden from the switcher until it meets the bar of the live concepts;
  // open it with ?v=m or ?drafts=1 to work on it.
  status: 'draft',
  family: 'Light & Illusion',
  swatch: { light: ['#e7ecf1', '#6f8fb8', '#7a63b8'], dark: ['#0d0f14', '#8fb4e6', '#9a82e0'] },
  font: 'var(--font-mirror)',
  grain: 0.1,
};
