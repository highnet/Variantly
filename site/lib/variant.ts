'use client';

import { flushSync } from 'react-dom';

import type { VariantKey } from '@/components/backdrop/variants';
import { calmMotion } from '@/lib/prefs';
import { useSiteStore } from '@/lib/store';
import { VARIANT_KEYS } from '@/lib/variantBoot';

export { VARIANT_KEYS };

const apply = (v: VariantKey) => {
  // Restyle synchronously so a view transition snapshots the finished page.
  document.documentElement.dataset.variant = v;
  flushSync(() => useSiteStore.getState().setVariant(v));
};

export const setVariant = (v: VariantKey) => {
  // Where the browser supports it, the new concept wipes in behind a leaning
  // edge, like the before/after divider dragged across (see globals.css).
  if (document.startViewTransition && !calmMotion()) {
    document.startViewTransition(() => apply(v));
  } else {
    apply(v);
  }
  // Reflect it in the URL so the current concept can be shared.
  const url = new URL(location.href);
  url.searchParams.set('v', v);
  history.replaceState(history.state, '', url);
};

// The active concept on the client; null until persisted state is read.
export const useVariant = () => useSiteStore((s) => (s.hydrated ? s.variant : null));
