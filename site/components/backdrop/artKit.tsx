import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import grainTile from '@/app/_grain/grain-strong.png';

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

/*
 * Film grain on the art's shapes, the 2D twin of GlField's grain pass (and
 * the only grain phones see, since they paint the art, not the scene): each
 * Piece draws its shapes a second time, filled with the page's grain tile
 * (see .vy-art-grain in globals.css), so only the shapes pick up texture and
 * the ground between them stays clean. A static pattern, rasterised once with
 * the rest of the layer. The tile spans 16 of a Piece's 100 units, so the
 * grain scales with the shape, like grain in a print of it.
 */
export const GrainDefs = () => (
  <svg width="0" height="0" className="absolute" aria-hidden="true">
    <defs>
      <pattern id="vy-art-grain" patternUnits="userSpaceOnUse" width="16" height="16">
        <image href={grainTile.src} width="16" height="16" />
      </pattern>
    </defs>
  </svg>
);

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
      <g className="vy-art-grain">{children}</g>
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
