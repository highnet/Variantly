import { conceptAt, shownIds, type ConceptId } from '@/concepts';

// Every concept has one fixed concept behind its door: the next one on this
// loop, ordered so each step is a strong contrast (material, screen, print,
// light...). Keeping the door's concept moves the page one step on, so
// clicking the door again and again tours every look. Concepts not on the
// loop (drafts opened with ?v=) and loop entries that are hidden fall back
// to the switcher order. The Lens door and the headline's "You pick." both
// use it, so the word and the door always offer the same next look.
const LENS_LOOP: ConceptId[] = [
  'a',
  'c',
  'f',
  'i',
  'd',
  't',
  'h',
  'g',
  'o',
  's',
  'j',
  'p',
  'r',
  'n',
  'b',
  'k',
  'q',
  'e',
];
export const lensFor = (page: ConceptId): ConceptId => {
  const shown = shownIds();
  const loop = LENS_LOOP.filter((c) => shown.includes(c));
  const at = loop.indexOf(page);
  const next = at >= 0 ? loop[(at + 1) % loop.length] : null;
  if (next && next !== page) return next;
  const id = conceptAt(page, 1);
  return id === page ? conceptAt(id, 1) : id;
};
