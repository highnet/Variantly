/*
 * The split-flap turn, shared by the demo's after pane (components/SlatFlip)
 * and the concept swap (lib/slatSwap): each slat rotates on its vertical
 * centre past flat, then settles back, the slats one after another in the
 * direction of travel. Pure maths and timings: no DOM beyond the perf tier.
 */

/** One slat's turn, and the delay between neighbouring slats, in ms. */
export const SLAT_TURN = { normal: 380, fast: 220 };
export const SLAT_GAP = { normal: 30, fast: 10 };

/** Slats for a stage: fewer on phones and on the low power tier. */
export const slatCount = (phone: boolean) =>
  document.documentElement.dataset.perf === 'low' ? 6 : phone ? 9 : 14;

type Bezier = [number, number, number, number];

// The turn's stops: past flat to 194deg, back to 176deg, landing on 180deg.
const STOPS: { at: number; deg: number; ease?: Bezier }[] = [
  { at: 0, deg: 0, ease: [0.45, 0, 0.3, 1] },
  { at: 0.74, deg: 194, ease: [0.42, 0, 0.58, 1] },
  { at: 0.89, deg: 176, ease: [0.42, 0, 0.58, 1] },
  { at: 1, deg: 180 },
];

const css = (b: Bezier) => `cubic-bezier(${b.join(', ')})`;

/** The turn as WAAPI keyframes (rotateY), for real slats. */
export const turnKeyframes = (dir: 1 | -1): Keyframe[] =>
  STOPS.map((s) => ({
    transform: `rotateY(${dir * s.deg}deg)`,
    offset: s.at,
    ...(s.ease && { easing: css(s.ease) }),
  }));

// A CSS cubic-bezier as a function of time: solve x(t) = u, return y(t).
const bezierAt = ([x1, y1, x2, y2]: Bezier, u: number) => {
  const f = (a: number, b: number, t: number) =>
    3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (f(x1, x2, mid) < u) lo = mid;
    else hi = mid;
  }
  return f(y1, y2, (lo + hi) / 2);
};

/** The turn's angle in degrees at progress u (0..1), as the keyframes play it. */
export const turnAngle = (u: number) => {
  if (u <= 0) return 0;
  if (u >= 1) return 180;
  const i = STOPS.findIndex((s, k) => u >= s.at && u < STOPS[k + 1].at);
  const a = STOPS[i];
  const b = STOPS[i + 1];
  const k = bezierAt(a.ease!, (u - a.at) / (b.at - a.at));
  return a.deg + (b.deg - a.deg) * k;
};
