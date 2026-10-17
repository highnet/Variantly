import { Piece } from '@/components/backdrop/artKit';
import { CONCEPTS } from '@/concepts/metas';
import { cn } from '@/lib/utils';

/*
 * l · Inflated Chrome. A horizon over a wireframe floor that rolls toward
 * you (one 72px cell every 3s), chrome starburst glints on the beat, and
 * micro captions that carry real numbers, like a detector printout.
 */
type StarProps = {
  spin?: string;
};

// A puffy four-point starburst in banded chrome.
const Star = ({ spin = 'vy-ll-spin' }: StarProps) => (
  <g className={spin}>
    <path
      d="M50 2 C54 34 66 46 98 50 C66 54 54 66 50 98 C46 66 34 54 2 50 C34 46 46 34 50 2Z"
      fill="url(#ll-chrome)"
      className="stroke-(--chrome-lo)"
      strokeWidth="0.6"
    />
    <path d="M50 14 C52 38 56 44 70 48 C56 46 52 44 50 14Z" fill="#fff" fillOpacity="0.85" />
  </g>
);

const CAPTIONS = [
  [
    'top-[12%] left-4 sm:left-8',
    `l/${CONCEPTS.length}  inflated chrome\nmetalness 1.00  rough 0.05`,
  ],
  ['top-[12%] right-4 text-right sm:right-8 max-sm:hidden', 'port 4477\nloop 24.000s @ 120bpm'],
  [
    'bottom-[16%] right-4 text-right sm:right-8 max-sm:hidden',
    `grid 72px  24px/s\n${CONCEPTS.length} looks  keep 1`,
  ],
] as const;

const InflatedChrome = () => (
  <>
    <svg width="0" height="0" className="absolute">
      <defs>
        <linearGradient id="ll-chrome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="[stop-color:var(--chrome-hi)]" />
          <stop offset="0.42" className="[stop-color:var(--chrome-mid)]" />
          <stop offset="0.5" className="[stop-color:var(--chrome-lo)]" />
          <stop offset="0.56" className="[stop-color:var(--art-1)]" />
          <stop offset="0.7" className="[stop-color:var(--chrome-hi)]" />
          <stop offset="1" className="[stop-color:var(--chrome-mid)]" />
        </linearGradient>
      </defs>
    </svg>
    <div className="vy-ll-sky absolute inset-0" />
    <div className="vy-ll-floor absolute inset-x-0 bottom-0 overflow-hidden">
      <div className="vy-ll-grid" />
    </div>
    <Piece className="top-[44%] left-[4%] size-[7vmax]" float={0}>
      <Star />
    </Piece>
    <Piece className="top-[52%] right-[8%] size-[6vmax]" float={1}>
      <Star spin="vy-ll-spin vy-ll-spin-b" />
    </Piece>
    <Piece className="top-[9%] right-[30%] size-[3.5vmax] max-sm:hidden" float={2}>
      <Star />
    </Piece>
    {CAPTIONS.map(([at, text]) => (
      <p key={at} className={cn('vy-ll-cap absolute m-0', at)}>
        {text}
      </p>
    ))}
  </>
);

export default InflatedChrome;
