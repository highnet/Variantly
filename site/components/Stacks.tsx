import { Plus } from 'lucide-react';

import { CommandCopy } from '@/components/CommandCopy';
import { GlossaryTip } from '@/components/GlossaryTip';
import { LogoMark } from '@/components/LogoMark';
import { RunnerPicker } from '@/components/RunnerPicker';
import { Typography } from '@/components/ui/Typography';
import { AGENT_LOGOS, STACK_LOGOS } from '@/lib/logos';

/*
 * What it runs on and who does the work, as marks people recognise at a
 * glance, with the one fact under each that matters.
 */
const Stacks = () => (
  <section aria-labelledby="stacks-title" className="grid gap-24">
    {/* Both columns share the section's rows, so the two headings and the two
        panels line up whatever the copy length. */}
    <div className="grid gap-10">
      <div className="grid max-w-[52ch] content-start gap-3">
        <Typography variant="headline" as="h2" id="stacks-title">
          Works with your site
        </Typography>
        <Typography variant="body" color="steel">
          <strong className="text-ink">Runs locally with a start command?</strong> It works. These
          are <strong className="text-ink">auto-detected</strong>; anything else needs{' '}
          <strong className="text-ink">one extra answer</strong>.
        </Typography>
      </div>
      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(140px,1fr))] content-start gap-x-6 gap-y-10 p-0">
        {STACK_LOGOS.map((s) => (
          <li key={s.title} className="grid content-start gap-3">
            <LogoMark title={s.title} path={s.path} className="text-ink size-7" />
            <div className="grid gap-0.5">
              <span className="condensed font-mono text-[13px] font-bold uppercase">{s.title}</span>
              <span className="text-steel condensed font-mono text-[11px]">{s.command}</span>
            </div>
          </li>
        ))}
        <li className="grid content-start gap-3">
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

    <div className="grid gap-10">
      <div className="grid max-w-[60ch] content-start gap-3">
        <Typography variant="headline" as="h2">
          Uses your own AI
        </Typography>
        <Typography variant="body" color="steel">
          <strong className="text-ink">No account, nothing to pay us.</strong> Any of these, on your
          own plan or an{' '}
          <strong className="text-ink">
            <GlossaryTip term="openrouter" />
          </strong>{' '}
          key (Claude Code, Codex). variantly finds the one you have. Each variant ={' '}
          <strong className="text-ink">one session</strong>.
        </Typography>
        <RunnerPicker className="mt-2" />
      </div>
      <ul className="m-0 grid list-none content-start gap-7 p-0">
        {AGENT_LOGOS.map((a) => (
          <li key={a.name} className="grid gap-2.5">
            <div className="flex items-center gap-2.5">
              <LogoMark title={a.title} path={a.path} className="text-ink size-5 shrink-0" />
              <span className="text-[14px] font-semibold">{a.name}</span>
            </div>
            <CommandCopy command={a.install} size="sm" className="w-fit max-w-full min-w-64" />
          </li>
        ))}
      </ul>
    </div>
  </section>
);

export { Stacks };
