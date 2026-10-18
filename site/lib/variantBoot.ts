import { CONCEPT_IDS, LIVE_IDS } from '@/concepts/metas';

// Server-safe: the concept list and the <head> boot script used by the root layout.
export const VARIANT_KEYS = CONCEPT_IDS;

// Pages dressed in the concept (SiteShell without `plain`); the agent and
// legal pages stay plain documents.
export const CONCEPT_PATHS = ['/', '/start', '/docs', '/safety'];

/*
 * Runs in <head> before first paint on the concept pages (CONCEPT_PATHS), so everything that keys
 * off these attributes (concept styles, the switcher dock's label, the
 * backdrop's perf tier) paints right on the first frame:
 *
 * - html[data-drafts]: `?drafts=1` previews draft concepts for the session
 *   (`?drafts=0` ends it).
 * - html[data-variant]: `?v=` (any concept, drafts included: a direct
 *   preview link), else the saved pick, else 'a'. A saved draft only counts
 *   while drafts are shown.
 * - html[data-perf='low']: a tier remembered from earlier in the session or
 *   forced with `?perf=low` (lib/perfTier.ts keeps it up to date). Seekreel
 *   renders (`?t=`) always run the full tier.
 *
 * The title is not hidden: its first paint is the still final word (the poster
 * the 3D word, or the 2D reveal, starts from).
 */
export const VARIANT_BOOT = `(function(){try{var P=location.pathname,L=${JSON.stringify(CONCEPT_PATHS)};if(L.indexOf(P)<0&&L.indexOf(P.slice(0,-1))<0)return;var d=document.documentElement,q=new URLSearchParams(location.search),ss=sessionStorage,f=q.get('drafts');try{if(f==='1')ss.setItem('variantly:drafts','1');if(f==='0')ss.removeItem('variantly:drafts');if(ss.getItem('variantly:drafts')==='1')d.setAttribute('data-drafts','')}catch(e){}var a=${JSON.stringify(CONCEPT_IDS)},k=d.hasAttribute('data-drafts')?a:${JSON.stringify(LIVE_IDS)},v=q.get('v');if(a.indexOf(v)<0){try{v=(JSON.parse(localStorage.getItem('variantly:site')||'{}').state||{}).variant}catch(e){}if(k.indexOf(v)<0)v='a'}d.dataset.variant=v;if(q.get('t')===null){try{var p=q.get('perf');if(p==='low'||p==='high')ss.setItem('variantly:perf','forced:'+p);p=ss.getItem('variantly:perf');if(p==='low'||p==='forced:low')d.dataset.perf='low'}catch(e){}}}catch(e){}})()`;
