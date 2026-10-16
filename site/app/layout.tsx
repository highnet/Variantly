import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';

import { Toaster } from '@/components/Toaster';
import { PREFS_BOOT } from '@/lib/prefs';
import { REPO_URL, SITE_URL } from '@/lib/site';

import './globals.css';

const martian = localFont({
  src: './fonts/martian-mono.woff2',
  variable: '--font-martian',
  weight: '100 800',
  display: 'swap',
  declarations: [{ prop: 'font-stretch', value: '75% 112.5%' }],
});

const title = 'variantly — AI website redesigns, side by side. Keep one.';
const description =
  'Your own coding agent redesigns your site several times over with Impeccable. Every variant runs as your real site; flick between them with a before/after slider and keep one.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: title, template: '%s · variantly' },
  description,
  applicationName: 'variantly',
  keywords: [
    'AI website redesign',
    'website redesign tool',
    'design variants',
    'coding agent',
    'Claude Code',
    'Codex',
    'Copilot CLI',
    'Gemini CLI',
    'Cursor CLI',
    'OpenRouter',
    'Impeccable',
    'before/after slider',
    'frontend design',
    'npx variantly',
  ],
  authors: [{ name: 'variantly', url: REPO_URL }],
  creator: 'variantly',
  category: 'technology',
  icons: { icon: '/icon.svg' },
  openGraph: {
    title,
    description,
    url: '/',
    siteName: 'variantly',
    type: 'website',
    locale: 'en_US',
  },
  twitter: { card: 'summary_large_image', title, description },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  alternates: { canonical: '/', types: { 'text/markdown': '/SKILLS.md' } },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#e6e8eb' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1114' },
  ],
};

// Structured data so search engines can show variantly as a software result.
const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'variantly',
  description,
  url: SITE_URL,
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'macOS, Linux, Windows',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  sameAs: [REPO_URL],
};

type RootLayoutProps = {
  children: ReactNode;
};

const RootLayout = ({ children }: RootLayoutProps) => (
  <html lang="en" className={martian.variable} suppressHydrationWarning>
    <head>
      {/* Theme and reading aids before first paint, so nothing flashes. */}
      <script dangerouslySetInnerHTML={{ __html: PREFS_BOOT }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
    </head>
    <body>
      {children}
      <Toaster />
    </body>
  </html>
);

export default RootLayout;
