'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

import { canWebGL } from '@/lib/glTier';
import {
  blendMorph,
  loadMorph,
  morphPath,
  morphPose,
  morphTrack,
  planStep,
  type MorphData,
  type MorphPose,
} from '@/lib/glyphMorph';
import { INTRO_FINAL, INTRO_FONTS } from '@/lib/introFonts';
import { calmMotion } from '@/lib/prefs';
import { releaseFrame, seekTime, useSeekTime } from '@/lib/seek';
import { useSiteStore } from '@/lib/store';
import {
  faceAt,
  morphAt,
  msToNextStep,
  scaleAt,
  startDelay,
  stepAt,
  type MorphPhase,
} from '@/lib/titleTiming';
import { useVariant } from '@/lib/variant';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

// The 3D title (three.js and its typefaces) loads after first paint, once idle.
const Letters3D = dynamic(() => import('@/components/Letters3D').then((m) => m.Letters3D), {
  ssr: false,
});

const WORD = 'variantly';
const fontAt = (step: number, index: number) =>
  INTRO_FONTS[faceAt(step, index, INTRO_FONTS.length)];
const FINAL = INTRO_FINAL.map((c) => INTRO_FONTS.indexOf(c));
// A seeked frame of the 2D word is ready once its outlines have loaded and drawn.
const releaseMorphed = () =>
  void loadMorph()
    .catch(() => null)
    .then(() => releaseFrame('title'));
const SVG = 'http://www.w3.org/2000/svg';

// One rAF for every morphing 2D letter: each registers a painter while it shifts.
const painters = new Set<(now: number) => void>();
let tickRaf = 0;
const tickAll = (now: number) => {
  painters.forEach((p) => p(now));
  tickRaf = painters.size ? requestAnimationFrame(tickAll) : 0;
};
const addPainter = (p: (now: number) => void) => {
  painters.add(p);
  if (!tickRaf) tickRaf = requestAnimationFrame(tickAll);
  return () => {
    painters.delete(p);
  };
};

// The letter's CSS text-shadow as SVG layers (text-shadow does not reach SVG
// paths), bottom layer first.
const shadowLayers = (el: Element) => {
  const ts = getComputedStyle(el).textShadow;
  if (!ts || ts === 'none') return [];
  return ts
    .split(/,(?![^(]*\))/)
    .map((part) => {
      const color =
        part.match(/(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^)]*\)|#[0-9a-f]+/i)?.[0] ??
        'currentColor';
      const [x = 0, y = 0, blur = 0] = (part.replace(color, '').match(/-?[\d.]+(?=px)/g) ?? []).map(
        Number,
      );
      return { color, x, y, blur };
    })
    .reverse();
};

type LetterProps = {
  char: string;
  index: number;
  run: number;
  solid: boolean;
  // Outline data: once loaded, a shifting letter morphs as an SVG path.
  morph: MorphData | null;
};

