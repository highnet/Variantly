'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { canWebGL } from '@/lib/glTier';
import { INTRO_FINAL, INTRO_FONTS } from '@/lib/introFonts';
import { calmMotion } from '@/lib/prefs';
import { releaseFrame, seekTime, useSeekTime } from '@/lib/seek';
import { useSiteStore } from '@/lib/store';
import { faceAt, msToNextStep, scaleAt, startDelay, stepAt } from '@/lib/titleTiming';
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

type LetterProps = {
  char: string;
  index: number;
  run: number;
  solid: boolean;
};

/* One letter that shape-shifts through the font wardrobe, then locks in. */
const Letter = ({ char, index, run, solid }: LetterProps) => {
  // 'idle' = resting on the final face, a number = flickering, null = just locked.
  const [live, setLive] = useState<number | null | 'idle'>('idle');

  useEffect(() => {
    if (seekTime() !== null || calmMotion()) return;
    // The 3D word does its own reveal: the hidden HTML letters stay still
    // instead of re-rendering and re-measuring every step.
    if (solid) {
      document.documentElement.removeAttribute('data-intro');
      return;
    }
    const t0 = performance.now();
    let timer = 0;
    const tick = () => {
      const step = stepAt(performance.now() - t0, index);
      setLive(step === null ? null : Math.max(step, 0));
      // The first glyph to move reveals the title (hidden by VARIANT_BOOT).
      document.documentElement.removeAttribute('data-intro');
      // Wake exactly when the face next changes, not on a fixed poll.
      if (step !== null)
        timer = window.setTimeout(tick, msToNextStep(performance.now() - t0, index) + 4);
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
    if (!g || !box || !text || step === null) return;
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
  }, [step, index]);

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
      {step !== null && (
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
    if (seekTime() !== null) releaseFrame('title');
  }, []);
  const variant = useVariant();
  useEffect(() => {
    clock.current = performance.now();
  }, [run]);
  useEffect(() => {
    if (!variant) return;
    if (!canWebGL()) {
      if (seekTime() !== null) releaseFrame('title');
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
          <Letter key={i} char={c} index={i} run={run} solid={solid} />
        ))}
      </div>
      {want3d && (
        <Letters3D run={run} clock={clock} title={word} onReady={onReady} onFail={onFail} />
      )}
    </div>
  );
};
