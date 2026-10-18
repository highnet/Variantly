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
import { EASE } from '@/lib/motion';
import { perfTier } from '@/lib/perfTier';
import { calmMotion } from '@/lib/prefs';
import { seekTime } from '@/lib/seek';
import { turnSlats } from '@/lib/slatSwap';
import { warmSwap } from '@/lib/swapWarm';
import { useSiteStore } from '@/lib/store';

export const VARIANT_KEYS = CONCEPT_IDS;

const apply = (v: ConceptId) => {
  // Restyle synchronously so a view transition snapshots the finished page.
  document.documentElement.dataset.variant = v;
  flushSync(() => useSiteStore.getState().setVariant(v));
};

// The low tier skips the full-page snapshot: the panel wipe instead.
const cheapSwap = () => perfTier() === 'low';

export type SwapOptions = {
  // Which way the slats turn: 1 left to right (a later concept), -1 right
  // to left. Worked out from the concepts' order when left out.
  dir?: 1 | -1;
};

let swapId = 0;

/*
 * The low tier's wipe (and browsers without view transitions): no page snapshot, just one panel with a leaning edge in
 * the outgoing concept's ink. It sweeps in, the concept swaps while the
 * screen is covered, and it sweeps on off the other side. Transforms only,
 * so it stays on the compositor.
 */
const panelWipe = (ready: Promise<unknown>, swap: () => void) => {
  const panel = document.createElement('div');
  panel.className = 'vy-wipe';
  panel.setAttribute('aria-hidden', 'true');
  document.body.appendChild(panel);
  const cover = panel.animate(
    [{ transform: 'translateX(-115%)' }, { transform: 'translateX(0)' }],
    { duration: 260, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'forwards' },
  );
  let swapped = false;
  const once = () => {
    if (!swapped) swap();
    swapped = true;
  };
  // Covered and the concept loaded (or given up on): swap, then reveal.
  return Promise.all([cover.finished, ready])
    .then(() => {
      once();
      return panel.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(115%)' }], {
        duration: 380,
        easing: EASE.outExpo,
        fill: 'forwards',
      }).finished;
    })
    .catch(once)
    .finally(() => panel.remove());
};

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
  const ids = shownIds();
  const dir = opts.dir ?? (ids.indexOf(v) >= ids.indexOf(currentVariant()) ? 1 : -1);
  const go = () => {
    if (id !== swapId) return;
    // Backdrop loops and the 3D scene pause while the swap runs.
    html.setAttribute('data-swapping', '');
    const done = () => html.removeAttribute('data-swapping');
    if (calmMotion() || seekTime() !== null) {
      apply(v);
      done();
    } else {
      // The page turns over slat by slat, as the demo's after pane does
      // (lib/slatSwap, globals.css "Concept swap").
      const vt = document.startViewTransition(() => apply(v));
      void vt.ready.then(() => turnSlats(dir)).catch(() => {});
      void vt.finished.finally(done);
    }
  };
  // Wait (briefly) for the concept's backdrop, look and (when it will run)
  // scene, so it lands whole instead of the old scene blanking first; then
  // for its scene and title look to be built and compiled (lib/swapWarm), so
  // that work stays out of the transition.
  const loaded = Promise.race([
    prefetchConcept(v, !calmMotion()).then(() => (id === swapId ? warmSwap(v) : undefined)),
    new Promise((r) => setTimeout(r, 400)),
  ]);
  if (!calmMotion() && seekTime() === null && (cheapSwap() || !document.startViewTransition)) {
    // The phone wipe starts on the tap and covers the load.
    html.setAttribute('data-swapping', '');
    void panelWipe(loaded, () => {
      if (id === swapId) apply(v);
    }).finally(() => {
      if (id === swapId) html.removeAttribute('data-swapping');
    });
  } else void loaded.then(go);
  // Reflect it in the URL so the current concept can be shared.
  const url = new URL(location.href);
  url.searchParams.set('v', v);
  history.replaceState(history.state, '', url);
};

export const stepVariant = (from: ConceptId, by: number) =>
  setVariant(conceptAt(from, by), { dir: by < 0 ? -1 : 1 });

export const shuffleVariant = (from: ConceptId) => {
  const others = shownIds().filter((k) => k !== from);
  setVariant(others[Math.floor(Math.random() * others.length)]);
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
