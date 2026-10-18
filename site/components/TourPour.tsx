'use client';

import { useEffect } from 'react';

import { calmMotion } from '@/lib/prefs';
import { lowPerf, touchUI, whenIdle } from '@/lib/scrollIdle';
import { seekTime } from '@/lib/seek';

// Frames in each baked liquid sprite (scripts/bake-liquid.mjs).
const LIQUID_FRAMES = 48;

/*
 * Pours the tour's numerals (the homepage steps' liquid, see Delight). The
 * steps sit a screen or more apart, so each numeral fills over its own trip
 * up the screen rather than along one shared progress line. Touch and low
 * power pour each in one stepped CSS run once it is in view.
 */
const TourPour = () => {
  useEffect(() => {
    const items = [...document.querySelectorAll<HTMLElement>('.vy-pour')];
    if (!items.length) return;
    const calm = calmMotion() || seekTime() !== null;
    const light = touchUI() || lowPerf();
    const root = document.documentElement;
    const stops: (() => void)[] = [];

    // The liquid masks load only once a numeral is near the viewport.
    const near = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add('vy-liquid');
          near.unobserve(e.target);
        }),
      { rootMargin: '50% 0px' },
    );
    items.forEach((el) => near.observe(el));
    stops.push(() => near.disconnect());

    if (light || calm) {
      if (light) root.classList.add('vy-steps-touch');
      const still = calm || lowPerf();
      const on = new Set<Element>();
      let pending: () => void = () => {};
      const apply = () =>
        on.forEach((el) => {
          el.classList.add('vy-step-on');
          if (still) el.classList.add('vy-step-full', 'vy-step-done');
        });
      const poured = (e: AnimationEvent) => {
        if (e.animationName !== 'vy-liq-pour') return;
        (e.target as HTMLElement)
          .closest('.vy-pour')
          ?.classList.add('vy-step-full', 'vy-step-done');
      };
      document.addEventListener('animationend', poured);
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach(
            (e) => e.isIntersecting && on.add(e.target.closest('.vy-pour') ?? e.target),
          );
          pending();
          if (calm) apply();
          else pending = whenIdle(apply);
        },
        // A numeral pours once it is in the upper three quarters of the screen.
        { rootMargin: '0px 0px -25% 0px' },
      );
      items.forEach((el) => io.observe(el.querySelector('.vy-step-num') ?? el));
      stops.push(() => {
        io.disconnect();
        pending();
        document.removeEventListener('animationend', poured);
        root.classList.remove('vy-steps-touch');
      });
      return () => stops.forEach((s) => s());
    }

    const nums = items.map((el) => el.querySelector<HTMLElement>('.vy-step-num') ?? el);
    const frames: string[] = [];
    let frame = 0;
    const paint = () => {
      frame = 0;
      // One layout read pass, then writes.
      const tops = nums.map((n) => n.getBoundingClientRect().top);
      items.forEach((el, i) => {
        // Fills as the numeral rises from the bottom of the screen to just
        // above the middle, then stays full.
        const fill = Math.min(1, Math.max(0, (innerHeight * 0.9 - tops[i]) / (innerHeight * 0.45)));
        const f = String(Math.round(fill * (LIQUID_FRAMES - 1)));
        if (frames[i] !== f) {
          frames[i] = f;
          el.style.setProperty('--frame', f);
        }
        el.classList.toggle('vy-step-full', fill >= 1);
        // The pop plays once, the first time a numeral is full.
        if (fill >= 1) el.classList.add('vy-step-done');
      });
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    paint();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll, { passive: true });
    stops.push(() => {
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    });
    return () => stops.forEach((s) => s());
  }, []);
  return null;
};

export { TourPour };
