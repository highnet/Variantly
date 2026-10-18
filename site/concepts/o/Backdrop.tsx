/*
 * o · Swiss Punk: the structure on show. A hairline 12-column grid, oxblood
 * bars that cut across it and slide by whole columns, and an enormous
 * cropped "06" (six variants) that jumps between grid positions.
 */
const SwissPunk = () => (
  <>
    <div className="vy-o-grid absolute inset-0" />
    <div className="vy-o-num absolute">06</div>
    <i className="vy-o-bar vy-o-bar-a" />
    <i className="vy-o-bar vy-o-bar-b" />
    <i className="vy-o-bar vy-o-bar-c" />
  </>
);

export default SwissPunk;
