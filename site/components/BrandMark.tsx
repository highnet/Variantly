import { cn } from '@/lib/utils';

type BrandMarkProps = {
  className?: string;
};

/*
 * The variantly mark: the product in one tile. An angled before/after divider
 * with its grip splits a plain page (thin lines) from its redesign (bold
 * blocks). Under `[data-audience='agent']` the split folds away into a
 * terminal prompt with a blinking cursor: the same tool, driven by an agent. Geometry and motion live in globals.css under `.brand-mark`.
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
        <path className="brand-prompt" d="M8 11.5 13.5 16 8 20.5" />
        <rect className="brand-cursor" x="16" y="18.5" width="8" height="3" rx="1.2" />
        <circle className="brand-spark" cx="24.5" cy="9" r="2" />
      </g>
    </svg>
  );
};

export { BrandMark };
