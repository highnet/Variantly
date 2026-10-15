import Link from 'next/link';

import { CommandCopy } from '@/components/CommandCopy';
import { Typography } from '@/components/ui/Typography';
import { FAQ } from '@/lib/content';
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
        <Typography variant="body" color="steel">
          Open a terminal in your website&apos;s folder and paste:
        </Typography>
        <CommandCopy command="npx variantly" />
        <Typography variant="body" color="steel">
          Want to see how it works first, without using any AI?
        </Typography>
        <CommandCopy command="npx variantly --demo" />
        <Typography variant="body" color="steel">
          Use Claude Code? Let it do the setup:
        </Typography>
        <CommandCopy command="/plugin marketplace add highnet/ProjectHusky" />
        <Typography variant="small" color="steel">
          Something not working?{' '}
          <code className="condensed font-mono text-[13px]">npx variantly doctor</code> checks your
          setup and tells you what to fix.
        </Typography>
      </div>
      <div className="grid content-start gap-3">
        <Typography variant="title" as="h3">
          What you need first
        </Typography>
        <ul className="text-steel m-0 grid list-disc gap-2 pl-5 text-[15px] leading-relaxed">
          <li>
            An AI coding assistant on your computer: Claude Code, Codex or GitHub Copilot CLI.
          </li>
          <li>
            Your website&apos;s code on your computer, saved with git (at least one commit), and
            Node.js 20.11 or newer.
          </li>
          <li>
            A way to start your site locally, like{' '}
            <code className="condensed font-mono text-[13px]">npm run dev</code>.
          </li>
          <li>Files that aren&apos;t committed to git won&apos;t be copied into the designs.</li>
        </ul>
      </div>
    </div>

    <div className="grid gap-5">
      <Typography variant="headline" as="h2">
        Common questions
      </Typography>
      <dl className="m-0 grid gap-x-10 gap-y-6 md:grid-cols-2">
        {FAQ.map((f) => (
          <div key={f.q} className="grid content-start gap-1.5">
            <dt className="text-[17px] font-semibold">{f.q}</dt>
            <dd className="text-steel m-0 text-[15px] leading-relaxed">{f.a}</dd>
          </div>
        ))}
      </dl>
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
