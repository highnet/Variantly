import { calmMotion } from '@/lib/prefs';

/*
 * The one disclosure motion, shared by the prompt card's show-more pill and
 * the <details class="vy-more"> disclosures (Delight, idea 12): height springs
 * open with a small overshoot and settles shut, revealed text fades and
 * un-blurs. Every helper is a no-op under reduced or calm motion.
 */

const OPEN_EASE = 'cubic-bezier(0.3, 1.3, 0.4, 1)';
const SHUT_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

export const stillMotion = () =>
  calmMotion() || matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Animate `el` from one pixel height to another, clipping while it moves. */
export const animateHeight = (el: HTMLElement, from: number, to: number, done?: () => void) => {
  if (stillMotion() || Math.abs(from - to) < 1) {
    done?.();
    return;
  }
  const opening = to > from;
  el.style.overflow = 'hidden';
  const a = el.animate([{ height: `${from}px` }, { height: `${to}px` }], {
    duration: opening ? 460 : 320,
    easing: opening ? OPEN_EASE : SHUT_EASE,
  });
  const end = () => {
    el.style.overflow = '';
    done?.();
  };
  a.onfinish = end;
  a.oncancel = end;
};

/** Newly shown text fades in and comes into focus. */
export const revealText = (els: Element[]) => {
  if (stillMotion()) return;
  els.forEach((el, i) =>
    el.animate(
      [
        { opacity: 0.2, filter: 'blur(6px)', transform: 'translateY(-4px)' },
        { opacity: 1, filter: 'none', transform: 'none' },
      ],
      { duration: 420, delay: i * 40, easing: SHUT_EASE, fill: 'backwards' },
    ),
  );
};

/** A springy squash for the control that was pressed. */
export const squash = (el: Element) => {
  if (stillMotion()) return;
  el.animate(
    [
      { scale: '1 1' },
      { scale: '1.12 0.84', offset: 0.25 },
      { scale: '0.95 1.06', offset: 0.55 },
      { scale: '1 1' },
    ],
    { duration: 480, easing: 'ease-out' },
  );
};
