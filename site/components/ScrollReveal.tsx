'use client';

import { useEffect } from 'react';

import { calmMotion } from '@/lib/prefs';
import { lowPerf, touchUI } from '@/lib/scrollIdle';
import { seekTime } from '@/lib/seek';

// What enters, and how. Selectors are scoped to the content below the hero.
const KINDS: [selector: string, kind: string][] = [
  ['main > div h2', 'head'],
  ['main > div h2 + p, main > div h2 ~ p:first-of-type', 'lead'],
  [
    'main > div > section > .bg-surface, main > div > section > div > .bg-surface, main > div .on-slate',
    'card',
  ],
  // Big figures pop. Step numerals are left out: they have their own fill
  // and pop (Delight), and their list item already enters.
  ['main > div .figure:not(h3, .vy-step-num *, :is(ol, ul, dl) *)', 'fig'],
];
const GROUPS = 'main > div ol, main > div ul, main > div dl';
// Longest entrance (slow duration plus the deepest cascade delay), after
// which the reveal classes come off and the stylesheet is in sole charge.
const SETTLE_MS = 1100;

/*
 * Site-wide scroll entrances, CSS-only (see .vy-rv in globals.css). Elements
 * below the fold at load are tagged, and <html> gets .vy-reveal-ready, which
 * is what hides them, so content is never hidden without JS. One shared
 * IntersectionObserver flips each to .vy-rv-in as its first pixel enters; a transform/opacity transition on the motion tokens does the
 * rest. Touch devices, low-power and calm motion get no entrances at all:
 * everything simply stays visible.
 */
export const ScrollReveal = () => {
  useEffect(() => {
    if (calmMotion() || lowPerf() || touchUI() || seekTime() !== null) return;
    const below = innerHeight * 0.92;
    const tagged: HTMLElement[] = [];
    const tops = new Map<Element, number>();
    // One layout read pass before any writes.
    const all = [
      ...KINDS.flatMap(([sel, kind]) =>
        [...document.querySelectorAll<HTMLElement>(sel)].map((el) => [el, kind] as const),
      ),
      ...[...document.querySelectorAll<HTMLElement>(GROUPS)].map((el) => [el, 'list'] as const),
    ];
    all.forEach(([el]) => tops.set(el, el.getBoundingClientRect().top));

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          io.unobserve(e.target);
          const el = e.target as HTMLElement;
          el.classList.add('vy-rv-in');
          if (el.dataset.rv === 'card') el.classList.add('vy-sheen');
          window.setTimeout(() => {
            el.classList.remove('vy-rv', 'vy-rv-in', 'vy-rv-list', 'vy-sheen');
            el.removeAttribute('data-rv');
          }, SETTLE_MS + 400);
        });
      },
      { rootMargin: '0px', threshold: 0 },
    );

    all.forEach(([el, kind]) => {
      if ((tops.get(el) ?? 0) <= below || el.closest('.vy-rv')) return;
      if (kind === 'list' && el.children.length < 2) return;
      el.classList.add('vy-rv');
      if (kind === 'list') el.classList.add('vy-rv-list');
      el.dataset.rv = kind;
      tagged.push(el);
      io.observe(el);
    });
    const root = document.documentElement;
    root.classList.add('vy-reveal-ready');

    return () => {
      io.disconnect();
      root.classList.remove('vy-reveal-ready');
      tagged.forEach((el) => {
        el.classList.remove('vy-rv', 'vy-rv-in', 'vy-rv-list');
        el.removeAttribute('data-rv');
      });
    };
  }, []);

  return null;
};
