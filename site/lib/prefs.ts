// Reading and display preferences: theme plus the accessibility menu. They
// live on <html> as data attributes, persist in localStorage, and are also
// pushed into the before/after panes so the demo honours them.

export type Prefs = {
  theme: 'light' | 'dark';
  motion: 'full' | 'calm';
  readable: boolean;
  large: boolean;
  contrast: boolean;
  calm: boolean;
};

export const PREFS_KEY = 'variantly:prefs';
export const PREFS_EVENT = 'variantly:prefs';

export const defaults = (): Prefs => ({
  theme:
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light',
  motion:
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'calm'
      : 'full',
  readable: false,
  large: false,
  contrast: false,
  calm: false,
});

export const readPrefs = (): Prefs => {
  try {
    return { ...defaults(), ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') };
  } catch {
    return defaults();
  }
};

export const applyPrefs = (p: Prefs) => {
  const d = document.documentElement.dataset;
  d.theme = p.theme;
  d.motion = p.motion;
  d.readable = String(p.readable);
  d.large = String(p.large);
  d.contrast = String(p.contrast);
  d.calm = String(p.calm);
  document.documentElement.style.colorScheme = p.theme;
};

export const savePrefs = (p: Prefs) => {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {}
  applyPrefs(p);
  window.dispatchEvent(new CustomEvent(PREFS_EVENT, { detail: p }));
};

/** True when motion should be kept to a minimum. */
export const calmMotion = () =>
  typeof document !== 'undefined' && document.documentElement.dataset.motion === 'calm';

/** Runs before paint (inlined in <head>) so the page never flashes the wrong theme. */
export const PREFS_BOOT = `(function(){try{var m=function(q){return matchMedia(q).matches};var p=Object.assign({theme:m('(prefers-color-scheme: dark)')?'dark':'light',motion:m('(prefers-reduced-motion: reduce)')?'calm':'full'},JSON.parse(localStorage.getItem('${PREFS_KEY}')||'{}'));var d=document.documentElement;d.dataset.theme=p.theme;d.dataset.motion=p.motion;d.dataset.readable=!!p.readable;d.dataset.large=!!p.large;d.dataset.contrast=!!p.contrast;d.dataset.calm=!!p.calm;d.style.colorScheme=p.theme}catch(e){}})()`;

/*
 * Push the preferences into a same-origin demo page. Every design ships a
 * light and a dark palette keyed on html[data-theme], so the theme is just
 * the attribute; the reading aids are applied the same way as on the site.
 */
export const applyPrefsToFrame = (doc: Document, p: Prefs) => {
  const html = doc.documentElement;
  html.dataset.theme = p.theme;
  let style = doc.getElementById('variantly-prefs');
  if (!style) {
    style = doc.createElement('style');
    style.id = 'variantly-prefs';
    doc.head.append(style);
  }
  const filters = [p.contrast && 'contrast(1.25)', p.calm && 'saturate(0.6)'].filter(Boolean);
  style.textContent = [
    filters.length && `html{filter:${filters.join(' ')}}`,
    p.large && 'html{zoom:1.125}',
    p.readable &&
      "body,body *{font-family:'Atkinson Hyperlegible',Verdana,Tahoma,sans-serif!important;letter-spacing:.02em!important;word-spacing:.08em!important;line-height:1.7!important}",
    p.calm && '*{box-shadow:none!important;text-shadow:none!important}',
    p.motion === 'calm' &&
      '*,*::before,*::after{animation:none!important;transition:none!important}',
  ]
    .filter(Boolean)
    .join('\n');
};
