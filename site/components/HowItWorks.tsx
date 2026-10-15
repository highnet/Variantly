import { Columns2, GitBranch, Terminal } from 'lucide-react';

import { Typography } from '@/components/ui/Typography';
import { STEPS } from '@/lib/content';

const ICONS = [Terminal, GitBranch, Columns2];

/*
 * Three steps on one strip, read left to right. No numbers: the arrows and
 * the order carry the sequence.
 */
const HowItWorks = () => (
  <section aria-labelledby="how-title" className="grid gap-6">
    <Typography variant="headline" as="h2" id="how-title">
      What just happened there
    </Typography>
    <ol className="rounded-pass border-rule bg-surface m-0 grid list-none overflow-hidden border p-0 md:grid-cols-3">
      {STEPS.map((s, i) => {
        const Icon = ICONS[i];
        return (
          <li
            key={s.title}
            className="border-rule relative grid content-start gap-3 border-t p-6 first:border-t-0 md:border-t-0 md:border-l md:first:border-l-0"
          >
            <Icon className="text-ink size-6" strokeWidth={1.6} aria-hidden="true" />
            <Typography variant="title" as="h3">
              {s.title}
            </Typography>
            <Typography variant="small" color="steel">
              {s.body}
            </Typography>
            {s.command && (
              <code className="bg-panel condensed w-max rounded-[4px] px-2 py-1 font-mono text-[13px]">
                $ {s.command}
              </code>
            )}
          </li>
        );
      })}
    </ol>
  </section>
);

export { HowItWorks };
