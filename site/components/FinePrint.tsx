import Link from 'next/link';

import { Typography } from '@/components/ui/Typography';
import { FAQ } from '@/lib/content';
import { REPO_URL } from '@/lib/site';

/*
 * The close: how to get it, and the honest fine print a careful reader
 * checks before running it on their project.
 */
const FinePrint = () => (
  <section aria-labelledby="faq-title" className="grid gap-10">
    <div className="grid gap-5">
      <Typography variant="headline" as="h2" id="faq-title">
        Common questions
      </Typography>
      <dl className="m-0 grid gap-x-10 gap-y-6 md:grid-cols-2">
        {FAQ.map((f) => (
          <div key={f.q} className="grid content-start gap-1.5">
            <dt className="text-[17px] font-semibold">{f.q}</dt>
            <dd className="text-steel m-0 text-[15px] leading-relaxed">{f.a}</dd>
          </div>
        ))}
      </dl>
    </div>

    <footer className="border-rule text-steel flex flex-wrap items-center justify-between gap-4 border-t pt-6 text-sm">
      <span>
        Built on{' '}
        <a href="https://impeccable.style" className="text-ink underline">
          Impeccable
        </a>{' '}
        by Paul Bakaus (Apache-2.0); independent and not affiliated. MIT © highnet.
      </span>
      <span className="flex gap-5">
        <a href={REPO_URL} className="text-ink underline">
          Source
        </a>
        <Link href="/SKILLS.md" className="text-ink underline">
          SKILLS.md
        </Link>
      </span>
    </footer>
  </section>
);

export { FinePrint };
