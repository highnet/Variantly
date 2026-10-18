'use client';

/*
 * The Lens: the original fills the stage and the chosen design shows only
 * through a rounded door. With a mouse the door follows the pointer (a short
 * lag, none when motion is calm) and a click asks to keep that design; hold
 * Shift to reach the page underneath. On touch the door rests as a pull-tab
 * at the stage's edge: drag it in, tap its label to keep, drag it back out to
 * close. With the keyboard, focus the stage and the arrows move the door.
 * Both frames stay scroll-locked through frame.js, so the door always shows
 * the same spot of the page. The door's position lives in CSS variables on
 * the stage (--lx, --ly, --lw, --lh), written per frame without re-rendering.
 */
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { vname } from '@/lib/format';
import { getState, setState, useStore } from '@/lib/store';
import type { Variant } from '@/lib/types';

type Props = {
  stage: RefObject<HTMLDivElement | null>;
  before: RefObject<HTMLIFrameElement | null>;
  /** The design behind the door; null when the door shows the original. */
  v: Variant | null;
  /** What fills the stage, for the accessible name. */
  base: string;
};

type Drag = { id: number; kind: 'door' | 'scroll'; dx: number; dy: number; lastY: number; x0: number; y0: number; moved: boolean };

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const calm = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'calm';
/** Touch-first screens start with the door closed, as a tab at the edge. */
export const lensStartsOpen = () => typeof window === 'undefined' || !window.matchMedia?.('(hover: none)').matches;

// An upright door, about 2:3; narrower in the phone frame.
const doorFor = (w: number, h: number) => {
  const dw = w < 520 ? Math.round(Math.min(150, w * 0.42)) : Math.round(clamp(w * 0.17, 160, 230));
  return { w: dw, h: Math.round(Math.min(dw * 1.5, h * 0.62)) };
};

