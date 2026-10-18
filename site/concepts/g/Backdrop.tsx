import { Piece, STOPS } from '@/components/backdrop/artKit';

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

export default Candy;
