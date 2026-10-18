'use client';

import { useLayoutEffect, useRef } from 'react';

import { SLAT_GAP, SLAT_TURN, turnKeyframes } from '@/lib/slatTurn';

/** One switch between redesigns, as the slats play it. */
export type Flip = {
  id: number;
  /** The outgoing redesign's poster (front faces). */
  from: string;
  /** The incoming redesign's poster (back faces). */
  to: string;
  /** 1 ripples left to right (a later number), -1 right to left. */
  dir: 1 | -1;
  /** A flip that interrupts another: quicker, so it catches up. */
  fast: boolean;
  /** The stage's size in px, and how many slats it splits into. */
  w: number;
  h: number;
  count: number;
  /** The posters span the stage's width, white below (a tall stage). */
  contain: boolean;
};

// The posters are shot at the stage's own shape: 1440 x 702 on a desktop,
// 390 x 523 on a phone; the slats crop them as the panes' object-cover does.
const POSTER_RATIO = { desktop: 1440 / 702, phone: 390 / 523 };

type SlatFlipProps = {
  flip: Flip | null;
  phone: boolean;
  /** Called once every slat has landed on the incoming poster. */
  onLanded: (id: number) => void;
};

/*
 * The redesign switch as a split-flap board: the after pane splits into
 * vertical slats that turn, one after another in the direction of travel,
 * from the outgoing poster to the incoming one. Clipped to the after side
 * like the panes (.vy-split-clip), under the divider. Transform only, with
 * backface-visibility and a perspective on the board; a dark board behind
 * the slats hides the live pages while the slats are edge on.
 */
const SlatFlip = ({ flip, phone, onLanded }: SlatFlipProps) => {
  const slats = useRef<(HTMLDivElement | null)[]>([]);
  const landed = useRef(onLanded);
  useLayoutEffect(() => {
    landed.current = onLanded;
  }, [onLanded]);

  useLayoutEffect(() => {
    if (!flip) return;
    const { count } = flip;
    const dur = flip.fast ? SLAT_TURN.fast : SLAT_TURN.normal;
    const gap = flip.fast ? SLAT_GAP.fast : SLAT_GAP.normal;
    const list = slats.current.slice(0, count);
    const anims = list.map((s, i) => {
      const order = flip.dir === 1 ? i : count - 1 - i;
      // A departures-board turn (lib/slatTurn): keyframes, not a spring.
      return s?.animate(turnKeyframes(flip.dir), {
        duration: dur,
        delay: order * gap,
        fill: 'forwards',
      });
    });
    let left = anims.length;
    const id = flip.id;
    // Never a stuck half-flip: land anyway if the slats are held up (a
    // busy main thread, a background tab).
    const watchdog = window.setTimeout(() => landed.current(id), dur + gap * (count - 1) + 600);
    anims.forEach((a) => {
      if (!a) return void left--;
      a.onfinish = () => {
        left -= 1;
        if (left === 0) {
          clearTimeout(watchdog);
          landed.current(id);
        }
      };
    });
    return () => {
      clearTimeout(watchdog);
      anims.forEach((a) => a?.cancel());
    };
  }, [flip]);

  if (!flip) return null;

  const { w, h, count } = flip;
  const ratio = phone ? POSTER_RATIO.phone : POSTER_RATIO.desktop;
  // As the panes' posters: object-cover anchored at the top centre, or the
  // stage's width on a tall stage the live pages are scaled to.
  const wide = flip.contain || w / h > ratio;
  const bw = wide ? w : h * ratio;
  const bh = wide ? w / ratio : h;
  const face = (src: string, x: number) => ({
    backgroundImage: `url("${src}")`,
    backgroundSize: `${bw}px ${bh}px`,
    backgroundPosition: `${(w - bw) / 2 - x}px 0px`,
  });

  return (
    <div
      aria-hidden="true"
      className="vy-split-clip bg-slate pointer-events-none absolute inset-0 z-[15] perspective-[1600px]"
    >
      {Array.from({ length: count }, (_, i) => {
        const x = Math.round((i * w) / count);
        const sw = Math.round(((i + 1) * w) / count) - x;
        return (
          <div
            key={`${flip.id}-${i}`}
            ref={(el) => {
              slats.current[i] = el;
            }}
            className="absolute inset-y-0 transform-3d"
            // One extra pixel overlaps the next slat, so no seam shows.
            style={{ left: x, width: sw + 1 }}
          >
            <div
              className="absolute inset-0 bg-white bg-no-repeat backface-hidden"
              style={face(flip.from, x)}
            />
            <div
              className="absolute inset-0 rotate-y-180 bg-white bg-no-repeat backface-hidden"
              style={face(flip.to, x)}
            />
          </div>
        );
      })}
    </div>
  );
};

export { SlatFlip };
