import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';

import { StoreHydrator } from '@/components/StoreHydrator';
import { Toaster } from '@/components/Toaster';
import { HERO_FONT_VARS } from '@/lib/introFonts';
import { cn } from '@/lib/utils';
import { VARIANT_BOOT } from '@/lib/variantBoot';
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

// The agent page is a plain document: flag it before paint so no styling flashes.
const AUDIENCE_BOOT = `document.documentElement.dataset.audience=location.pathname==='/agents'||location.hash==='#agent'?'agent':'human'`;

type RootLayoutProps = {
  children: ReactNode;
};

const RootLayout = ({ children }: RootLayoutProps) => (
  <html lang="en" className={cn(martian.variable, HERO_FONT_VARS)} suppressHydrationWarning>
    <head>
      {/* Theme and reading aids before first paint, so nothing flashes. */}
      <script dangerouslySetInnerHTML={{ __html: PREFS_BOOT }} />
      <script dangerouslySetInnerHTML={{ __html: VARIANT_BOOT }} />
      <script dangerouslySetInnerHTML={{ __html: AUDIENCE_BOOT }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
    </head>
    <body>
      {children}
      <Toaster />
      <StoreHydrator />
    </body>
  </html>
);

export default RootLayout;
