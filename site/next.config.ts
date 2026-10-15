import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    // site/ is its own app inside the CLI's repository; don't climb to the root lockfile.
    root: process.cwd(),
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  // Agents guess lowercase; serve them the manual either way.
  rewrites: async () => [{ source: '/skills.md', destination: '/SKILLS.md' }],
};

export default nextConfig;
