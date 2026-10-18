/* ---- C · Amber Terminal: scanlines, grid, radar sweep ------------------- */
const Terminal = () => (
  <>
    <div className="vy-art-crt absolute inset-0" />
    <div className="vy-art-radar absolute top-[-14vmax] right-[-18vmax] size-[56vmax] rounded-full max-sm:right-[-30vmax]">
      <div className="vy-art-sweep absolute inset-0 rounded-full" />
    </div>
    <div className="vy-art-scan absolute inset-0" />
  </>
);

export default Terminal;
