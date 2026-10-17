import { Plus } from 'lucide-react';

import { CommandCopy } from '@/components/CommandCopy';
import { LogoMark } from '@/components/LogoMark';
import { RunnerPicker } from '@/components/RunnerPicker';
import { Typography } from '@/components/ui/Typography';
import { AGENT_LOGOS, STACK_LOGOS } from '@/lib/logos';

/*
 * What it runs on and who does the work, as marks people recognise at a
 * glance, with the one fact under each that matters.
 */
const Stacks = () => (
  <section
    aria-labelledby="stacks-title"
    className="grid gap-x-12 gap-y-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:grid-rows-[auto_1fr]"
  >
    {/* Both columns share the section's rows, so the two headings and the two
        panels line up whatever the copy length. */}
    <div className="grid gap-5 lg:row-span-2 lg:grid-rows-subgrid">
      <div className="grid content-start gap-2">
        <Typography variant="headline" as="h2" id="stacks-title">
          Works with your site
        </Typography>
        <Typography variant="body" color="steel">
          <strong className="text-ink">Runs locally with a start command?</strong> It works. These
          are <strong className="text-ink">auto-detected</strong>; anything else needs{' '}
          <strong className="text-ink">one extra answer</strong>.
        </Typography>
      </div>
      <ul className="rounded-pass border-rule bg-rule m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-px overflow-hidden border p-0">
        {STACK_LOGOS.map((s) => (
          <li key={s.title} className="bg-surface grid content-start gap-3 px-4 py-4">
            <LogoMark title={s.title} path={s.path} className="text-ink size-7" />
            <div className="grid gap-0.5">
              <span className="condensed font-mono text-[13px] font-bold uppercase">{s.title}</span>
              <span className="text-steel condensed font-mono text-[11px]">{s.command}</span>
            </div>
          </li>
        ))}
        <li className="bg-surface grid content-start gap-3 px-4 py-4">
          <Plus aria-hidden="true" className="text-steel size-7" />
          <div className="grid gap-0.5">
            <span className="condensed font-mono text-[13px] font-bold uppercase">
              Anything else
            </span>
            <span className="text-steel condensed font-mono text-[11px]">your start command</span>
          </div>
        </li>
      </ul>
    </div>

    <div className="mt-7 grid gap-5 lg:row-span-2 lg:mt-0 lg:grid-rows-subgrid">
      <div className="grid content-start gap-2">
        <Typography variant="headline" as="h2">
          Uses your own AI
        </Typography>
        <Typography variant="body" color="steel">
          <strong className="text-ink">No account, nothing to pay us.</strong> Any of these, on your
          own plan or an <strong className="text-ink">OpenRouter</strong> key (Claude Code, Codex).
          variantly finds the one you have. Each variant ={' '}
          <strong className="text-ink">one session</strong>.
        </Typography>
        <RunnerPicker className="mt-1" />
      </div>
      <ul className="m-0 grid list-none auto-rows-fr gap-2 p-0">
        {AGENT_LOGOS.map((a) => (
          <li
            key={a.name}
            className="rounded-pass border-rule bg-surface grid content-center gap-2 border px-3 py-2.5"
          >
            <div className="flex items-center gap-2.5">
              <LogoMark title={a.title} path={a.path} className="text-ink size-5 shrink-0" />
              <span className="text-[14px] font-semibold">{a.name}</span>
            </div>
            <CommandCopy command={a.install} size="sm" />
          </li>
        ))}
      </ul>
    </div>
  </section>
);

export { Stacks };
