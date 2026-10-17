// The Lens's doorway: an upright slab about 1:2, its outline (with the
// glitch's sideways band slices and scanline dropouts), its tilt toward the
// cursor, and the rounded-rect paths the 2D layers clip with. Shared by the
// Lens itself (components/Lens.tsx, lib/lens3d.ts) and the concept-swap
// doorway that opens from every switch (lib/lensSwap.ts). Pure maths: no DOM.

export type Pt = [number, number];
export type Rect = { x: number; y: number; w: number; h: number };

// Door size in px: ~180x360 on desktop, smaller on phones.
export const doorSize = (vw: number) =>
  vw < 640 ? { w: 132, h: 264 } : vw < 1100 ? { w: 160, h: 320 } : { w: 180, h: 360 };
// The resting "peek" door on phones, tucked in a corner of the hero.
export const PEEK = { w: 48, h: 96 };
export const DOOR_RADIUS = 4;

// A horizontal slice of the door shifted sideways, in door px (y from the top).
export type Band = { y0: number; y1: number; dx: number };

// Corner arcs sampled at `seg` points each (crisp at these sizes).
const arc = (cx: number, cy: number, r: number, a0: number, seg: number, out: Pt[]) => {
  for (let i = 0; i <= seg; i++) {
    const a = a0 + (i / seg) * (Math.PI / 2);
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
};

/*
 * The door's outline, clockwise in screen space (y down), relative to its
 * top-left: rounded corners, and each glitch band's stretch of the left and
 * right edges stepped sideways by its dx (the slices "offset sideways").
 */
export const doorOutline = (w: number, h: number, r: number, bands: Band[] = []): Pt[] => {
  const seg = 3;
  const out: Pt[] = [];
  const rr = Math.min(r, w / 2, h / 2);
  arc(rr, rr, rr, Math.PI, seg, out);
  arc(w - rr, rr, rr, -Math.PI / 2, seg, out);
  // Right edge, top to bottom, stepping out at each band.
  const sorted = bands
    .filter((b) => b.y1 > rr && b.y0 < h - rr)
    .sort((a, b) => a.y0 - b.y0)
    .map((b) => ({ ...b, y0: Math.max(b.y0, rr), y1: Math.min(b.y1, h - rr) }));
  for (const b of sorted) {
    out.push([w, b.y0], [w + b.dx, b.y0], [w + b.dx, b.y1], [w, b.y1]);
  }
  arc(w - rr, h - rr, rr, 0, seg, out);
  arc(rr, h - rr, rr, Math.PI / 2, seg, out);
  for (let i = sorted.length - 1; i >= 0; i--) {
    const b = sorted[i];
    out.push([0, b.y1], [b.dx, b.y1], [b.dx, b.y0], [0, b.y0]);
  }
  return out;
};

export type Tilt = { rx: number; ry: number };
const PERSPECTIVE = 900;

// A door-local point (from its top-left) after the slab's tilt about its
// centre, seen through a CSS-like perspective: where it lands on screen,
// relative to the door's top-left. Small angles (a few degrees).
export const tiltPoint = (p: Pt, w: number, h: number, t: Tilt): Pt => {
  const u = p[0] - w / 2;
  const v = p[1] - h / 2;
  const ax = (t.rx * Math.PI) / 180;
  const ay = (t.ry * Math.PI) / 180;
  // rotateX then rotateY (CSS order, y down).
  const y1 = v * Math.cos(ax);
  const z1 = -v * Math.sin(ax);
  const x2 = u * Math.cos(ay) + z1 * Math.sin(ay);
  const z2 = -u * Math.sin(ay) + z1 * Math.cos(ay);
  const k = PERSPECTIVE / (PERSPECTIVE - z2);
  return [w / 2 + x2 * k, h / 2 + y1 * k];
};

export const tiltOutline = (pts: Pt[], w: number, h: number, t: Tilt): Pt[] =>
  t.rx === 0 && t.ry === 0 ? pts : pts.map((p) => tiltPoint(p, w, h, t));

const f = (n: number) => Math.round(n * 10) / 10;

// SVG / CSS path() data for closed rings, offset by (ox, oy).
export const ringsPath = (rings: Pt[][], ox = 0, oy = 0) =>
  rings
    .map((ring) => `M${ring.map(([x, y]) => `${f(x + ox)} ${f(y + oy)}`).join('L')}Z`)
    .join('');

// A full-width scanline dropout as a ring (a hole under evenodd).
export const dropoutRing = (w: number, y0: number, y1: number): Pt[] => [
  [-2, y0],
  [w + 2, y0],
  [w + 2, y1],
  [-2, y1],
];

// A rounded rect as path() data, for the swap doorway's clip and rim.
export const roundRectPath = (r: Rect, radius: number) => {
  const rr = Math.max(0, Math.min(radius, r.w / 2, r.h / 2));
  const { x, y, w, h } = r;
  return (
    `M${f(x + rr)} ${f(y)}H${f(x + w - rr)}A${f(rr)} ${f(rr)} 0 0 1 ${f(x + w)} ${f(y + rr)}` +
    `V${f(y + h - rr)}A${f(rr)} ${f(rr)} 0 0 1 ${f(x + w - rr)} ${f(y + h)}` +
    `H${f(x + rr)}A${f(rr)} ${f(rr)} 0 0 1 ${f(x)} ${f(y + h - rr)}` +
    `V${f(y + rr)}A${f(rr)} ${f(rr)} 0 0 1 ${f(x + rr)} ${f(y)}Z`
  );
};

export const growRect = (r: Rect, by: number): Rect => ({
  x: r.x - by,
  y: r.y - by,
  w: r.w + 2 * by,
  h: r.h + 2 * by,
});

export const lerpRect = (a: Rect, b: Rect, s: number): Rect => ({
  x: a.x + (b.x - a.x) * s,
  y: a.y + (b.y - a.y) * s,
  w: a.w + (b.w - a.w) * s,
  h: a.h + (b.h - a.h) * s,
});

/*
 * A damped spring from 0 to 1 over normalised time u (0..1): a slight
 * overshoot (~5%), then it settles. The doorway's opening and the Lens's
 * commit share it.
 */
export const springAt = (u: number, zeta = 0.68, omega = 10.5) => {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const wd = omega * Math.sqrt(1 - zeta * zeta);
  return (
    1 - Math.exp(-zeta * omega * u) * (Math.cos(wd * u) + ((zeta * omega) / wd) * Math.sin(wd * u))
  );
};

// The same spring as a CSS linear() easing, for CSS-driven motion.
export const springEasing = (steps = 32) =>
  `linear(${Array.from({ length: steps + 1 }, (_, i) => f(springAt(i / steps) * 1000) / 1000).join(', ')})`;
