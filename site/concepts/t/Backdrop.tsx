/* t · Stone & Linen: linen (the page ground in concept.css), the light of a
   four-pane window drifting across it as the sun moves, and one pebble at
   rest. Nothing else moves (24s, transform only). */
const PANES = [0, 1, 2, 3];

const Linen = () => (
  <>
    <div className="vy-t-window absolute top-[6%] left-[-8%] h-[64vh] w-[52vw] max-sm:top-[18%] max-sm:h-[44vh] max-sm:w-[90vw]">
      {PANES.map((p) => (
        <i key={p} />
      ))}
    </div>
    <div className="vy-t-pebble absolute top-[47%] right-[12%] h-[4.6vmax] w-[6.6vmax] rotate-[-8deg] max-sm:top-[59%] max-sm:right-[16%]" />
  </>
);

export default Linen;
