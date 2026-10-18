import type { ReactNode } from 'react';
import { siGithub } from 'simple-icons';

import { BackdropPoster } from '@/components/backdrop/BackdropPoster';
import { Brand } from '@/components/Brand';
import { HumanChrome } from '@/components/HumanChrome';
import { PrefsMenu } from '@/components/PrefsMenu';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteNav } from '@/components/SiteNav';
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

type SiteShellProps = {
  children: ReactNode;
  /** The plain agent document: no backdrop art, concept dock or motion. */
  plain?: boolean;
};

/* Header, page and footer, shared by every section of the site. */
const SiteShell = ({ children, plain }: SiteShellProps) => (
  <>
    {/* The concept's background art paints with the first frame, under the title. */}
    {!plain && <BackdropPoster />}
    {!plain && <HumanChrome />}
    <a
      href="#content"
      className="bg-ink text-surface fixed top-3 left-3 z-50 -translate-y-24 rounded-[4px] px-3.5 py-2.5 font-mono text-[13px] font-semibold no-underline focus:translate-y-0"
    >
      Skip to content
    </a>
    <SiteNav
      brand={<Brand />}
      aside={
        <div className="flex items-center gap-1 sm:gap-3">
          <PrefsMenu />
          <GitHubLink />
        </div>
      }
    />
    <div id="content" tabIndex={-1} className="flex flex-1 flex-col outline-none">
      {children}
    </div>
    <SiteFooter />
  </>
);

export { SiteShell };
