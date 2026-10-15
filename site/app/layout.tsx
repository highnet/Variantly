import type { Metadata } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';

import { Toaster } from '@/components/Toaster';
import { PREFS_BOOT } from '@/lib/prefs';
import { SITE_URL } from '@/lib/site';

import './globals.css';

const martian = localFont({
  src: './fonts/martian-mono.woff2',
  variable: '--font-martian',
  weight: '100 800',
  display: 'swap',
  declarations: [{ prop: 'font-stretch', value: '75% 112.5%' }],
});

const title = 'variantly — N redesigns of your site, side by side. Keep one.';
const description =
  'Your own coding agent redesigns your site several times over with Impeccable. Every variant runs as your real site; flick between them with a before/after slider and keep one.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: title, template: '%s · variantly' },
  description,
  icons: { icon: '/icon.svg' },
  openGraph: { title, description, url: SITE_URL, siteName: 'variantly', type: 'website' },
  twitter: { card: 'summary_large_image', title, description },
  alternates: { types: { 'text/markdown': '/SKILLS.md' } },
};

type RootLayoutProps = {
  children: ReactNode;
};

const RootLayout = ({ children }: RootLayoutProps) => (
  <html lang="en" className={martian.variable} suppressHydrationWarning>
    <head>
      {/* Theme and reading aids before first paint, so nothing flashes. */}
      <script dangerouslySetInnerHTML={{ __html: PREFS_BOOT }} />
    </head>
    <body>
      {children}
      <Toaster />
    </body>
  </html>
);

export default RootLayout;
