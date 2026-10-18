import { Piece } from '@/components/backdrop/artKit';

/* ---- B · Riso Poster: two inks, halftone, misregistered overprint -------- */
const Riso = () => (
  <>
    <svg width="0" height="0" className="absolute">
      <defs>
        <pattern id="riso-dots-1" width="4" height="4" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.25" className="fill-(--art-1)" />
        </pattern>
        <pattern
          id="riso-dots-2"
          width="3.4"
          height="3.4"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(30)"
        >
          <circle cx="1.7" cy="1.7" r="1" className="fill-(--art-2)" />
        </pattern>
      </defs>
    </svg>
    {/* Desktop: the inks frame the title from the sides and sit low between
        the headline and the prompt card. Phones: a small row in the band
        between the title card and the headline. Never behind either. */}
    <Piece
      className="top-[14%] left-[-32%] size-[40vmax] max-sm:top-[23%] max-sm:left-[2%] max-sm:size-[10vmax]"
      float={0}
    >
      <circle cx="50" cy="50" r="42" fill="url(#riso-dots-1)" />
      <circle cx="53" cy="47" r="42" className="fill-(--art-2)" fillOpacity="0.55" />
    </Piece>
    <Piece
      className="top-[-2%] right-[-16%] size-[30vmax] max-sm:top-[22.5%] max-sm:right-[2%] max-sm:size-[10vmax]"
      float={1}
    >
      <rect x="10" y="14" width="74" height="60" className="fill-(--art-1)" fillOpacity="0.8" />
      <rect x="15" y="20" width="74" height="60" fill="url(#riso-dots-2)" />
    </Piece>
    <Piece
      className="top-[50%] left-[44%] size-[18vmax] max-sm:top-[24%] max-sm:left-[26%] max-sm:size-[7vmax]"
      float={2}
    >
      <circle cx="46" cy="50" r="34" className="fill-(--art-2)" fillOpacity="0.7" />
      <circle cx="54" cy="50" r="34" fill="none" className="stroke-(--art-1)" strokeWidth="4" />
    </Piece>
    {/* paper fibres */}
    <div className="vy-art-fibre absolute inset-0" />
  </>
);

export default Riso;
