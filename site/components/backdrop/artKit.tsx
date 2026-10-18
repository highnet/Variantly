import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/*
 * Each concept's own background art, drawn once and never repainted: plain
 * SVG shapes, gradients and patterns, no SVG filters and no blend modes, so a
 * phone rasterises the layer a single time and scrolling only composites it.
 * Colours come from --art-* tokens in globals.css, set per concept and theme.
 * Every concept loops seamlessly over 24s, transform only (see .vy-art-float).
 */

export type PieceProps = {
  className: string;
  children: ReactNode;
  float?: number;
};

// One absolutely placed shape in a 100×100 box; `float` picks a drift path.
export const Piece = ({ className, children, float }: PieceProps) => (
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
export const STOPS = [
  '[stop-color:var(--art-1)]',
  '[stop-color:var(--art-2)]',
  '[stop-color:var(--art-3)]',
];
export const FILLS = {
  '--art-1': 'fill-(--art-1)',
  '--art-2': 'fill-(--art-2)',
  '--art-3': 'fill-(--art-3)',
};
