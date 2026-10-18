/* ---- P · Tenango Thread: satin-stitch flora on white cotton manta --------
 * After Tenango embroidery by Otomí–Hñähñu artisans of Tenango de Doria,
 * Hidalgo: flat motifs in one colour each, filled with dense satin stitch
 * whose direction turns with every petal and leaf, set in mirrored pairs.
 * The animals (birds, deer) live in the 3D scene, lifting off the cloth. */

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

// Satin stitch, colour-neutral: thread shadows and sheen over a flat fill.
const ANGLES = [0, 90];

type SatProps = { d: string; a: number };

const Sat = ({ d, a }: SatProps) => (
  <>
    <path d={d} />
    <path d={d} fill={`url(#p-sat-${a})`} />
  </>
);

const PETAL = 'M50 50C43 40 43 23 50 12C57 23 57 40 50 50Z';

// An eight-petal flower: each petal's stitches run along it; an unstitched
// ring of cotton round a satin heart.
const Rosette = () => (
  <>
    {Array.from({ length: 8 }, (_, i) => (
      <g key={i} transform={`rotate(${i * 45} 50 50)`}>
        <Sat d={PETAL} a={90} />
      </g>
    ))}
    <circle cx="50" cy="50" r="11" className="fill-(--art-cloth)" />
    <circle cx="50" cy="50" r="7.5" />
    <circle cx="50" cy="50" r="7.5" fill="url(#p-sat-0)" />
  </>
);

type PairProps = { at: [string, string]; colour: string; children: ReactNode };

// Motifs come in mirrored pairs, one each side of the page's axis.
const Pair = ({ at, colour, children }: PairProps) => (
  <>
    {at.map((pos, i) => (
      <div key={pos} className={cn('absolute', pos, i === 1 && '-scale-x-100')}>
        <svg
          viewBox="0 0 100 100"
          className={cn('p-breathe block size-full overflow-visible', colour)}
        >
          {children}
        </svg>
      </div>
    ))}
  </>
);

const Tenango = () => (
  <>
    <div className="p-manta absolute inset-0" />
    <svg width="0" height="0" className="absolute">
      <defs>
        {ANGLES.map((a) => (
          <pattern
            key={a}
            id={`p-sat-${a}`}
            width="1.25"
            height="10"
            patternUnits="userSpaceOnUse"
            patternTransform={`rotate(${a + 90})`}
          >
            <rect width="0.32" height="10" fill="#000" fillOpacity="0.2" />
            <rect x="0.55" width="0.3" height="10" fill="#fff" fillOpacity="0.3" />
          </pattern>
        ))}
        <symbol id="p-rosette" viewBox="0 0 100 100" overflow="visible">
          <Rosette />
        </symbol>
      </defs>
    </svg>
    <Pair
      at={[
        'top-[34%] left-[-4vmax] size-[17vmax] max-sm:hidden',
        'top-[34%] right-[-4vmax] size-[17vmax] max-sm:hidden',
      ]}
      colour="fill-(--art-3)"
    >
      <use href="#p-rosette" />
    </Pair>
    {/* the thread that runs round the panel's border */}
    <div className="p-run p-run-t" />
    <div className="p-run p-run-b" />
    <div className="p-run p-run-l" />
    <div className="p-run p-run-r" />
  </>
);

export default Tenango;
