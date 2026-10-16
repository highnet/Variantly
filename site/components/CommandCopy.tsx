'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { useRunner, withRunner } from '@/lib/runner';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

type CommandCopyProps = {
  command: string;
  tone?: 'light' | 'slate';
  /** The copy button carries the page's one yellow action. */
  accent?: boolean;
  /** A compact block for lists. */
  size?: 'default' | 'sm';
  className?: string;
};

const CommandCopy = ({
  command,
  tone = 'light',
  accent,
  size = 'default',
  className,
}: CommandCopyProps) => {
  const [copied, setCopied] = useState(false);
  const runner = useRunner();
  const shown = withRunner(command, runner);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shown);
      setCopied(true);
      toast('Command copied', { body: 'Paste it into a terminal in your site’s folder.' });
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
      toast('Couldn’t copy', { body: 'Select the command and copy it yourself.', tone: 'warn' });
    }
  };

  return (
    <div
      data-slot="command-copy"
      className={cn(
        'rounded-chip flex items-center gap-3 border',
        size === 'sm' ? 'py-1 pr-1 pl-3' : 'py-1.5 pr-1.5 pl-4',
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
      <code
        className={cn(
          'condensed min-w-0 flex-1 font-mono [overflow-wrap:anywhere] break-words whitespace-pre-wrap',
          size === 'sm' ? 'text-[12px]' : 'text-sm',
        )}
      >
        {shown}
      </code>
      <Button
        variant={accent ? 'primary' : tone === 'slate' ? 'outline-slate' : 'icon'}
        size={size === 'sm' ? 'icon-sm' : 'icon'}
        onClick={copy}
        aria-label={copied ? 'Copied' : `Copy ${shown}`}
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
