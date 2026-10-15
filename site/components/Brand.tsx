import Link from 'next/link';

/* The wordmark, the same on every page and in the local app. */
const Brand = () => (
  <Link href="/" className="flex items-center gap-2.5 no-underline" aria-label="variantly home">
    <svg viewBox="0 0 24 24" className="fill-ink size-5" aria-hidden="true">
      <rect x="3" y="4" width="4" height="16" />
      <rect x="9" y="4" width="2" height="16" />
      <rect x="13" y="4" width="4" height="16" />
      <rect x="19" y="4" width="2" height="16" />
    </svg>
    <span className="figure hidden text-base sm:inline">variantly</span>
  </Link>
);

export { Brand };
