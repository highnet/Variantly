'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { VARIANTS } from '@/components/backdrop/variants';
import { Button } from '@/components/ui/Button';
import { useSeekTime } from '@/lib/seek';
import { setVariant, useVariant, VARIANT_KEYS } from '@/lib/variant';
import { cn } from '@/lib/utils';

/*
 * Floating dock that swaps the whole homepage between the six concepts.
 * The pick sticks (localStorage) and lands in the URL so it can be shared.
 */
export const VariantSwitcher = () => {
  const current = useVariant();
  const seek = useSeekTime();

  if (!current || seek !== null) return null;

  const at = VARIANT_KEYS.indexOf(current);
  const step = (by: number) =>
    setVariant(VARIANT_KEYS[(at + by + VARIANT_KEYS.length) % VARIANT_KEYS.length]);

  return (
    <nav
      aria-label="Homepage concept"
      className="vy-switcher fixed bottom-4 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-full p-1.5"
    >
      {/* Phones: a prev/next cycler instead of six chips. */}
      <Button
        variant="concept"
        size="small"
        aria-label="Previous concept"
        onClick={() => step(-1)}
        className="rounded-full sm:hidden"
      >
        <ChevronLeft />
      </Button>
      <span
        aria-live="polite"
        className="flex min-w-36 items-center justify-center gap-2 text-[13px] font-semibold sm:hidden"
      >
        <span
          className={cn('vy-swatch size-3 rounded-full', `vy-swatch-${current}`)}
          aria-hidden="true"
        />
        {VARIANTS[current].name}
        <span className="text-steel font-mono text-[10px]">
          {at + 1}/{VARIANT_KEYS.length}
        </span>
      </span>
      <Button
        variant="concept"
        size="small"
        aria-label="Next concept"
        onClick={() => step(1)}
        className="rounded-full sm:hidden"
      >
        <ChevronRight />
      </Button>
      <span className="vy-switcher-label hidden px-3 font-mono text-[10px] font-semibold tracking-[0.12em] uppercase sm:inline">
        Concept
      </span>
      {VARIANT_KEYS.map((k) => (
        <Button
          key={k}
          variant="concept"
          size="small"
          aria-pressed={k === current}
          title={VARIANTS[k].name}
          onClick={() => setVariant(k)}
          className="hidden shrink-0 rounded-full sm:inline-flex"
        >
          <span
            className={cn('vy-swatch size-3 rounded-full', `vy-swatch-${k}`)}
            aria-hidden="true"
          />
          <span className="hidden md:inline">{VARIANTS[k].name}</span>
          <span className="md:hidden">{k.toUpperCase()}</span>
        </Button>
      ))}
    </nav>
  );
};
