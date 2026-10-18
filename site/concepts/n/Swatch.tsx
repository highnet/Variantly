/*
 * Swatch: an original rubber-hose mascot for Orientation Reel. A paint chip
 * (a rounded card with a darker band on top) with pie-cut eyes, a curled
 * grin, puffy four-finger gloves, bulbous shoes and tapering hose limbs
 * drawn as an outlined tube, the way 1930s studio cartoons inked them. A 24s
 * idle (wave, wink, hop); every 6s the chip flips like a split-flap tile to
 * another grey, one shade per variant (greys from concept.css). Decorative
 * only. Every loop's 0% is the still pose.
 */

const BAND = 'M32 27a9 9 0 0 1 9-9h38a9 9 0 0 1 9 9v12H32Z';

// A pie-cut eye: a tall black oval with a white wedge cut into its upper
// right, the classic 1930s eye.
type EyeProps = { cx: number };

const Eye = ({ cx }: EyeProps) => (
  <>
    <ellipse cx={cx} cy="57" rx="5.4" ry="8.4" className="sw-ink" />
    <path
      d={`M${cx + 0.6} 55.2L${cx + 4.6} 50.4A5.4 8.4 0 0 0 ${cx + 1.4} 48.7Z`}
      className="sw-glint"
    />
  </>
);

type LimbProps = { d: string };

// A hose limb: a dark tube with a contrasting outline (reads on both grounds).
const Limb = ({ d }: LimbProps) => (
  <>
    <path d={d} className="sw-hose-o" />
    <path d={d} className="sw-hose" />
  </>
);

type GloveProps = { x: number; y: number; r: number };

// A puffy four-finger glove: three fingers, a thumb, stitch lines on the
// back and a flared, rolled cuff.
const Glove = ({ x, y, r }: GloveProps) => (
  <g transform={`translate(${x} ${y}) rotate(${r})`}>
    <path
      d="M-6.5 4.5C-10 1-10.2-5.5-6.6-8C-5.6-12-1.8-12.4-.6-9.6C.4-13.2 4.2-13.2 5-9.8C7.4-11.2 10-9.2 8.8-5.8C11.2-3.4 10.2 2.6 6.5 4.5Z"
      className="sw-glove"
    />
    <path d="M-8.8-1.6C-12.6-2.6-13.4 2-9.4 3.2" className="sw-glove" />
    <path d="M-.6-9.6V-4M5-9.8 4.3-4" className="sw-stitch" />
    <path d="M-7.5 4.5H7.5L9 10.5H-9Z" className="sw-glove" />
    <path d="M-8.2 7.4H8.2" className="sw-stitch" />
  </g>
);

const Swatch = () => (
  <svg viewBox="0 0 120 150" className="n-swatch hidden" aria-hidden="true">
    {/* a soft ground shadow that stays put while he hops */}
    <ellipse cx="60" cy="143" rx="30" ry="3.6" className="sw-shadow" />
    <g className="sw-bob">
      <g className="sw-hop">
        {/* hose legs and shoes */}
        <Limb d="M50 96C47 110 55 121 47 131" />
        <Limb d="M70 96C73 110 65 121 73 131" />
        <path
          d="M34 138C33 131 40 128 47 129C53 130 56 134 55 138C54 141 36 141 34 138Z"
          className="sw-shoe"
        />
        <path
          d="M86 138C87 131 80 128 73 129C67 130 64 134 65 138C66 141 84 141 86 138Z"
          className="sw-shoe"
        />
        <path
          d="M38 132.5C40 131 43 130.6 45 130.8M82 132.5C80 131 77 130.6 75 130.8"
          className="sw-shine"
        />
        {/* resting arm */}
        <Limb d="M33 62C22 66 18 76 17 84" />
        <Glove x={16} y={91} r={160} />
        {/* the waving arm */}
        <g className="sw-wave">
          <Limb d="M87 62C98 58 104 49 104 39" />
          <Glove x={104} y={30} r={10} />
        </g>
        {/* the chip: four shades stacked, one shown at a time, flipping */}
        <g className="sw-card">
          {[0, 1, 2, 3].map((i) => (
            <g key={i} className={`sw-shade sw-s${i}`}>
              <rect x="32" y="18" width="56" height="80" rx="9" className="sw-c" />
              <path d={BAND} className="sw-b" />
            </g>
          ))}
          {/* a highlight down the left edge and a shade down the right */}
          <path d="M38 44V88" className="sw-sheen" />
          <path d="M84 30V90" className="sw-shade-r" />
          <rect x="32" y="18" width="56" height="80" rx="9" className="sw-edge" />
          <path d="M32 39H88" className="sw-band-line" />
          <path d="M42 90H62M42 94H54" className="sw-line" />
        </g>
        {/* the face: pie-cut eyes, a wink, a grin curled at both ends */}
        <g className="sw-eye-l">
          <Eye cx={51} />
        </g>
        <path d="M44.5 58Q51 51.5 57.5 58" className="sw-wink sw-hose-thin" />
        <Eye cx={69} />
        <path d="M47 72Q60 84 73 72" className="sw-hose-thin" />
        <path d="M45 70.2Q46.4 73.4 49.2 73.4M75 70.2Q73.6 73.4 70.8 73.4" className="sw-curl" />
      </g>
    </g>
  </svg>
);

export default Swatch;
