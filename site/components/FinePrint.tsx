import Link from 'next/link';

import { CommandCopy } from '@/components/CommandCopy';
import { Typography } from '@/components/ui/Typography';
import { AGENTS, STACKS } from '@/lib/content';
import { REPO_URL } from '@/lib/site';

/*
 * After the journey, the facts a careful reader checks before installing:
 * how to get it, what it runs on, what it costs, and what it isn't.
 */
const FinePrint = () => (
  <section aria-labelledby="fine-print-title" className="border-rule grid gap-12 border-t pt-12">
    <Typography variant="headline" as="h2" id="fine-print-title">
      Before you install
    </Typography>

    <div className="grid gap-10 lg:grid-cols-2">
      <div className="grid content-start gap-4">
        <Typography variant="title">Install</Typography>
        <div className="grid gap-3">
          <Typography variant="label" color="steel" as="p">
            Run it once, from your project
          </Typography>
          <CommandCopy command="npx variantly" />
          <Typography variant="label" color="steel" as="p">
            Or keep it around
          </Typography>
          <CommandCopy command="npm install -g variantly" />
          <Typography variant="label" color="steel" as="p">
            Or let Claude Code drive it
          </Typography>
          <CommandCopy command="/plugin marketplace add highnet/ProjectHusky" />
          <Typography variant="small" color="steel">
            Needs Node 20.11+, git, and a repository with one commit. Check everything with{' '}
            <code className="condensed font-mono text-[13px]">npx variantly doctor</code>.
          </Typography>
        </div>
      </div>

      <div className="grid content-start gap-4">
        <Typography variant="title">Your agent, your bill</Typography>
        <Typography variant="body" color="steel">
          variantly has no model and no account. It starts one of these in each worktree, signed in
          as you, and every variant is one full session of it. Four variants cost what four redesign
          sessions cost you; two run at a time.
        </Typography>
        <div className="rounded-pass border-rule bg-surface overflow-hidden border">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className="px-4 py-2.5">
                  <Typography variant="label" color="steel">
                    Agent
                  </Typography>
                </th>
                <th className="hidden px-4 py-2.5 sm:table-cell">
                  <Typography variant="label" color="steel">
                    Install
                  </Typography>
                </th>
              </tr>
            </thead>
            <tbody>
              {AGENTS.map((a) => (
                <tr key={a.name} className="border-rule border-t">
                  <td className="px-4 py-3 text-[15px] font-medium">{a.name}</td>
                  <td className="text-steel condensed hidden px-4 py-3 font-mono text-[13px] sm:table-cell">
                    {a.install}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Typography variant="small" color="steel">
          Plus the Impeccable skill for that agent:{' '}
          <code className="condensed font-mono text-[13px]">npx impeccable install</code>. The
          wizard can run it for you.
        </Typography>
      </div>
    </div>

    <div className="grid gap-4">
      <Typography variant="title">Runs on your stack</Typography>
      <Typography variant="body" color="steel">
        variantly runs your project&apos;s own dev server once per variant behind a local preview
        proxy, so anything with a dev server works, including servers without hot reload. Detected
        out of the box:
      </Typography>
      <ul className="rounded-pass border-rule bg-rule m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-px overflow-hidden border p-0">
        {STACKS.map((s) => (
          <li key={s.name} className="bg-surface grid gap-1 px-4 py-3">
            <span className="condensed font-mono text-[13px] font-bold uppercase">{s.name}</span>
            <span className="text-steel condensed font-mono text-xs">{s.command}</span>
          </li>
        ))}
      </ul>
    </div>

    <div className="grid gap-10 lg:grid-cols-2">
      <div className="grid content-start gap-3">
        <Typography variant="title">What it is not</Typography>
        <Typography variant="body" color="steel">
          Not a hosted service, and not a replacement for{' '}
          <a href="https://impeccable.style/docs/live/" className="text-ink underline">
            Impeccable Live
          </a>
          . Live picks between versions of one element in your running page; variantly does the same
          one level up, for the whole page. Use variantly to choose a direction, then Live to tune
          the one you kept.
        </Typography>
      </div>
      <div className="grid content-start gap-3">
        <Typography variant="title">Where it can trip</Typography>
        <Typography variant="body" color="steel">
          Your dev command has to take a port. Untracked files aren&apos;t copied into variants.
          Next.js variants install their own dependencies, which is quick with pnpm and slow with
          npm. Rust variants compile from scratch the first time.
        </Typography>
      </div>
    </div>

    <footer className="border-rule text-steel flex flex-wrap items-center justify-between gap-4 border-t pt-6 text-sm">
      <span>
        Built on{' '}
        <a href="https://impeccable.style" className="text-ink underline">
          Impeccable
        </a>{' '}
        by Paul Bakaus (Apache-2.0); independent and not affiliated. MIT © highnet.
      </span>
      <span className="flex gap-5">
        <a href={REPO_URL} className="text-ink underline">
          Source
        </a>
        <Link href="/SKILLS.md" className="text-ink underline">
          SKILLS.md
        </Link>
      </span>
    </footer>
  </section>
);

export { FinePrint };
