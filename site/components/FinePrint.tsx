import Link from 'next/link';

import { Rich } from '@/components/ui/Rich';
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
            <dd className="text-steel m-0 text-[15px] leading-relaxed">
              <Rich text={f.a} />
            </dd>
          </div>
        ))}
      </dl>
    </div>

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
