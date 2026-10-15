import Link from 'next/link';

import { AgentQuickstart } from '@/components/AgentQuickstart';
import { AudienceFork } from '@/components/AudienceFork';
import { Board } from '@/components/Board';
import { CheckinPass } from '@/components/CheckinPass';
import { CommandCopy } from '@/components/CommandCopy';
import { Compare } from '@/components/Compare';
import { Counter } from '@/components/Counter';
import { FinePrint } from '@/components/FinePrint';
import { KeptPass } from '@/components/KeptPass';
import { RunProvider } from '@/components/RunProvider';
import { Typography } from '@/components/ui/Typography';
import { INSTALL, REPO_URL } from '@/lib/site';

const Brand = () => (
  <Link href="/" className="flex items-center gap-2.5 no-underline" aria-label="variantly home">
    <svg viewBox="0 0 24 24" className="fill-ink size-5" aria-hidden="true">
      <rect x="3" y="4" width="4" height="16" />
      <rect x="9" y="4" width="2" height="16" />
      <rect x="13" y="4" width="4" height="16" />
      <rect x="19" y="4" width="2" height="16" />
    </svg>
    <span className="figure hidden text-base sm:inline">variantly</span>
  </Link>
);

const GitHubLink = () => (
  <a
    href={REPO_URL}
    className="text-steel condensed hover:text-ink hidden font-mono text-[11px] font-semibold tracking-[0.08em] uppercase no-underline sm:inline"
  >
    GitHub
  </a>
);

const Human = () => (
  <RunProvider>
    <main className="mx-auto grid max-w-[1440px] grid-cols-[minmax(0,1fr)] gap-24 px-4 pt-10 pb-24 sm:px-6 lg:pt-16">
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12">
        <div className="grid content-start gap-7 lg:sticky lg:top-24">
          <Typography variant="display">N redesigns. Keep one.</Typography>
          <Typography variant="lead" color="steel">
            Your site works, it just looks like every other one. variantly has the coding agent you
            already use redesign it several ways at once with Impeccable, runs every version as your
            real site, and lets you flick between them against the original. Keep the one you like;
            nothing touches your code before that.
          </Typography>
          <CommandCopy command={INSTALL} className="max-w-md" />
          <Typography variant="small" color="steel">
            Claude Code, Codex CLI or GitHub Copilot CLI · your account, your inference · 15 stacks
          </Typography>
        </div>
        <Counter
          id="checkin"
          compact
          number={1}
          name="Check-in"
          title="Thirty seconds of setup"
          intro={
            <Typography variant="body" color="steel">
              variantly reads your project and fills in the pass. Change anything you like, then
              generate.
            </Typography>
          }
        >
          <CheckinPass />
        </Counter>
      </div>

      <Counter
        id="board"
        number={2}
        name="Board"
        title="Every agent, in the open"
        intro={
          <Typography variant="body" color="steel">
            Each variant is its own git worktree and its own agent session. Rows move up as they
            finish; a finished row stays yellow until you&apos;ve looked at it. Open any row for
            that agent&apos;s full log.
          </Typography>
        }
      >
        <Board />
      </Counter>

      <Counter
        id="compare"
        number={3}
        name="Compare"
        title="Drag the line. Press a number."
        intro={
          <Typography variant="body" color="steel">
            The original on the left, a variant on the right, both running. These are real pages:
            the Oak &amp; Iron example and what the built-in demo agent made of it, deliberately
            crude and with no AI. With your agent and Impeccable, each variant is a full redesign of
            type, layout and components.
          </Typography>
        }
      >
        <Compare />
      </Counter>

      <Counter
        id="keep"
        number={4}
        name="Keep"
        title="One goes home with you"
        intro={
          <Typography variant="body" color="steel">
            Keeping applies that variant&apos;s diff to your working tree with git, merged with
            anything you changed meanwhile. The rest stay as branches.
          </Typography>
        }
      >
        <KeptPass />
      </Counter>

      <FinePrint />
    </main>
  </RunProvider>
);

const Page = () => (
  <AudienceFork
    brand={<Brand />}
    aside={<GitHubLink />}
    human={<Human />}
    agent={<AgentQuickstart />}
  />
);

export default Page;
