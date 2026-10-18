import { CommandCopy } from '@/components/CommandCopy';
import { PromptCopy } from '@/components/PromptCopy';
import { Typography } from '@/components/ui/Typography';
import { PROMPTS } from '@/lib/content';
import { cn } from '@/lib/utils';

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

type QuickDocsProps = {
  className?: string;
};

/* A compact command reference: every command and flag on one screen. */
const QuickDocs = ({ className }: QuickDocsProps) => (
  <section
    id="docs"
    aria-labelledby="docs-title"
    className={cn('grid scroll-mt-28 gap-10', className)}
  >
    <div className="grid gap-3">
      <Typography variant="headline" as="h2" id="docs-title">
        Quick docs
      </Typography>
      <Typography variant="small" color="steel">
        Every command runs in your site&apos;s folder. Add a path to run it somewhere else.
      </Typography>
      <PromptCopy chip prompt={PROMPTS.docs} label="Copy prompt: point your AI at these docs" />
    </div>
    <div className="grid max-w-[920px] gap-10">
      <dl className="m-0 grid gap-7">
        {COMMANDS.map(([cmd, what]) => (
          <div key={cmd} className="grid gap-2.5">
            {/* The command is the term; its description reads first. */}
            <dt className="order-2">
              <CommandCopy command={cmd} size="sm" className="w-fit max-w-full min-w-64" />
            </dt>
            <dd className="text-steel order-1 m-0 text-[15px] leading-snug">{what}</dd>
          </div>
        ))}
      </dl>
      <details className="vy-more grid content-start gap-3">
        <summary className="text-steel hover:text-ink w-fit cursor-pointer text-sm font-semibold">
          Flags
        </summary>
        <dl className="m-0 grid gap-3.5 pt-2">
          {FLAGS.map(([flag, what]) => (
            <div
              key={flag}
              className="grid gap-1 sm:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] sm:gap-8"
            >
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
