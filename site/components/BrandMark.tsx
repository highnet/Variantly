import { cn } from '@/lib/utils';

type BrandMarkProps = {
  className?: string;
};

/*
 * The variantly mark: the product in one tile. An angled before/after divider
 * with its grip splits a plain page (thin lines) from its redesign (bold
 * blocks). Under `[data-audience='agent']` (the /agents page) the split folds
 * away into a small wall clock whose hand ticks round: a quiet nod to the
 * agents who keep the timeline in order. Geometry and motion live in globals.css under `.brand-mark`.
 */
const BrandMark = ({ className }: BrandMarkProps) => {
  return (
    <svg viewBox="0 0 32 32" className={cn('brand-mark', className)} aria-hidden="true">
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
      <g className="brand-agent">
        {/* A plain wall clock: dial, four hour ticks, an hour hand and a
            thin hand that ticks round once a minute. */}
        <circle className="brand-dial" cx="16" cy="16" r="10" />
        <path className="brand-ticks" d="M16 7.6v1.8M24.4 16h-1.8M16 24.4v-1.8M7.6 16h1.8" />
        <path className="brand-hour" d="M16 16 12.2 12.6" />
        <path className="brand-tick-hand" d="M16 17.6V8.8" />
        <circle className="brand-pin" cx="16" cy="16" r="1.5" />
      </g>
    </svg>
  );
};

export { BrandMark };
