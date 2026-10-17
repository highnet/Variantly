'use client';

import { useEffect, useState } from 'react';

import { INTRO_FINAL, INTRO_FONTS } from '@/lib/introFonts';
import { calmMotion } from '@/lib/prefs';
import { releaseFrame, seekTime } from '@/lib/seek';
import { VARIANT_EVENT } from '@/lib/variant';
import { cn } from '@/lib/utils';

const WORD = 'variantly';
// Per-letter frame delays: fast flicker, then an ease-out into the lockup.
const SCHEDULE = [...Array(22).fill(55), 70, 90, 120, 160, 220, 300];
const startDelay = (index: number) => 200 + index * 90;
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
    const seek = seekTime();
    if (seek !== null) {
      const step = stepAt(seek * 1000, index);
      setFont(step === null ? INTRO_FINAL[index] : fontAt(Math.max(step, 0), index));
      setLocked(step === null);
      return;
    }
    if (calmMotion()) return;
    let step = 0;
    let timer = 0;
    setLocked(false);
    const tick = () => {
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
    const replay = () => setRun((r) => r + 1);
    addEventListener(VARIANT_EVENT, replay);
    return () => removeEventListener(VARIANT_EVENT, replay);
  }, []);
  return (
    <div data-hero-title className="vy-card relative grid place-items-center overflow-hidden border-b border-slate-line px-4 py-14 sm:py-20">
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
