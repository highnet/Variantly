'use client';

/*
 * The Lens's scoping hook: lets a hero render in another concept while the
 * page's concept CSS stays keyed on html[data-variant] (concepts/README.md).
 *
 * The Lens's 2D layer lives in a shadow root, so none of the page's
 * `:root[data-variant='x'] ...` rules reach it. Its stylesheet is the page's
 * own, copied once, with every `:root` (and `html` type selector) rewritten
 * to `.vy-lens-root`: an element inside the shadow root that carries the
 * lens concept as its `data-variant` (and the page's other html data
 * attributes: theme, perf, motion...). So every concept's tokens, hero
 * styling and backdrop art apply inside the Lens exactly as they would on
 * the page, with no change to any concept.css.
 *
 * Fonts, @property and @font-face stay document-level (they reach shadow
 * trees anyway) and are not copied.
 */

let cached: { sheet: CSSStyleSheet; count: number } | null = null;

const ROOT = /:root\b/g;
// `html` as a type selector (start of a compound), not inside a word or value.
const HTML = /(^|[\s,>+~(}{])html(?=[\s,.:[#>+~){]|$)/g;

const rulesOf = (sheet: CSSStyleSheet): CSSRuleList | null => {
  try {
    return sheet.cssRules;
  } catch {
    // Cross-origin sheet: not ours to copy.
    return null;
  }
};

const copy = (rules: CSSRuleList, out: string[]) => {
  for (const rule of rules) {
    if (rule instanceof CSSFontFaceRule || rule instanceof CSSImportRule) continue;
    if (typeof CSSPropertyRule !== 'undefined' && rule instanceof CSSPropertyRule) continue;
    out.push(rule.cssText.replace(ROOT, '.vy-lens-root').replace(HTML, '$1.vy-lens-root'));
  }
};

// The page's stylesheet, rescoped for the Lens. Rebuilt only when the page
// has gained stylesheets since (a lazily loaded chunk's CSS).
export const lensSheet = (): CSSStyleSheet | null => {
  if (typeof CSSStyleSheet === 'undefined' || !('replaceSync' in CSSStyleSheet.prototype))
    return null;
  const sheets = [...document.styleSheets];
  if (cached && cached.count === sheets.length) return cached.sheet;
  const out: string[] = [];
  for (const s of sheets) {
    const rules = rulesOf(s);
    if (rules) copy(rules, out);
  }
  // The Lens's own: the 2D letters hide while the 3D lens draws them.
  out.push(
    '.vy-lens-root[data-lens-3d] .vy-title .vy-letter > *{color:transparent!important;text-shadow:none!important}',
    '.vy-lens-root[data-lens-3d][data-lens-scene] [data-hero-title]{background-color:transparent!important}',
  );
  const sheet = cached?.sheet ?? new CSSStyleSheet();
  sheet.replaceSync(out.join('\n'));
  cached = { sheet, count: sheets.length };
  return sheet;
};

// The html attributes the Lens mirrors onto its root (all but the concept).
export const mirrorRoot = (el: HTMLElement, variant: string) => {
  const html = document.documentElement;
  for (const { name, value } of [...html.attributes]) {
    if (name.startsWith('data-') && name !== 'data-variant' && name !== 'data-swapping')
      el.setAttribute(name, value);
  }
  for (const { name } of [...el.attributes]) {
    if (name.startsWith('data-lens')) continue;
    if (name.startsWith('data-') && !html.hasAttribute(name) && name !== 'data-variant')
      el.removeAttribute(name);
  }
  el.dataset.variant = variant;
  el.className = `vy-lens-root ${html.className}`;
};
