/*
 * j · Instrument OS: the page as a faceplate. A dot-matrix field, three
 * rubber knobs that click between detents, and a dot-matrix display whose
 * level meter scrolls past in held steps. Colours are --art-* tokens.
 */

// One period of the level meter: bar heights in LED rows (of 9), two periods drawn.
const BARS = Array.from({ length: 24 }, (_, i) =>
  Math.max(1, Math.round(4.5 + 3.4 * Math.sin(i * 0.9) * Math.cos(i * 0.37 + 1) + (i % 3) - 1)),
);

const Meter = () => (
  <svg viewBox="0 0 96 18" className="vy-j-wave">
    <defs>
      <pattern id="j-led" width="2" height="2" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r="0.62" className="fill-(--art-led)" />
      </pattern>
    </defs>
    {[...BARS, ...BARS].map((h, i) => (
      <rect key={i} x={i * 2} y={18 - h * 2} width="2" height={h * 2} fill="url(#j-led)" />
    ))}
  </svg>
);

const KNOBS = ['VAR', 'MIX', 'KEEP'];

const Instrument = () => (
  <>
    <div className="vy-j-dots absolute inset-0" />
    <div className="absolute top-[11vh] left-[3vw] flex gap-[2.2vw] max-md:hidden">
      {KNOBS.map((label) => (
        <div key={label} className="vy-j-knob grid justify-items-center gap-2">
          <div className="vy-j-ring">
            <i className="vy-j-cap" />
          </div>
          <b>{label}</b>
        </div>
      ))}
    </div>
    <div className="vy-j-lcd absolute top-[46vh] right-[3vw] max-lg:hidden">
      <span>PRESET J · LEVEL</span>
      <div className="vy-j-window">
        <Meter />
      </div>
    </div>
  </>
);

export default Instrument;