/* One letter that shape-shifts through the font wardrobe, then locks in. */
const Letter = ({ char, index, run, solid, morph }: LetterProps) => {
  // 'idle' = resting on the final face, a number = flickering, null = just locked.
  const [live, setLive] = useState<number | null | 'idle'>('idle');
  // performance.now() when this letter's reveal started.
  const t0 = useRef(0);

  useEffect(() => {
    if (seekTime() !== null || calmMotion()) return;
    // The 3D word does its own reveal: the hidden HTML letters stay still
    // instead of re-rendering and re-measuring every step.
    if (solid) {
      document.documentElement.removeAttribute('data-intro');
      return;
    }
    const start = performance.now();
    t0.current = start;
    let timer = 0;
    const tick = () => {
      const step = stepAt(performance.now() - start, index);
      setLive(step === null ? null : Math.max(step, 0));
      // The first glyph to move reveals the title (hidden by VARIANT_BOOT).
      document.documentElement.removeAttribute('data-intro');
      // Wake exactly when the face next changes, not on a fixed poll.
      if (step !== null)
        timer = window.setTimeout(tick, msToNextStep(performance.now() - start, index) + 4);
    };
    timer = window.setTimeout(tick, startDelay(index));
    return () => clearTimeout(timer);
  }, [index, run, solid]);

  // seekreel frames derive the step from ?t instead of the clock.
  const seek = useSeekTime();
  const raw = seek === null ? live : stepAt(seek * 1000, index);
  const step = solid || raw === null || raw === 'idle' ? null : Math.max(raw, 0);

  // The slot is sized by the final face (invisible), so the word keeps the same
  // width, and stays centred, while the shifting glyph swaps faces on top.
  // Wide faces would spill into the neighbours: shrink the glyph to its slot.
  const slot = useRef<HTMLSpanElement>(null);
  // The 3D word (Letters3D) mirrors this exactly: fit by the glyph's advance,
  // jump in size about the slot centre.
  const glyph = useRef<HTMLSpanElement>(null);
  const ink = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const g = glyph.current;
    const box = slot.current;
    const text = ink.current;
    if (!g || !box || !text || step === null || morph) return;
    const fit = () => {
      const k = Math.min(1, box.offsetWidth / Math.max(1, text.offsetWidth));
      g.style.transform = `scale(${k * scaleAt(step, index)})`;
    };
    fit();
    // A face still loading measures with its fallback: fit again once it lands.
    let live = true;
    void document.fonts.ready.then(() => live && fit());
    return () => {
      live = false;
    };
  }, [step, index, morph]);

  // Morphing: the shifting glyph is an SVG path lerped between the outlines
  // of this step's face and the next, posed exactly as the font glyph was.
  const svg = useRef<SVGSVGElement>(null);
  const id = useId();
  const shifting = step !== null;
  useLayoutEffect(() => {
    const el = svg.current;
    const box = slot.current;
    if (!morph || !shifting || !el || !box) return;
    const track = morphTrack(morph, char);
    const phase: MorphPhase = { step: 0, e: 0 };
    const pose: MorphPose = { k: 1, y: 0 };
    const g = document.createElementNS(SVG, 'g');
    g.id = id;
    const path = document.createElementNS(SVG, 'path');
    g.appendChild(path);
    // The concept's text-shadow, as offset (and blurred) copies underneath.
    for (const l of shadowLayers(box)) {
      const use = document.createElementNS(SVG, 'use');
      use.setAttribute('href', `#${id}`);
      use.setAttribute('x', String(l.x));
      use.setAttribute('y', String(l.y));
      use.setAttribute('fill', l.color);
      if (l.blur) use.style.filter = `blur(${l.blur / 2}px)`;
      el.appendChild(use);
    }
    el.appendChild(g);
    let w = 0;
    let h = 0;
    let fontPx = 16;
    let finalBase = 0;
    const measure = () => {
      w = box.offsetWidth;
      h = box.offsetHeight;
      fontPx = parseFloat(getComputedStyle(box).fontSize) || 16;
      const mark = box.querySelector<HTMLElement>('[data-base]');
      finalBase = (mark?.offsetTop ?? h) - h / 2;
    };
    measure();
    let lastStep = -1;
    let lastE = -1;
    const paint = (now: number) => {
      const seekAt = seekTime();
      const ms = seekAt === null ? now - t0.current : seekAt * 1000;
      // Past the lock (React swaps in the final letter next): hold the end.
      if (!morphAt(ms, index, phase)) {
        phase.step = Math.max(lastStep, 0);
        phase.e = 1;
      }
      if (phase.step === lastStep && phase.e === lastE) return;
      lastStep = phase.step;
      lastE = phase.e;
      const toFinal = planStep(morph, track, phase, index, FINAL[index]);
      blendMorph(track, phase.e);
      path.setAttribute('d', morphPath(track));
      morphPose(morph, track, index, phase.e, toFinal, w, h, fontPx, finalBase, pose);
      const k = (fontPx * pose.k) / 1000;
      g.setAttribute('transform', `translate(${w / 2} ${h / 2 + pose.y}) scale(${k})`);
    };
    const resize = () => {
      measure();
      lastE = -1;
      paint(performance.now());
    };
    paint(performance.now());
    addEventListener('resize', resize);
    const stop = seekTime() === null ? addPainter(paint) : () => {};
    return () => {
      stop();
      removeEventListener('resize', resize);
      el.replaceChildren();
    };
  }, [morph, shifting, char, index, id]);

  return (
    <span
      ref={slot}
      className={cn(
        'vy-letter relative inline-block leading-none',
        live === null && seek === null && 'vy-letter-locked',
      )}
    >
      <span className={cn(INTRO_FINAL[index], step !== null && 'invisible')}>
        {char}
        {/* Marks the final glyph's baseline for the 3D word's layout. */}
        <span data-base className="inline-block h-0 w-0" />
      </span>
      {step !== null && morph && (
        <svg
          ref={svg}
          aria-hidden="true"
          fill="currentColor"
          className="absolute inset-0 h-full w-full overflow-visible"
        />
      )}
      {step !== null && !morph && (
        <span
          ref={glyph}
          aria-hidden="true"
          className={cn('absolute inset-0 flex items-end justify-center', fontAt(step, index))}
        >
          <span ref={ink}>{char}</span>
        </span>
      )}
    </span>
  );
};

