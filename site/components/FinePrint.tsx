import Link from 'next/link';

import { QuickDocs } from '@/components/QuickDocs';
import { Rich } from '@/components/ui/Rich';
import { Typography } from '@/components/ui/Typography';
import { FAQ } from '@/lib/content';
import { REPO_URL } from '@/lib/site';

/*
 * The close: how to get it, and the honest fine print a careful reader
 * checks before running it on their project.
 */
const FinePrint = () => (
  <section aria-labelledby="faq-title" className="grid gap-28">
    <div className="grid gap-10">
      <Typography variant="headline" as="h2" id="faq-title">
        Common questions
      </Typography>
      <dl className="m-0 grid max-w-[1100px] gap-x-20 gap-y-10 md:grid-cols-2">
        {FAQ.map((f) => (
          <div key={f.q} className="grid max-w-[52ch] content-start gap-2.5">
            <dt className="text-[18px] font-semibold">{f.q}</dt>
            <dd className="text-steel m-0 text-[16px] leading-relaxed">
              <Rich text={f.a} />
            </dd>
          </div>
        ))}
      </dl>
    </div>

    <QuickDocs />

    <footer className="border-rule text-steel flex flex-wrap items-center justify-between gap-4 border-t pt-6 text-sm">
      <span className="max-w-[90ch] leading-relaxed">
        Built on{' '}
        <a href="https://impeccable.style" className="text-ink underline">
          Impeccable
        </a>
        , created by{' '}
        <a href="https://x.com/pbakaus" className="text-ink underline">
          Paul Bakaus
        </a>{' '}
        (Apache-2.0). Independent: not affiliated with or endorsed by Impeccable or Paul Bakaus;
        names used only for credit. variantly is MIT © highnet, provided “as is”, no warranty.{' '}
        <strong className="text-ink">Review every change before you keep it.</strong>
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
