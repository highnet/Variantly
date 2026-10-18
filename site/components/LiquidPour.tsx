'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { calmMotion } from '@/lib/prefs';
import { lowPerf } from '@/lib/scrollIdle';
import { seekTime } from '@/lib/seek';

// Frames in each baked liquid sprite (scripts/bake-liquid.mjs; the mask
// position in globals.css divides by LIQUID_FRAMES - 1).
const LIQUID_FRAMES = 48;

/*
 * Pours every liquid numeral on the page (LiquidNumeral), the same way on
 * every route and every device: each fills over its own trip from the bottom
 * of the screen to just above the middle, scrubbed by the scroll, then pops
 * once. A frame change only moves a mask on a numeral-sized element, so it
 * is cheap enough for phones. Calm and seek show them full (CSS); low power
 * skips the pour and fills each once it is in view.
 */
const LiquidPour = () => {
  const pathname = usePathname();
  useEffect(() => {
    const items = [...document.querySelectorAll<HTMLElement>('.vy-pour')];
    if (!items.length) return;
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

    if (calmMotion() || seekTime() !== null) {
      items.forEach((el) => el.classList.add('vy-step-full'));
      return () => stops.forEach((s) => s());
    }
    if (lowPerf()) {
      const io = new IntersectionObserver(
        (entries) =>
          entries.forEach((e) => e.isIntersecting && e.target.classList.add('vy-step-full')),
        { rootMargin: '0px 0px -25% 0px' },
      );
      items.forEach((el) => io.observe(el));
      stops.push(() => io.disconnect());
      return () => stops.forEach((s) => s());
    }

    const frames: string[] = [];
    let frame = 0;
    const paint = () => {
      frame = 0;
      // One layout read pass, then writes.
      const tops = items.map((el) => el.getBoundingClientRect().top);
      const h = innerHeight;
      items.forEach((el, i) => {
        const fill = Math.min(1, Math.max(0, (h * 0.9 - tops[i]) / (h * 0.45)));
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
    // One read-and-write pass per frame, however fast the scroll events come.
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
  }, [pathname]);
  return null;
};

export { LiquidPour };
