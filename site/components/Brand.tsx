import Link from 'next/link';

import { BrandMark } from '@/components/BrandMark';

/* The wordmark, the same on every page and in the local app. The mark
   morphs into an agent node on the agent view (data-audience on the header). */
const Brand = () => (
  <Link href="/" className="flex items-center gap-2.5 no-underline" aria-label="variantly home">
    <BrandMark className="size-7" />
    <span className="figure hidden text-base sm:inline">variantly</span>
  </Link>
);

export { Brand };
