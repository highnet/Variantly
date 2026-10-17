import { AgentQuickstart } from '@/components/AgentQuickstart';
import { AudienceFork } from '@/components/AudienceFork';
import { FinePrint } from '@/components/FinePrint';
import { DemoVideo } from '@/components/DemoVideo';
import { HowItWorks } from '@/components/HowItWorks';
import { PrefsMenu } from '@/components/PrefsMenu';
import { Brand } from '@/components/Brand';
import { SiteFooter } from '@/components/SiteFooter';
import { Showcase } from '@/components/Showcase';
import { Stacks } from '@/components/Stacks';
import { WithLive } from '@/components/WithLive';
import { StartChecklist } from '@/components/StartChecklist';
import { siGithub } from 'simple-icons';
import { Backdrop } from '@/components/backdrop/Backdrop';
import { ScrollReveal } from '@/components/ScrollReveal';
import { VariantSwitcher } from '@/components/VariantSwitcher';

import { REPO_URL } from '@/lib/site';

const GitHubLink = () => (
  <a
    href={REPO_URL}
    aria-label="variantly on GitHub"
    title="GitHub"
    className="text-steel hover:text-ink grid size-9 place-items-center rounded-md transition-colors"
  >
    <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden="true">
      <path d={siGithub.path} />
    </svg>
  </a>
);

/*
 * Agents read a page top-down, so the first words on the human view send
 * them to the quickstart written for them. Visually hidden (sr-only): it
 * stays in the HTML and text extraction agents read, but humans never see it.
 */
const AgentStrip = () => (
  <a href="#agent" className="sr-only">
    <span>AI agent or assistant?</span> Stop here and open the quickstart written for you:
    variantly.style/#agent. Every command and flag: variantly.style/#docs. The full manual is at
    /SKILLS.md.
  </a>
);

const Human = () => (
  <main>
    <AgentStrip />
    <Showcase />
    <div className="mx-auto grid max-w-[1440px] grid-cols-[minmax(0,1fr)] gap-24 px-4 pt-20 pb-16 sm:px-6">
      <DemoVideo />
      <HowItWorks />
      <StartChecklist />
      <WithLive />
      <Stacks />
      <FinePrint />
    </div>
  </main>
);

const Page = () => (
  <>
    <Backdrop />
    <AudienceFork
      brand={<Brand />}
      aside={
        <div className="flex items-center gap-3">
          <PrefsMenu />
          <GitHubLink />
        </div>
      }
      human={<Human />}
      agent={<AgentQuickstart />}
    />
    <SiteFooter />
    <VariantSwitcher />
    <ScrollReveal />
  </>
);

export default Page;
