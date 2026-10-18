'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Links from before the site had pages: the old in-page anchors.
const MOVED: Record<string, string> = {
  '#agent': '/agents',
  '#docs': '/docs',
  '#start': '/start',
  '#try': '/start#try',
  '#trust': '/safety',
  '#faq-title': '/safety#faq-title',
};

/* Sends an old `/#section` link to the page that section now lives on. */
const HashRedirect = () => {
  const router = useRouter();
  useEffect(() => {
    const to = MOVED[window.location.hash];
    if (to) router.replace(to);
  }, [router]);
  return null;
};

export { HashRedirect };
