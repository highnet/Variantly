// The title letters' colour as they morph (an experiment, on by default:
// TITLE_COLOR in lib/titleTiming, `?titlecolor=0` to compare): each face a
// letter passes through wears one of the active concept's palette colours,
// and the colour rides the same spring as the outline (clamped, so it never
// overshoots past the next colour), blended in OKLab so the midpoints stay
// clean instead of going muddy. The letter leaves from and lands on its
// concept's own title colours, so the resting word never changes. Shared by
// the 2D and 3D words.
import type { Timeline } from '@/lib/titleTiming';

export type Lab = [number, number, number];

// The concept tokens a letter may wear while it morphs, most on-brand first.
const TOKENS = ['--title', '--alert', '--art-1', '--art-2', '--art-3', '--hero-ink', '--ink'];
// Large display type: WCAG's 3:1 for large text, against the letter's ground.
const MIN_CONTRAST = 3;

// Any CSS colour as sRGB 0..1 (and alpha): drawn once into a 1x1 canvas, so
// every syntax (hex, rgb(), oklch(), color-mix()) resolves the same way.
let probe: CanvasRenderingContext2D | null = null;
const cache = new Map<string, [number, number, number, number]>();
export const rgba = (css: string): [number, number, number, number] => {
  const hit = cache.get(css);
  if (hit) return hit;
  probe ??= Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext(
    '2d',
    { willReadFrequently: true },
  );
  let out: [number, number, number, number] = [0, 0, 0, 0];
  if (probe && css) {
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = '#000';
    probe.fillStyle = css;
    probe.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
    out = [r / 255, g / 255, b / 255, a / 255];
  }
  cache.set(css, out);
  return out;
};

const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export const toLab = ([r, g, b]: readonly number[]): Lab => {
  const R = lin(r);
  const G = lin(g);
  const B = lin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363015264 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};

// OKLab to sRGB 0..1, clipped to the gamut, into `out`.
export const toRgb = ([L, a, b]: Lab, out: [number, number, number]) => {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clip = (v: number) => Math.min(1, Math.max(0, gam(Math.max(0, v))));
  out[0] = clip(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  out[1] = clip(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  out[2] = clip(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
  return out;
};

const luminance = ([r, g, b]: readonly number[]) =>
  0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const contrast = (x: readonly number[], y: readonly number[]) => {
  const a = luminance(x);
  const b = luminance(y);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

// One letter's colours: its resting face and side colours, and the palette
// colours it may wear while morphing (each legible on the letter's ground,
// and on the same side of it as the resting colour, so no blend between two
// of them can pass through the ground's own lightness).
export type LetterPalette = { face: Lab; side: Lab; options: Lab[] };

export const letterPalette = (letter: Element, face: string, side: string): LetterPalette => {
  const css = getComputedStyle(letter);
  const own = rgba(css.backgroundColor);
  const root = getComputedStyle(document.documentElement);
  const ground =
    own[3] > 0.5 ? own : rgba(root.getPropertyValue('--hero-bg').trim() || root.backgroundColor);
  const f = rgba(face);
  const lighter = luminance(f) > luminance(ground);
  const seen = new Set<string>();
  const options: Lab[] = [];
  for (const t of TOKENS) {
    const v = root.getPropertyValue(t).trim();
    if (!v) continue;
    const c = rgba(v);
    const key = c
      .slice(0, 3)
      .map((x) => Math.round(x * 40))
      .join();
    if (c[3] < 0.99 || seen.has(key)) continue;
    seen.add(key);
    if (contrast(c, ground) < MIN_CONTRAST || luminance(c) > luminance(ground) !== lighter)
      continue;
    options.push(toLab(c));
  }
  return { face: toLab(f), side: toLab(rgba(side)), options };
};

const hash = (a: number, b: number) => {
  let x = (Math.imul(a + 11, 0x9e3779b1) ^ Math.imul(b + 5, 0x85ebca77)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d) >>> 0;
  return (x ^ (x >>> 15)) >>> 0;
};
const near = (a: Lab, b: Lab) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 0.04;

// The colour a letter wears on step k of a run of `count` steps: its resting
// colour at both ends (or, for a concept change, the old concept's colour at
// the start), a palette colour in between (never the one before it).
const stepColour = (
  p: LetterPalette,
  index: number,
  k: number,
  count: number,
  from: Lab | null,
): Lab => {
  if (k === 0) return from ?? p.face;
  if (k >= count || !p.options.length) return p.face;
  const prev = stepColour(p, index, k - 1, count, from);
  const list = p.options.filter((c) => !near(c, prev) && !near(c, p.face));
  const pick = list.length ? list : p.options;
  return pick[hash(k, index) % pick.length];
};

// Face and side colour (OKLab) of a letter `c` (0..1) of the way from step
// `a` to step `b` of a run, into `face` and `side`. The side keeps its
// resting offset from the face, so an extruded or stacked side stays a
// darker (or offset) twin of whatever the face wears.
export const colourAt = (
  p: LetterPalette,
  index: number,
  tl: Timeline,
  count: number,
  a: number,
  b: number,
  c: number,
  from: Lab | null,
  face: Lab,
  side: Lab,
) => {
  const ca = stepColour(p, index, a, count, tl.kind === 'swap' ? from : null);
  const cb = stepColour(p, index, b, count, tl.kind === 'swap' ? from : null);
  for (let i = 0; i < 3; i++) {
    face[i] = ca[i] + (cb[i] - ca[i]) * c;
    side[i] = face[i] + p.side[i] - p.face[i];
  }
};

// A CSS colour for canvas drawing.
const tmp: [number, number, number] = [0, 0, 0];
export const cssOf = (lab: Lab, alpha = 1) => {
  const [r, g, b] = toRgb(lab, tmp);
  return `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)} / ${alpha})`;
};
