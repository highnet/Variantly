import { toast } from '@/lib/toast';

/**
 * Copy a terminal command and say what to do with it. Shared by every
 * command block (CommandCopy, the hero's tip) so they all feel the same.
 * Resolves true when the clipboard took it.
 */
export const copyCommand = async (command: string) => {
  try {
    await navigator.clipboard.writeText(command);
    toast('Command copied', {
      body: 'Paste it into a new terminal in your site’s folder and press Enter.',
    });
    return true;
  } catch {
    toast('Couldn’t copy', { body: 'Select the command and copy it yourself.', tone: 'warn' });
    return false;
  }
};
