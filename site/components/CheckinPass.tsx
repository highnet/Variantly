'use client';

import { ArrowRight } from 'lucide-react';

import { useRun } from '@/components/RunProvider';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { DEMO_VARIANTS } from '@/lib/content';
import { cn } from '@/lib/utils';

const SEGMENTS = [
  {
    label: 'From',
    value: 'Static HTML',
    detail: 'examples/oak-and-iron · variantly starts it',
    note: 'Detected from the files: 15 stacks, at the root or two folders down.',
  },
  {
    label: 'Via',
    value: 'Claude',
    detail: 'Claude Code · Impeccable installed',
    note: 'Your agent, signed in with your account. Codex CLI and Copilot CLI work too.',
  },
  {
    label: 'To',
    value: 'Redesign',
    detail: DEMO_VARIANTS.slice(0, 4)
      .map((v) => v.direction)
      .join(' · '),
    note: 'One direction per variant, or one Impeccable command each in Refine mode.',
  },
  {
    label: 'Variants',
    value: '04',
    detail: '2 at a time · 3 servers live',
    note: 'One to ten. Only the variants you look at run a dev server.',
  },
];

/*
 * A faithful miniature of the app's check-in pass, filled in for the Oak &
 * Iron example. Its Generate starts the board below and takes you there.
 */
const CheckinPass = () => {
  const { start, started } = useRun();

  const generate = () => {
    start();
    document.getElementById('board')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="@container">
      <div className="rounded-pass border-rule bg-surface shadow-lift grid overflow-hidden border @3xl:grid-cols-[minmax(0,1fr)_240px]">
        <div className="@container min-w-0">
          <div className="border-rule flex items-baseline justify-between gap-4 border-b px-5 py-3.5">
            <Typography variant="title" as="p">
              oak-and-iron
            </Typography>
            <div className="flex gap-5">
              <div>
                <Typography variant="label" color="steel" as="div">
                  Branch
                </Typography>
                <Typography variant="data" as="div">
                  main
                </Typography>
              </div>
            </div>
          </div>
          <dl className="grid grid-cols-2">
            {SEGMENTS.map((s, i) => (
              <div
                key={s.label}
                className={cn(
                  'grid content-start gap-2 px-5 pt-4 pb-5',
                  i % 2 === 0 && 'border-rule border-r',
                  i < 2 && 'border-rule border-b',
                )}
              >
                <dt>
                  <Typography variant="label" color="steel">
                    {s.label}
                  </Typography>
                </dt>
                <dd className="m-0 grid gap-2">
                  <span className="figure flex min-h-[1.9em] items-end text-[clamp(1.75rem,9cqi,3.25rem)]">
                    {s.value}
                  </span>
                  <Typography variant="small" color="steel">
                    {s.detail}
                  </Typography>
                  <Typography variant="small" className="text-ink/80">
                    {s.note}
                  </Typography>
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <aside
          aria-label="Summary"
          className="punch border-rule relative flex flex-col gap-5 border-t-2 border-dashed p-5 before:-top-2.5 before:-left-2.5 after:-top-2.5 after:-right-2.5 @3xl:border-t-0 @3xl:border-l-2 @3xl:after:top-auto @3xl:after:right-auto @3xl:after:-bottom-2.5 @3xl:after:-left-2.5"
        >
          <dl className="m-0 grid gap-3.5">
            <div>
              <dt>
                <Typography variant="label" color="steel">
                  Run
                </Typography>
              </dt>
              <dd className="condensed m-0 font-mono text-sm font-semibold">
                4 variants · redesign
              </dd>
            </div>
            <div>
              <dt>
                <Typography variant="label" color="steel">
                  Cost
                </Typography>
              </dt>
              <dd className="text-steel m-0 text-sm">4 Claude Code sessions on your account</dd>
            </div>
          </dl>
          <div className="mt-auto grid gap-4">
            <Button
              variant="primary"
              size="big"
              className="w-full"
              onClick={generate}
              aria-describedby="generate-note"
            >
              {started ? 'Watch the board' : 'Generate 4 variants'}
              <ArrowRight />
            </Button>
            <Typography variant="small" color="steel" id="generate-note" className="text-xs">
              Here it replays a run of the built-in demo agent.
            </Typography>
            <div className="scan h-9 rounded-sm opacity-85" aria-hidden="true" />
          </div>
        </aside>
      </div>
    </div>
  );
};

export { CheckinPass };
