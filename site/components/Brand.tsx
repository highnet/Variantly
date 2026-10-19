'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { BrandMark } from '@/components/BrandMark';

/* The wordmark, the same on every page and in the local app. The mark
   morphs into an agent node on the agent view (data-audience on the header).
   Already on the homepage, it glides back to the top instead of reloading;
   html's scroll-behavior keeps that instant under reduced motion. */
const Brand = () => {
  const pathname = usePathname();
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 no-underline"
      aria-label="variantly home"
      onClick={(e) => {
        if (pathname !== '/' || window.location.hash) return;
        e.preventDefault();
        window.scrollTo({ top: 0 });
      }}
    >
      <BrandMark className="size-7" />
      {/* A logotype (the link is labelled): it keeps its face under the
          readable font aid, and steps aside when the header is too narrow
          for it and the controls (a small phone with larger text). */}
      <span aria-hidden="true" className="figure text-base @max-[19.5rem]:hidden">
        variantly
      </span>
    </Link>
  );
};

export { Brand };
