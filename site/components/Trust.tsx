import { Rich } from '@/components/ui/Rich';
import { Typography } from '@/components/ui/Typography';
import { TRUST, TRUST_CAVEATS } from '@/lib/content';
import { REPO_URL } from '@/lib/site';

/*
 * What variantly does to the visitor's repository, step by step, each with
 * a link to the code that does it. The careful reader's question before
 * running anything on a real project.
 */
const Trust = () => (
  <section id="trust" aria-labelledby="trust-title" className="grid scroll-mt-28 gap-10">
    <div className="grid max-w-[68ch] gap-3">
      <Typography variant="headline" as="h2" id="trust-title">
        What it does to your repo
      </Typography>
      <p className="text-steel m-0 text-[16px] leading-relaxed">
        Plain git, nothing hidden. Every step below links to the code that does it, in the{' '}
        <a href={REPO_URL} className="text-ink underline underline-offset-2">
          open-source repository
        </a>{' '}
        (
        <a
          href={`${REPO_URL}/blob/main/LICENCE.md`}
          className="text-ink underline underline-offset-2"
        >
          MIT licence
        </a>
        ).
      </p>
    </div>
    <ol className="m-0 grid max-w-[1100px] list-none gap-x-8 gap-y-9 p-0 md:grid-cols-2">
      {TRUST.map((t) => (
        <li key={t.title} className="border-rule grid content-start gap-2 border-t pt-4">
          <span className="text-[17px] font-semibold">{t.title}</span>
          <p className="text-steel m-0 text-[15px] leading-relaxed">
            <Rich text={t.body} />
          </p>
          <a
            href={`${REPO_URL}/blob/main/${t.source}`}
            className="text-steel hover:text-ink w-fit font-mono text-[13px] underline underline-offset-2"
          >
            {t.source.replace(/#L\d+$/, '')}
          </a>
        </li>
      ))}
    </ol>
    <div className="border-alert grid max-w-[68ch] gap-3 border-l-4 pl-5">
      <span className="text-[17px] font-semibold">Know before you run it</span>
      <ul className="text-steel m-0 grid list-disc gap-2 pl-5 text-[15px] leading-relaxed">
        {TRUST_CAVEATS.map((c) => (
          <li key={c}>
            <Rich text={c} />
          </li>
        ))}
      </ul>
    </div>
  </section>
);

export { Trust };
