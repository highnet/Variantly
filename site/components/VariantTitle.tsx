'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { INTRO_FINAL, INTRO_FONTS } from '@/lib/introFonts';
import { calmMotion } from '@/lib/prefs';
import { releaseFrame, seekTime, useSeekTime } from '@/lib/seek';
import { faceAt, msToNextStep, startDelay, stepAt } from '@/lib/titleTiming';
import { useSiteStore } from '@/lib/store';
import { useVariant } from '@/lib/variant';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

// The 3D title (three.js and its typefaces) loads only for the Candy 3D concept.
const Letters3D = dynamic(() => import('@/components/Letters3D').then((m) => m.Letters3D), {
  ssr: false,
});

const WORD = 'variantly';
const fontAt = (step: number, index: number) =>
  INTRO_FONTS[faceAt(step, index, INTRO_FONTS.length)];
// Mismatched sizes while shifting, like the title card's jumping glyphs.
// Never above 1: a shifting glyph may shrink inside its slot but never spill.
const scaleAt = (step: number, index: number) => 0.72 + (((step * 13 + index * 29) % 9) / 8) * 0.28;

type LetterProps = {
  char: string;
  index: number;
  run: number;
};

/* One letter that shape-shifts through the font wardrobe, then locks in. */
const Letter = ({ char, index, run }: LetterProps) => {
  // 'idle' = resting on the final face, a number = flickering, null = just locked.
  const [live, setLive] = useState<number | null | 'idle'>('idle');

  useEffect(() => {
    if (seekTime() !== null || calmMotion()) return;
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
  }, [index, run]);

  // seekreel frames derive the step from ?t instead of the clock.
  const seek = useSeekTime();
  const raw = seek === null ? live : stepAt(seek * 1000, index);
  const step = raw === null || raw === 'idle' ? null : Math.max(raw, 0);

  // The slot is sized by the final face (invisible), so the word keeps the same
  // width, and stays centred, while the shifting glyph swaps faces on top.
  // Wide faces would spill into the neighbours: shrink the glyph to its slot.
  const slot = useRef<HTMLSpanElement>(null);
  const glyph = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const g = glyph.current;
    const box = slot.current;
    if (!g || !box || step === null) return;
    g.style.transform = 'none';
    const fit = Math.min(1, box.offsetWidth / Math.max(1, g.scrollWidth));
    g.style.transform = `scale(${fit * scaleAt(step, index)})`;
  });

  return (
    <span
      ref={slot}
      className={cn(
        'vy-letter relative inline-block leading-none',
        live === null && seek === null && 'vy-letter-locked',
      )}
    >
      <span className={cn(INTRO_FINAL[index], step !== null && 'invisible')}>{char}</span>
      {step !== null && (
        <span
          ref={glyph}
          aria-hidden="true"
          className={cn('absolute inset-0 flex items-end justify-center', fontAt(step, index))}
        >
          {char}
        </span>
      )}
    </span>
  );
};

/*
 * TVA-style title card: "variantly" spelled in nine mismatched typefaces,
 * each letter flickering through variants before it settles. Click replays.
 */
export const VariantTitle = () => {
  const [run, setRun] = useState(0);
  // The 3D concept draws the word as extruded letters; the HTML word stays for
  // screen readers and as the replay target.
  const solid = useVariant() === 'g';
  useEffect(() => {
    if (seekTime() !== null && !solid) releaseFrame('title');
    // A new concept gets its own title reveal.
    return useSiteStore.subscribe((s, prev) => {
      if (prev.hydrated && s.variant !== prev.variant) setRun((r) => r + 1);
    });
  }, [solid]);
  return (
    <div
      data-hero-title
      className="vy-card border-slate-line relative grid place-items-center overflow-hidden border-b px-4 py-14 sm:py-20"
    >
      <button
        type="button"
        aria-label="variantly"
        title="Replay"
        data-keep-cycle
        onClick={() => setRun((r) => r + 1)}
        className={cn(
          'vy-title relative z-1 flex cursor-pointer items-end gap-[0.12em] text-[clamp(2.5rem,16vw,11rem)]',
          solid && 'vy-title-solid',
        )}
      >
        {[...WORD].map((c, i) => (
          <Letter key={i} char={c} index={i} run={run} />
        ))}
      </button>
      {solid && <Letters3D run={run} />}
    </div>
  );
};
