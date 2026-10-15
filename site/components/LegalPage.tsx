import type { ReactNode } from 'react';

import { Brand } from '@/components/Brand';
import { PrefsMenu } from '@/components/PrefsMenu';
import { SiteFooter } from '@/components/SiteFooter';
import { Typography } from '@/components/ui/Typography';

type LegalPageProps = {
  title: string;
  children: ReactNode;
};

/* A plain static page under the site's own header and footer. */
const LegalPage = ({ title, children }: LegalPageProps) => (
  <>
    <a
      href="#content"
      className="bg-ink text-surface fixed top-3 left-3 z-50 -translate-y-24 rounded-[4px] px-3.5 py-2.5 font-mono text-[13px] font-semibold no-underline focus:translate-y-0"
    >
      Skip to content
    </a>
    <header className="border-rule bg-panel/95 sticky top-0 z-20 border-b backdrop-blur-sm">
      <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
        <Brand />
        <PrefsMenu />
      </div>
    </header>
    <main
      id="content"
      tabIndex={-1}
      className="mx-auto grid max-w-[72ch] gap-6 px-4 py-16 outline-none sm:px-6"
    >
      <Typography variant="headline" as="h1">
        {title}
      </Typography>
      <div className="text-steel [&_h2]:text-ink grid gap-4 text-[16px] leading-relaxed [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold">
        {children}
      </div>
    </main>
    <SiteFooter />
  </>
);

export { LegalPage };
