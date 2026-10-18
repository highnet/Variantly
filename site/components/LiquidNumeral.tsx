import type { CSSProperties } from 'react';

import { cn } from '@/lib/utils';

type LiquidNumeralProps = {
  /** The numeral as shown; public/liquid/step-<n>.svg must exist for it. */
  n: string;
  /** The font size, e.g. text-[clamp(3rem,5vw,4.5rem)]. */
  className: string;
};

/*
 * A step numeral that fills with liquid as it rises up the screen, the same
 * on every page. An outlined numeral sits under a copy masked by a prebaked
 * liquid simulation (public/liquid, scripts/bake-liquid.mjs); LiquidPour
 * picks the frame. A toned copy adds depth and grain, a lighter copy the
 * meniscus. The wrapper is the .vy-pour item LiquidPour drives.
 */
const LiquidNumeral = ({ n, className }: LiquidNumeralProps) => (
  <span
    className="vy-pour vy-step-num relative w-fit"
    style={{ '--liq-src': `url('/liquid/step-${n}.svg')` } as CSSProperties}
    aria-hidden="true"
  >
    <span className={cn('vy-step-liq absolute inset-x-0 -inset-y-[0.15em]', className)}>
      <span className="figure vy-step-fill text-ink block py-[0.15em] leading-[0.8]">{n}</span>
      <span className="figure vy-step-tone text-ink absolute inset-0 py-[0.15em] leading-[0.8]">
        {n}
      </span>
      <span className="figure vy-step-line text-ink absolute inset-0 py-[0.15em] leading-[0.8]">
        {n}
      </span>
    </span>
    <span className={cn('figure vy-step-ghost text-ink relative leading-[0.8]', className)}>
      {n}
    </span>
  </span>
);

export { LiquidNumeral };
