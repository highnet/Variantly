import { Piece } from '@/components/backdrop/artKit';

/* s · Lived-in Den: placeholder composition (three drifting shapes). */
const Placeholder = () => (
  <>
    <Piece className="top-[10%] left-[-8%] size-[40vmax]" float={0}>
      <circle cx="50" cy="50" r="42" className="fill-(--art-1)" fillOpacity="0.55" />
    </Piece>
    <Piece className="top-[-4%] right-[-8%] size-[30vmax]" float={1}>
      <rect x="12" y="12" width="76" height="76" className="fill-(--art-2)" fillOpacity="0.5" />
    </Piece>
    <Piece className="top-[56%] left-[46%] size-[24vmax] max-sm:hidden" float={2}>
      <path d="M50,8 L94,90 L6,90Z" className="fill-(--art-3)" fillOpacity="0.5" />
    </Piece>
  </>
);

export default Placeholder;
