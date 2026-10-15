import { Typography } from '@/components/ui/Typography';
import { STEPS } from '@/lib/content';

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
          <p className="text-steel m-0 max-w-[40ch] text-[16px] leading-relaxed">{s.body}</p>
        </li>
      ))}
    </ol>
  </section>
);

export { HowItWorks };
