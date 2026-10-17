import { CommandCopy } from '@/components/CommandCopy';
import { NodeHint, RunnerPicker } from '@/components/RunnerPicker';
import { PromptCopy } from '@/components/PromptCopy';
import { Rich } from '@/components/ui/Rich';
import { Typography } from '@/components/ui/Typography';
import { CHECKLIST, PROMPTS } from '@/lib/content';

const ALL_PROMPTS = [
  'Help me get set up for Variantly. Go through these steps in order, skipping any that are already done:',
  ...CHECKLIST.map((c, i) => `${i + 1}. ${c.prompt}`),
].join('\n\n');

/*
 * What you need, with a prompt beside each thing in case it is missing, and
 * the commands to run once it is all there.
 */
const StartChecklist = () => (
  <section
    aria-labelledby="start-title"
    className="rounded-pass border-rule bg-surface grid w-full max-w-[880px] overflow-hidden border"
  >
    <div className="grid content-start gap-10 p-6 sm:p-10 lg:p-14">
      <div className="grid gap-3">
        <Typography variant="headline" as="h2" id="start-title">
          Before you start
        </Typography>
        <Typography variant="body" color="steel">
          <strong className="text-ink">Four things.</strong> Missing one? Copy its{' '}
          <strong className="text-ink">prompt</strong> into your AI assistant.
        </Typography>
      </div>
      <ol className="m-0 grid list-none gap-9 p-0">
        {CHECKLIST.map((c, i) => (
          <li key={c.id} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4">
            <span className="figure text-steel pt-0.5 text-2xl leading-none" aria-hidden="true">
              {i + 1}
            </span>
            <div className="grid max-w-[52ch] justify-items-start gap-3">
              <div className="grid gap-1.5">
                <span className="text-[17px] font-semibold">{c.need}</span>
                <span className="text-steel text-[15px] leading-relaxed">
                  <Rich text={c.how} />
                </span>
              </div>
              <PromptCopy chip prompt={c.prompt} label="Copy prompt" />
            </div>
          </li>
        ))}
      </ol>
      <div className="border-rule grid justify-items-start gap-3 border-t pt-8">
        <Typography variant="small" color="steel">
          Missing more than one? One prompt walks through them all.
        </Typography>
        <PromptCopy chip prompt={ALL_PROMPTS} label="Copy all four prompts" />
      </div>
    </div>

    <div className="bg-slate on-slate text-surface grid content-start gap-14 p-6 sm:p-10 lg:p-14">
      <div className="grid gap-4">
        <Typography variant="title" as="h3">
          Then run it
        </Typography>
        <Typography variant="small" color="steel-on-slate">
          In your <strong className="text-surface">site&apos;s folder</strong>, paste:
        </Typography>
        <RunnerPicker tone="slate" />
        <CommandCopy command="npx variantly" tone="slate" className="max-w-xl" />
        <NodeHint tone="slate" />
      </div>

      <div className="grid gap-4">
        <Typography variant="title" as="h3">
          Rather not use the terminal?
        </Typography>
        <Typography variant="small" color="steel-on-slate">
          Paste this into your AI assistant. It <strong className="text-surface">sets up</strong>{' '}
          and <strong className="text-surface">hands you the link</strong>.
        </Typography>
        <PromptCopy chip prompt={PROMPTS.setup} tone="slate" label="Copy setup prompt" />
      </div>

      <div className="border-slate-line grid gap-10 border-t pt-10">
        <div className="grid content-start justify-items-start gap-3">
          <Typography variant="small" color="steel-on-slate">
            <strong className="text-surface">Just looking?</strong> Ready-made variants, no AI:
          </Typography>
          <CommandCopy command="npx variantly --demo" tone="slate" className="w-full max-w-xl" />
          <PromptCopy chip prompt={PROMPTS.demo} tone="slate" label="Or copy as a prompt" />
        </div>
        <div className="grid content-start justify-items-start gap-3">
          <Typography variant="small" color="steel-on-slate">
            <strong className="text-surface">Stuck?</strong> This names what&apos;s missing:
          </Typography>
          <CommandCopy command="npx variantly doctor" tone="slate" className="w-full max-w-xl" />
          <PromptCopy chip prompt={PROMPTS.doctor} tone="slate" label="Or copy as a prompt" />
        </div>
      </div>
    </div>
  </section>
);

export { StartChecklist };
