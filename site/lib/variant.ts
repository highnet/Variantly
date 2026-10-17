import type { VariantKey } from '@/components/backdrop/variants';
import { useSiteStore } from '@/lib/store';

export const VARIANT_KEYS: VariantKey[] = ['a', 'b', 'c', 'd', 'e', 'f'];

export const setVariant = (v: VariantKey) => {
  useSiteStore.getState().setVariant(v);
  // Reflect it in the URL so the current concept can be shared.
  const url = new URL(location.href);
  url.searchParams.set('v', v);
  history.replaceState(history.state, '', url);
};

// The active concept on the client; null until persisted state is read.
export const useVariant = () => useSiteStore((s) => (s.hydrated ? s.variant : null));
