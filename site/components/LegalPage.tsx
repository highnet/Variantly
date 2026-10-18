import type { ReactNode } from 'react';

import { SiteShell } from '@/components/SiteShell';
import { Typography } from '@/components/ui/Typography';

type LegalPageProps = {
  title: string;
  children: ReactNode;
};

/* A plain static page under the site's own header and footer. */
const LegalPage = ({ title, children }: LegalPageProps) => (
  <SiteShell plain>
    <main className="mx-auto grid w-full max-w-[72ch] gap-6 px-4 py-16 sm:px-6">
      <Typography variant="headline" as="h1">
        {title}
      </Typography>
      <div className="text-steel [&_h2]:text-ink grid gap-4 text-[16px] leading-relaxed [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold">
        {children}
      </div>
    </main>
  </SiteShell>
);

export { LegalPage };
