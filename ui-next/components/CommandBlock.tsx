'use client';

// Every command the app shows is a block you can copy, never inline code.
import { useState } from 'react';
import { motion } from 'motion/react';
import { toast } from '@/lib/store';

type CommandBlockProps = {
  command: string;
  /** Makes the block an input: the command stays editable, and copyable. */
  onEdit?: (command: string) => void;
  label?: string;
};

const CommandBlock = ({ command, onEdit, label }: CommandBlockProps) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      toast('Command copied', {
        body: 'Paste it into a terminal in your project folder and press Enter.',
      });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast('Couldn’t copy', { body: 'Select the command and copy it yourself.', tone: 'warn' });
    }
  };
  return (
    <div className={onEdit ? 'cmd cmd-edit' : 'cmd'}>
      <span className="cmd-prompt" aria-hidden="true">
        $
      </span>
      {onEdit ? (
        // A textarea so a long command wraps in full instead of scrolling out of sight.
        <textarea value={command} aria-label={label} spellCheck={false} rows={1} onChange={(e) => onEdit(e.target.value.replace(/\n/g, ' '))} />
      ) : (
        <code>{command}</code>
      )}
      <motion.button type="button" className="cmd-copy" onClick={copy} whileTap={{ scale: 0.92 }} aria-label={`Copy ${command}`}>
        {copied ? 'Copied' : 'Copy'}
      </motion.button>
    </div>
  );
};

export { CommandBlock };
