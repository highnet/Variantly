import Link from 'next/link';

import { AgentQuickstart } from '@/components/AgentQuickstart';
import { AudienceFork } from '@/components/AudienceFork';
import { BrandMark } from '@/components/BrandMark';
import { FinePrint } from '@/components/FinePrint';
import { HowItWorks } from '@/components/HowItWorks';
import { Showcase } from '@/components/Showcase';
import { Stacks } from '@/components/Stacks';
import { WithLive } from '@/components/WithLive';
import { StartChecklist } from '@/components/StartChecklist';
import { REPO_URL } from '@/lib/site';

const Brand = () => (
  <Link href="/" className="flex items-center gap-2.5 no-underline" aria-label="variantly home">
    <BrandMark className="size-7" />
    <span className="figure hidden text-base sm:inline">variantly</span>
  </Link>
);

const GitHubLink = () => (
  <a
    href={REPO_URL}
    className="text-steel condensed hover:text-ink hidden font-mono text-[11px] font-semibold tracking-[0.08em] uppercase no-underline sm:inline"
  >
    GitHub
  </a>
);

const Human = () => (
  <main>
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
  <AudienceFork
    brand={<Brand />}
    aside={<GitHubLink />}
    human={<Human />}
    agent={<AgentQuickstart />}
  />
);

export default Page;
