import type { ReactNode } from 'react';

import type { VariantKey } from '@/components/backdrop/variants';
import { cn } from '@/lib/utils';

/*
 * Each concept's own background art, drawn once and never repainted: plain
 * SVG shapes, gradients and patterns, no SVG filters and no blend modes, so a
 * phone rasterises the layer a single time and scrolling only composites it.
 * Colours come from --art-* tokens in globals.css, set per concept and theme.
 * Every concept loops seamlessly over 24s, transform only (see .vy-art-float).
 */

type PieceProps = {
  className: string;
  children: ReactNode;
  float?: number;
};

// One absolutely placed shape in a 100×100 box; `float` picks a drift path.
const Piece = ({ className, children, float }: PieceProps) => (
  <div
    className={cn(
      'absolute',
      float !== undefined && `vy-art-float vy-art-float-${float}`,
      className,
    )}
  >
    <svg viewBox="0 0 100 100" className="size-full overflow-visible">
      {children}
    </svg>
  </div>
);

// Literal class names, so Tailwind sees every token it has to generate.
const STOPS = [
  '[stop-color:var(--art-1)]',
  '[stop-color:var(--art-2)]',
  '[stop-color:var(--art-3)]',
];
const FILLS = {
  '--art-1': 'fill-(--art-1)',
  '--art-2': 'fill-(--art-2)',
  '--art-3': 'fill-(--art-3)',
};

/* ---- A · Soft Clay: matte pastel pebbles, soft contact shadows, fingerprints */
const PEBBLES = [
  'M50,12 C76,10 94,30 92,54 C90,78 70,92 46,90 C20,88 6,70 8,48 C10,26 26,13 50,12Z',
  'M48,16 C70,8 96,24 90,52 C86,76 64,94 40,88 C16,82 6,60 14,40 C20,26 32,20 48,16Z',
  'M52,14 C78,18 92,40 86,62 C80,84 56,92 36,84 C14,76 8,52 18,34 C26,20 38,12 52,14Z',
];

const Clay = () => (
  <>
    <svg width="0" height="0" className="absolute">
      <defs>
        {STOPS.map((c, i) => (
          <radialGradient key={c} id={`clay-${i}`} cx="38%" cy="32%" r="72%">
            <stop offset="0" className="[stop-color:var(--art-hi)]" />
            <stop offset="0.38" className={c} />
            <stop offset="1" className={c} stopOpacity="0.92" />
          </radialGradient>
        ))}
        <radialGradient id="clay-ao" cx="50%" cy="50%" r="50%">
          <stop offset="0" className="[stop-color:var(--art-shadow)]" stopOpacity="0.32" />
          <stop offset="1" className="[stop-color:var(--art-shadow)]" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="clay-rim" cx="40%" cy="34%" r="66%">
          <stop offset="0.7" className="[stop-color:var(--art-shadow)]" stopOpacity="0" />
          <stop offset="1" className="[stop-color:var(--art-shadow)]" stopOpacity="0.18" />
        </radialGradient>
      </defs>
    </svg>
    {[
      { pos: 'left-[-8%] top-[10%] size-[42vmax]', r: -8 },
      { pos: 'right-[-12%] top-[-4%] size-[36vmax]', r: 14 },
      { pos: 'left-[42%] top-[52%] size-[26vmax] max-sm:hidden', r: 4 },
    ].map(({ pos, r }, i) => (
      <Piece key={i} className={pos} float={i}>
        <ellipse cx="54" cy="94" rx="40" ry="8" fill="url(#clay-ao)" />
        <g transform={`rotate(${r} 50 50)`}>
          <path d={PEBBLES[i]} fill={`url(#clay-${i})`} />
          <path d={PEBBLES[i]} fill="url(#clay-rim)" />
          {/* a thumbprint pressed into the clay */}
          <g fill="none" className="stroke-(--art-shadow)" strokeOpacity="0.07" strokeWidth="0.7">
            {[4, 7, 10, 13, 16].map((k) => (
              <ellipse key={k} cx="60" cy="58" rx={k * 1.2} ry={k} />
            ))}
          </g>
        </g>
      </Piece>
    ))}
  </>
);

