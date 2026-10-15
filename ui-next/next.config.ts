import type { NextConfig } from 'next';

// Built once, served by variantly's own server: no Next.js at runtime.
const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/__variantly',
  images: { unoptimized: true },
  turbopack: { root: process.cwd() },
};

export default nextConfig;
