import type { Metadata } from 'next';

import { Faq } from '@/components/Faq';
import { PageIntro } from '@/components/PageIntro';
import { SiteShell } from '@/components/SiteShell';
import { Trust } from '@/components/Trust';

export const metadata: Metadata = {
  title: 'Safety',
  description:
    'How variantly uses git worktrees, what happens to uncommitted changes, how a kept design is applied and how to roll it back.',
  alternates: { canonical: '/safety' },
};

const SafetyPage = () => (
  <SiteShell>
    <main className="mx-auto grid w-full max-w-[1440px] grid-cols-[minmax(0,1fr)] gap-24 px-4 pt-16 pb-16 sm:px-6">
      <PageIntro title="Safety">
        What happens to your repository, your uncommitted work and a design you keep, and how to
        undo it.
      </PageIntro>
      <Trust />
      <Faq />
    </main>
  </SiteShell>
);

export default SafetyPage;
