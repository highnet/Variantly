import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/site';

const robots = (): MetadataRoute.Robots => ({
  // Demo variants are sample client sites embedded in the showcase, not pages to rank.
  rules: { userAgent: '*', allow: '/', disallow: '/demo/' },
  host: SITE_URL,
  sitemap: `${SITE_URL}/sitemap.xml`,
});

export default robots;
