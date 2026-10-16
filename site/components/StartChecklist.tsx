import { CommandCopy } from '@/components/CommandCopy';
import { NodeHint, RunnerPicker } from '@/components/RunnerPicker';
import { PromptCopy } from '@/components/PromptCopy';
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
    className="rounded-pass border-rule bg-surface grid overflow-hidden border lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"
  >
    <div className="grid content-start gap-6 p-6 sm:p-8">
      <div className="grid gap-2">
        <Typography variant="headline" as="h2" id="start-title">
          Before you start
        </Typography>
        <Typography variant="body" color="steel">
          You need these four things. Missing one? Copy its prompt into your AI assistant and it
          sets it up with you.
        </Typography>
      </div>
      <ol className="border-rule m-0 grid list-none border-t p-0">
        {CHECKLIST.map((c, i) => (
          <li
            key={c.id}
            className="border-rule grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 gap-y-3 border-b py-4 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:items-center"
          >
            <span className="figure text-steel text-xl leading-none" aria-hidden="true">
              {i + 1}
            </span>
            <div className="grid gap-1">
              <span className="text-[16px] font-semibold">{c.need}</span>
              <span className="text-steel text-[14px] leading-snug">{c.how}</span>
            </div>
            <PromptCopy
              prompt={c.prompt}
              className="col-start-2 sm:col-start-3 sm:justify-self-end"
            />
          </li>
        ))}
      </ol>
      <PromptCopy prompt={ALL_PROMPTS} label="Copy all four prompts" />
    </div>

    <div className="bg-slate on-slate text-surface grid content-start gap-6 p-6 sm:p-8">
      <div className="grid gap-3">
        <Typography variant="title" as="h3">
          Then run it
        </Typography>
        <Typography variant="small" color="steel-on-slate">
          Open a terminal in your website&apos;s folder and paste:
        </Typography>
        <RunnerPicker tone="slate" />
        <CommandCopy command="npx variantly" tone="slate" />
        <NodeHint tone="slate" />
      </div>

      <div className="grid gap-3">
        <Typography variant="small" color="steel-on-slate">
          Just looking? This runs the whole thing with ready-made designs and no AI:
        </Typography>
        <CommandCopy command="npx variantly --demo" tone="slate" />
        <PromptCopy prompt={PROMPTS.demo} tone="slate" label="Copy as a prompt instead" />
      </div>

      <div className="border-slate-line grid gap-3 border-t pt-6">
        <Typography variant="title" as="h3">
          Rather not use the terminal?
        </Typography>
        <Typography variant="small" color="steel-on-slate">
          Paste this into your AI assistant. It does the setup for you, then hands you the link.
        </Typography>
        <PromptCopy prompt={PROMPTS.setup} tone="slate" preview label="Copy setup prompt" />
      </div>

      <Typography variant="small" color="steel-on-slate">
        Stuck? This says what&apos;s missing:
      </Typography>
      <CommandCopy command="npx variantly doctor" tone="slate" />
      <PromptCopy prompt={PROMPTS.doctor} tone="slate" label="Copy as a prompt instead" />
    </div>
  </section>
);

export { StartChecklist };
