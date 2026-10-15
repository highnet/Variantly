import Link from 'next/link';

import { CommandCopy } from '@/components/CommandCopy';
import { Typography } from '@/components/ui/Typography';
import { REPO_URL } from '@/lib/site';

/*
 * The close: how to get it, and the honest fine print a careful reader
 * checks before running it on their project.
 */
const FinePrint = () => (
  <section aria-labelledby="install-title" className="grid gap-10">
    <div className="grid gap-10 lg:grid-cols-2">
      <div className="grid content-start gap-4">
        <Typography variant="headline" as="h2" id="install-title">
          Try it on your site
        </Typography>
        <Typography variant="label" color="steel" as="p">
          From your project, once
        </Typography>
        <CommandCopy command="npx variantly" />
        <Typography variant="label" color="steel" as="p">
          No agent yet? The whole flow, no AI
        </Typography>
        <CommandCopy command="npx variantly --demo" />
        <Typography variant="label" color="steel" as="p">
          Or let Claude Code drive it
        </Typography>
        <CommandCopy command="/plugin marketplace add highnet/ProjectHusky" />
        <Typography variant="small" color="steel">
          Needs Node 20.11+, git and one commit.{' '}
          <code className="condensed font-mono text-[13px]">npx variantly doctor</code> checks
          everything.
        </Typography>
      </div>
      <div className="grid content-start gap-3">
        <Typography variant="title" as="h3">
          Where it can trip
        </Typography>
        <ul className="text-steel m-0 grid list-disc gap-2 pl-5 text-[15px] leading-relaxed">
          <li>Your dev command has to take a port ({'{port}'} or a PORT variable).</li>
          <li>Untracked files aren&apos;t copied into variants; commit what the site needs.</li>
          <li>Next.js variants install their own dependencies: quick with pnpm, slow with npm.</li>
          <li>Every variant is one full agent session on your account. Start with four.</li>
        </ul>
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
