import { burst } from '@/components/FreshLook';
import { EASE } from '@/lib/motion';
import { calmMotion } from '@/lib/prefs';
import { toast } from '@/lib/toast';

/**
 * The copy celebration: the pressed button pops and a small burst of
 * confetti in the concept's colours flies out of it. Transforms and opacity
 * only. Calm or reduced motion skips it; the "Copied" state and the toast
 * still say it worked.
 */
export const celebrateCopy = (from?: Element | null) => {
  if (!from || calmMotion()) return;
  const r = from.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, 10);
  from.animate(
    [
      { transform: 'scale(0.8)' },
      { transform: 'scale(1.2) rotate(-6deg)', offset: 0.4 },
      { transform: 'none' },
    ],
    { duration: 420, easing: EASE.springPop },
  );
};

type CopyMessage = { title: string; body: string; failBody: string };

const copyText = async (text: string, msg: CopyMessage, from?: Element | null) => {
  try {
    await navigator.clipboard.writeText(text);
    celebrateCopy(from);
    toast(msg.title, { body: msg.body });
    return true;
  } catch {
    toast('Couldn’t copy', { body: msg.failBody, tone: 'warn' });
    return false;
  }
};

/**
 * Copy a terminal command and say what to do with it. Shared by every
 * command block (CommandCopy, the hero's tip) so they all feel the same.
 * Resolves true when the clipboard took it; `from` is the pressed button.
 */
export const copyCommand = (command: string, from?: Element | null) =>
  copyText(
    command,
    {
      title: 'Command copied',
      body: 'Paste it into a new terminal in your site’s folder and press Enter.',
      failBody: 'Select the command and copy it yourself.',
    },
    from,
  );

/** Copy a prompt for the reader's AI assistant (every PromptCopy). */
export const copyPrompt = (prompt: string, from?: Element | null) =>
  copyText(
    prompt,
    {
      title: 'Prompt copied',
      body: 'Paste it into your AI assistant.',
      failBody: 'Select the text and copy it yourself.',
    },
    from,
  );
