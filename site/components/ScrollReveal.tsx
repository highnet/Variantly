'use client';

import { animate, inView, stagger } from 'motion';
import { useEffect } from 'react';

import { calmMotion } from '@/lib/prefs';
import { seekTime } from '@/lib/seek';

// What enters, and how. Selectors are scoped to the content below the hero.
const SPRING = { type: 'spring', stiffness: 260, damping: 22, mass: 0.9 } as const;
const HEADS = 'main > div h2';
const LEADS = 'main > div h2 + p, main > div h2 ~ p:first-of-type';
const CARDS =
  'main > div > section > .bg-surface, main > div > section > div > .bg-surface, main > div .on-slate';
const GROUPS = 'main > div ol, main > div ul, main > div dl';
// Step numerals enter as one piece (outline and fill together).
const FIGURES =
  'main > div .figure:not(h3, .vy-step-ghost, .vy-step-fill), main > div .vy-step-num';

/*
 * Site-wide scroll entrances. Each element starts hidden only if it is below
 * the fold when the page loads (so nothing already on screen blinks), then
 * animates the first time it scrolls into view: headings rise and un-blur,
 * leads follow, cards spring up and settle, list items cascade, and big
 * figures pop. Skipped entirely for reduced motion and seekreel frames.
 */
export const ScrollReveal = () => {
  useEffect(() => {
    if (calmMotion() || seekTime() !== null) return;
    const stops: (() => void)[] = [];
    const below = (el: Element) => el.getBoundingClientRect().top > innerHeight * 0.92;
    const hide = (el: HTMLElement, from: Record<string, string>) => Object.assign(el.style, from);

    const each = (
      selector: string,
      from: Record<string, string>,
      run: (el: HTMLElement) => void,
    ) => {
      document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
        if (el.dataset.revealed || !below(el)) return;
        el.dataset.revealed = 'pending';
        hide(el, from);
        stops.push(
          inView(
            el,
            () => {
              el.dataset.revealed = 'done';
              run(el);
            },
            { amount: 0.15 },
          ),
        );
      });
    };

    each(
      HEADS,
      { opacity: '0', transform: 'translateY(28px) skewY(2deg)', filter: 'blur(8px)' },
      (el) =>
        animate(
          el,
          { opacity: 1, transform: 'translateY(0px) skewY(0deg)', filter: 'blur(0px)' },
          { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
        ),
    );
    each(LEADS, { opacity: '0', transform: 'translateY(16px)' }, (el) =>
      animate(
        el,
        { opacity: 1, transform: 'translateY(0px)' },
        { duration: 0.6, delay: 0.12, ease: [0.16, 1, 0.3, 1] },
      ),
    );
    each(CARDS, { opacity: '0', transform: 'translateY(48px) scale(0.96)' }, (el) => {
      // 20 · a light streak sweeps the card once as it lands.
      el.classList.add('vy-sheen');
      setTimeout(() => el.classList.remove('vy-sheen'), 1400);
      return animate(
        el,
        { opacity: 1, transform: 'translateY(0px) scale(1)' },
        { ...SPRING, opacity: { duration: 0.35 } },
      );
    });
    // Lists: the container stays put; its items cascade in.
    document.querySelectorAll<HTMLElement>(GROUPS).forEach((list) => {
      if (list.dataset.revealed || !below(list) || list.closest('[data-revealed="pending"]'))
        return;
      const items = [...list.children] as HTMLElement[];
      if (items.length < 2) return;
      list.dataset.revealed = 'pending';
      // Some lists draw their dividers as a background; hold it back until
      // the items have landed and cover it.
      hide(list, { backgroundColor: 'transparent' });
      items.forEach((i) => hide(i, { opacity: '0', transform: 'translateY(24px) scale(0.94)' }));
      stops.push(
        inView(
          list,
          () => {
            list.dataset.revealed = 'done';
            void animate(
              items,
              { opacity: 1, transform: 'translateY(0px) scale(1)' },
              {
                ...SPRING,
                delay: stagger(0.045),
              },
            ).finished.then(() => {
              // Hand the items back to the stylesheet (e.g. step dimming).
              list.style.removeProperty('background-color');
              items.forEach((i) => {
                i.style.removeProperty('opacity');
                i.style.removeProperty('transform');
              });
            });
          },
          { amount: 0.1 },
        ),
      );
    });
    each(FIGURES, { opacity: '0', transform: 'scale(0.4) rotate(-12deg)' }, (el) =>
      animate(
        el,
        { opacity: 1, transform: 'scale(1) rotate(0deg)' },
        { type: 'spring', stiffness: 380, damping: 14, delay: 0.1 },
      ),
    );

    return () => stops.forEach((s) => s());
  }, []);

  return null;
};
