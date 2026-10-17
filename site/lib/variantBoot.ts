import type { VariantKey } from '@/components/backdrop/variants';

// Server-safe: the concept list and the <head> boot script used by the root layout.
export const VARIANT_KEYS: VariantKey[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

/*
 * Runs in <head> before first paint on the homepage: applies the concept
 * (?v, else the saved pick, else 'a') so the page never paints unstyled. The
 * title is not hidden: its first paint is the still final word (the poster the
 * 3D word, or the 2D reveal, starts from).
 */
export const VARIANT_BOOT = `(function(){try{if(location.pathname!=='/')return;var d=document.documentElement,k=${JSON.stringify(VARIANT_KEYS)},q=new URLSearchParams(location.search),v=q.get('v');if(k.indexOf(v)<0){try{v=(JSON.parse(localStorage.getItem('variantly:site')||'{}').state||{}).variant}catch(e){}}d.dataset.variant=k.indexOf(v)<0?'a':v;}catch(e){}})()`;
