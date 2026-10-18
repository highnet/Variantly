import type { ComponentType } from 'react';

import A from './a/Backdrop';
import B from './b/Backdrop';
import C from './c/Backdrop';
import D from './d/Backdrop';
import E from './e/Backdrop';
import F from './f/Backdrop';
import G from './g/Backdrop';
import H from './h/Backdrop';
import I from './i/Backdrop';
import J from './j/Backdrop';
import K from './k/Backdrop';
import L from './l/Backdrop';
import M from './m/Backdrop';
import N from './n/Backdrop';
import O from './o/Backdrop';
import P from './p/Backdrop';
import Q from './q/Backdrop';
import R from './r/Backdrop';
import S from './s/Backdrop';
import T from './t/Backdrop';

import type { ConceptId } from './metas';

/*
 * Server-only: every concept's Backdrop.tsx, statically imported so the page's
 * server HTML can carry the live concepts' art (components/backdrop/
 * BackdropPoster.tsx) and the shapes paint with the first frame. Client code
 * keeps using the lazy CONCEPT_LOADERS. A new id adds one line here.
 */
export const CONCEPT_POSTERS: Record<ConceptId, ComponentType> = {
  a: A,
  b: B,
  c: C,
  d: D,
  e: E,
  f: F,
  g: G,
  h: H,
  i: I,
  j: J,
  k: K,
  l: L,
  m: M,
  n: N,
  o: O,
  p: P,
  q: Q,
  r: R,
  s: S,
  t: T,
};
