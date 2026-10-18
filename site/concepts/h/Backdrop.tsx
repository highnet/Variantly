/*
 * h · Dither Machine: a rust sun printed 1-bit through a Bayer 4×4 on toothy
 * paper, with a stepped light sweeping across it, and three proofs of the same
 * sun re-dithered at other thresholds (variation that is real, not noise).
 * Every tone is one ordered-dither level (.vy-h-dN in concept.css).
 */
import { cn } from '@/lib/utils';

type DiscProps = { levels: number[]; className: string; sweep?: boolean };

const Disc = ({ levels, className, sweep }: DiscProps) => (
  <div className={cn('vy-h-disc absolute', className)}>
    {levels.map((l, i) => (
      <i key={i} className={l ? `vy-h-d${l}` : undefined} />
    ))}
    {sweep && <b className="vy-h-sweep" />}
  </div>
);

// Top to bottom: lit at the crown, dissolving into the paper below.
const SUN = [16, 16, 12, 8, 8, 4, 2, 1];
const PROOFS: [string, number[]][] = [
  ['.75', [12, 8, 4, 2, 1, 1, 0, 0]],
  ['.50', SUN],
  ['.25', [16, 16, 16, 16, 12, 8, 4, 2]],
];

const Dither = () => (
  <>
    <div className="vy-h-tooth absolute inset-0" />
    <Disc
      levels={SUN}
      sweep
      className="top-[7vh] right-[-7vmax] size-[46vmax] max-sm:top-[3vh] max-sm:right-[-18vmax] max-sm:size-[50vmax]"
    />
    <div className="vy-h-proofs absolute top-[16vh] left-[2.5vw] grid gap-4 max-xl:hidden">
      {PROOFS.map(([t, levels]) => (
        <figure key={t} className="m-0 grid gap-2">
          <Disc levels={levels} className="relative size-[88px]" />
          <figcaption>T{t}</figcaption>
        </figure>
      ))}
    </div>
  </>
);

export default Dither;
