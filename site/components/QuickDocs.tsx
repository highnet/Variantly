import { Typography } from '@/components/ui/Typography';

export const COMMANDS = [
  ['npx variantly', 'Open the wizard in the current folder.'],
  ['npx variantly --demo', 'The full flow with ready-made variants. No AI, no account.'],
  ['npx variantly doctor', 'Check Node, git, your AI assistants and the detected stack.'],
  ['npx variantly keep <n>', 'Apply variant n. The others stay as branches.'],
  ['npx variantly status', 'The current run, as JSON.'],
  ['npx variantly clean', 'Remove every copy, branch and state file.'],
  ['npx variantly install-skill', 'Put the variantly skill where your assistants read skills.'],
] as const;

export const FLAGS = [
  ['--agent <id>', 'claude, codex, copilot, gemini, cursor or demo'],
  ['--agents <mix>', 'split variants across agents: claude:opus:2,gemini:2'],
  ['--blind', 'hide who made each variant until you keep one'],
  ['--count <n>', 'how many variants, 1–10'],
  ['--brief <txt>', 'what you want, in your words'],
  ['--yes', 'skip the wizard, use detected defaults'],
  ['--port <n>', 'app port (default 4477)'],
  ['--no-open', 'don’t open a browser'],
] as const;

/* A compact command reference: every command and flag on one screen. */
const QuickDocs = () => (
  <section id="docs" aria-labelledby="docs-title" className="grid scroll-mt-28 gap-6">
    <div className="grid gap-2">
      <Typography variant="headline" as="h2" id="docs-title">
        Quick docs
      </Typography>
      <Typography variant="small" color="steel">
        Every command runs in your site&apos;s folder. Add a path to run it somewhere else.
      </Typography>
    </div>
    <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <dl className="m-0 grid gap-1">
        {COMMANDS.map(([cmd, what]) => (
          <div
            key={cmd}
            className="grid gap-1 py-2 sm:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] sm:gap-4"
          >
            <dt>
              <code className="condensed font-mono text-sm font-semibold">{cmd}</code>
            </dt>
            <dd className="text-steel m-0 text-[15px] leading-snug">{what}</dd>
          </div>
        ))}
      </dl>
      <details className="vy-more grid content-start gap-3">
        <summary className="text-steel hover:text-ink w-fit cursor-pointer text-sm font-semibold">
          Flags
        </summary>
        <dl className="m-0 grid gap-2.5">
          {FLAGS.map(([flag, what]) => (
            <div key={flag} className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] gap-3">
              <dt>
                <code className="condensed font-mono text-sm">{flag}</code>
              </dt>
              <dd className="text-steel m-0 text-[14px] leading-snug">{what}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  </section>
);

export { QuickDocs };
