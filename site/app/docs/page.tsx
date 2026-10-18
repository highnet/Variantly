import type { Metadata } from 'next';

import { QuickDocs } from '@/components/QuickDocs';
import { SiteShell } from '@/components/SiteShell';

export const metadata: Metadata = {
  title: 'Docs',
  description: 'Every variantly command and flag on one page.',
  alternates: { canonical: '/docs' },
};

const DocsPage = () => (
  <SiteShell>
    <main className="mx-auto grid w-full max-w-[1440px] grid-cols-[minmax(0,1fr)] gap-24 px-4 pt-16 pb-16 sm:px-6">
      <QuickDocs heading="h1" />
    </main>
  </SiteShell>
);

export default DocsPage;
