import type { ReactNode } from 'react';

/* s · Lived-in Den: a panelled wall, the lamp's amber glow pool and a walnut
   shelf of record sleeves. The row slides and settles; one sleeve is pulled
   out and slipped back (24s, transform and opacity only). The scene stands
   its lamp, phone and plant on the same shelf (its top is at 55%, 32% on phones). */
type SleeveProps = {
  x: number;
  lean: number;
  fill: string;
  children?: ReactNode;
};

const Sleeve = ({ x, lean, fill, children }: SleeveProps) => (
  <g transform={`rotate(${lean} ${x + 46} 100)`}>
    <rect x={x} y="6" width="92" height="94" rx="2" className={fill} />
    <rect x={x} y="6" width="92" height="94" rx="2" fill="url(#s-sheen)" />
    {children}
  </g>
);

const Den = () => (
  <>
    <svg width="0" height="0" className="absolute">
      <defs>
        <linearGradient id="s-sheen" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0.14" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.16" />
        </linearGradient>
      </defs>
    </svg>
    <div className="vy-s-glow absolute -top-[30%] -left-[22%] size-[95vmax]" />
    <div className="vy-s-shelf absolute inset-x-0 top-[55%] h-[2.2vh] max-sm:hidden" />
    <div className="vy-s-row absolute bottom-[45%] left-[3%] aspect-[5/1] h-[10.5vh] max-sm:hidden">
      <svg viewBox="0 0 500 100" className="size-full overflow-visible">
        <Sleeve x={0} lean={-2} fill="fill-(--art-1)">
          <circle cx="46" cy="53" r="26" className="fill-(--art-paper)" />
          <circle cx="46" cy="53" r="5" className="fill-(--art-1)" />
        </Sleeve>
        <Sleeve x={96} lean={0} fill="fill-(--art-2)">
          {[22, 38, 54, 70].map((y) => (
            <rect
              key={y}
              x="110"
              y={y}
              width="64"
              height="7"
              className="fill-(--art-paper)"
              fillOpacity="0.8"
            />
          ))}
        </Sleeve>
        {/* a gap where the pulled sleeve lives */}
        <g transform="rotate(-9 242 100)">
          <circle cx="242" cy="56" r="44" className="fill-(--art-ink)" />
          <circle
            cx="242"
            cy="56"
            r="30"
            fill="none"
            className="stroke-(--art-paper)"
            strokeOpacity="0.12"
          />
          <circle cx="242" cy="56" r="12" className="fill-(--art-3)" />
        </g>
        <Sleeve x={300} lean={3} fill="fill-(--art-3)">
          <path d="M312,88 L346,30 L380,88Z" className="fill-(--art-ink)" fillOpacity="0.85" />
        </Sleeve>
        <Sleeve x={396} lean={6} fill="fill-(--art-paper)">
          <path d="M408,20 H476 M408,32 H460" className="stroke-(--art-1)" strokeWidth="6" />
          <circle cx="442" cy="68" r="16" className="fill-(--art-2)" />
        </Sleeve>
      </svg>
      <div className="vy-s-pull absolute bottom-0 left-[39%] aspect-square h-[94%]">
        <svg viewBox="0 0 100 100" className="size-full">
          <rect x="2" y="2" width="96" height="96" rx="2" className="fill-(--art-ink)" />
          <rect x="2" y="2" width="96" height="96" rx="2" fill="url(#s-sheen)" />
          <text
            x="50"
            y="66"
            textAnchor="middle"
            fontSize="54"
            className="fill-(--art-3) [font-family:var(--font-fraunces)]"
          >
            v
          </text>
        </svg>
      </div>
    </div>
  </>
);

export default Den;
