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
// Three proofs of the same disc at falling thresholds (unlabelled: no text
// sits around the title).
const PROOFS: number[][] = [[12, 8, 4, 2, 1, 1, 0, 0], SUN, [16, 16, 16, 16, 12, 8, 4, 2]];

// The sun rises at the right edge beside the title (desktop), or small in the
// band between the title card and the headline (phones): never behind either.
const Dither = () => (
  <>
    <div className="vy-h-tooth absolute inset-0" />
    <Disc
      levels={SUN}
      sweep
      className="top-[7vh] right-[-38vmax] size-[46vmax] max-sm:top-[22vh] max-sm:right-[-3vmax] max-sm:size-[11vmax]"
    />
    <div className="vy-h-proofs absolute top-[12vh] left-[2.5vw] grid gap-3 max-xl:hidden">
      {PROOFS.map((levels, i) => (
        <Disc key={i} levels={levels} className="relative size-[72px]" />
      ))}
    </div>
  </>
);

export default Dither;
