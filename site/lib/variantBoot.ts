import { CONCEPT_IDS } from '@/concepts/metas';

// Server-safe: the concept list and the <head> boot script used by the root layout.
export const VARIANT_KEYS = CONCEPT_IDS;

/*
 * Runs in <head> before first paint on the homepage: applies the concept
 * (?v, else the saved pick, else 'a') so the page never paints unstyled, and
 * hides the title until its reveal starts. The 3s fallback un-hides it if
 * scripts never load.
 */
export const VARIANT_BOOT = `(function(){try{if(location.pathname!=='/')return;var d=document.documentElement,k=${JSON.stringify(VARIANT_KEYS)},q=new URLSearchParams(location.search),v=q.get('v');if(k.indexOf(v)<0){try{v=(JSON.parse(localStorage.getItem('variantly:site')||'{}').state||{}).variant}catch(e){}}d.dataset.variant=k.indexOf(v)<0?'a':v;if(q.get('t')===null&&d.dataset.motion!=='calm'&&d.dataset.calm!=='true'){d.setAttribute('data-intro','');setTimeout(function(){d.removeAttribute('data-intro')},3000)}}catch(e){}})()`;
