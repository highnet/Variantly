'use client';

import { useEffect, useState } from 'react';

import { INTRO_FINAL, INTRO_FONTS } from '@/lib/introFonts';
import { calmMotion } from '@/lib/prefs';
import { releaseFrame, seekTime, useSeekTime } from '@/lib/seek';
import { useSiteStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const WORD = 'variantly';
// Timing after the Loki title card: every letter flickers at once, about nine
// typefaces a second, then the changes slow and each letter drops into its
// final face. Letters lock in a loose, uneven order rather than left to right.
const FLICKER_MS = 110;
const EASE_OUT = [140, 180, 240, 320, 420, 560];
// Deterministic per-letter jitter, so a seeked frame is the same every time.
const jitter = (index: number, salt: number) => ((index * 37 + salt * 11) % 7) / 6;
const scheduleFor = (index: number) => [
  ...Array(36 + Math.round(jitter(index, 1) * 6)).fill(FLICKER_MS),
  ...EASE_OUT,
];
const SCHEDULES = [...WORD].map((_, i) => scheduleFor(i));
const startDelay = (index: number) => 200 + Math.round(jitter(index, 2) * 120);

const fontAt = (step: number, index: number) =>
  INTRO_FONTS[(step * 5 + index * 3 + ((step * 7 + index * 13) % 4)) % INTRO_FONTS.length];
// Mismatched sizes while shifting, like the title card's jumping glyphs.
const scaleAt = (step: number, index: number) => 0.8 + (((step * 13 + index * 29) % 9) / 8) * 0.4;

// The step a letter is on `ms` after the intro starts: -1 before it starts,
// null once locked.
const stepAt = (ms: number, index: number) => {
  let at = ms - startDelay(index);
  if (at < 0) return -1;
  const schedule = SCHEDULES[index];
  for (let k = 0; k < schedule.length; k++) {
    at -= schedule[k];
    if (at < 0) return k;
  }
  return null;
};

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
      if (step !== null) timer = window.setTimeout(tick, 30);
    };
    timer = window.setTimeout(tick, startDelay(index));
    return () => clearTimeout(timer);
  }, [index, run]);

  // seekreel frames derive the step from ?t instead of the clock.
  const seek = useSeekTime();
  const raw = seek === null ? live : stepAt(seek * 1000, index);
  const step = raw === null || raw === 'idle' ? null : Math.max(raw, 0);

  return (
    <span
      className={cn(
        'vy-letter inline-block leading-none',
        step === null ? INTRO_FINAL[index] : fontAt(step, index),
        live === null && seek === null && 'vy-letter-locked',
      )}
      style={step === null ? undefined : { transform: `scale(${scaleAt(step, index)})` }}
    >
      {char}
    </span>
  );
};

/*
 * TVA-style title card: "variantly" spelled in nine mismatched typefaces,
 * each letter flickering through variants before it settles. Click replays.
 */
export const VariantTitle = () => {
  const [run, setRun] = useState(0);
  useEffect(() => {
    if (seekTime() !== null) releaseFrame('title');
    // A new concept gets its own title reveal.
    return useSiteStore.subscribe((s, prev) => {
      if (prev.hydrated && s.variant !== prev.variant) setRun((r) => r + 1);
    });
  }, []);
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
        className="vy-title relative z-1 flex cursor-pointer items-end gap-[0.04em] text-[clamp(3.5rem,13vw,11rem)]"
      >
        {[...WORD].map((c, i) => (
          <Letter key={i} char={c} index={i} run={run} />
        ))}
      </button>
    </div>
  );
};
