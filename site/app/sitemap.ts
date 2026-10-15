import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/site';

const sitemap = (): MetadataRoute.Sitemap => [
  { url: SITE_URL, changeFrequency: 'weekly', priority: 1 },
  { url: `${SITE_URL}/SKILLS.md`, changeFrequency: 'weekly', priority: 0.6 },
];

export default sitemap;
