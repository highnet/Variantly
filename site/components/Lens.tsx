'use client';

import { ChevronLeft, X } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentType,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { createPortal } from 'react-dom';

import { CONCEPT_BY_ID, CONCEPT_LOADERS, prefetchConcept, type ConceptId } from '@/concepts';
import { INTRO_FINAL } from '@/lib/introFonts';
import {
  lensEnabled,
  lensLive,
  lensPerf,
  lensTick,
  onLensGl,
  pendingKick,
  takeKick,
} from '@/lib/lens';
import {
  DOOR_RADIUS,
  PEEK,
  doorOutline,
  doorSize,
  dropoutRing,
  ringsPath,
  tiltOutline,
  type Pt,
  type Rect,
} from '@/lib/lensDoor';
import { lensFor } from '@/lib/lensPair';
import { NO_GLITCH, glitchFrame, glitchIntensity, glitchOn } from '@/lib/lensGlitch';
import { lensSheet, mirrorRoot } from '@/lib/lensScope';
import { perfTier } from '@/lib/perfTier';
import { PREFS_EVENT, calmMotion } from '@/lib/prefs';
import { cn } from '@/lib/utils';
import { setVariant, useConcept } from '@/lib/variant';
import { Button } from '@/components/ui/Button';

const WORD = 'variantly';
// Room around the door for its glitch slices, tilt and side edge, px.
const M = 28;
// How far the door trails the cursor (time constant, ms), and its tilt.
const LAG = 70;
const TILT_Y = 7;
const TILT_X = 5;
// Above this speed (px/ms) the inner 3D scene pauses.
const FAST = 1.1;

type Mode = 'pointer' | 'touch' | 'fixed';

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const offset = (pts: Pt[], dx: number, dy: number): Pt[] => pts.map(([x, y]) => [x + dx, y + dy]);

// How the Lens works here: the pointer, touch, or a still door (calm).
const onPrefs = (cb: () => void) => {
  addEventListener(PREFS_EVENT, cb);
  document.addEventListener('vy:perf', cb);
  return () => {
    removeEventListener(PREFS_EVENT, cb);
    document.removeEventListener('vy:perf', cb);
  };
};
const modeNow = (): Mode | null => {
  if (!lensEnabled()) return null;
  if (calmMotion()) return 'fixed';
  return matchMedia('(pointer: coarse)').matches ? 'touch' : 'pointer';
};
// The doorway's light: off in calm and at the low tier (a solid frame).
const glowNow = () => !calmMotion() && perfTier() !== 'low';
const never = () => null;
const noGlow = () => false;

