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

/*
 * Runs in <head> before first paint on the homepage: applies the concept
 * (?v, else the saved pick, else 'a') so the page never paints unstyled, and
 * hides the title until its reveal starts. The 3s fallback un-hides it if
 * scripts never load.
 */
export const VARIANT_BOOT = `(function(){try{if(location.pathname!=='/')return;var d=document.documentElement,k=${JSON.stringify(VARIANT_KEYS)},q=new URLSearchParams(location.search),v=q.get('v');if(k.indexOf(v)<0){try{v=(JSON.parse(localStorage.getItem('variantly:site')||'{}').state||{}).variant}catch(e){}}d.dataset.variant=k.indexOf(v)<0?'a':v;if(q.get('t')===null&&d.dataset.motion!=='calm'&&d.dataset.calm!=='true'){d.setAttribute('data-intro','');setTimeout(function(){d.removeAttribute('data-intro')},3000)}}catch(e){}})()`;
