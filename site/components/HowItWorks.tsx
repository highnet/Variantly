import { Typography } from '@/components/ui/Typography';
import { STEPS } from '@/lib/content';

/*
 * Three steps as pass fields: a label above a value, and the concrete thing
 * each step produces, so it reads as data rather than as feature cards.
 */
const HowItWorks = () => (
  <section aria-labelledby="how-title" className="grid gap-6">
    <Typography variant="headline" as="h2" id="how-title">
      How it works
    </Typography>
    <ol className="rounded-pass border-rule bg-surface m-0 grid list-none overflow-hidden border p-0 md:grid-cols-3">
      {STEPS.map((s) => (
        <li
          key={s.label}
          className="border-rule grid content-start gap-2 border-t p-6 first:border-t-0 md:border-t-0 md:border-l md:first:border-l-0"
        >
          <Typography variant="label" color="steel">
            {s.label}
          </Typography>
          <Typography variant="title" as="h3">
            {s.title}
          </Typography>
          <Typography variant="small" color="steel">
            {s.body}
          </Typography>
          <span className="bg-panel condensed rounded-keycap mt-2 w-max max-w-full truncate px-2 py-1 font-mono text-[13px]">
            {s.artifact}
          </span>
        </li>
      ))}
    </ol>
  </section>
);

export { HowItWorks };
