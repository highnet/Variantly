/*
 * Swatch: Orientation Reel's mascot, an Easter egg seen only in this concept.
 * A squat paint chip in 1930s rubber-hose style, toes in, head tilted, giving
 * a shy little wave. One shot: a moment after the concept appears he rises
 * onto the side card's edge with a small overshoot, tilts his head, waves,
 * blinks and blushes, then holds that pose (concept.css). Calm and reduced
 * motion show the final pose. Decorative only.
 *
 * The art is static SVG, drawn once and grouped by what moves; the outline
 * colour that has to read on both grounds is the theme's --sw-ink.
 */

// Inline SVG markup, authored as data (no user input reaches it).
const ART = {
  ground: '<ellipse cx="100" cy="197" rx="46" ry="5" fill="#000" opacity=".42"/>',
  legs: '<path d="M88 152C86 168 92 178 96 186" fill="none" stroke="var(--sw-ink)" stroke-width="11.6" stroke-linecap="round" stroke-linejoin="round"/> <path d="M88 152C86 168 92 178 96 186" fill="none" stroke="#141312" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/> <path d="M88 152C86 168 92 178 96 186" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity=".38" stroke-dasharray="0 3 999" transform="translate(-1.6 -1.2)"/> <path d="M112 152C114 168 108 178 104 186" fill="none" stroke="var(--sw-ink)" stroke-width="11.6" stroke-linecap="round" stroke-linejoin="round"/> <path d="M112 152C114 168 108 178 104 186" fill="none" stroke="#141312" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/> <path d="M112 152C114 168 108 178 104 186" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity=".38" stroke-dasharray="0 3 999" transform="translate(-1.6 -1.2)"/> <g transform="translate(92 192) rotate(14) scale(-0.95 0.95)"> <path d="M-9-2C-10-11-2-15 9-14C20-13 27-8 27-1C27 3 22 4 9 4C-3 4-9 3-9-2Z" fill="#141312" stroke="var(--sw-ink)" stroke-width="2"/> <path d="M-9-2C-9 1-6 3.4 9 3.6C22 3.6 26.6 2.8 26.8-0.6" fill="none" stroke="#ffffff" stroke-width="2.2" opacity=".9"/> <path d="M10-10.6C15-10.6 19.6-8.6 21.4-6" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" opacity=".85"/> </g> <g transform="translate(108 192) rotate(-14) scale(0.95 0.95)"> <path d="M-9-2C-10-11-2-15 9-14C20-13 27-8 27-1C27 3 22 4 9 4C-3 4-9 3-9-2Z" fill="#141312" stroke="var(--sw-ink)" stroke-width="2"/> <path d="M-9-2C-9 1-6 3.4 9 3.6C22 3.6 26.6 2.8 26.8-0.6" fill="none" stroke="#ffffff" stroke-width="2.2" opacity=".9"/> <path d="M10-10.6C15-10.6 19.6-8.6 21.4-6" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" opacity=".85"/> </g>',
  armL: '<path d="M50 116C40 126 44 140 58 142" fill="none" stroke="var(--sw-ink)" stroke-width="11.6" stroke-linecap="round" stroke-linejoin="round"/> <path d="M50 116C40 126 44 140 58 142" fill="none" stroke="#141312" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/> <path d="M50 116C40 126 44 140 58 142" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity=".38" stroke-dasharray="0 3 999" transform="translate(-1.6 -1.2)"/><g transform="translate(64 140) rotate(-60) scale(0.95 0.95)" fill="#ffffff" stroke="#141312" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"> <path d="M-11 6C-16 2-16-9-8-12.6C-3-14.6 8-14.6 12.6-10.6C17.4-6.8 16.8 3.6 11.6 7Z"/> <path d="M-14-1C-19.4-2-20.4 4.4-14.6 5.6"/> <path d="M-12 6H12.4L14.6 15.6H-14.2Z"/> <path d="M-13 10.6H13.4" fill="none" stroke-width="1.3" opacity=".6"/> </g>',
  armR: '<path d="M150 104C166 98 170 82 166 70" fill="none" stroke="var(--sw-ink)" stroke-width="11.6" stroke-linecap="round" stroke-linejoin="round"/> <path d="M150 104C166 98 170 82 166 70" fill="none" stroke="#141312" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/> <path d="M150 104C166 98 170 82 166 70" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity=".38" stroke-dasharray="0 3 999" transform="translate(-1.6 -1.2)"/><g transform="translate(166 62) rotate(20) scale(1 1)" fill="#ffffff" stroke="#141312" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"> <path d="M-11 6C-16 1-16-8-10.5-11.5C-9-18-2-18.6 0-14.2C1.4-20 8-20.4 9.6-15C13.6-17 17.6-13.6 15.6-8.4C19.6-4.6 17.8 3.8 11.6 7Z"/> <path d="M-14.4-2C-21-3.6-22.6 4-15.8 6"/> <path d="M0-14.2V-6.4M9.6-15 8.6-6.4" fill="none" stroke-width="1.3" opacity=".6"/> <path d="M-12 6H12.4L14.6 15.6H-14.2Z"/> <path d="M-13 10.6H13.4" fill="none" stroke-width="1.3" opacity=".6"/> </g>',
  body: '<g transform="rotate(0 100 154)"> <rect x="44" y="54" width="112" height="100" rx="26" fill="#e6e3de"/> <clipPath id="sw-chip"><rect x="44" y="54" width="112" height="100" rx="26"/></clipPath> <g clip-path="url(#sw-chip)"> <rect x="44" y="54" width="112" height="26" fill="#a9a49d"/> <path d="M44 80H156" stroke="#141312" stroke-width="1.6" opacity=".35"/> <path d="M147 54V154" stroke="#141312" stroke-width="16" opacity=".09"/> <path d="M54 90C53 124 56 136 62 142" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" opacity=".55"/> <path d="M58 62C74 58 94 58 108 60" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity=".45"/> <path d="M62 140H90M62 145H78" stroke="#141312" stroke-width="2.2" stroke-linecap="round" opacity=".28"/> </g> <rect x="44" y="54" width="112" height="100" rx="26" fill="none" stroke="#141312" stroke-width="4.2"/> </g>',
  eyes: '<ellipse cx="82" cy="98" rx="9" ry="13" fill="#141312"/> <path d="M83 95L89.92 88.64A9 13 0 0 0 84 85.4Z" fill="#ffffff"/> <ellipse cx="114" cy="98" rx="9" ry="13" fill="#141312"/> <path d="M115 95L121.92 88.64A9 13 0 0 0 116 85.4Z" fill="#ffffff"/>',
  brows:
    '<path d="M76 81Q84 73 92 75M108 75Q116 73 124 81" fill="none" stroke="#141312" stroke-width="3" stroke-linecap="round"/>',
  cheeks:
    '<ellipse cx="70" cy="116" rx="8" ry="4.6" fill="#b7b1aa" opacity=".9"/><ellipse cx="130" cy="116" rx="8" ry="4.6" fill="#b7b1aa" opacity=".9"/>',
  mouth:
    '<path d="M89 120Q100 132.8 111 120" fill="none" stroke="#141312" stroke-width="4" stroke-linecap="round"/> <path d="M86 117Q88 122 92 122M114 117Q112 122 108 122" fill="none" stroke="#141312" stroke-width="2.6" stroke-linecap="round"/>',
};

type LayerProps = {
  className?: string;
  svg: string;
};

const Layer = ({ className, svg }: LayerProps) => (
  <g className={className} dangerouslySetInnerHTML={{ __html: svg }} />
);

const Swatch = () => (
  <svg viewBox="0 0 200 200" className="n-swatch hidden" aria-hidden="true">
    <Layer className="sw-ground" svg={ART.ground} />
    <g className="sw-rise">
      <Layer svg={ART.legs} />
      <Layer svg={ART.armL} />
      <g className="sw-tilt">
        <Layer svg={ART.body} />
        <Layer className="sw-eyes" svg={ART.eyes} />
        <Layer svg={ART.brows} />
        <Layer className="sw-blush" svg={ART.cheeks} />
        <Layer svg={ART.mouth} />
      </g>
      <Layer className="sw-arm" svg={ART.armR} />
    </g>
  </svg>
);

export default Swatch;
