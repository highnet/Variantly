import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './variantly.css';

export const metadata: Metadata = {
  title: 'variantly',
  icons: { icon: '/__variantly/icon.svg' },
};

type RootLayoutProps = {
  children: ReactNode;
};

const RootLayout = ({ children }: RootLayoutProps) => (
  <html lang="en">
    <body>{children}</body>
  </html>
);

export default RootLayout;
