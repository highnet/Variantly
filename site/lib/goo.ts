/*
 * The demo picker's goo hop: the selected pill stretches toward the new
 * number, a neck forms, pinches, snaps, and the pill lands with a wobble.
 *
 * Pre-baked: one call samples a damped spring into WAAPI keyframes for three
 * small layers (the pill arriving, the blob it leaves behind, and the neck
 * between them), all transform and opacity, so the browser plays them on the
 * compositor. No filters, no masks, no per-frame script.
 */

type Vec = { x: number; y: number };

export type GooPlan = {
  duration: number;
  /** The arriving pill, drawn in the target cell. */
  head: Keyframe[];
  /** The blob left in the source cell, drawn there. */
  tail: Keyframe[];
  /** The neck, drawn from the source cell's centre. */
  neck: Keyframe[];
  /** When the target's number turns to the pill's ink, in ms. */
  arriveMs: number;
  /** When the source's number turns back, in ms. */
  leaveMs: number;
};

/** Base length of the neck element, in px; it is scaled to the gap. */
export const NECK_BASE = 100;

const SAMPLES = 28;
const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/*
 * Progress of the travelling pill, 0 to 1 with a springy overshoot. First
 * the stretch: it leans out to STRETCH of the way while still attached, and
 * eases to a stop as the neck draws thin. Then the snap: it lets go, shoots
 * over and wobbles in.
 */
const STRETCH = 0.55;
const HOLD = 0.34;
const progress = (t: number) => {
  if (t < HOLD) {
    const u = t / HOLD;
    return STRETCH * (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
  }
  const u = (t - HOLD) / (1 - HOLD);
  const a = 4.2;
  const w = 8.5;
  return (
    STRETCH + (1 - STRETCH) * (1 - Math.exp(-a * u) * (Math.cos(w * u) + (a / w) * Math.sin(w * u)))
  );
};

/** Squash and stretch along the travel direction, area roughly kept. */
const stretch = (angle: number, along: number) => {
  const across = 1 / Math.sqrt(along);
  return `rotate(${angle}rad) scale(${along.toFixed(3)}, ${across.toFixed(3)}) rotate(${-angle}rad)`;
};

/**
 * Bake the hop from `from` to `to` (cell centres, px, in the picker's frame).
 * `start` is where the pill is drawn right now, which differs from `from`
 * when a hop interrupts another. `pitch` is the distance between neighbouring
 * cells, so a hop of one cell and a run across five feel alike.
 */
export const bakeGoo = (
  start: Vec,
  from: Vec,
  to: Vec,
  pitch: number,
  /** The pill's resting corner radius and its full round, in px. */
  corners = { rest: 6, round: 18 },
): GooPlan => {
  const radius = (k: number) =>
    `${(corners.rest + (corners.round - corners.rest) * clamp(k)).toFixed(2)}px`;
  const dx = to.x - start.x;
  const dy = to.y - start.y;
  const len = Math.hypot(dx, dy) || 1;
  const angle = Math.atan2(dy, dx);
  const cells = len / pitch;
  // Long runs take a little longer; the tail follows instead of holding.
  const duration = Math.round(720 + 70 * Math.min(cells - 1, 5));
  const far = cells > 1.5;
  // Overshoot is a fraction of a cell, however far the pill travels.
  const give = Math.min(1, 0.55 / cells);
  // Where the source blob sits relative to its own cell centre at the start.
  const ox = start.x - from.x;
  const oy = start.y - from.y;

  const head: Keyframe[] = [];
  const tail: Keyframe[] = [];
  const neck: Keyframe[] = [];
  let arriveMs = duration * 0.5;
  let leaveMs = duration * 0.35;
  let arrived = false;
  let left = false;
  let prev = 0;

  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const raw = progress(t);
    const h = raw <= 1 ? raw : 1 + (raw - 1) * give;
    // Velocity in cells per tenth of the hop: drives the stretch, and turns
    // into a squash when the pill rebounds.
    const v = ((h - prev) * cells * SAMPLES) / 10;
    prev = h;
    const along = i === SAMPLES ? 1 : 1 + clamp(v * 0.22, -0.16, 0.42);

    // The pill is drawn at the target: it starts back at the source.
    const hx = -dx * (1 - h);
    const hy = -dy * (1 - h);
    // The head swells out of the source blob rather than starting full size.
    const grow = 0.6 + 0.4 * smooth(0.45, 0.95, h);
    head.push({
      offset: t,
      // Rounder while it is goo, back to the pill's corners as it settles.
      borderRadius: i === SAMPLES ? radius(0) : radius(1 - smooth(0.82, 1, h)),
      transform:
        i === SAMPLES
          ? 'none'
          : `translate(${hx.toFixed(2)}px, ${hy.toFixed(2)}px) ${stretch(angle, along)} scale(${grow.toFixed(3)})`,
    });

    // The blob left behind: a hop holds it in place and drains it through
    // the neck; a long run drags it along a cell or so behind the head.
    const k = far ? Math.max(0, h * cells - 1.3) / cells : 0.12 * smooth(0, 0.6, h);
    const drain = far
      ? smooth(0.5, 0.86, h)
      : 0.22 * smooth(0, STRETCH, h) + 0.78 * smooth(STRETCH, 0.9, h);
    const ts = Math.max(0, 1 - drain);
    // A bulge toward the target before it lets go.
    const lean = 1 + 0.1 * smooth(0, 0.15, h) * (1 - drain);
    const tx = ox + dx * k;
    const ty = oy + dy * k;
    tail.push({
      offset: t,
      opacity: ts > 0.02 ? 1 : 0,
      borderRadius: radius(smooth(0, 0.5, drain) + smooth(0, 0.2, h)),
      transform: `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) ${stretch(angle, lean)} scale(${ts.toFixed(3)})`,
    });

    // The neck runs from the blob's centre to the pill's, thinning as they
    // part, and snaps once the gap is too wide.
    const snap = far ? smooth(0.5, 0.84, h) : smooth(0.5, 0.86, h);
    // Its flared ends never stand taller than the blobs they join.
    const headTall = grow / Math.sqrt(along);
    const thick = (1 - 0.6 * snap) * 0.92 * Math.min(ts, headTall, 1);
    const broken = snap >= 0.98 || ts <= 0.02;
    const gap = Math.max(0, len * (h - k));
    neck.push({
      offset: t,
      opacity: broken ? 0 : 1,
      transform: `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) rotate(${angle}rad) scale(${(gap / NECK_BASE).toFixed(4)}, ${broken ? 0 : thick.toFixed(3)})`,
    });

    if (!arrived && h * cells >= cells - 0.4) {
      arrived = true;
      arriveMs = t * duration;
    }
    // The old number goes dark once the blob drains or moves off it.
    if (!left && (ts < 0.75 || k * cells > 0.4)) {
      left = true;
      leaveMs = t * duration;
    }
  }
  // A fully drained blob stays hidden at rest.
  tail[tail.length - 1] = { ...tail[tail.length - 1], opacity: 0 };
  neck[neck.length - 1] = { ...neck[neck.length - 1], opacity: 0 };
  return {
    duration,
    head,
    tail,
    neck,
    arriveMs: Math.round(arriveMs),
    leaveMs: Math.round(Math.min(leaveMs, arriveMs)),
  };
};
