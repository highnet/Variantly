/* ---- N · Noir Velvet: one spotlight on a velvet wall, blind shadows -------
 * A velvet wall in soft folds, one hard spotlight pool where the title sits,
 * venetian-blind bars sweeping through the light (only the lit area shows
 * them: a vignette of darkness closes over everything else), and a film-grain
 * tile baked once from a fixed seed. */

// Park-Miller, so the grain is the same plate on every load.
const seeded = (s: number) => () => (s = (s * 16807) % 2147483647) / 2147483647;

const GRAIN = (() => {
  const r = seeded(23);
  return Array.from({ length: 420 }, () => {
    const x = Math.floor(r() * 96);
    const y = Math.floor(r() * 96);
    return `M${x} ${y}h1v1h-1z`;
  }).join('');
})();
const GRAIN_LIGHT = (() => {
  const r = seeded(71);
  return Array.from(
    { length: 300 },
    () => `M${Math.floor(r() * 96)} ${Math.floor(r() * 96)}h1v1h-1z`,
  ).join('');
})();

const Noir = () => (
  <>
    <div className="n-wall absolute inset-0" />
    <div className="n-pool absolute inset-0" />
    <div className="n-blinds absolute">
      <div className="n-bars absolute inset-0" />
    </div>
    <div className="n-dark absolute inset-0" />
    <div className="n-grain absolute">
      <svg className="size-full">
        <defs>
          <pattern id="n-grain" width="96" height="96" patternUnits="userSpaceOnUse">
            <path d={GRAIN} className="fill-(--art-ink)" fillOpacity="0.22" />
            <path d={GRAIN_LIGHT} className="fill-(--art-hi)" fillOpacity="0.18" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#n-grain)" />
      </svg>
    </div>
  </>
);

export default Noir;
