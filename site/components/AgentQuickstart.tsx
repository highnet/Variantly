import Link from 'next/link';

import { CommandCopy } from '@/components/CommandCopy';
import { Typography } from '@/components/ui/Typography';
import { SKILLS_URL } from '@/lib/site';

const STEPS = [
  {
    command: `curl -fsSL ${SKILLS_URL}`,
    what: 'Read the manual first. It is short and written for you.',
  },
  {
    command: 'npx variantly doctor',
    what: 'Fix every ✗: a commit, an agent CLI. The Impeccable skill installs itself when missing.',
  },
  {
    command: 'npx variantly --yes --agent claude --count 4 --brief "<their words>"',
    what: 'Start a run in the background and give the person the URL it prints.',
  },
  {
    command: 'npx variantly status',
    what: 'Poll until "phase" is "ready". Cheap: it reads a file.',
  },
  {
    command: 'npx variantly keep <n>',
    what: 'Only after the person names a variant. Then stop the background process.',
  },
];

/*
 * The agent's view: no pitch, the commands in order, and the one rule.
 */
const AgentQuickstart = () => (
  <main className="mx-auto flex w-full max-w-[920px] flex-1 flex-col gap-10 px-4 py-14 sm:px-6">
    <div className="grid gap-4">
      <Typography variant="data" color="steel" as="p">
        # variantly — agent quickstart
      </Typography>
      <Typography variant="headline" as="h1">
        Check the project. Start the run. Let the person choose.
      </Typography>
      <Typography variant="lead" color="steel">
        variantly makes N whole-page redesigns of a web project with the person&apos;s own agent and
        the{' '}
        <a
          href="https://impeccable.style"
          target="_blank"
          rel="noreferrer"
          className="text-ink underline"
        >
          Impeccable
        </a>{' '}
        skill, runs each as the real site, and opens a local before/after comparison. Your job is to
        set it up and hand over the URL.
      </Typography>
    </div>
    <ol className="m-0 grid list-none gap-5 p-0">
      {STEPS.map((s, i) => (
        <li key={s.command} className="grid gap-2 sm:grid-cols-[2.5rem_1fr]">
          <span className="figure text-steel pt-2.5 text-xl" aria-hidden="true">
            {i + 1}
          </span>
          <div className="grid gap-1.5">
            <CommandCopy command={s.command} />
            <Typography variant="small" color="steel">
              {s.what}
            </Typography>
          </div>
        </li>
      ))}
    </ol>
    <div className="border-rule grid gap-3 border-t pt-6">
      <Typography variant="label" color="steel" as="p">
        Constraints
      </Typography>
      <ul className="m-0 grid list-disc gap-2 pl-5 text-[15px] leading-relaxed">
        <li>Never pick a variant for the person unless they told you which one.</li>
        <li>
          Each variant is one full session of their agent, on their account. Say so before a large
          run.
        </li>
        <li>
          Nothing touches their working tree until keep; the change lands unstaged for them to
          review.
        </li>
        <li className="grid gap-2">
          For one element instead of the whole page, use Impeccable live in their agent:
          <CommandCopy command="/impeccable live" size="sm" />
        </li>
      </ul>
    </div>
    {/* Pinned to the bottom of a short page, like the human view's fine print. */}
    <footer className="border-rule mt-auto border-t pt-6">
      <Typography variant="small" color="steel">
        Full manual:{' '}
        <Link href="/SKILLS.md" className="text-ink underline">
          /SKILLS.md
        </Link>{' '}
        ·{' '}
        <a
          href="https://docs.anthropic.com/en/docs/claude-code/overview"
          target="_blank"
          rel="noreferrer"
          className="text-ink underline"
        >
          Claude Code
        </a>{' '}
        plugin:
      </Typography>
      <CommandCopy
        command="/plugin marketplace add highnet/ProjectHusky"
        size="sm"
        className="mt-3"
      />
    </footer>
  </main>
);

export { AgentQuickstart };
