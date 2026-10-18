import { Piece } from '@/components/backdrop/artKit';

/* ---- E · Bauhaus: flat primaries on a grid --------------------------------- */
const Bauhaus = () => (
  <>
    <div className="vy-art-grid absolute inset-0" />
    {/* Desktop: the primaries frame the title from the sides, one sits in the
        gap under it. Phones: a small row in the band between the title card
        and the headline. Never behind either. */}
    <Piece
      className="top-[12%] left-[-26%] size-[34vmax] max-sm:top-[23%] max-sm:left-[2%] max-sm:size-[10vmax]"
      float={0}
    >
      <circle cx="50" cy="50" r="44" className="fill-(--art-1)" />
    </Piece>
    <Piece
      className="top-[4%] right-[-12%] size-[24vmax] max-sm:top-[23%] max-sm:right-[2%] max-sm:size-[10vmax]"
      float={1}
    >
      <path d="M0,100 A100,100 0 0 1 100,0 L100,100Z" className="fill-(--art-2)" />
      <path d="M50,100 A50,50 0 0 1 100,50 L100,100Z" className="fill-(--art-3)" />
    </Piece>
    <Piece
      className="top-[48%] left-[30%] size-[14vmax] max-sm:top-[23%] max-sm:left-[40%] max-sm:size-[9vmax]"
      float={2}
    >
      <rect x="0" y="40" width="100" height="14" className="fill-(--art-ink)" />
      <rect x="20" y="0" width="14" height="100" className="fill-(--art-3)" />
      <path d="M60,60 A40,40 0 0 1 100,100 L60,100Z" className="fill-(--art-1)" />
    </Piece>
  </>
);

export default Bauhaus;
