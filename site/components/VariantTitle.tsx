'use client';

import { useEffect, useState } from 'react';

import { INTRO_FINAL, INTRO_FONTS } from '@/lib/introFonts';
import { calmMotion } from '@/lib/prefs';
import { releaseFrame, seekTime, useSeekTime } from '@/lib/seek';
import { useSiteStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const WORD = 'variantly';
// Per-letter frame delays: fast flicker, then an ease-out into the lockup.
const SCHEDULE = [...Array(10).fill(300), 380, 480, 600, 760, 960];
const startDelay = (index: number) => 400 + index * 350;
// Deterministic jitter, so a seeked frame is the same picture every time.
const fontAt = (step: number, index: number) =>
  INTRO_FONTS[(step * 5 + index * 3 + ((step * 7 + index * 13) % 4)) % INTRO_FONTS.length];

// The font a letter wears `ms` after the intro starts, or null once locked.
const stepAt = (ms: number, index: number) => {
  let at = ms - startDelay(index);
  if (at < 0) return -1;
  for (let k = 0; k < SCHEDULE.length; k++) {
    at -= SCHEDULE[k];
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
  const [font, setFont] = useState(INTRO_FINAL[index]);
  const [locked, setLocked] = useState(true);

  useEffect(() => {
    if (seekTime() !== null || calmMotion()) return;
    let step = 0;
    let timer = 0;
    const tick = () => {
      if (step === 0) setLocked(false);
      if (step >= SCHEDULE.length) {
        setFont(INTRO_FINAL[index]);
        setLocked(true);
        return;
      }
      setFont(fontAt(step, index));
      timer = window.setTimeout(tick, SCHEDULE[step++]);
    };
    // Letters lock left to right.
    timer = window.setTimeout(tick, startDelay(index));
    return () => clearTimeout(timer);
  }, [index, run]);

  // seekreel frames derive the letter from ?t instead of the timers above.
  const seek = useSeekTime();
  if (seek !== null) {
    const step = stepAt(seek * 1000, index);
    return (
      <span
        className={cn(
          'vy-letter inline-block leading-none',
          step === null ? INTRO_FINAL[index] : fontAt(Math.max(step, 0), index),
        )}
      >
        {char}
      </span>
    );
  }

  return (
    <span className={cn('vy-letter inline-block leading-none', font, locked && 'vy-letter-locked')}>
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
