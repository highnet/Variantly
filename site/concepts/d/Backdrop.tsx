import { Piece } from '@/components/backdrop/artKit';

/* ---- D · Brutal Zine: torn black shapes, hatching, toner, xerox streaks --- */
const Zine = () => (
  <>
    <svg width="0" height="0" className="absolute">
      <defs>
        <pattern
          id="zine-hatch"
          width="3"
          height="3"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-35)"
        >
          <rect width="1.2" height="3" className="fill-(--art-ink)" />
        </pattern>
      </defs>
    </svg>
    <Piece className="top-[14%] left-[-6%] size-[40vmax]" float={0}>
      <path
        d="M6,20 L18,8 L30,14 L44,4 L58,12 L70,6 L86,16 L94,34 L88,48 L96,62 L86,80 L70,90 L52,84 L38,96 L22,86 L8,74 L12,58 L2,42Z"
        className="fill-(--art-ink)"
      />
      <path d="M60,40 L98,30 L94,70 L58,78Z" className="fill-(--art-1)" />
    </Piece>
    <Piece className="top-[2%] right-[-6%] size-[32vmax]" float={1}>
      <path d="M8,10 L92,4 L86,40 L96,58 L84,94 L14,88 L20,60 L4,44Z" fill="url(#zine-hatch)" />
    </Piece>
    <div className="vy-art-xerox absolute inset-0" />
  </>
);

export default Zine;
