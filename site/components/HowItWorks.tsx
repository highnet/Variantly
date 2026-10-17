import { Rich } from '@/components/ui/Rich';
import { Typography } from '@/components/ui/Typography';
import { EXTRAS, STEPS } from '@/lib/content';

/*
 * Three steps read like an instruction page: oversized step numbers carry
 * the sequence, a short sentence does the explaining.
 */
const HowItWorks = () => (
  <section aria-labelledby="how-title" className="grid gap-8">
    <Typography variant="headline" as="h2" id="how-title">
      How it works
    </Typography>
    <ol className="m-0 grid list-none gap-10 p-0 md:grid-cols-3 md:gap-8">
      {STEPS.map((s, i) => (
        <li key={s.label} className="border-ink grid content-start gap-3 border-t-2 pt-5">
          <span
            className="figure text-ink text-[clamp(4.5rem,8vw,7rem)] leading-[0.8]"
            aria-hidden="true"
          >
            {i + 1}
          </span>
          <Typography variant="title" as="h3">
            {s.title}
          </Typography>
          <p className="text-steel m-0 max-w-[40ch] text-[16px] leading-relaxed">
            <Rich text={s.body} />
          </p>
        </li>
      ))}
    </ol>
    {/* Secondary: tucked behind a disclosure so the three steps stay the focus. */}
    <details className="vy-more group grid gap-4">
      <summary className="text-steel hover:text-ink w-fit cursor-pointer text-sm font-semibold">
        Optional add-ons <span className="font-normal">· opt-in steps in the wizard, skip any</span>
      </summary>
      <ul className="m-0 mt-4 grid list-none gap-x-8 gap-y-4 p-0 sm:grid-cols-2 lg:grid-cols-5">
        {EXTRAS.map((x) => (
          <li key={x.label} className="grid content-start gap-1">
            <span className="condensed font-mono text-[13px] font-semibold">{x.label}</span>
            <span className="text-steel text-sm leading-snug">
              <Rich text={x.hint} />
            </span>
          </li>
        ))}
      </ul>
    </details>
  </section>
);

export { HowItWorks };
