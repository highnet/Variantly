import type { VariantKey } from '@/components/backdrop/variants';

export const VARIANT_KEYS: VariantKey[] = ['a', 'b', 'c', 'd', 'e', 'f'];
export const VARIANT_EVENT = 'variantly:variant';
const STORE = 'variantly:concept';

const valid = (v: string | null): v is VariantKey => !!v && (VARIANT_KEYS as string[]).includes(v);

// URL wins (shareable links, seekreel), then the visitor's last pick.
export const readVariant = (): VariantKey => {
  const fromUrl = new URLSearchParams(location.search).get('v');
  if (valid(fromUrl)) return fromUrl;
  try {
    const stored = localStorage.getItem(STORE);
    if (valid(stored)) return stored;
  } catch {}
  return 'a';
};

export const setVariant = (v: VariantKey) => {
  try {
    localStorage.setItem(STORE, v);
  } catch {}
  const url = new URL(location.href);
  url.searchParams.set('v', v);
  history.replaceState(history.state, '', url);
  document.documentElement.dataset.variant = v;
  dispatchEvent(new CustomEvent(VARIANT_EVENT, { detail: v }));
};
