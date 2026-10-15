import { LogoMark } from '@/components/LogoMark';
import { Typography } from '@/components/ui/Typography';
import { AGENT_LOGOS, STACK_LOGOS } from '@/lib/logos';

/*
 * What it runs on and who does the work, as marks people recognise at a
 * glance, with the one fact under each that matters.
 */
const Stacks = () => (
  <section
    aria-labelledby="stacks-title"
    className="grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
  >
    <div className="grid content-start gap-5">
      <div className="grid gap-2">
        <Typography variant="headline" as="h2" id="stacks-title">
          Runs on your stack
        </Typography>
        <Typography variant="body" color="steel">
          variantly runs your project&apos;s own dev server once per variant, behind a local preview
          proxy, so anything with a dev server works, hot reload or not.
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
      </ul>
    </div>

    <div className="grid content-start gap-5">
      <div className="grid gap-2">
        <Typography variant="headline" as="h2">
          Your agent, your bill
        </Typography>
        <Typography variant="body" color="steel">
          variantly has no model and no account. Each variant is one session of the agent you
          already use, signed in as you.
        </Typography>
      </div>
      <ul className="m-0 grid list-none gap-2 p-0">
        {AGENT_LOGOS.map((a) => (
          <li
            key={a.name}
            className="rounded-pass border-rule bg-surface flex items-center gap-4 border px-4 py-3.5"
          >
            <LogoMark title={a.title} path={a.path} className="text-ink size-7 shrink-0" />
            <div className="grid min-w-0 gap-0.5">
              <span className="text-[15px] font-semibold">{a.name}</span>
              <code className="text-steel condensed truncate font-mono text-[12px]">
                {a.install}
              </code>
            </div>
          </li>
        ))}
      </ul>
    </div>
  </section>
);

export { Stacks };
