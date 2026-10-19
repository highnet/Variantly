import type { Metadata } from 'next';
import Link from 'next/link';

import { CommandCopy } from '@/components/CommandCopy';
import { HowItWorks } from '@/components/HowItWorks';
import { PageIntro } from '@/components/PageIntro';
import { SiteShell } from '@/components/SiteShell';
import { Tour } from '@/components/Tour';
import { Typography } from '@/components/ui/Typography';

export const metadata: Metadata = {
  title: 'How it works',
  description:
    'One real variantly run, screen by screen: from the wizard to the board, comparing designs on the live site and keeping one.',
  alternates: { canonical: '/how-it-works' },
};

const HowItWorksPage = () => (
  <SiteShell>
    <main className="mx-auto grid w-full max-w-[1440px] grid-cols-[minmax(0,1fr)] gap-24 px-4 pt-16 pb-16 sm:px-6">
      <div className="grid gap-6">
        <PageIntro title="How it works">
          One real run, screen by screen: variantly making four designs for Northgate Cycles, a
          made-up bike shop. The screens follow your theme, light or dark.
        </PageIntro>
        <p className="text-steel m-0 max-w-[68ch] text-[15px] leading-relaxed">
          These were taken with the demo agent, which applies fixed restyles so you can try the
          whole flow for free. With your own AI assistant, each design is a full redesign by{' '}
          <a
            href="https://impeccable.style"
            className="text-ink underline underline-offset-4"
            rel="noopener"
          >
            Impeccable
          </a>{' '}
          (variantly installs it if it&apos;s missing): see real ones in the{' '}
          <Link href="/" className="text-ink underline underline-offset-4">
            demo
          </Link>
          .
        </p>
      </div>
      <HowItWorks />
      <Tour />
      <section aria-labelledby="try-title" className="border-ink grid gap-5 border-t-2 pt-6">
        <Typography variant="headline" as="h2" id="try-title">
          Try the same run
        </Typography>
        <p className="text-steel m-0 max-w-[60ch] text-[17px] leading-relaxed">
          Run it in your site&apos;s folder. Add <code className="text-ink font-mono">--demo</code>{' '}
          to try it with no AI first. Need git or Node.js?{' '}
          <Link href="/start" className="text-ink underline underline-offset-4">
            Get started
          </Link>{' '}
          lists all four things it needs.
        </p>
        <CommandCopy
          command="npx variantly"
          accent
          className="w-fit max-w-full min-w-[min(18rem,100%)]"
        />
      </section>
    </main>
  </SiteShell>
);

export default HowItWorksPage;
