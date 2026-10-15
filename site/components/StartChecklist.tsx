'use client';

import { Check } from 'lucide-react';
import { useState } from 'react';

import { CommandCopy } from '@/components/CommandCopy';
import { Typography } from '@/components/ui/Typography';
import { CHECKLIST } from '@/lib/content';
import { cn } from '@/lib/utils';

/*
 * A pass to tick before boarding. Ticking is only for the reader's own
 * confidence; the commands work whether or not every box is ticked.
 */
const StartChecklist = () => {
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const ready = ticked.size === CHECKLIST.length;

  const toggle = (id: string) =>
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section
      aria-labelledby="start-title"
      className="rounded-pass border-rule bg-surface grid overflow-hidden border lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"
    >
      <div className="grid content-start gap-5 p-6 sm:p-8">
        <div className="grid gap-2">
          <Typography variant="headline" as="h2" id="start-title">
            Before you start
          </Typography>
          <p className="text-steel m-0 text-[16px] leading-relaxed">
            Tick what you already have. Anything missing, your AI assistant can help you set up.
          </p>
        </div>
        <ul className="m-0 grid list-none gap-2 p-0">
          {CHECKLIST.map((c) => {
            const on = ticked.has(c.id);
            return (
              <li key={c.id}>
                <label
                  className={cn(
                    'border-rule hover:border-ink grid cursor-pointer grid-cols-[1.5rem_1fr] gap-3 rounded-[4px] border p-3.5 transition-colors',
                    on && 'border-ink bg-panel',
                  )}
                >
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={on}
                    onChange={() => toggle(c.id)}
                  />
                  <span
                    aria-hidden="true"
                    className={cn(
                      'border-ink peer-focus-visible:outline-ink mt-0.5 grid size-5 place-items-center rounded-[3px] border-2 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2',
                      on && 'bg-ink text-surface',
                    )}
                  >
                    {on && <Check className="size-3.5" strokeWidth={3} />}
                  </span>
                  <span className="grid gap-0.5">
                    <span className="text-[16px] font-semibold">{c.need}</span>
                    <span className="text-steel text-[14px] leading-snug">{c.how}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="bg-slate on-slate text-surface grid content-start gap-4 p-6 sm:p-8">
        <p className="figure m-0 text-[clamp(1.5rem,2.4vw,2rem)] leading-none" aria-live="polite">
          {ready ? 'You’re ready' : `${ticked.size} of ${CHECKLIST.length} ready`}
        </p>
        <p className="text-steel-on-slate m-0 text-[15px] leading-relaxed">
          Open a terminal in your website&apos;s folder and paste:
        </p>
        <CommandCopy command="npx variantly" tone="slate" />
        <p className="text-steel-on-slate m-0 text-[15px] leading-relaxed">
          Just looking? This runs the whole thing with ready-made designs and no AI:
        </p>
        <CommandCopy command="npx variantly --demo" tone="slate" />
        <p className="text-steel-on-slate m-0 text-[15px] leading-relaxed">
          Stuck?{' '}
          <code className="condensed text-surface font-mono text-[13px]">npx variantly doctor</code>{' '}
          says what&apos;s missing. Or paste this page&apos;s address into your assistant and ask it
          to set variantly up.
        </p>
      </div>
    </section>
  );
};

export { StartChecklist };
