import Link from 'next/link';

import { Credits } from '@/components/Faq';
import { HashRedirect } from '@/components/HashRedirect';
import { HowItWorks } from '@/components/HowItWorks';
import { Showcase } from '@/components/Showcase';
import { SiteShell } from '@/components/SiteShell';
import { buttonVariants } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';

/*
 * Agents read a page top-down, so the first words on the human view send
 * them to the quickstart written for them. Visually hidden (sr-only): it
 * stays in the HTML and text extraction agents read, but humans never see it.
 */
const AgentStrip = () => (
  <a href="/agents" className="sr-only">
    <span>AI agent or assistant?</span> Stop here and open the quickstart written for you:
    variantly.style/agents. Every command and flag: variantly.style/docs. The full manual is at
    /SKILLS.md.
  </a>
);

/* Where to go after the demo: set it up, or check what it does first. */
const NextSteps = () => (
  <section aria-labelledby="next-title" className="grid gap-6">
    <Typography variant="headline" as="h2" id="next-title">
      Try it on your site
    </Typography>
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <Link href="/start" className={buttonVariants({ variant: 'primary', size: 'big' })}>
        Get started
      </Link>
      <Link href="/start#try" className="text-ink font-semibold underline underline-offset-2">
        Try a run with no AI first
      </Link>
      <Link href="/safety" className="text-ink font-semibold underline underline-offset-2">
        What it does to your repo
      </Link>
    </div>
  </section>
);

const Page = () => (
  <SiteShell>
    <HashRedirect />
    <main>
      <AgentStrip />
      <Showcase />
      <div className="mx-auto grid w-full max-w-[1440px] grid-cols-[minmax(0,1fr)] gap-24 px-4 pt-16 pb-16 sm:px-6">
        <HowItWorks />
        <NextSteps />
        <Credits />
      </div>
    </main>
  </SiteShell>
);

export default Page;
