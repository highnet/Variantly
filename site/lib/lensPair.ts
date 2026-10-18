import { conceptAt, type ConceptId } from '@/concepts';

// Every concept has one fixed concept behind its door: the next one on the
// dock's step order (concepts/index.ts), so the Lens door, the headline's
// "You pick." and the dock's next arrow always offer the same next look.
export const lensFor = (page: ConceptId): ConceptId => conceptAt(page, 1);
