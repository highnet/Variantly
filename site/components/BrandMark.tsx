import { useId } from 'react';

import { cn } from '@/lib/utils';

type BrandMarkProps = {
  className?: string;
};

/*
 * The variantly mark. For humans it is four bars of a variant spectrum; under
 * `[data-audience='agent']` the same four shapes melt into an agent node (a
 * core with three satellites). They sit under a goo filter, so they blend into
 * each other while they move. Geometry and motion live in globals.css under
 * `.brand-mark`.
 */
const BrandMark = ({ className }: BrandMarkProps) => {
  const goo = `goo-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  return (
    <svg viewBox="0 0 32 32" className={cn('brand-mark', className)} aria-hidden="true">
      <defs>
        <filter id={goo} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.1" result="blur" />
          <feColorMatrix in="blur" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" />
        </filter>
      </defs>
      <rect className="brand-tile" width="32" height="32" rx="8" />
      <g filter={`url(#${goo})`}>
        <rect className="brand-a" />
        <rect className="brand-b" />
        <rect className="brand-c" />
        <rect className="brand-d" />
      </g>
    </svg>
  );
};

export { BrandMark };
