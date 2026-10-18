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
import { EASE } from '@/lib/motion';
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

// The low tier skips the full-page snapshot: the panel wipe instead. Touch
// devices open the doorway too (shorter, lib/lensSwap).
const cheapSwap = () => perfTier() === 'low';

export type SwapOptions = {
  // Where the doorway opens from: the click point, the focused control's
  // centre for keyboard presses; the hero title's centre when left out.
  origin?: SwapOrigin;
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
  const go = () => {
    if (id !== swapId) return;
    // Backdrop loops and the 3D scene pause while the swap runs.
    html.setAttribute('data-swapping', '');
    const done = () => html.removeAttribute('data-swapping');
    if (calmMotion() || seekTime() !== null) {
      apply(v);
      done();
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
      // The frame layers go the moment the rings have left the screen (and
      // at the latest when the transition ends, if it was skipped).
      void vt.ready
        .then(() => openDoor(origin, duration, v))
        .then(() => unmount())
        .catch(() => unmount());
      void vt.finished.finally(() => {
        unmount();
        done();
      });
    }
  };
  // Wait (briefly) for the concept's backdrop, look and (when it will run)
  // scene, so it lands whole instead of the old scene blanking first.
  const loaded = Promise.race([
    prefetchConcept(v, !calmMotion()),
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