/* ---- B · Riso Poster: two inks, halftone, misregistered overprint -------- */
const Riso = () => (
  <>
    <svg width="0" height="0" className="absolute">
      <defs>
        <pattern id="riso-dots-1" width="4" height="4" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.25" className="fill-(--art-1)" />
        </pattern>
        <pattern
          id="riso-dots-2"
          width="3.4"
          height="3.4"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(30)"
        >
          <circle cx="1.7" cy="1.7" r="1" className="fill-(--art-2)" />
        </pattern>
      </defs>
    </svg>
    <Piece className="top-[6%] left-[-10%] size-[44vmax]" float={0}>
      <circle cx="50" cy="50" r="42" fill="url(#riso-dots-1)" />
      <circle cx="53" cy="47" r="42" className="fill-(--art-2)" fillOpacity="0.55" />
    </Piece>
    <Piece className="top-[-2%] right-[-8%] size-[30vmax]" float={1}>
      <rect x="10" y="14" width="74" height="60" className="fill-(--art-1)" fillOpacity="0.8" />
      <rect x="15" y="20" width="74" height="60" fill="url(#riso-dots-2)" />
    </Piece>
    <Piece className="top-[56%] left-[46%] size-[24vmax] max-sm:hidden" float={2}>
      <circle cx="46" cy="50" r="34" className="fill-(--art-2)" fillOpacity="0.7" />
      <circle cx="54" cy="50" r="34" fill="none" className="stroke-(--art-1)" strokeWidth="4" />
    </Piece>
    {/* paper fibres */}
    <div className="vy-art-fibre absolute inset-0" />
  </>
);

/* ---- C · TVA Terminal: phosphor glow, scanlines, grid, radar sweep -------- */
const Terminal = () => (
  <>
    <div className="vy-art-crt absolute inset-0" />
    <div className="vy-art-radar absolute top-[-14vmax] right-[-18vmax] size-[56vmax] rounded-full max-sm:right-[-30vmax]">
      <div className="vy-art-sweep absolute inset-0 rounded-full" />
    </div>
    <div className="vy-art-scan absolute inset-0" />
  </>
);

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

/* ---- E · Bauhaus: flat primaries on a grid --------------------------------- */
const Bauhaus = () => (
  <>
    <div className="vy-art-grid absolute inset-0" />
    <Piece className="top-[12%] left-[-6%] size-[34vmax]" float={0}>
      <circle cx="50" cy="50" r="44" className="fill-(--art-1)" />
    </Piece>
    <Piece className="top-[4%] right-[4%] size-[24vmax]" float={1}>
      <path d="M0,100 A100,100 0 0 1 100,0 L100,100Z" className="fill-(--art-2)" />
      <path d="M50,100 A50,50 0 0 1 100,50 L100,100Z" className="fill-(--art-3)" />
    </Piece>
    <Piece className="top-[62%] left-[40%] size-[30vmax] max-sm:hidden" float={2}>
      <rect x="0" y="40" width="100" height="14" className="fill-(--art-ink)" />
      <rect x="20" y="0" width="14" height="100" className="fill-(--art-3)" />
      <path d="M60,60 A40,40 0 0 1 100,100 L60,100Z" className="fill-(--art-1)" />
    </Piece>
  </>
);

/* ---- F · Cut & Paste: torn scraps, tape, cut-outs with paper shadows ------ */
type ScrapProps = {
  d: string;
  colour: keyof typeof FILLS;
};

const Scrap = ({ d, colour }: ScrapProps) => (
  <>
    <path d={d} transform="translate(2.5 3.5)" className="fill-(--art-shadow)" fillOpacity="0.22" />
    <path d={d} className={FILLS[colour]} />
  </>
);

