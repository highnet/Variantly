'use client';

import { RUNNERS, setRunner, useRunner } from '@/lib/runner';
import { cn } from '@/lib/utils';

type RunnerPickerProps = {
  tone?: 'light' | 'slate';
  className?: string;
};

/* npm · pnpm · yarn · bun. Switches every command on the page at once. */
const RunnerPicker = ({ tone = 'light', className }: RunnerPickerProps) => {
  const runner = useRunner();
  return (
    <div
      role="radiogroup"
      aria-label="Package manager"
      className={cn('flex flex-wrap gap-1 font-mono text-[13px]', className)}
    >
      {RUNNERS.map((r) => {
        const on = r.id === runner;
        return (
          <button
            key={r.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setRunner(r.id)}
            className={cn(
              'rounded-chip cursor-pointer border px-2.5 py-1 transition-colors',
              tone === 'slate'
                ? on
                  ? 'border-surface text-surface'
                  : 'text-steel-on-slate hover:text-surface border-transparent'
                : on
                  ? 'border-ink text-ink'
                  : 'text-steel hover:text-ink border-transparent',
            )}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
};

/* For readers who have none of the above yet. */
const NodeHint = ({ tone = 'light' }: { tone?: 'light' | 'slate' }) => (
  <p
    className={cn(
      'm-0 text-[13px] leading-snug',
      tone === 'slate' ? 'text-steel-on-slate' : 'text-steel',
    )}
  >
    No <code className="font-mono">npx</code>? Install Node.js from{' '}
    <a
      href="https://nodejs.org/en/download"
      target="_blank"
      rel="noreferrer"
      className={cn('underline underline-offset-2', tone === 'slate' ? 'text-surface' : 'text-ink')}
    >
      nodejs.org
    </a>{' '}
    (it comes with npx), or skip the terminal with the prompt below.
  </p>
);

export { NodeHint, RunnerPicker };
