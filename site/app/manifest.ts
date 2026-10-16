import type { MetadataRoute } from 'next';

const manifest = (): MetadataRoute.Manifest => ({
  name: 'variantly',
  short_name: 'variantly',
  description: 'AI website redesigns, side by side. Keep one.',
  start_url: '/',
  display: 'standalone',
  background_color: '#e6e8eb',
  theme_color: '#0d0d10',
  icons: [
    { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
    { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
  ],
});

export default manifest;
