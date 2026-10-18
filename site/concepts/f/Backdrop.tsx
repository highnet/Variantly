import { Piece, FILLS } from '@/components/backdrop/artKit';

/* ---- F · Cut & Paste: torn scraps, tape, cut-outs with paper shadows ------ */
type ScrapProps = {
  d: string;
  colour: keyof typeof FILLS;
};

const Scrap = ({ d, colour }: ScrapProps) => (
  <>
    <path d={d} transform="translate(2.5 3.5)" className="fill-(--art-shadow)" fillOpacity="0.22" />
    <path d={d} className={FILLS[colour]} />
  </>
);

const Paste = () => (
  <>
    {/* Desktop: the scraps frame the title from the sides, the ring sits in
        the gap under it. Phones: a small row in the band between the title
        card and the headline. Never behind either. */}
    <Piece
      className="top-[12%] left-[-30%] size-[38vmax] max-sm:top-[23%] max-sm:left-[2%] max-sm:size-[10vmax]"
      float={0}
    >
      <g transform="rotate(-7 50 50)">
        <Scrap
          d="M8,14 L22,10 L34,13 L48,9 L62,12 L78,8 L92,12 L90,30 L94,48 L89,66 L93,86 L74,90 L58,87 L40,92 L24,88 L10,90 L12,70 L7,50 L11,32Z"
          colour="--art-1"
        />
        <rect
          x="34"
          y="2"
          width="30"
          height="10"
          transform="rotate(-4 49 7)"
          className="fill-(--art-tape)"
          fillOpacity="0.6"
        />
      </g>
    </Piece>
    <Piece
      className="top-[0%] right-[-20%] size-[30vmax] max-sm:top-[22.5%] max-sm:right-[2%] max-sm:size-[10vmax]"
      float={1}
    >
      <g transform="rotate(9 50 50)">
        <Scrap
          d="M50,6 L61,38 L95,38 L67,58 L78,92 L50,72 L22,92 L33,58 L5,38 L39,38Z"
          colour="--art-2"
        />
      </g>
    </Piece>
    <Piece
      className="top-[50%] left-[40%] size-[18vmax] max-sm:top-[24%] max-sm:left-[42%] max-sm:size-[8vmax]"
      float={2}
    >
      <g transform="rotate(-12 50 50)">
        <Scrap d="M50,10 A40,40 0 1 1 49.9,10Z M50,34 A16,16 0 1 0 50.1,34Z" colour="--art-3" />
        <rect
          x="6"
          y="44"
          width="34"
          height="9"
          transform="rotate(28 23 48)"
          className="fill-(--art-tape)"
          fillOpacity="0.6"
        />
      </g>
    </Piece>
  </>
);

export default Paste;
