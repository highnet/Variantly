'use client';

import { useEffect } from 'react';

import { useSiteStore } from '@/lib/store';
import { VARIANT_KEYS } from '@/lib/variant';

const LEGACY_RUNNER = 'variantly-runner';

/* Reads persisted choices after mount; a `?v=` in the URL beats the stored concept. */
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
      const v = new URLSearchParams(location.search).get('v');
      if (v && (VARIANT_KEYS as string[]).includes(v)) patch.variant = v as never;
      useSiteStore.setState(patch);
    });
  }, []);
  return null;
};
