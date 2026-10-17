import type { ConceptMeta } from '@/concepts/types';

import { meta as a } from './a/meta';
import { meta as b } from './b/meta';
import { meta as c } from './c/meta';
import { meta as d } from './d/meta';
import { meta as e } from './e/meta';
import { meta as f } from './f/meta';
import { meta as g } from './g/meta';
import { meta as h } from './h/meta';
import { meta as i } from './i/meta';
import { meta as j } from './j/meta';
import { meta as k } from './k/meta';
import { meta as l } from './l/meta';
import { meta as m } from './m/meta';
import { meta as n } from './n/meta';
import { meta as o } from './o/meta';
import { meta as p } from './p/meta';
import { meta as q } from './q/meta';
import { meta as r } from './r/meta';
import { meta as s } from './s/meta';
import { meta as t } from './t/meta';

/*
 * Server-safe concept list (ids, names, families, swatches): read by the
 * <head> boot script, the store and the switcher. Order is the a→t keyboard
 * and cycle order. Each concept's own files live in concepts/<id>/.
 */
export type ConceptId =
  | 'a'
  | 'b'
  | 'c'
  | 'd'
  | 'e'
  | 'f'
  | 'g'
  | 'h'
  | 'i'
  | 'j'
  | 'k'
  | 'l'
  | 'm'
  | 'n'
  | 'o'
  | 'p'
  | 'q'
  | 'r'
  | 's'
  | 't';

export const CONCEPTS: ConceptMeta[] = [a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r, s, t];

export const CONCEPT_IDS = CONCEPTS.map((c) => c.id) as ConceptId[];

export const CONCEPT_BY_ID = Object.fromEntries(CONCEPTS.map((c) => [c.id, c])) as Record<
  ConceptId,
  ConceptMeta
>;

export const isConceptId = (v: unknown): v is ConceptId =>
  typeof v === 'string' && (CONCEPT_IDS as string[]).includes(v);
