/*
 * Theme and reading aids, shared with the legacy ui/ (same storage key and
 * data attributes on <html>). PREFS_BOOT runs inline before first paint so
 * nothing flashes; `?theme=dark|light` in the URL sets and saves the theme.
 */
export const PREFS_KEY = 'variantly:prefs';

export type Prefs = {
  theme: 'light' | 'dark';
  motion: 'full' | 'calm';
  readable: boolean;
  large: boolean;
  contrast: boolean;
  calm: boolean;
};

export const PREFS_BOOT = `(function(){try{var m=function(q){return matchMedia(q).matches};var s={};try{s=JSON.parse(localStorage.getItem('${PREFS_KEY}')||'{}')}catch(e){}var t=new URLSearchParams(location.search).get('theme');if(t==='dark'||t==='light'){s.theme=t;try{localStorage.setItem('${PREFS_KEY}',JSON.stringify(s))}catch(e){}}var p=Object.assign({theme:m('(prefers-color-scheme: dark)')?'dark':'light',motion:m('(prefers-reduced-motion: reduce)')?'calm':'full'},s);var d=document.documentElement;d.dataset.theme=p.theme;d.dataset.motion=p.motion;d.dataset.readable=!!p.readable;d.dataset.large=!!p.large;d.dataset.contrast=!!p.contrast;d.dataset.calm=!!p.calm}catch(e){}})()`;

export const readPrefs = (): Prefs => {
  const m = (q: string) => matchMedia(q).matches;
  const base: Prefs = {
    theme: m('(prefers-color-scheme: dark)') ? 'dark' : 'light',
    motion: m('(prefers-reduced-motion: reduce)') ? 'calm' : 'full',
    readable: false,
    large: false,
    contrast: false,
    calm: false,
  };
  try {
    return { ...base, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') };
  } catch {
    return base;
  }
};

export const savePrefs = (p: Prefs) => {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {}
  const d = document.documentElement.dataset;
  for (const k of ['theme', 'motion', 'readable', 'large', 'contrast', 'calm'] as const) d[k] = String(p[k]);
};