// The lens concept's 2D background art, loaded on demand.
const useArt = (id: ConceptId) => {
  const [art, setArt] = useState<{ id: ConceptId; Art: ComponentType } | null>(null);
  useEffect(() => {
    let live = true;
    void CONCEPT_LOADERS[id]
      .backdrop()
      .then((m) => live && setArt({ id, Art: m.default }))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [id]);
  return art;
};

type LensHeroProps = {
  id: ConceptId;
  cardClass: string;
  wordClass: string;
  rootRef: (el: HTMLDivElement | null) => void;
};

/*
 * The hero as the lens concept draws it, inside the Lens's shadow root: the
 * page ground, the concept's background art (laid out over the viewport, as
 * the page's fixed backdrop is) and the title card with its 2D word, at the
 * real card's place and size. lib/lensScope rescopes the page's CSS to it.
 */
const LensHero = ({ id, cardClass, wordClass, rootRef }: LensHeroProps) => {
  const art = useArt(id);
  const Art = art && art.id === id ? art.Art : null;
  return (
    <div ref={rootRef} className="vy-lens-root pointer-events-none absolute overflow-hidden">
      <div className="vy-backdrop absolute inset-0 overflow-hidden">
        {Art && (
          <div className="vy-blobs vy-art absolute inset-0">
            <Art key={id} />
          </div>
        )}
      </div>
      <section data-lens-section className="bg-slate on-slate absolute grid">
        <div className="text-surface grid">
          <div data-hero-title className={cardClass}>
            <div className={wordClass}>
              {[...WORD].map((c, i) => (
                <span key={i} className="vy-letter relative inline-block leading-none">
                  <span className={INTRO_FINAL[i]}>
                    {c}
                    <span data-base className="inline-block h-0 w-0" />
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

type Els = {
  card: HTMLElement;
  shadow: ShadowRoot;
  layer: HTMLDivElement;
  port: HTMLDivElement;
  inner: HTMLDivElement;
  frame: HTMLDivElement;
  glow: HTMLDivElement;
  edge: SVGPathElement;
  front: SVGPathElement;
  lum: SVGPathElement;
  handle: HTMLDivElement | null;
  chip: () => HTMLDivElement | null;
  root: () => HTMLDivElement | null;
};

type Ui = {
  id: () => ConceptId | null;
  page: () => ConceptId | null;
  setFixed: (open: boolean) => void;
  setDragging: (on: boolean) => void;
  say: (text: string) => void;
};

/*
 * The Lens's input and motion, outside React: one rAF loop runs while the
 * door moves, settles or glitches, writes the door to lib/lens (read by the
 * 3D pass in the same frame) and moves the 2D layers with transforms.
 */
const lensController = (mode: Mode, els: Els, ui: Ui) => {
  const { card } = els;
  let raf = 0;
  let shown = false;
  let target: Rect = { x: 0, y: 0, w: 180, h: 360 };
  let rect: Rect = { ...target };
  const tilt = { rx: 0, ry: 0 };
  let last = 0;
  let glitchUntil = 0;
  let glitchAmount = 0;
  // Varies the glitch's slicing from one page load to the next.
  const glitchSeed = Math.floor(Math.random() * 1000);
  let lastRim = 0;
  let clipNow = '';
  let suppressUntil = 0;
  let committing = false;
  let fixedOpen = false;
  let dragging = false;
  const cleanups: (() => void)[] = [];

  // Re-line the word up when either word's box changes (fonts and the lens
  // concept's sheet land after the first placement).
  let watched: Element | null = null;
  const words = new ResizeObserver(() => shown && placeRoot());
  cleanups.push(() => words.disconnect());
  void document.fonts?.ready.then(() => shown && placeRoot());

  const placeRoot = () => {
    const r = els.root();
    if (!r) return;
    const b = card.getBoundingClientRect();
    lensLive.card = { left: b.left, top: b.top };
    // Inline: the page's rescoped `:root` rules (unlayered) outrank the
    // utility classes on this element.
    r.style.position = 'absolute';
    r.style.left = `${-b.left}px`;
    r.style.top = `${-b.top}px`;
    r.style.width = `${innerWidth}px`;
    r.style.height = `${innerHeight}px`;
    const sec = r.querySelector('[data-lens-section]') as HTMLElement | null;
    if (!sec) return;
    sec.style.left = `${b.left}px`;
    sec.style.top = `${b.top}px`;
    sec.style.width = `${card.offsetWidth}px`;
    sec.style.height = `${card.offsetHeight}px`;
    const hc = sec.querySelector('[data-hero-title]') as HTMLElement | null;
    if (hc) {
      hc.style.height = `${card.offsetHeight}px`;
      // A concept's own min-height would outgrow the page's card.
      hc.style.minHeight = '0';
    }
    // Line the lens word up with the page's: concepts pad and centre the word
    // differently, so left to its own CSS it sits off the page word's line.
    const lw = sec.querySelector('.vy-title') as HTMLElement | null;
    const pw = card.querySelector('.vy-title');
    if (!lw || !pw) return;
    if (watched !== lw) {
      words.disconnect();
      words.observe(pw);
      words.observe(lw);
      watched = lw;
    }
    const pls = [...pw.querySelectorAll('.vy-letter')];
    const lls = [...lw.querySelectorAll<HTMLElement>('.vy-letter')];
    for (const el of [lw, ...lls]) el.style.removeProperty('translate');
    lw.style.removeProperty('scale');
    const a = pw.getBoundingClientRect();
    const l = lw.getBoundingClientRect();
    const dx = a.left + a.width / 2 - (l.left + l.width / 2);
    const dy = a.top + a.height / 2 - (l.top + l.height / 2);
    // Each concept sizes its word differently: match the page word's width
    // so the letters meet at the door's edge.
    const k = l.width > 0 ? a.width / l.width : 1;
    lw.style.setProperty('scale', k.toFixed(4), 'important');
    // Important: the low tier's `translate: none !important` (meant for the
    // backdrop's drift) reaches the lens word through the rescoped sheet.
    lw.style.setProperty('translate', `${dx.toFixed(1)}px ${dy.toFixed(1)}px`, 'important');
    // Then letter by letter: concepts' faces space their letters differently,
    // so each lens letter sits on its page letter (centre, baseline side).
    // Offsets are in the word's scaled space, hence / k.
    if (pls.length !== lls.length) return;
    lls.forEach((el, i) => {
      const p = pls[i].getBoundingClientRect();
      const q = el.getBoundingClientRect();
      const x = (p.left + p.width / 2 - (q.left + q.width / 2)) / k;
      const y = (p.bottom - q.bottom) / k;
      el.style.setProperty('translate', `${x.toFixed(1)}px ${y.toFixed(1)}px`, 'important');
    });
  };

  // A door for this screen, never taller than the card it shows (phones
  // have a short title card): 1:2, a little inset.
  const fitDoor = () => {
    const d = doorSize(innerWidth);
    const h = Math.min(d.h, Math.max(PEEK.h, card.offsetHeight - 20));
    return { w: Math.round(h / 2), h };
  };

  // The resting door (phones): in the card's corner, in the strip below (or,
  // failing room, above) the word, sized so it never covers a letter; the
  // "Try ..." chip sits beside it in the same strip.
  const restRect = (): Rect => {
    const W = card.offsetWidth;
    const H = card.offsetHeight;
    const cb = card.getBoundingClientRect();
    const wb = card.querySelector('.vy-title')?.getBoundingClientRect();
    const top = wb ? wb.top - cb.top : H / 2;
    const bottom = wb ? wb.bottom - cb.top : H / 2;
    const below = H - bottom - 14;
    const above = top - 14;
    const room = Math.max(below, above);
    const h = Math.round(Math.min(PEEK.h, Math.max(32, room)));
    const w = Math.round(h / 2);
    const y = below >= above ? H - 6 - h : 6 + Math.max(0, above - h - 8);
    const r = { x: W - w - 14, y, w, h };
    const chip = els.chip();
    if (chip) {
      const cy = Math.max(
        4,
        Math.min(H - chip.offsetHeight - 4, y + h / 2 - chip.offsetHeight / 2),
      );
      chip.style.transform = `translate(${Math.round(r.x - chip.offsetWidth - 8)}px, ${Math.round(cy)}px)`;
    }
    return r;
  };

  const syncLayers = () => {
    const lr = els.root();
    if (lr) {
      lr.toggleAttribute('data-lens-3d', lensLive.gl);
      lr.toggleAttribute('data-lens-scene', lensLive.scene);
    }
    els.layer.toggleAttribute('data-over', !lensLive.gl);
  };

  const draw = (now: number) => {
    const t0 = lensPerf ? performance.now() : 0;
    const dt = Math.min(64, last ? now - last : 16);
    last = now;
    const k = mode === 'fixed' || fixedOpen ? 1 : 1 - Math.exp(-dt / LAG);
    const px = rect.x + rect.w / 2;
    const py = rect.y + rect.h / 2;
    rect = {
      x: rect.x + (target.x - rect.x) * k,
      y: rect.y + (target.y - rect.y) * k,
      w: rect.w + (target.w - rect.w) * k,
      h: rect.h + (target.h - rect.h) * k,
    };
    // Tilt toward the motion (desktop), eased.
    const vx = (rect.x + rect.w / 2 - px) / Math.max(1, dt);
    const vy = (rect.y + rect.h / 2 - py) / Math.max(1, dt);
    const tilting = mode === 'pointer' && !fixedOpen;
    const kt = 1 - Math.exp(-dt / 90);
    tilt.ry += ((tilting ? clamp(vx * 6, -TILT_Y, TILT_Y) : 0) - tilt.ry) * kt;
    tilt.rx += ((tilting ? clamp(-vy * 5, -TILT_X, TILT_X) : 0) - tilt.rx) * kt;
    lensLive.fast = Math.hypot(vx, vy) > FAST;
    // Glitch: a kick starts one; while it runs, a new frame every ~40ms.
    const kicked = pendingKick();
    const lid = ui.id();
    if (kicked && glitchOn() && lid) {
      const rim = kicked.kind === 'rim';
      if (!rim || now - lastRim > 450) {
        if (rim) lastRim = now;
        glitchUntil = now + (rim ? 70 : 100);
        glitchAmount = glitchIntensity(lid) * (rim ? 0.55 : 1);
      }
    }
    const glitching = now < glitchUntil;
    const g = glitching
      ? glitchFrame(Math.floor(now / 40) + glitchSeed, glitchAmount, rect.h)
      : NO_GLITCH;
    // Phones: no RGB split or flicker in the glitch.
    lensLive.glitch = mode === 'touch' ? { ...g, split: 0, flicker: false } : g;
    const { w, h } = rect;
    const local = tiltOutline(doorOutline(w, h, DOOR_RADIUS, g.bands), w, h, tilt);
    const holes = g.dropouts.map((d) => tiltOutline(dropoutRing(w, d.y0, d.y1), w, h, tilt));
    lensLive.rect = { ...rect };
    lensLive.tilt = { ...tilt };
    lensLive.outline = offset(local, rect.x, rect.y);
    lensLive.holes = holes.map((ring) => offset(ring, rect.x, rect.y));
    // The 2D layers: translated (compositor), clipped by a path that only
    // changes when the door's shape does.
    const ox = rect.x - M;
    const oy = rect.y - M;
    const move = `translate3d(${ox.toFixed(1)}px, ${oy.toFixed(1)}px, 0)`;
    const bw = `${Math.ceil(w + 2 * M)}px`;
    const bh = `${Math.ceil(h + 2 * M)}px`;
    for (const el of [els.port, els.frame, els.glow]) {
      if (el.style.width !== bw) el.style.width = bw;
      if (el.style.height !== bh) el.style.height = bh;
      el.style.transform = move;
    }
    els.inner.style.transform = `translate3d(${(-ox).toFixed(1)}px, ${(-oy).toFixed(1)}px, 0)`;
    els.frame.style.setProperty('--door-h', `${h.toFixed(1)}px`);
    if (els.handle) {
      els.handle.style.transform = `translate3d(${rect.x.toFixed(1)}px, ${rect.y.toFixed(1)}px, 0)`;
      els.handle.style.width = `${w.toFixed(1)}px`;
      els.handle.style.height = `${h.toFixed(1)}px`;
    }
    const clip = `path(evenodd, '${ringsPath([local, ...holes], M, M)}')`;
    if (clip !== clipNow) {
      clipNow = clip;
      els.port.style.clipPath = clip;
      // The slab: its side edge (the back outline, offset by its depth),
      // the front frame, the inner light.
      const dx = 3 + clamp(-tilt.ry * 0.9, -6, 6);
      const dy = 3 + clamp(tilt.rx * 0.7, -4, 4);
      const front = ringsPath([local], M, M);
      els.edge.setAttribute('d', ringsPath([offset(local, dx, dy), local], M, M));
      els.front.setAttribute('d', front);
      els.lum.setAttribute('d', front);
    }
    // The 3D pass decides per frame: the 2D layer sits under the canvas
    // while it draws the letters, over it otherwise.
    syncLayers();
    lensTick();
    lensPerf?.push(performance.now() - t0);
    const settled =
      Math.abs(target.x - rect.x) < 0.2 &&
      Math.abs(target.y - rect.y) < 0.2 &&
      Math.abs(target.w - rect.w) < 0.2 &&
      Math.abs(target.h - rect.h) < 0.2 &&
      Math.abs(tilt.rx) + Math.abs(tilt.ry) < 0.02 &&
      !glitching;
    if (settled) {
      raf = 0;
      last = 0;
      if (lensLive.fast) {
        lensLive.fast = false;
        lensTick();
      }
      // The 3D pass may have changed its mind in that paint.
      requestAnimationFrame(syncLayers);
    } else raf = requestAnimationFrame(draw);
  };
  const wake = () => {
    if (!raf) raf = requestAnimationFrame(draw);
  };
  cleanups.push(takeKick(wake), onLensGl(syncLayers));

  const show = (on: boolean) => {
    if (shown === on) return;
    shown = on;
    lensLive.shown = on;
    lensLive.mode = mode;
    if (on) {
      const sheet = lensSheet();
      if (sheet && !els.shadow.adoptedStyleSheets.includes(sheet))
        els.shadow.adoptedStyleSheets = [sheet];
      const r = els.root();
      const lid = ui.id();
      if (r && lid) mirrorRoot(r, lid);
      placeRoot();
      lensLive.word = (r?.querySelector('.vy-title') as HTMLElement | null) ?? null;
    } else lensLive.gl = false;
    els.layer.toggleAttribute('data-shown', on);
    els.frame.toggleAttribute('data-shown', on);
    lensTick();
    wake();
  };

  const commit = () => {
    const cur = ui.id();
    if (!cur || committing) return;
    committing = true;
    const b = card.getBoundingClientRect();
    setVariant(cur, {
      origin: {
        x: b.left + rect.x + rect.w / 2,
        y: b.top + rect.y + rect.h / 2,
        w: rect.w,
        h: rect.h,
      },
    });
    // A switch that does not happen frees it again.
    setTimeout(() => (committing = false), 1500);
  };

  // The page took a concept (a commit or any switch): the door goes in the
  // same task, so the switch's new snapshot has no door in it.
  const html = document.documentElement;
  let was = html.dataset.variant;
  const mo = new MutationObserver(() => {
    if (html.dataset.variant === was) return;
    was = html.dataset.variant;
    suppressUntil = performance.now() + 900;
    committing = false;
    if (fixedOpen) ui.setFixed(false);
    fixedOpen = false;
    if (mode !== 'touch') show(false);
    else {
      target = restRect();
      rect = { ...target };
      wake();
    }
  });
  mo.observe(html, { attributes: true, attributeFilter: ['data-variant'] });
  cleanups.push(() => mo.disconnect());

  // ---- Desktop: follow the cursor over the card. ----
  if (mode === 'pointer') {
    const at = (e: PointerEvent): Rect => {
      const b = card.getBoundingClientRect();
      const { w, h } = fitDoor();
      return { x: e.clientX - b.left - w / 2, y: e.clientY - b.top - h / 2, w, h };
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || fixedOpen) return;
      if (performance.now() < suppressUntil || committing) return;
      // Over the Lens's own controls the door steps aside.
      if ((e.target as Element).closest('[data-lens-ui]')) return show(false);
      target = at(e);
      if (!shown) {
        rect = { ...target };
        show(true);
      }
      wake();
    };
    const onLeave = () => {
      if (!committing && !fixedOpen) show(false);
    };
    const onClick = (e: MouseEvent) => {
      if (!shown || fixedOpen || (e.target as Element).closest('[data-lens-ui], a, button')) return;
      commit();
    };
    const onScroll = () => shown && placeRoot();
    card.addEventListener('pointermove', onMove);
    card.addEventListener('pointerleave', onLeave);
    card.addEventListener('click', onClick);
    addEventListener('scroll', onScroll, { passive: true });
    cleanups.push(() => {
      card.removeEventListener('pointermove', onMove);
      card.removeEventListener('pointerleave', onLeave);
      card.removeEventListener('click', onClick);
      removeEventListener('scroll', onScroll);
    });
  }

  // ---- Phones: the resting peek, drag and snap. ----
  if (mode === 'touch') {
    target = restRect();
    rect = { ...target };
    show(true);
    const onResize = () => {
      if (!dragging) {
        target = restRect();
        wake();
      }
      placeRoot();
    };
    const onScroll = () => placeRoot();
    addEventListener('resize', onResize);
    addEventListener('scroll', onScroll, { passive: true });
    cleanups.push(() => {
      removeEventListener('resize', onResize);
      removeEventListener('scroll', onScroll);
    });
  }
  const drag = { id: -1, x0: 0, y0: 0, moved: false };
  const handleDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.id = e.pointerId;
    drag.x0 = e.clientX;
    drag.y0 = e.clientY;
    drag.moved = false;
  };
  const handleMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.id !== e.pointerId) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 8) return;
    if (!drag.moved) {
      drag.moved = true;
      dragging = true;
      ui.setDragging(true);
    }
    const b = card.getBoundingClientRect();
    const { w, h } = fitDoor();
    // Above the finger, so the finger does not hide what it shows.
    target = { x: e.clientX - b.left - w / 2, y: e.clientY - b.top - h * 0.75, w, h };
    wake();
  };
  const handleUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.id !== e.pointerId) return;
    drag.id = -1;
    // A tap on the door (no drag) keeps its concept, like a click on desktop.
    if (!drag.moved) commit();
    dragging = false;
    ui.setDragging(false);
    target = restRect();
    wake();
  };

  // ---- The still door (calm, keyboard). ----
  const openFixed = () => {
    const lid = ui.id();
    if (!lid) return;
    const { w, h } = fitDoor();
    target = {
      x: (card.offsetWidth - w) / 2,
      y: Math.max(8, (card.offsetHeight - h) / 2 - 24),
      w,
      h,
    };
    rect = { ...target };
    tilt.rx = tilt.ry = 0;
    fixedOpen = true;
    ui.setFixed(true);
    ui.say(`Previewing ${CONCEPT_BY_ID[lid].name}. Use the arrows to change it, Try to keep it.`);
    if (shown) wake();
    else show(true);
  };
  const closeFixed = () => {
    fixedOpen = false;
    ui.setFixed(false);
    if (mode === 'touch') {
      target = restRect();
      wake();
    } else show(false);
  };

  // Escape closes the still door. (`[` / `]` stay the page's own keys: the
  // door's concept is fixed by the page's, see stepIds in concepts/index.ts.)
  const onKey = (e: KeyboardEvent) => {
    if (!shown || e.metaKey || e.ctrlKey || e.altKey) return;
    if (mode === 'touch' && !fixedOpen) return;
    if (e.key === 'Escape' && fixedOpen) closeFixed();
  };
  addEventListener('keydown', onKey, { capture: true });
  cleanups.push(() => removeEventListener('keydown', onKey, { capture: true }));

  // The lens root follows the page's html attributes and the lens concept.
  const rootChanged = () => {
    const r = els.root();
    const lid = ui.id();
    if (!r || !lid) return;
    mirrorRoot(r, lid);
    if (shown) {
      placeRoot();
      lensLive.word = r.querySelector('.vy-title') as HTMLElement | null;
      wake();
    }
  };
  const mirror = new MutationObserver(rootChanged);
  mirror.observe(html, { attributes: true });
  cleanups.push(() => mirror.disconnect());

  return {
    commit,
    openFixed,
    closeFixed,
    handleDown,
    handleMove,
    handleUp,
    rootChanged,
    // The chip's label changed width: line it up again (phones).
    placeChip: () => {
      if (mode === 'touch') restRect();
    },
    dispose: () => {
      cancelAnimationFrame(raf);
      cleanups.forEach((c) => c());
      lensLive.shown = false;
      lensLive.gl = false;
      lensLive.word = null;
      lensTick();
    },
  };
};

