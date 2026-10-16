import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/site';

const sitemap = (): MetadataRoute.Sitemap => [
  { url: SITE_URL, changeFrequency: 'weekly', priority: 1 },
  { url: `${SITE_URL}/SKILLS.md`, changeFrequency: 'weekly', priority: 0.6 },
  { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
  { url: `${SITE_URL}/imprint`, changeFrequency: 'yearly', priority: 0.2 },
  { url: `${SITE_URL}/accessibility`, changeFrequency: 'yearly', priority: 0.2 },
];

export default sitemap;
