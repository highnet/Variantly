/*
 * m · Uncanny Mirror. Sky over a hue-shifted mirror floor, a plaster moon
 * sliding along the horizon and a tiny doorway. One rule breaks: the floor's
 * reflections lie. The moon's reflection is a violet crescent a beat behind
 * it, and the doorway opens onto a different variant in each world.
 */
const Moon = () => (
  <svg viewBox="0 0 100 100" className="size-full">
    <defs>
      <radialGradient id="lm-moon" cx="38%" cy="34%" r="70%">
        <stop offset="0" className="[stop-color:var(--art-moon)]" />
        <stop offset="0.7" className="[stop-color:var(--art-moon)]" />
        <stop offset="1" className="[stop-color:var(--art-moon-shade)]" />
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="48" fill="url(#lm-moon)" />
    <circle cx="36" cy="58" r="7" className="fill-(--art-moon-shade)" fillOpacity="0.35" />
    <circle cx="62" cy="34" r="4" className="fill-(--art-moon-shade)" fillOpacity="0.3" />
    <circle cx="66" cy="66" r="3" className="fill-(--art-moon-shade)" fillOpacity="0.3" />
  </svg>
);

// The lie: a crescent in another variant's violet.
const Crescent = () => (
  <svg viewBox="0 0 100 100" className="size-full">
    <path
      d="M50 2 A48 48 0 1 0 50 98 A36 48 0 1 1 50 2Z"
      className="fill-(--art-3)"
      fillOpacity="0.55"
    />
  </svg>
);

type DoorProps = {
  id: string;
  glow: string;
  ink: string;
};

// A plaster wall with a doorway onto another variant's world: its own sky
// colour, horizon and sun, and the door leaf standing ajar.
const Door = ({ id, glow, ink }: DoorProps) => (
  <svg viewBox="0 0 100 100" className="size-full">
    <defs>
      <linearGradient id={`lm-door-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" className={glow} stopOpacity="0.6" />
        <stop offset="0.7" className={glow} />
      </linearGradient>
    </defs>
    <rect
      x="6"
      y="18"
      width="88"
      height="82"
      className="fill-(--art-plaster) stroke-(--art-2)"
      strokeWidth="0.8"
    />
    <rect x="38" y="40" width="26" height="60" fill={`url(#lm-door-${id})`} />
    <circle cx="54" cy="62" r="4" className={ink} fillOpacity="0.45" />
    <rect x="38" y="80" width="26" height="20" className={ink} fillOpacity="0.3" />
    <path
      d="M38 40 L28 44 V100 L38 100Z"
      className="fill-(--art-plaster) stroke-(--art-2)"
      strokeWidth="0.8"
    />
  </svg>
);

const UncannyMirror = () => (
  <>
    <div className="vy-lm-room absolute inset-0" />
    <div className="vy-lm-line absolute inset-x-0" />
    {/* the moon sits on the horizon; its reflection hangs below, late and wrong */}
    <div className="vy-lm-slide absolute top-[calc(var(--lm-h)-10vmax)] left-[24%] size-[12vmax]">
      <Moon />
    </div>
    <div className="vy-lm-slide vy-lm-late absolute top-[calc(var(--lm-h)+2vmax)] left-[24%] size-[12vmax] -scale-y-100 opacity-70">
      <Crescent />
    </div>
    {/* a tiny doorway on the horizon, opening onto other variants */}
    <div className="absolute top-[calc(var(--lm-h)-7vmax)] right-[28%] size-[7vmax]">
      <Door id="up" glow="[stop-color:var(--art-lie)]" ink="fill-(--art-moon)" />
    </div>
    <div className="absolute top-[var(--lm-h)] right-[28%] size-[7vmax] -scale-y-100 opacity-50">
      <Door id="down" glow="[stop-color:var(--art-lie-2)]" ink="fill-(--art-ink)" />
    </div>
  </>
);

export default UncannyMirror;
