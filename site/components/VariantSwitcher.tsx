'use client';

import { useEffect, useState } from 'react';

import { VARIANTS, type VariantKey } from '@/components/backdrop/variants';
import { Button } from '@/components/ui/Button';
import { seekTime } from '@/lib/seek';
import { readVariant, setVariant, VARIANT_EVENT, VARIANT_KEYS } from '@/lib/variant';
import { cn } from '@/lib/utils';

/*
 * Floating dock that swaps the whole homepage between the six concepts.
 * The pick sticks (localStorage) and lands in the URL so it can be shared.
 */
export const VariantSwitcher = () => {
  const [current, setCurrent] = useState<VariantKey | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setCurrent(readVariant());
    setHidden(seekTime() !== null);
    const on = (e: Event) => setCurrent((e as CustomEvent<VariantKey>).detail);
    addEventListener(VARIANT_EVENT, on);
    return () => removeEventListener(VARIANT_EVENT, on);
  }, []);

  if (!current || hidden) return null;

  return (
    <nav
      aria-label="Homepage concept"
      className="vy-switcher fixed bottom-4 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-full p-1.5"
    >
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
          className="shrink-0 rounded-full"
        >
          <span className={cn('vy-swatch size-3 rounded-full', `vy-swatch-${k}`)} aria-hidden="true" />
          <span className="hidden md:inline">{VARIANTS[k].name}</span>
          <span className="md:hidden">{k.toUpperCase()}</span>
        </Button>
      ))}
    </nav>
  );
};
