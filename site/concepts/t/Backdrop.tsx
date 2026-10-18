/* t · Stone & Linen: linen (the page ground in concept.css), sunlight through
   a sheer linen curtain (soft vertical folds, no window bars) drifting across
   it as the sun moves, and one pebble at rest. Nothing else moves (24s,
   transform only). */

const Linen = () => (
  <>
    <div className="vy-t-window absolute top-[2%] left-[-6%] h-[72vh] w-[46vw] max-sm:top-[14%] max-sm:h-[46vh] max-sm:w-[88vw]" />
    <div className="vy-t-pebble absolute top-[47%] right-[12%] h-[4.6vmax] w-[6.6vmax] rotate-[-8deg] max-sm:top-[59%] max-sm:right-[16%]" />
  </>
);

export default Linen;
