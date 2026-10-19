import type { Metadata } from 'next';

import { DemoSteps } from '@/components/DemoVideo';
import { PageIntro } from '@/components/PageIntro';
import { SiteShell } from '@/components/SiteShell';
import { Stacks } from '@/components/Stacks';
import { StartChecklist } from '@/components/StartChecklist';
import { WithLive } from '@/components/WithLive';

export const metadata: Metadata = {
  title: 'Get started',
  description: 'What you need, the one command to run, and a full demo run that needs no AI.',
  alternates: { canonical: '/start' },
};

const StartPage = () => (
  <SiteShell>
    <main className="mx-auto grid w-full max-w-[1440px] grid-cols-[minmax(0,1fr)] gap-24 px-4 pt-16 pb-16 sm:px-6">
      <PageIntro title="Get started">
        Run <code className="text-ink font-mono">npx variantly</code> in your site&apos;s folder.
        Check the four things it needs below, or try a whole run first with the demo agent: no AI,
        no account.
      </PageIntro>
      <StartChecklist />
      <DemoSteps />
      <Stacks />
      <WithLive />
    </main>
  </SiteShell>
);

export default StartPage;
