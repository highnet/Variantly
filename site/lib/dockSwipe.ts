'use client';

import {
  useEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';

import { EASE } from '@/lib/motion';
import { calmMotion } from '@/lib/prefs';

// Past this distance (px), or this flick speed (px/ms), a release steps.
const STEP_AT = 56;
const FLICK = 0.45;
// How far the face can be pulled before it resists (rubber band), px.
const GIVE = 70;

type DockSwipeOptions = {
  // The dock (lights the arrow it heads toward) and its moving face.
  dock: RefObject<HTMLElement | null>;
  face: RefObject<HTMLSpanElement | null>;
  // The concept on screen: the face springs in when it changes after a swipe.
  current: string;
  // Step to the previous (-1) or next (1) concept.
  step: (by: -1 | 1) => void;
  // A swipe up opens the full picker.
  open: () => void;
};

const lean = (dock: HTMLElement | null, dx: number) => {
  if (dock) dock.dataset.lean = dx < -12 ? 'next' : dx > 12 ? 'prev' : '';
};

// Linear up to GIVE, then each further px moves a third as far.
const place = (face: HTMLElement | null, dx: number) => {
  if (!face) return;
  const m = Math.abs(dx);
  const pulled = m <= GIVE ? m : GIVE + (m - GIVE) / 3;
  face.style.transform = `translateX(${(Math.sign(dx) * pulled).toFixed(1)}px)`;
  face.style.opacity = String(1 - Math.min(0.5, m / 260));
};

// Spring back from wherever the finger left it.
const settle = (dock: HTMLElement | null, face: HTMLElement | null) => {
  lean(dock, 0);
  if (!face) return;
  const from = face.style.transform || 'none';
  const fromO = face.style.opacity || '1';
  face.style.transform = '';
  face.style.opacity = '';
  if (calmMotion()) return;
  face.animate(
    [
      { transform: from, opacity: fromO },
      { transform: 'none', opacity: 1 },
    ],
    { duration: 420, easing: EASE.spring },
  );
};

const clear = (face: HTMLElement) => {
  face.style.transform = '';
  face.style.opacity = '';
};

// Fly out the way the finger went; resolves once it is gone.
const flyOut = (face: HTMLElement, by: -1 | 1) => {
  const out = face.animate(
    [
      { transform: face.style.transform || 'none', opacity: face.style.opacity || '1' },
      { transform: `translateX(${by * -120}px)`, opacity: 0 },
    ],
    { duration: 160, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' },
  );
  return out.finished.then(() => {
    face.style.transform = `translateX(${by * -120}px)`;
    face.style.opacity = '0';
    out.cancel();
  });
};

// The next face springs in from the side opposite the swipe.
const springIn = (face: HTMLElement, by: -1 | 1) => {
  clear(face);
  if (calmMotion()) return;
  face.animate(
    [
      { transform: `translateX(${by * 90}px)`, opacity: 0 },
      { transform: `translateX(${by * -6}px)`, opacity: 1, offset: 0.7 },
      { transform: 'none', opacity: 1 },
    ],
    { duration: 460, easing: EASE.outExpo },
  );
};

/*
 * Swipe gestures for the concept dock on touch screens. The dock's face (the
 * swatch, letter and name) follows the finger with a rubber band and the
 * arrow on the side it heads toward lights up; let go past STEP_AT or with a
 * flick and the face flies out, the concept steps, and the next face springs
 * in from the other side. A swipe up opens the picker. A swipe never also
 * counts as a tap (the click that follows it is swallowed). Calm motion
 * keeps the gesture and drops the travel. Returns the dock's handlers.
 */
export const useDockSwipe = ({ dock, face, current, step, open }: DockSwipeOptions) => {
  const g = useRef({
    id: -1,
    x0: 0,
    y0: 0,
    axis: '' as '' | 'x' | 'y',
    dx: 0,
    // The release speed comes from the last stretch of movement, not the whole
    // gesture: a slow start and then a flick still counts as a flick.
    vx: 0,
    lastX: 0,
    lastT: 0,
    swallow: false,
  });
  // The direction of the last swipe that stepped, for the face's entrance.
  const entering = useRef<0 | -1 | 1>(0);

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'touch') return;
    g.current = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      axis: '',
      dx: 0,
      vx: 0,
      lastX: e.clientX,
      lastT: performance.now(),
      swallow: false,
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const s = g.current;
    if (s.id !== e.pointerId) return;
    const dx = e.clientX - s.x0;
    const dy = e.clientY - s.y0;
    if (!s.axis) {
      if (Math.hypot(dx, dy) < 8) return;
      s.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      s.swallow = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const now = performance.now();
    const dt = now - s.lastT;
    // Smoothed px/ms, weighted to the latest move.
    if (dt > 0) s.vx = s.vx * 0.3 + ((e.clientX - s.lastX) / dt) * 0.7;
    s.lastX = e.clientX;
    s.lastT = now;
    if (s.axis === 'x') {
      s.dx = dx;
      lean(dock.current, dx);
      place(face.current, dx);
    }
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLElement>) => {
    const s = g.current;
    if (s.id !== e.pointerId) return;
    s.id = -1;
    if (s.axis === 'y') {
      if (e.clientY - s.y0 < -32) open();
      return;
    }
    if (s.axis !== 'x') return;
    // A flick counts only toward where the finger was heading, and only if
    // it was still moving when it lifted.
    const fresh = performance.now() - s.lastT < 90;
    const flick = fresh && Math.abs(s.vx) >= FLICK && Math.sign(s.vx) === Math.sign(s.dx);
    if (Math.abs(s.dx) < STEP_AT && !flick) return settle(dock.current, face.current);
    const by: -1 | 1 = s.dx < 0 ? 1 : -1;
    const f = face.current;
    navigator.vibrate?.(8);
    entering.current = by;
    lean(dock.current, 0);
    if (!f || calmMotion()) {
      if (f) clear(f);
      step(by);
      return;
    }
    void flyOut(f, by).then(() => step(by));
  };

  useEffect(() => {
    const by = entering.current;
    if (!face.current || !by) return;
    entering.current = 0;
    springIn(face.current, by);
  }, [current, face]);

  // The tap that ends a swipe must not also open the picker.
  const onClickCapture = (e: ReactMouseEvent) => {
    if (!g.current.swallow) return;
    g.current.swallow = false;
    e.preventDefault();
    e.stopPropagation();
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    onClickCapture,
  };
};