/*
 * The Lens: a doorway over the hero that shows the hero in another concept.
 *
 * - The door always shows the page concept's fixed partner (the next on stepIds); only
 *   keeping it changes what the door shows next.
 * - Desktop: the door follows the cursor over the title card with a slight
 *   lag, tilting a few degrees toward its motion, its concept named on its
 *   top edge; a click keeps it: the door opens (setVariant with the door as
 *   the origin, the same doorway every concept switch opens).
 * - Phones: the door rests small in a corner (a peek); a finger drags it out
 *   full size, lifting snaps it back; a tap on it, or "Try ...", keeps it.
 * - Calm / reduced motion, and the keyboard: a "Peek another look" button
 *   opens a still door in the middle with its controls; keeping is instant
 *   in calm mode.
 *
 * Inside: a shadow-root copy of the hero in the lens concept (2D, clipped to
 * the door with path()); on desktop at the high tier the title's canvas draws
 * that concept's 3D letters and scene through the same outline (lib/lens3d).
 * Phones and the low tier keep the 2D hero (its 2D word and art: a still,
 * no second render). Off with ?lens=0 and in seek renders.
 */
export const Lens = () => {
  const page = useConcept();
  const mode = useSyncExternalStore(onPrefs, modeNow, never);
  const glow = useSyncExternalStore(onPrefs, glowNow, noGlow);
  const id = page && mode ? lensFor(page) : null;
  const [fixedOpen, setFixedOpen] = useState(false);
  const [dragging, setDraggingState] = useState(false);
  // The phone door has been dragged or tapped at least once.
  const [used, setUsed] = useState(false);
  const setDragging = useCallback((on: boolean) => {
    setDraggingState(on);
    setUsed(true);
  }, []);
  const [say, setSay] = useState('');
  const [shadow, setShadow] = useState<ShadowRoot | null>(null);
  const [card, setCard] = useState<HTMLElement | null>(null);
  const [classes, setClasses] = useState<{ card: string; word: string } | null>(null);

  const layer = useRef<HTMLDivElement | null>(null);
  const port = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const glowEl = useRef<HTMLDivElement>(null);
  const edge = useRef<SVGPathElement>(null);
  const front = useRef<SVGPathElement>(null);
  const lum = useRef<SVGPathElement>(null);
  const handle = useRef<HTMLDivElement>(null);
  const chip = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement | null>(null);
  const idRef = useRef<ConceptId | null>(null);
  const pageRef = useRef<ConceptId | null>(null);
  const ctl = useRef<ReturnType<typeof lensController> | null>(null);

  const hostRef = useCallback((el: HTMLDivElement | null) => {
    if (el) setShadow(el.shadowRoot ?? el.attachShadow({ mode: 'open' }));
  }, []);
  const layerRef = useCallback((el: HTMLDivElement | null) => {
    layer.current = el;
    const c = (el?.closest('[data-hero-title]') as HTMLElement | null) ?? null;
    setCard(c);
    // The page's own title word, to copy its classes.
    const w = c?.querySelector('.vy-title');
    if (c && w)
      setClasses({ card: c.className, word: w.className.replace('vy-title-solid', '').trim() });
  }, []);
  const rootRef = useCallback((el: HTMLDivElement | null) => {
    root.current = el;
    ctl.current?.rootChanged();
  }, []);

  useEffect(() => {
    idRef.current = id;
    pageRef.current = page;
    lensLive.id = id;
    if (id) void prefetchConcept(id, true);
    ctl.current?.rootChanged();
    ctl.current?.placeChip();
  }, [id, page]);

  useEffect(() => {
    const l = layer.current;
    const p = port.current;
    const i = inner.current;
    const f = frame.current;
    const g = glowEl.current;
    const e = edge.current;
    const fr = front.current;
    const lu = lum.current;
    if (!mode || !card || !shadow || !l || !p || !i || !f || !g || !e || !fr || !lu) return;
    const c = lensController(
      mode,
      {
        card,
        shadow,
        layer: l,
        port: p,
        inner: i,
        frame: f,
        glow: g,
        edge: e,
        front: fr,
        lum: lu,
        handle: handle.current,
        chip: () => chip.current,
        root: () => root.current,
      },
      {
        id: () => idRef.current,
        page: () => pageRef.current,
        setFixed: setFixedOpen,
        setDragging,
        say: setSay,
      },
    );
    ctl.current = c;
    return () => {
      c.dispose();
      ctl.current = null;
    };
  }, [mode, card, shadow, setDragging]);

  // The chip shows (first use) or relabels: line it up beside the door.
  useEffect(() => ctl.current?.placeChip(), [used]);

  useEffect(() => {
    if (fixedOpen) document.getElementById('vy-lens-try')?.focus();
  }, [fixedOpen]);

  if (!mode) return null;
  const name = id ? CONCEPT_BY_ID[id].name : '';
  const peek = mode === 'touch' && !dragging && !fixedOpen;

  return (
    <>
      <div
        ref={layerRef}
        aria-hidden="true"
        data-glow={glow || undefined}
        // Leans with the 3D title (Letters3D sets the transform).
        data-lens-lean
        className="vy-lens pointer-events-none absolute inset-0 z-1 overflow-hidden [transition:transform_0.7s_ease-out]"
      >
        {/* The slab's light: a halo and a warm spill on the ground below it. */}
        <div ref={glowEl} className="vy-lens-glow absolute top-0 left-0" />
        <div ref={port} className="vy-lens-port absolute top-0 left-0 overflow-hidden">
          <div ref={inner} className="absolute top-0 left-0">
            <div ref={hostRef} />
          </div>
        </div>
      </div>
      {/* The frame rides a full-card layer that leans with the 3D title, so
          it stays on the door the canvas stencils while the word tilts. */}
      <div
        data-lens-lean
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-3 [transition:transform_0.7s_ease-out]"
      >
        <div
          ref={frame}
          aria-hidden="true"
          data-glow={glow || undefined}
          data-peek={peek || undefined}
          className="vy-lens-frame pointer-events-none absolute top-0 left-0 z-3"
        >
          <svg className="absolute top-0 left-0 overflow-visible" width="1" height="1">
            <defs>
              <radialGradient id="vy-lens-lum" cx="50%" cy="50%" r="72%">
                <stop offset="58%" stopColor="var(--lens-light)" stopOpacity="0" />
                <stop offset="100%" stopColor="var(--lens-light)" stopOpacity="0.3" />
              </radialGradient>
            </defs>
            <path ref={lum} className="vy-lens-lum" fill="url(#vy-lens-lum)" />
            <path ref={edge} className="fill-lens-edge" fillRule="evenodd" />
            <path ref={front} className="vy-lens-front" fill="none" />
          </svg>
          {id && (
            <span className="vy-lens-label">
              {name}
              {mode === 'pointer' && !fixedOpen && (
                <span className="vy-lens-hint">click to keep</span>
              )}
            </span>
          )}
        </div>
      </div>
      {mode === 'touch' && (
        <div
          ref={handle}
          data-lens-ui
          aria-hidden="true"
          onPointerDown={(e) => ctl.current?.handleDown(e)}
          onPointerMove={(e) => ctl.current?.handleMove(e)}
          onPointerUp={(e) => ctl.current?.handleUp(e)}
          onPointerCancel={(e) => ctl.current?.handleUp(e)}
          className="vy-lens-handle absolute top-0 left-0 z-4 grid touch-none place-items-center"
        >
          {/* At rest the door peeks in from the edge: a chevron says it is a
              tab to pull, not a stray frame. */}
          {peek && <ChevronLeft className="vy-lens-grip size-5" strokeWidth={2.75} />}
        </div>
      )}
      {!fixedOpen && (
        <div data-lens-ui className="absolute bottom-3 left-3 z-4 flex items-center gap-2">
          {/* The still door: always on in calm mode, the keyboard's way in
              elsewhere (shown on focus). */}
          <Button
            variant="lens"
            size="pill"
            onClick={() => ctl.current?.openFixed()}
            className={cn(mode !== 'fixed' && 'sr-only focus:not-sr-only')}
          >
            Peek another look
          </Button>
        </div>
      )}
      {mode === 'touch' && (
        // Phones: keep the peeked concept, from a chip beside the resting
        // door (never over the word), shown once the door has been used
        // (focusable before that).
        <div
          ref={chip}
          data-lens-ui
          className={cn(
            'vy-lens-try absolute top-0 left-0 z-4',
            (dragging || fixedOpen || !id) && 'invisible',
          )}
        >
          <Button
            variant="lens"
            size="small"
            onClick={() => ctl.current?.commit()}
            // A 32px chip with a 44px touch target: the hit area reaches 6px
            // past it above and below, invisibly.
            className={cn(
              used
                ? "relative before:absolute before:-inset-x-1 before:-inset-y-1.5 before:content-['']"
                : 'sr-only focus:not-sr-only',
            )}
          >
            Try {name}
          </Button>
        </div>
      )}
      {fixedOpen && id && (
        <div
          data-lens-ui
          role="group"
          aria-label="Peek another look"
          className="absolute inset-x-0 bottom-3 z-4 flex flex-wrap items-center justify-center gap-2 px-3"
        >
          <Button id="vy-lens-try" variant="lens" size="pill" onClick={() => ctl.current?.commit()}>
            Try {name}
          </Button>
          <Button
            variant="lens"
            size="round"
            aria-label="Close"
            onClick={() => ctl.current?.closeFixed()}
          >
            <X />
          </Button>
        </div>
      )}
      <span className="sr-only" aria-live="polite">
        {say}
      </span>
      {shadow &&
        classes &&
        id &&
        createPortal(
          <LensHero id={id} cardClass={classes.card} wordClass={classes.word} rootRef={rootRef} />,
          shadow,
        )}
    </>
  );
};
