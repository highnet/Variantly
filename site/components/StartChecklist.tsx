'use client';

import { Check } from 'lucide-react';
import { useState } from 'react';

import { CommandCopy } from '@/components/CommandCopy';
import { PromptCopy } from '@/components/PromptCopy';
import { Typography } from '@/components/ui/Typography';
import { CHECKLIST, PROMPTS } from '@/lib/content';
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
                    {on && <Check className="animate-pop size-3.5" strokeWidth={3} />}
                  </span>
                  <span className="grid gap-0.5">
                    <span className="text-[16px] font-semibold">{c.need}</span>
                    <span className="text-steel text-[14px] leading-snug">{c.how}</span>
                  </span>
                </label>
                {!on && (
                  <PromptCopy
                    prompt={c.prompt}
                    label="Don’t have this? Copy a prompt for your AI"
                    className="mt-1.5 ml-[2.625rem]"
                  />
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="bg-slate on-slate text-surface grid content-start gap-4 p-6 sm:p-8">
        <p className="figure m-0 text-[clamp(1.5rem,2.4vw,2rem)] leading-none" aria-live="polite">
          <span
            key={ready ? 'ready' : ticked.size}
            className={cn('inline-block', ready ? 'animate-stamp text-ok-on-slate' : 'animate-pop')}
          >
            {ready ? 'You’re ready ✓' : `${ticked.size} of ${CHECKLIST.length} ready`}
          </span>
        </p>
        <div aria-hidden="true" className="bg-slate-line h-1 overflow-hidden rounded-full">
          <div
            className="bg-ok-on-slate h-full origin-left transition-[scale] duration-500 ease-[cubic-bezier(.3,1.4,.5,1)]"
            style={{ scale: `${ticked.size / CHECKLIST.length} 1` }}
          />
        </div>
        <p className="text-steel-on-slate m-0 text-[15px] leading-relaxed">
          Open a terminal in your website&apos;s folder and paste:
        </p>
        <CommandCopy command="npx variantly" tone="slate" />
        <p className="text-steel-on-slate m-0 text-[15px] leading-relaxed">
          Just looking? This runs the whole thing with ready-made designs and no AI:
        </p>
        <CommandCopy command="npx variantly --demo" tone="slate" />
        <PromptCopy prompt={PROMPTS.demo} tone="slate" label="Or copy it as a prompt for your AI" />
        <div className="border-slate-line grid gap-2 border-t pt-4">
          <p className="text-surface m-0 text-[15px] font-semibold">
            Rather not use the terminal yourself?
          </p>
          <p className="text-steel-on-slate m-0 text-[14px] leading-relaxed">
            Paste this into your AI assistant and it does the setup for you, then hands you the
            link.
          </p>
          <PromptCopy prompt={PROMPTS.setup} tone="slate" preview label="Copy setup prompt" />
        </div>
        <p className="text-steel-on-slate m-0 text-[14px] leading-relaxed">
          Stuck?{' '}
          <code className="condensed text-surface font-mono text-[13px]">npx variantly doctor</code>{' '}
          says what&apos;s missing.
        </p>
      </div>
    </section>
  );
};

export { StartChecklist };
