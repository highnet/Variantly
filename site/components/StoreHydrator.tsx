'use client';

import { useEffect } from 'react';

import { useSiteStore } from '@/lib/store';
import { isConceptId } from '@/concepts/metas';

const LEGACY_RUNNER = 'variantly-runner';

/*
 * Reads persisted choices after mount. On the homepage the concept is the one
 * the <head> boot script already painted (html[data-variant]: `?v=`, the saved
 * pick or 'a', drafts only with ?drafts=1), so the store never disagrees with
 * the first frame.
 */
export const StoreHydrator = () => {
  useEffect(() => {
    void Promise.resolve(useSiteStore.persist.rehydrate()).then(() => {
      const patch: Partial<ReturnType<typeof useSiteStore.getState>> = { hydrated: true };
      try {
        // Carry over the pick made before the store existed.
        const old = localStorage.getItem(LEGACY_RUNNER);
        if (old && !localStorage.getItem('variantly:site')) {
          patch.runner = old as never;
        }
      } catch {}
      const v = document.documentElement.dataset.variant;
      if (isConceptId(v)) patch.variant = v;
      useSiteStore.setState(patch);
    });
  }, []);
  return null;
};
