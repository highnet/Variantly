'use client';

import { inView } from 'motion';
import { useEffect } from 'react';

import { DUR, EASE, STAGGER } from '@/lib/motion';
import { calmMotion } from '@/lib/prefs';
import { seekTime } from '@/lib/seek';

// What enters, and how. Selectors are scoped to the content below the hero.
const HEADS = 'main > div h2';
const LEADS = 'main > div h2 + p, main > div h2 ~ p:first-of-type';
const CARDS =
  'main > div > section > .bg-surface, main > div > section > div > .bg-surface, main > div .on-slate';
const GROUPS = 'main > div ol, main > div ul, main > div dl';
// Big figures pop. Step numerals are left out: they have their own motion
// (the liquid fill and pop in Delight), and their list item already enters.
const FIGURES = 'main > div .figure:not(h3, .vy-step-num *)';

type From = { opacity: string; transform: string };
type Enter = { duration: number; delay?: number; ease?: string };

/*
 * Plays an entrance from `from` to whatever the stylesheet says now. Both
 * WAAPI animations have a single keyframe, so they end on the live
 * underlying value: a class toggled mid-entrance (the steps' dimming) is
 * honoured at once, and nothing inline is left behind. The pending inline
 * hide comes off in the same frame the animation (held at its first frame
 * through any delay) takes over, so there is no flash.
 */
const enter = (el: HTMLElement, from: From, { duration, delay = 0, ease = EASE.spring }: Enter) => {
  el.style.removeProperty('opacity');
  el.style.removeProperty('transform');
  el.animate([{ opacity: from.opacity }], {
    duration: DUR.base,
    delay,
    easing: EASE.outExpo,
    fill: 'backwards',
  });
  return el.animate([{ transform: from.transform }], {
    duration,
    delay,
    easing: ease,
    fill: 'backwards',
  });
};

/*
 * Site-wide scroll entrances. Each element starts hidden only if it is below
 * the fold when the page loads (so nothing already on screen blinks), then
 * animates the first time it scrolls into view: headings and leads rise,
 * cards spring up and settle, list items cascade, and big figures pop.
 * Opacity and transform only. Skipped for calm/reduced motion and seekreel
 * frames.
 */
export const ScrollReveal = () => {
  useEffect(() => {
    if (calmMotion() || seekTime() !== null) return;
    const stops: (() => void)[] = [];
    const below = (el: Element) => el.getBoundingClientRect().top > innerHeight * 0.92;
    const hide = (el: HTMLElement, from: From) => Object.assign(el.style, from);

    const each = (selector: string, from: From, run: (el: HTMLElement) => void) => {
      document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
        if (el.dataset.revealed || !below(el) || el.closest('[data-revealed="pending"]')) return;
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

    const rise = (y: number): From => ({ opacity: '0', transform: `translateY(${y}px)` });
    each(HEADS, rise(24), (el) => enter(el, rise(24), { duration: DUR.slow, ease: EASE.outExpo }));
    each(LEADS, rise(16), (el) =>
      enter(el, rise(16), { duration: DUR.slow, delay: 120, ease: EASE.outExpo }),
    );
    const card: From = { opacity: '0', transform: 'translateY(40px) scale(0.97)' };
    each(CARDS, card, (el) => {
      // 20 · a light streak sweeps the card once as it lands.
      el.classList.add('vy-sheen');
      setTimeout(() => el.classList.remove('vy-sheen'), 1400);
      enter(el, card, { duration: DUR.slow });
    });
    // Lists: the container stays put; its items cascade in.
    const item: From = { opacity: '0', transform: 'translateY(24px) scale(0.96)' };
    document.querySelectorAll<HTMLElement>(GROUPS).forEach((list) => {
      if (list.dataset.revealed || !below(list) || list.closest('[data-revealed="pending"]'))
        return;
      const items = [...list.children] as HTMLElement[];
      if (items.length < 2) return;
      list.dataset.revealed = 'pending';
      // Some lists draw their dividers as a background; hold it back until
      // the items have landed and cover it.
      list.style.backgroundColor = 'transparent';
      items.forEach((i) => hide(i, item));
      stops.push(
        inView(
          list,
          () => {
            list.dataset.revealed = 'done';
            const runs = items.map((i, n) =>
              enter(i, item, { duration: DUR.slow, delay: n * STAGGER }),
            );
            void runs[runs.length - 1].finished.then(() =>
              list.style.removeProperty('background-color'),
            );
          },
          { amount: 0.1 },
        ),
      );
    });
    const pop: From = { opacity: '0', transform: 'scale(0.6) rotate(-8deg)' };
    each(FIGURES, pop, (el) =>
      enter(el, pop, { duration: DUR.slow, delay: 100, ease: EASE.springPop }),
    );

    return () => stops.forEach((s) => s());
  }, []);

  return null;
};
