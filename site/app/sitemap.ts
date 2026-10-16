import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/site';

// Build time stands in for last-modified: the site is static and redeploys on change.
const lastModified = new Date();

const sitemap = (): MetadataRoute.Sitemap => [
  { url: SITE_URL, lastModified, changeFrequency: 'weekly', priority: 1 },
  { url: `${SITE_URL}/SKILLS.md`, lastModified, changeFrequency: 'weekly', priority: 0.6 },
  { url: `${SITE_URL}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.2 },
  { url: `${SITE_URL}/imprint`, lastModified, changeFrequency: 'yearly', priority: 0.2 },
  { url: `${SITE_URL}/accessibility`, lastModified, changeFrequency: 'yearly', priority: 0.2 },
];

export default sitemap;
