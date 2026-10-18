import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import type { NextConfig } from 'next';

// The CLI's version and the commit this build came from, for the footer.
const version = JSON.parse(readFileSync('../package.json', 'utf8')).version as string;
const sha = (() => {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA;
  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
  } catch {
    return 'dev';
  }
})()
  .trim()
  .slice(0, 7);

// The day that commit was made (YYYY-MM-DD), else the day of the build.
const builtOn =
  (() => {
    try {
      return execSync('git log -1 --format=%cs', { stdio: ['ignore', 'pipe', 'ignore'] })
        .toString()
        .trim();
    } catch {
      return '';
    }
  })() || new Date().toISOString().slice(0, 10);

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_VERSION: version, NEXT_PUBLIC_BUILD: sha, NEXT_PUBLIC_BUILD_DATE: builtOn },
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
