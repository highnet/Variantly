import type { ReactNode } from 'react';

import { Typography } from '@/components/ui/Typography';

type PageIntroProps = {
  title: string;
  children: ReactNode;
};

/* The h1 and one paragraph at the top of each section page. */
const PageIntro = ({ title, children }: PageIntroProps) => (
  <div className="grid max-w-[68ch] gap-4">
    <Typography variant="display" as="h1" className="text-[clamp(2.25rem,5vw,4rem)]">
      {title}
    </Typography>
    <p className="text-steel m-0 text-[18px] leading-relaxed">{children}</p>
  </div>
);

export { PageIntro };