/*
 * TVA-style title card: "variantly" spelled in nine mismatched typefaces,
 * each letter flickering through variants before it settles. It plays on
 * load and again whenever the concept switches (clicking does not replay).
 */
export const VariantTitle = () => {
  const [run, setRun] = useState(0);
  const word = useRef<HTMLDivElement>(null);
  // performance.now() when the current reveal started, shared with the 3D word.
  const clock = useRef(0);
  // The 2D word shows first; three.js loads when the browser is idle, and the
  // 3D word crossfades in over it. The HTML word stays for screen readers and
  // as the fallback when WebGL is unavailable.
  const [want3d, setWant3d] = useState(false);
  const [solid, setSolid] = useState(false);
  const onReady = useCallback(() => setSolid(true), []);
  const onFail = useCallback(() => {
    setSolid(false);
    setWant3d(false);
    if (seekTime() !== null) releaseMorphed();
  }, []);
  const variant = useVariant();
  useEffect(() => {
    clock.current = performance.now();
  }, [run]);
  // The outlines the letters morph between (reduced motion shows the final
  // lockup, so it never needs them).
  const [morph, setMorph] = useState<MorphData | null>(null);
  useEffect(() => {
    if (calmMotion()) return;
    let live = true;
    loadMorph()
      .then((m) => live && setMorph(m))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (!variant) return;
    if (!canWebGL()) {
      if (seekTime() !== null) releaseMorphed();
      return;
    }
    const go = () => setWant3d(true);
    if (seekTime() !== null) {
      queueMicrotask(go);
      return;
    }
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(go, { timeout: 2500 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(go, 1200);
    return () => clearTimeout(id);
  }, [variant]);
  useEffect(
    // A new concept gets its own title reveal.
    () =>
      useSiteStore.subscribe((s, prev) => {
        if (prev.hydrated && s.variant !== prev.variant) setRun((r) => r + 1);
      }),
    [],
  );
  return (
    <div
      data-hero-title
      className={cn(
        'vy-card border-slate-line relative grid place-items-center overflow-hidden border-b px-4 py-14 sm:py-20',
        want3d && 'min-h-[clamp(180px,34vw,460px)]',
      )}
    >
      <div
        ref={word}
        role="img"
        aria-label="variantly"
        className={cn(
          'vy-title relative z-1 flex items-end gap-[0.12em] text-[clamp(2.5rem,16vw,11rem)]',
          solid && 'vy-title-solid',
        )}
      >
        {[...WORD].map((c, i) => (
          <Letter key={i} char={c} index={i} run={run} solid={solid} morph={morph} />
        ))}
      </div>
      {want3d && (
        <Letters3D run={run} clock={clock} title={word} onReady={onReady} onFail={onFail} />
      )}
    </div>
  );
};
