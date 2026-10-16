import { AgentQuickstart } from '@/components/AgentQuickstart';
import { AudienceFork } from '@/components/AudienceFork';
import { FinePrint } from '@/components/FinePrint';
import { HowItWorks } from '@/components/HowItWorks';
import { PrefsMenu } from '@/components/PrefsMenu';
import { Brand } from '@/components/Brand';
import { SiteFooter } from '@/components/SiteFooter';
import { Showcase } from '@/components/Showcase';
import { Stacks } from '@/components/Stacks';
import { WithLive } from '@/components/WithLive';
import { StartChecklist } from '@/components/StartChecklist';
import { siGithub } from 'simple-icons';

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
 * them to the quickstart written for them.
 */
const AgentStrip = () => (
  <a
    href="#agent"
    className="bg-ink text-surface hover:bg-slate block px-4 py-2.5 text-center font-mono text-[12px] font-semibold no-underline sm:px-6"
  >
    <span className="text-alert">AI agent or assistant?</span> Stop here and open the quickstart
    written for you: variantly.style/#agent. The full manual is at /SKILLS.md.
  </a>
);

const Human = () => (
  <main>
    <AgentStrip />
    <Showcase />
    <div className="mx-auto grid max-w-[1440px] grid-cols-[minmax(0,1fr)] gap-24 px-4 pt-20 pb-16 sm:px-6">
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
  </>
);

export default Page;
