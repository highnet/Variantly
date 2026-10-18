/* ---- K · Ink & Stitch: cotton paper, dry-brush ink, rust running stitch ---
 * A swatch-book page. Every mark is editioned from a fixed seed, so each
 * stroke and seam is the same hand-made mark on every load, never jitter. */

type Pt = [number, number];

// Park-Miller: a tiny seeded generator, so every mark is editioned.
const seeded = (s: number) => () => (s = (s * 16807) % 2147483647) / 2147483647;

// A dry-brush stroke: bristles laid along a cubic, tapering, the outer ones
// running dry first. Returns [d, width, dasharray] per bristle.
const brush = (p: Pt[], w: number, n: number, seed: number) => {
  const r = seeded(seed);
  const at = (s: number): Pt => {
    const u = 1 - s;
    const k = [u * u * u, 3 * u * u * s, 3 * u * s * s, s * s * s];
    return [0, 1].map((i) => k.reduce((a, c, j) => a + c * p[j][i], 0)) as Pt;
  };
  return Array.from({ length: n }, (_, j) => {
    const o = j / (n - 1) - 0.5;
    const end = 1 - Math.abs(o) * 0.55 - r() * 0.18;
    const pts: string[] = [];
    for (let i = 0; i <= 14; i++) {
      const s = (i / 14) * end;
      const [x, y] = at(s);
      const [x2, y2] = at(Math.min(1, s + 0.01));
      const len = Math.hypot(x2 - x, y2 - y) || 1;
      const off = o * w * Math.pow(Math.sin(Math.PI * (0.12 + 0.88 * s)), 0.35);
      pts.push(
        `${(x - ((y2 - y) / len) * off).toFixed(0)} ${(y + ((x2 - x) / len) * off).toFixed(0)}`,
      );
    }
    // A loaded core; the outer bristles thin out and skip as the brush runs dry.
    const core = Math.abs(o) < 0.28;
    const dash =
      !core && r() < 0.6 ? `${(30 + r() * 80).toFixed(0)} ${(3 + r() * 9).toFixed(0)}` : 'none';
    return [
      `M${pts.join('L')}`,
      ((w / n) * (core ? 2.4 : 0.7 + r() * 0.9)).toFixed(1),
      dash,
    ] as const;
  });
};

// Paper fibres: short curls of cotton, scattered once into a tile.
const fibres = (size: number, n: number, seed: number) => {
  const r = seeded(seed);
  return Array.from({ length: n }, () => {
    const x = r() * size;
    const y = r() * size;
    const a = r() * Math.PI * 2;
    const l = 4 + r() * 14;
    const bend = (r() - 0.5) * 8;
    const ex = x + Math.cos(a) * l;
    const ey = y + Math.sin(a) * l;
    return `M${x.toFixed(0)} ${y.toFixed(0)}Q${((x + ex) / 2 - Math.sin(a) * bend).toFixed(0)} ${((y + ey) / 2 + Math.cos(a) * bend).toFixed(0)} ${ex.toFixed(0)} ${ey.toFixed(0)}`;
  }).join('');
};

// A pinked fabric swatch: zigzag edges all round.
const pinked = (w: number, h: number, t = 4) => {
  const side = (x0: number, y0: number, dx: number, dy: number, len: number) =>
    Array.from({ length: Math.round(len / t) }, (_, i) => {
      const s = (i + 0.5) * t;
      return `${(x0 + dx * s - dy * t * 0.5).toFixed(1)} ${(y0 + dy * s + dx * t * 0.5).toFixed(1)}L${(x0 + dx * (s + t / 2)).toFixed(1)} ${(y0 + dy * (s + t / 2)).toFixed(1)}`;
    }).join('L');
  return `M0 0L${side(0, 0, 1, 0, w)}L${w} 0L${side(w, 0, 0, 1, h)}L${w} ${h}L${side(w, h, -1, 0, w)}L0 ${h}L${side(0, h, 0, -1, h)}Z`;
};