const LensDoor = ({ stage, before, v, base }: Props) => {
  const open = useStore((s) => s.lensOpen);
  const [touch, setTouch] = useState(() => !lensStartsOpen());
  const [through, setThrough] = useState(false);
  const [dragging, setDragging] = useState(false);
  const pos = useRef({ x: -1, y: -1, tx: -1, ty: -1 });
  const raf = useRef(0);
  const drag = useRef<Drag | null>(null);
  const pad = useRef<HTMLDivElement>(null);

  const box = useCallback(() => {
    const r = stage.current?.getBoundingClientRect();
    return r ? { r, d: doorFor(r.width, r.height) } : null;
  }, [stage]);

  const paint = useCallback(() => {
    const el = stage.current;
    const b = box();
    if (!el || !b) return;
    const p = pos.current;
    el.style.setProperty('--lx', `${Math.round(p.x - b.d.w / 2)}px`);
    el.style.setProperty('--ly', `${Math.round(p.y - b.d.h / 2)}px`);
    el.style.setProperty('--lw', `${b.d.w}px`);
    el.style.setProperty('--lh', `${b.d.h}px`);
  }, [stage, box]);

  const step = useCallback(() => {
    raf.current = 0;
    const p = pos.current;
    p.x += (p.tx - p.x) * 0.24;
    p.y += (p.ty - p.y) * 0.24;
    if (Math.abs(p.tx - p.x) < 0.5 && Math.abs(p.ty - p.y) < 0.5) {
      p.x = p.tx;
      p.y = p.ty;
    } else raf.current = requestAnimationFrame(step);
    paint();
  }, [paint]);

  /** Aim the door's centre at a stage point; it eases there unless motion is calm. */
  const aim = useCallback(
    (x: number, y: number, now = false) => {
      const b = box();
      if (!b) return;
      const p = pos.current;
      p.tx = clamp(x, b.d.w / 2, Math.max(b.d.w / 2, b.r.width - b.d.w / 2));
      p.ty = clamp(y, b.d.h / 2, Math.max(b.d.h / 2, b.r.height - b.d.h / 2));
      if (now || calm() || p.x < 0) {
        cancelAnimationFrame(raf.current);
        raf.current = 0;
        p.x = p.tx;
        p.y = p.ty;
        paint();
      } else if (!raf.current) raf.current = requestAnimationFrame(step);
    },
    [box, paint, step],
  );

  const centre = useCallback(() => {
    const b = box();
    if (b) aim(b.r.width / 2, b.r.height / 2, true);
  }, [aim, box]);

  // Start centred; re-clamp when the stage changes size (window, device).
  useEffect(() => {
    if (pos.current.x < 0) centre();
    else aim(pos.current.tx, pos.current.ty, true);
    const onResize = () => aim(pos.current.tx, pos.current.ty, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
  }, [aim, centre, v?.n]);

  // Shift held (here or inside a preview, via frame.js) lets pointers through.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Shift' && setThrough(e.type === 'keydown');
    const onMessage = (e: MessageEvent) => {
      const msg = e.data as { variantly?: boolean; type?: string; shift?: boolean };
      if (msg?.variantly && msg.type === 'mod') setThrough(Boolean(msg.shift));
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      window.removeEventListener('message', onMessage);
    };
  }, []);

  const keep = () => {
    if (!v || v.status !== 'done' || getState().confirming) return;
    setState({ confirming: true, confirmN: v.n });
  };

  const scrollBy = (dy: number) => before.current?.contentWindow?.postMessage({ variantly: true, type: 'scrollBy', dy }, '*');

  const local = (e: { clientX: number; clientY: number }) => {
    const r = stage.current?.getBoundingClientRect();
    return r ? { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width } : { x: 0, y: 0, w: 0 };
  };

  const inDoor = (x: number, y: number) => {
    const b = box();
    const p = pos.current;
    return Boolean(b && Math.abs(x - p.x) <= b.d.w / 2 && Math.abs(y - p.y) <= b.d.h / 2);
  };

  const onDown = (e: React.PointerEvent) => {
    const isTouch = e.pointerType !== 'mouse';
    setTouch(isTouch);
    if (!isTouch) return;
    const { x, y } = local(e);
    const p = pos.current;
    const kind = inDoor(x, y) ? 'door' : 'scroll';
    drag.current = { id: e.pointerId, kind, dx: p.x - x, dy: p.y - y, lastY: y, x0: x, y0: y, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
    if (kind === 'door') setDragging(true);
  };

  const onMove = (e: React.PointerEvent) => {
    const { x, y } = local(e);
    const g = drag.current;
    if (!g) {
      if (e.pointerType === 'mouse') aim(x, y);
      return;
    }
    if (g.id !== e.pointerId) return;
    if (Math.hypot(x - g.x0, y - g.y0) > 6) g.moved = true;
    if (g.kind === 'door') aim(x + g.dx, y + g.dy, true);
    else {
      scrollBy(g.lastY - y);
      g.lastY = y;
    }
  };

  const onUp = (e: React.PointerEvent) => {
    const g = drag.current;
    if (!g || g.id !== e.pointerId) return;
    drag.current = null;
    setDragging(false);
    // A door dragged back out to the edge goes back to being a tab.
    const { x, w } = local(e);
    if (g.kind === 'door' && g.moved && x > w - 28) setState({ lensOpen: false });
  };

  // The tab: tap or click opens the door; on touch, dragging pulls it in.
  const onTabDown = (e: React.PointerEvent) => {
    const isTouch = e.pointerType !== 'mouse';
    setTouch(isTouch);
    if (!isTouch) return;
    const b = box();
    const { x, y } = local(e);
    if (!b) return;
    setState({ lensOpen: true });
    // The finger holds the door by its right edge, so the door leads it in.
    const dx = -(b.d.w / 2 - 14);
    aim(x + dx, y, true);
    drag.current = { id: e.pointerId, kind: 'door', dx, dy: 0, lastY: y, x0: x, y0: y, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };

  const onTabUp = (e: React.PointerEvent) => {
    const g = drag.current;
    if (!g || g.id !== e.pointerId) return;
    drag.current = null;
    setDragging(false);
    const { x, w } = local(e);
    // A plain tap opens the door a door's width in from the edge.
    if (!g.moved) {
      const b = box();
      if (b) aim(w - b.d.w / 2 - 24, pos.current.ty, true);
    } else if (x > w - 28) setState({ lensOpen: false });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const big = e.shiftKey ? 64 : 16;
    const p = pos.current;
    const to: Record<string, [number, number]> = { ArrowLeft: [-big, 0], ArrowRight: [big, 0], ArrowUp: [0, -big], ArrowDown: [0, big] };
    if (to[e.key]) {
      e.preventDefault();
      aim(p.tx + to[e.key][0], p.ty + to[e.key][1]);
    } else if (e.key === 'Home') {
      e.preventDefault();
      centre();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      keep();
    } else if (e.key === 'PageDown' || e.key === 'PageUp') {
      e.preventDefault();
      scrollBy((e.key === 'PageDown' ? 1 : -1) * (stage.current?.clientHeight ?? 600) * 0.8);
    }
  };

  const verb = touch ? 'Tap' : 'Click';
  const name = v ? vname(v.n) : 'Original';
  const keepable = v?.status === 'done';
  const hint = !open
    ? touch
      ? 'Lens · drag the tab in to look through'
      : 'Lens closed · press L or the tab to open · Esc for the slider'
    : through
      ? 'Using the page · let go of Shift for the lens'
      : touch
        ? 'Drag the door · tap its label to keep · drag it to the edge to close'
        : keepable ? `${verb} to keep ${name} · hold Shift to use the page · Esc closes` : 'The original behind the door · hold Shift to use the page · Esc closes';

  return (
    <>
      {open && (
        <div
          ref={pad}
          className="lens-pad"
          data-through={through || undefined}
          data-touch={touch || undefined}
          role="application"
          tabIndex={0}
          aria-roledescription="lens"
          aria-label={`Lens: ${name} through the door over ${base}. Arrow keys move the door,${keepable ? ` Enter keeps ${name},` : ''} Page Down scrolls, Escape closes.`}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onClick={(e) => {
            if ((e.nativeEvent as PointerEvent).pointerType === 'mouse' || e.detail === 0) keep();
          }}
          onWheel={(e) => scrollBy(e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY)}
          onKeyDown={onKeyDown}
        />
      )}
      <div className="lens-ring" data-open={open || undefined} data-through={through || undefined} data-dragging={dragging || undefined} aria-hidden={!open}>
        <button
          className="lens-label"
          type="button"
          tabIndex={-1}
          disabled={!keepable}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            keep();
          }}
        >
          <strong>{name}</strong>
          <span>{keepable ? `${verb.toLowerCase()} to keep` : 'as it is'}</span>
        </button>
      </div>
      <button
        className="lens-tab"
        type="button"
        data-open={open || undefined}
        data-dragging={dragging || undefined}
        aria-label={`Open the lens on ${name}`}
        tabIndex={open ? -1 : 0}
        onPointerDown={onTabDown}
        onPointerMove={onMove}
        onPointerUp={onTabUp}
        onPointerCancel={onTabUp}
        onClick={(e) => {
          if ((e.nativeEvent as PointerEvent).pointerType !== 'mouse' && e.detail !== 0) return;
          setState({ lensOpen: true });
          requestAnimationFrame(() => pad.current?.focus());
        }}
      >
        <svg viewBox="0 0 12 24" aria-hidden="true">
          <path d="M8 6l-4 6 4 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>Lens</span>
      </button>
      <div className="lens-hint" role="status">
        <span className="tag">{hint}</span>
      </div>
    </>
  );
};

export { LensDoor };
