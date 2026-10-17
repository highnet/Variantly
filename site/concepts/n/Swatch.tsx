/*
 * Swatch: an original rubber-hose mascot for Orientation Reel. A paint chip
 * (a rounded card with a darker band on top) with pie-cut eyes, a smile,
 * white four-finger gloves and bendy hose limbs. A 24s idle (wave, wink,
 * hop); every 6s the chip flips like a split-flap tile to another grey, one
 * shade per variant (greys from concept.css). Decorative only. Every loop's 0% is the still pose.
 */

const BAND = 'M32 27a9 9 0 0 1 9-9h38a9 9 0 0 1 9 9v12H32Z';

type GloveProps = { x: number; y: number; r: number };

// A four-finger cartoon glove: three fingers up, a thumb, a rolled cuff.
const Glove = ({ x, y, r }: GloveProps) => (
  <g transform={`translate(${x} ${y}) rotate(${r})`}>
    <rect x="-5.5" y="5" width="11" height="4.5" rx="2" className="sw-glove" />
    <path
      d="M-5.5 5C-8.5 1-8.5-5-5.6-7.2C-4.8-10.6-1.6-10.8-.6-8.6C.2-11.8 3.4-11.8 4.2-8.8C6.2-10 8.4-8.2 7.4-5.2C9.4-3 8.4 2.4 5.5 5Z"
      className="sw-glove"
    />
    <path d="M-7.6-1.5C-10.6-2.4-11.4 1.4-8.2 2.6" className="sw-glove" />
    <path d="M-.6-8.6V-3.6M4.2-8.8 3.6-3.4" fill="none" className="sw-line" />
  </g>
);

const Swatch = () => (
  <svg viewBox="0 0 120 150" className="n-swatch" aria-hidden="true">
    <g className="sw-bob">
      <g className="sw-hop">
        {/* hose legs and shoes */}
        <path d="M50 96C47 110 55 121 47 133M70 96C73 110 65 121 73 133" className="sw-hose" />
        <ellipse cx="43" cy="137" rx="9.5" ry="5.5" className="sw-shoe" />
        <ellipse cx="77" cy="137" rx="9.5" ry="5.5" className="sw-shoe" />
        {/* resting arm */}
        <path d="M33 62C22 66 18 76 17 84" className="sw-hose" />
        <Glove x={16} y={90} r={160} />
        {/* the waving arm */}
        <g className="sw-wave">
          <path d="M87 62C98 58 104 49 104 38" className="sw-hose" />
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
          <rect x="32" y="18" width="56" height="80" rx="9" className="sw-edge" />
          <path d="M42 89H64M42 93H56" className="sw-line" />
        </g>
        {/* the face */}
        <g className="sw-eye-l">
          <ellipse cx="51" cy="57" rx="5" ry="8" className="sw-ink" />
          <path d="M52 55 57 49 53 48Z" className="sw-glint" />
        </g>
        <path d="M45 58Q51 52 57 58" className="sw-wink sw-hose-thin" />
        <ellipse cx="69" cy="57" rx="5" ry="8" className="sw-ink" />
        <path d="M70 55 75 49 71 48Z" className="sw-glint" />
        <path d="M49 72Q60 82 71 72" className="sw-hose-thin" />
      </g>
    </g>
  </svg>
);

export default Swatch;