const STROKE_A = brush(
  [
    [-30, 250],
    [60, 120],
    [210, 70],
    [380, 40],
  ],
  54,
  11,
  11,
);

type StrokeProps = { marks: typeof STROKE_A; cls: string };

const Stroke = ({ marks, cls }: StrokeProps) => (
  <g fill="none" strokeLinecap="round" className="stroke-(--art-ink)">
    {marks.map(([d, w, dash], i) => (
      <path key={i} d={d} strokeWidth={w} strokeDasharray={dash} className={cls} />
    ))}
  </g>
);

const Ink = () => (
  <>
    {/* the sheet: warm cotton with soft mottling */}
    <div className="k-paper absolute inset-0" />

    {/* dry-brush ink, top left; a paper wipe re-draws it at an uneven hand pace */}
    <div className="absolute top-[-6vmax] left-[-7vmax] w-[46vmax] overflow-hidden max-sm:w-[40vmax]">
      <svg viewBox="-60 0 480 300" className="block w-full">
        <Stroke marks={STROKE_A} cls="opacity-90" />
      </svg>
      <div className="k-wipe k-wipe-a absolute inset-0" />
    </div>
    {/* swatches, stitched to the page */}
    <div className="vy-art-float vy-art-float-1 absolute top-[58%] left-[-3vmax] w-[14vmax] rotate-[-6deg] max-sm:hidden">
      <svg viewBox="-4 -4 108 128" className="block w-full overflow-visible">
        <path
          d={pinked(100, 120)}
          transform="translate(2 3)"
          className="fill-(--art-shadow)"
          fillOpacity="0.18"
        />
        <path d={pinked(100, 120)} className="fill-(--art-3)" />
        <rect
          x="9"
          y="9"
          width="82"
          height="102"
          fill="none"
          className="stroke-(--art-paper)"
          strokeWidth="1.6"
          strokeDasharray="6 4"
          strokeLinecap="round"
        />
      </svg>
    </div>
    <div className="vy-art-float vy-art-float-2 absolute bottom-[-3vmax] left-[38%] w-[13vmax] rotate-[-9deg] max-sm:hidden">
      <svg viewBox="-4 -4 108 96" className="block w-full overflow-visible">
        <path
          d={pinked(100, 88)}
          transform="translate(2 3)"
          className="fill-(--art-shadow)"
          fillOpacity="0.18"
        />
        <path d={pinked(100, 88)} className="fill-(--art-2)" />
        <path
          d="M8 22H92M8 66H92"
          fill="none"
          className="stroke-(--art-1)"
          strokeWidth="1.8"
          strokeDasharray="7 5"
          strokeLinecap="round"
        />
      </svg>
    </div>

    {/* cotton fibres over everything, so the wipes and ink sit in the paper */}
    <svg className="absolute inset-0 size-full">
      <defs>
        <pattern id="k-fib-a" width="180" height="180" patternUnits="userSpaceOnUse">
          <path
            d={fibres(180, 14, 7)}
            fill="none"
            className="stroke-(--art-ink)"
            strokeOpacity="0.09"
            strokeWidth="0.6"
          />
        </pattern>
        <pattern
          id="k-fib-b"
          width="263"
          height="263"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(37)"
        >
          <path
            d={fibres(263, 12, 19)}
            fill="none"
            className="stroke-(--art-2)"
            strokeOpacity="0.16"
            strokeWidth="0.8"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#k-fib-a)" />
      <rect width="100%" height="100%" fill="url(#k-fib-b)" />
    </svg>

    {/* the seams: running stitch, pulled taut a stitch at a time */}
    <div className="k-seam absolute top-[54%] right-0 left-0 max-sm:hidden">
      <div className="k-thread" />
    </div>
    <div className="k-seam k-seam-v absolute top-0 bottom-0 left-2 max-sm:hidden">
      <div className="k-thread" />
    </div>
  </>
);

export default Ink;
