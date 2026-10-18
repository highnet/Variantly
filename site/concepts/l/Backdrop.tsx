import { Piece } from '@/components/backdrop/artKit';

/*
 * l · Inflated Chrome. A horizon over a wireframe floor that rolls toward
 * you (one 72px cell every 3s), and chrome starburst glints on the beat.
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
    <Piece className="top-[44%] left-[4%] size-[7vmax] max-sm:hidden" float={0}>
      <Star />
    </Piece>
    <Piece className="top-[52%] right-[8%] size-[6vmax] max-sm:hidden" float={1}>
      <Star spin="vy-ll-spin vy-ll-spin-b" />
    </Piece>
    <Piece className="top-[9%] right-[30%] size-[3.5vmax] max-sm:hidden" float={2}>
      <Star />
    </Piece>
  </>
);

export default InflatedChrome;
