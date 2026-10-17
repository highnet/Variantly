import { useId } from 'react';

import { cn } from '@/lib/utils';

type BrandMarkProps = {
  className?: string;
};

/*
 * The variantly mark: the product in one tile. An angled before/after divider
 * with its grip splits a plain page (thin lines) from its redesign (bold
 * blocks). Under `[data-audience='agent']` the split folds away and four
 * shapes melt into an agent node (a core with three satellites) under a goo
 * filter. Geometry and motion live in globals.css under `.brand-mark`.
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
      <g className="brand-split">
        <path className="brand-after" d="M19.5 0H24a8 8 0 0 1 8 8v16a8 8 0 0 1-8 8h-11.5Z" />
        <rect className="brand-line" x="5" y="9" width="8" height="2" rx="1" />
        <rect className="brand-line" x="5" y="14" width="6" height="2" rx="1" />
        <rect className="brand-line" x="5" y="19" width="7.5" height="2" rx="1" />
        <rect className="brand-block" x="20" y="7" width="7" height="7" rx="1.5" />
        <rect className="brand-block" x="18" y="17" width="9" height="2.5" rx="1.25" />
        <rect className="brand-block" x="16.5" y="22" width="8" height="2.5" rx="1.25" />
        <path className="brand-divider" d="M19.5 0 12.5 32" />
        <circle className="brand-grip" cx="16" cy="16" r="3.2" />
      </g>
      <g className="brand-node" filter={`url(#${goo})`}>
        <rect className="brand-a" />
        <rect className="brand-b" />
        <rect className="brand-c" />
        <rect className="brand-d" />
      </g>
    </svg>
  );
};

export { BrandMark };
