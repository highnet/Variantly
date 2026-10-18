'use client';

import { useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';

import {
  CONCEPT_IDS,
  conceptAt,
  isConceptId,
  prefetchConcept,
  shownIds,
  type ConceptId,
} from '@/concepts';
import {
  heroOrigin,
  mountSwapFrame,
  openDoor,
  swapDuration,
  type SwapOrigin,
} from '@/lib/lensSwap';
import { DUR, EASE } from '@/lib/motion';
import { perfTier } from '@/lib/perfTier';
import { calmMotion } from '@/lib/prefs';
import { seekTime } from '@/lib/seek';
import { useSiteStore } from '@/lib/store';

export type { SwapOrigin } from '@/lib/lensSwap';
export { pressOrigin } from '@/lib/lensSwap';

export const VARIANT_KEYS = CONCEPT_IDS;

const apply = (v: ConceptId) => {
  // Restyle synchronously so a view transition snapshots the finished page.
  document.documentElement.dataset.variant = v;
  flushSync(() => useSiteStore.getState().setVariant(v));
};

// The low tier skips the full-page snapshot: the hero just cross-fades in.
const cheapSwap = () => perfTier() === 'low';

export type SwapOptions = {
  // Where the doorway opens from: the click point, the focused control's
  // centre for keyboard presses; the hero title's centre when left out.
  origin?: SwapOrigin;
};

let swapId = 0;

// The concept on screen: html[data-variant], set before first paint.
export const currentVariant = (): ConceptId => {
  const v = typeof document === 'undefined' ? null : document.documentElement.dataset.variant;
  return isConceptId(v) ? v : 'a';
};

export const setVariant = (v: ConceptId, opts: SwapOptions = {}) => {
  // Drafts are picked only while they are shown (?drafts=1); a ?v=<draft>
  // link opens one directly in the boot script.
  if (!shownIds().includes(v)) return;
  const id = ++swapId;
  const html = document.documentElement;
  const go = () => {
    if (id !== swapId) return;
    // Backdrop loops and the 3D scene pause while the swap runs.
    html.setAttribute('data-swapping', '');
    const done = () => html.removeAttribute('data-swapping');
    if (calmMotion() || seekTime() !== null) {
      apply(v);
      done();
    } else if (cheapSwap() || !document.startViewTransition) {
      apply(v);
      const hero = document.querySelector('[data-hero-title]');
      const a = hero?.animate([{ opacity: 0.35 }, { opacity: 1 }], {
        duration: DUR.fast,
        easing: EASE.outExpo,
      });
      if (a) a.onfinish = a.oncancel = done;
      else done();
    } else {
      // The new concept opens through a doorway from the trigger point
      // (lib/lensSwap, globals.css "Concept swap").
      const origin = opts.origin ?? heroOrigin();
      const duration = swapDuration();
      let unmount = () => {};
      const vt = document.startViewTransition(() => {
        apply(v);
        unmount = mountSwapFrame();
      });
      void vt.ready.then(() => openDoor(origin, duration)).catch(() => {});
      void vt.finished.finally(() => {
        unmount();
        done();
      });
    }
  };
  // Wait (briefly) for the concept's backdrop, look and (when it will run)
  // scene, so it lands whole instead of the old scene blanking first.
  void Promise.race([
    prefetchConcept(v, !calmMotion()),
    new Promise((r) => setTimeout(r, 400)),
  ]).then(go);
  // Reflect it in the URL so the current concept can be shared.
  const url = new URL(location.href);
  url.searchParams.set('v', v);
  history.replaceState(history.state, '', url);
};

export const stepVariant = (from: ConceptId, by: number, opts?: SwapOptions) =>
  setVariant(conceptAt(from, by), opts);

export const shuffleVariant = (from: ConceptId, opts?: SwapOptions) => {
  const others = shownIds().filter((k) => k !== from);
  setVariant(others[Math.floor(Math.random() * others.length)], opts);
};

// The active concept on the client; null until persisted state is read.
export const useVariant = () => useSiteStore((s) => (s.hydrated ? s.variant : null));

// The concept on screen, read straight from html[data-variant] (set in <head>
// before first paint, then by every swap), so client-only chrome renders the
// right concept on its first frame instead of waiting for the store. null on
// the server.
const onVariantAttr = (cb: () => void) => {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-variant'] });
  return () => mo.disconnect();
};
export const useConcept = (): ConceptId | null =>
  useSyncExternalStore(onVariantAttr, currentVariant, () => null);
