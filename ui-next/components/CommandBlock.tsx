'use client';

// Every command the app shows is a block you can copy, never inline code.
import { useState } from 'react';
import { motion } from 'motion/react';

type CommandBlockProps = {
  command: string;
};

const CommandBlock = ({ command }: CommandBlockProps) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <div className="cmd">
      <span className="cmd-prompt" aria-hidden="true">
        $
      </span>
      <code>{command}</code>
      <motion.button type="button" className="cmd-copy" onClick={copy} whileTap={{ scale: 0.92 }} aria-label={`Copy ${command}`}>
        {copied ? 'Copied' : 'Copy'}
      </motion.button>
    </div>
  );
};

export { CommandBlock };