const Paste = () => (
  <>
    <Piece className="top-[12%] left-[-6%] size-[38vmax]" float={0}>
      <g transform="rotate(-7 50 50)">
        <Scrap
          d="M8,14 L22,10 L34,13 L48,9 L62,12 L78,8 L92,12 L90,30 L94,48 L89,66 L93,86 L74,90 L58,87 L40,92 L24,88 L10,90 L12,70 L7,50 L11,32Z"
          colour="--art-1"
        />
        <rect
          x="34"
          y="2"
          width="30"
          height="10"
          transform="rotate(-4 49 7)"
          className="fill-(--art-tape)"
          fillOpacity="0.6"
        />
      </g>
    </Piece>
    <Piece className="top-[0%] right-[-6%] size-[30vmax]" float={1}>
      <g transform="rotate(9 50 50)">
        <Scrap
          d="M50,6 L61,38 L95,38 L67,58 L78,92 L50,72 L22,92 L33,58 L5,38 L39,38Z"
          colour="--art-2"
        />
      </g>
    </Piece>
    <Piece className="top-[58%] left-[44%] size-[26vmax] max-sm:hidden" float={2}>
      <g transform="rotate(-12 50 50)">
        <Scrap d="M50,10 A40,40 0 1 1 49.9,10Z M50,34 A16,16 0 1 0 50.1,34Z" colour="--art-3" />
        <rect
          x="6"
          y="44"
          width="34"
          height="9"
          transform="rotate(28 23 48)"
          className="fill-(--art-tape)"
          fillOpacity="0.6"
        />
      </g>
    </Piece>
  </>
);

/* ---- G · Candy 3D: glossy translucent gummies, bubbles, specular hits ----- */
type GlossProps = {
  x: number;
  y: number;
  rx: number;
  ry: number;
  r?: number;
};

const Gloss = ({ x, y, rx, ry, r = -30 }: GlossProps) => (
  <ellipse
    cx={x}
    cy={y}
    rx={rx}
    ry={ry}
    transform={`rotate(${r} ${x} ${y})`}
    fill="url(#candy-spec)"
  />
);

const Candy = () => (
  <>
    <svg width="0" height="0" className="absolute">
      <defs>
        {STOPS.map((c, i) => (
          <radialGradient key={c} id={`candy-${i}`} cx="34%" cy="28%" r="80%">
            <stop offset="0" className={c} stopOpacity="0.55" />
            <stop offset="0.55" className={c} stopOpacity="0.9" />
            <stop offset="0.85" className={c} />
            <stop offset="1" className="[stop-color:var(--art-deep)]" />
          </radialGradient>
        ))}
        <radialGradient id="candy-spec" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
    {/* a gummy star */}
    <Piece className="top-[10%] left-[-6%] size-[40vmax]" float={0}>
      <path
        d="M50,6 C55,6 58,30 64,34 C70,38 94,32 96,38 C98,44 76,56 74,62 C72,68 86,90 80,94 C74,98 56,80 50,80 C44,80 26,98 20,94 C14,90 28,68 26,62 C24,56 2,44 4,38 C6,32 30,38 36,34 C42,30 45,6 50,6Z"
        fill="url(#candy-0)"
      />
      <Gloss x={38} y={34} rx={12} ry={5} />
      <circle cx="62" cy="58" r="2.5" fill="#fff" fillOpacity="0.8" />
    </Piece>
    {/* a jelly ring */}
    <Piece className="top-[-2%] right-[-8%] size-[32vmax]" float={1}>
      <path
        d="M50,8 A42,42 0 1 1 49.9,8Z M50,32 A18,18 0 1 0 50.1,32Z"
        fill="url(#candy-1)"
        fillRule="evenodd"
      />
      <Gloss x={30} y={26} rx={14} ry={5} r={-40} />
      <Gloss x={60} y={42} rx={5} ry={2} r={-40} />
    </Piece>
    {/* bubbles */}
    <Piece className="top-[54%] left-[48%] size-[24vmax] max-sm:hidden" float={2}>
      <circle cx="40" cy="44" r="30" fill="url(#candy-2)" />
      <Gloss x={30} y={32} rx={9} ry={4} />
      <circle cx="82" cy="20" r="12" fill="url(#candy-0)" />
      <Gloss x={78} y={15} rx={4} ry={2} />
    </Piece>
  </>
);

const ART: Record<VariantKey, () => ReactNode> = {
  a: Clay,
  b: Riso,
  c: Terminal,
  d: Zine,
  e: Bauhaus,
  f: Paste,
  g: Candy,
};

type BackdropArtProps = {
  variant: VariantKey;
};

const BackdropArt = ({ variant }: BackdropArtProps) => {
  const Art = ART[variant];
  return (
    <div className="vy-blobs vy-art absolute inset-0">
      <Art />
    </div>
  );
};

export { BackdropArt };
