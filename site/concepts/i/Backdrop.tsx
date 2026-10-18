import { Piece } from '@/components/backdrop/artKit';

/*
 * i · Liquid Glass. A still colour field with hairlines (the thing the glass
 * bends), and glass slabs over it: a lighter body, magnified hairlines, a dark
 * refracted inner edge and a specular rim whose highlight travels round.
 */
type SlabProps = {
  id: string;
  d: string;
  lines: number;
  // Round slabs: the rim highlight travels round (a pill keeps its rim still).
  spin?: boolean;
};

const Slab = ({ id, d, lines, spin }: SlabProps) => (
  <>
    <defs>
      <clipPath id={`li-${id}`}>
        <path d={d} />
      </clipPath>
    </defs>
    <path d={d} fill="url(#li-body)" />
    <g clipPath={`url(#li-${id})`}>
      {Array.from({ length: lines }, (_, i) => (
        <path
          key={i}
          d={`M-10 ${(i + 0.5) * (100 / lines)} Q50 ${(i + 0.5) * (100 / lines) + (i - lines / 2) * 1.6} 110 ${(i + 0.5) * (100 / lines)}`}
          className="stroke-(--art-edge)"
          strokeOpacity="0.16"
          strokeWidth="0.35"
          fill="none"
        />
      ))}
      <path
        d={d}
        fill="none"
        className="stroke-(--art-edge)"
        strokeOpacity="0.35"
        strokeWidth="5"
      />
      <path
        d={d}
        fill="none"
        className="stroke-(--art-3)"
        strokeOpacity="0.35"
        strokeWidth="1.6"
        transform="translate(0.6 0.8)"
      />
    </g>
    <g className={spin ? 'vy-li-spin' : undefined}>
      <path d={d} fill="none" stroke="url(#li-rim)" strokeWidth="1.1" />
    </g>
  </>
);

const Gradients = () => (
  <svg width="0" height="0" className="absolute">
    <defs>
      <linearGradient id="li-body" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0" className="[stop-color:var(--art-hi)]" stopOpacity="0.55" />
        <stop offset="0.5" className="[stop-color:var(--art-hi)]" stopOpacity="0.12" />
        <stop offset="1" className="[stop-color:var(--art-1)]" stopOpacity="0.18" />
      </linearGradient>
      <linearGradient id="li-rim" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" className="[stop-color:var(--art-hi)]" />
        <stop offset="0.3" className="[stop-color:var(--art-hi)]" stopOpacity="0" />
        <stop offset="0.7" className="[stop-color:var(--art-hi)]" stopOpacity="0" />
        <stop offset="1" className="[stop-color:var(--art-hi)]" stopOpacity="0.8" />
      </linearGradient>
    </defs>
  </svg>
);

const LiquidGlass = () => (
  <>
    <div className="vy-li-field absolute inset-0" />
    <Gradients />
    {/* a wide pill, top right */}
    <Piece className="top-[-16%] right-[-14%] size-[52vmax]" float={0}>
      <Slab id="a" lines={16} d="M29 30 H71 A20 20 0 0 1 71 70 H29 A20 20 0 0 1 29 30Z" />
    </Piece>
    {/* a round lens, bottom left */}
    <Piece className="top-[58%] left-[-7%] size-[30vmax]" float={1}>
      <Slab id="b" spin lines={9} d="M50 4 A46 46 0 1 1 49.9 4Z" />
    </Piece>
    {/* a small droplet */}
    <Piece className="top-[8%] left-[14%] size-[11vmax] max-sm:hidden" float={2}>
      <Slab id="c" spin lines={4} d="M50 6 A44 44 0 1 1 49.9 6Z" />
    </Piece>
  </>
);

export default LiquidGlass;
