import { Piece, STOPS } from '@/components/backdrop/artKit';

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
      // Desktop: two pebbles framing the title from the sides, a third low on
      // the right beside the headline. Phones: a small row of three in the
      // band between the title card and the headline. Never behind either.
      {
        pos: 'left-[-30%] top-[14%] size-[36vmax] max-sm:left-[3%] max-sm:top-[23%] max-sm:size-[10vmax]',
        r: -8,
      },
      {
        pos: 'right-[-24%] top-[-4%] size-[36vmax] max-sm:right-[3%] max-sm:top-[23.5%] max-sm:size-[9vmax]',
        r: 14,
      },
      {
        pos: 'right-[-8%] top-[62%] size-[22vmax] max-sm:right-[42%] max-sm:top-[25%] max-sm:size-[6vmax]',
        r: 4,
      },
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

export default Clay;
