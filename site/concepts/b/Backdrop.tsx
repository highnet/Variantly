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
    <Piece className="top-[6%] left-[-10%] size-[44vmax]" float={0}>
      <circle cx="50" cy="50" r="42" fill="url(#riso-dots-1)" />
      <circle cx="53" cy="47" r="42" className="fill-(--art-2)" fillOpacity="0.55" />
    </Piece>
    <Piece className="top-[-2%] right-[-8%] size-[30vmax]" float={1}>
      <rect x="10" y="14" width="74" height="60" className="fill-(--art-1)" fillOpacity="0.8" />
      <rect x="15" y="20" width="74" height="60" fill="url(#riso-dots-2)" />
    </Piece>
    <Piece className="top-[56%] left-[46%] size-[24vmax] max-sm:hidden" float={2}>
      <circle cx="46" cy="50" r="34" className="fill-(--art-2)" fillOpacity="0.7" />
      <circle cx="54" cy="50" r="34" fill="none" className="stroke-(--art-1)" strokeWidth="4" />
    </Piece>
    {/* paper fibres */}
    <div className="vy-art-fibre absolute inset-0" />
  </>
);

export default Riso;
