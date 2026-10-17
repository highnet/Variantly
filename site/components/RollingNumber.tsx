'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

import { useSeekTime } from '@/lib/seek';
import { cn } from '@/lib/utils';

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

type RollingNumberProps = {
  value: number;
  className?: string;
};

/*
 * An odometer: each digit is a strip of 0–9 that rolls to its value with a
 * small overshoot, the ones digit last. Starts at 0 and rolls up the first
 * time it scrolls into view, then rolls between values when the number
 * changes (calm motion: no roll, see globals.css). Width never jumps (tabular digits, one slot per digit). The real
 * number is in the accessible text; the strips are decoration.
 */
const RollingNumber = ({ value, className }: RollingNumberProps) => {
  const root = useRef<HTMLSpanElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setSeen(true);
        io.disconnect();
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Seekreel frames show the final value, wherever the number sits.
  const seek = useSeekTime();
  const shown = seen || seek !== null ? value : 0;
  const digits = String(Math.abs(value)).split('').map(Number);
  // Pad the start value so it rolls up through the same slots.
  const target = String(Math.abs(shown)).padStart(digits.length, '0').split('').map(Number);

  return (
    <span ref={root} className={cn('inline-flex tabular-nums', className)}>
      <span className="sr-only">{Math.abs(value)}</span>
      <span aria-hidden="true" className="inline-flex">
        {target.map((d, i) => (
          <span key={digits.length - i} className="vy-roll-slot">
            <span
              className="vy-roll-strip"
              style={
                {
                  '--roll-d': d,
                  '--roll-delay': `${i * 70}ms`,
                } as CSSProperties
              }
            >
              {DIGITS.map((n) => (
                <span key={n}>{n}</span>
              ))}
            </span>
          </span>
        ))}
      </span>
    </span>
  );
};

export { RollingNumber };
