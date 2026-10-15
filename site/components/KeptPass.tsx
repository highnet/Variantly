'use client';

import { CommandCopy } from '@/components/CommandCopy';
import { useRun } from '@/components/RunProvider';
import { Typography } from '@/components/ui/Typography';
import { DEMO_VARIANTS } from '@/lib/content';
import { DEMO, INSTALL } from '@/lib/site';

/*
 * The pass variantly issues when you keep a variant, with the install on its
 * stub: the end of the journey and the start of yours.
 */
const KeptPass = () => {
  const { kept, selected } = useRun();
  const n = kept ?? selected;
  const v = DEMO_VARIANTS[n - 1];
  const name = `V${String(n).padStart(2, '0')}`;

  return (
    <div className="rounded-pass border-rule bg-surface shadow-lift grid overflow-hidden border lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="grid content-start gap-6 p-6 sm:p-8">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
          <span className="figure text-[clamp(4rem,9vw,6rem)]">{name}</span>
          <div className="pb-2">
            <Typography variant="title" as="p">
              {v.direction}
            </Typography>
            <Typography variant="small" color="steel">
              {kept
                ? 'Kept. Applied to your working tree, unstaged.'
                : 'Keep a variant above, or this is what keeping looks like.'}
            </Typography>
          </div>
        </div>
        <dl className="m-0 grid gap-4 sm:grid-cols-3">
          <div>
            <dt>
              <Typography variant="label" color="steel">
                Files changed
              </Typography>
            </dt>
            <dd className="condensed m-0 font-mono text-sm">{v.files.join(', ')}</dd>
          </div>
          <div>
            <dt>
              <Typography variant="label" color="steel">
                The others
              </Typography>
            </dt>
            <dd className="m-0 text-sm">Kept as branches until you run clean</dd>
          </div>
          <div>
            <dt>
              <Typography variant="label" color="steel">
                Next
              </Typography>
            </dt>
            <dd className="m-0 text-sm">
              Review with <code className="condensed font-mono text-[13px]">git diff</code>, tune
              details with <code className="condensed font-mono text-[13px]">/impeccable live</code>
            </dd>
          </div>
        </dl>
      </div>
      <aside
        aria-label="Install"
        className="punch border-rule relative grid content-start gap-4 border-t-2 border-dashed p-6 before:-top-2.5 before:-left-2.5 after:-top-2.5 after:-right-2.5 sm:p-8 lg:border-t-0 lg:border-l-2 lg:after:top-auto lg:after:-bottom-2.5 lg:after:-left-2.5"
      >
        <Typography variant="title" as="h3">
          Your turn
        </Typography>
        <Typography variant="small" color="steel">
          In a git repository with at least one commit:
        </Typography>
        <CommandCopy command={INSTALL} />
        <Typography variant="small" color="steel">
          No agent yet? See the whole flow with no AI:
        </Typography>
        <CommandCopy command={DEMO} />
        <div className="scan mt-2 h-9 rounded-sm opacity-85" aria-hidden="true" />
      </aside>
    </div>
  );
};

export { KeptPass };
