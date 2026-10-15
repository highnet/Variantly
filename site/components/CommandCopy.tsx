'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

type CommandCopyProps = {
  command: string;
  tone?: 'light' | 'slate';
  /** The copy button carries the page's one yellow action. */
  accent?: boolean;
  className?: string;
};

const CommandCopy = ({ command, tone = 'light', accent, className }: CommandCopyProps) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      data-slot="command-copy"
      className={cn(
        'rounded-chip flex items-center gap-3 border py-1.5 pr-1.5 pl-4',
        tone === 'slate'
          ? 'on-slate border-slate-line bg-ink text-surface'
          : 'border-rule bg-surface',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn('font-mono text-sm', tone === 'slate' ? 'text-steel-on-slate' : 'text-steel')}
      >
        $
      </span>
      <code className="condensed min-w-0 flex-1 overflow-x-auto font-mono text-sm whitespace-nowrap">
        {command}
      </code>
      <Button
        variant={accent ? 'primary' : tone === 'slate' ? 'outline-slate' : 'icon'}
        size="icon"
        onClick={copy}
        aria-label={copied ? 'Copied' : `Copy ${command}`}
      >
        {copied ? <Check className="animate-pop" /> : <Copy />}
      </Button>
      <span className="sr-only" role="status">
        {copied ? 'Copied to clipboard' : ''}
      </span>
    </div>
  );
};

export { CommandCopy };
