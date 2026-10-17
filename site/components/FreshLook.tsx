'use client';

import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { setVariant, useVariant, VARIANT_KEYS } from '@/lib/variant';
import { cn } from '@/lib/utils';

/*
 * "a fresh look", in the hero headline, as the thing it promises: a press
 * restyles the whole page as the next concept. A wavy underline and a little
 * spinning arrow invite the click; the press squashes, then pops.
 */
export const FreshLook = () => {
  const current = useVariant();
  const [pops, setPops] = useState(0);

  const next = () => {
    const at = VARIANT_KEYS.indexOf(current ?? 'a');
    setVariant(VARIANT_KEYS[(at + 1) % VARIANT_KEYS.length]);
    setPops((n) => n + 1);
  };

  return (
    <Button
      variant="headline-word"
      size="none"
      onClick={next}
      title="Show the next concept"
      aria-label="a fresh look: restyle this page as the next concept"
      className={cn('vy-fresh', pops > 0 && (pops % 2 ? 'vy-fresh-pop-a' : 'vy-fresh-pop-b'))}
    >
      a fresh look
      <RefreshCw aria-hidden="true" className="vy-fresh-icon" />
    </Button>
  );
};
