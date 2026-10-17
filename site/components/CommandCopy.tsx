'use client';

import { Check, Copy, SquareTerminal } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { copyCommand } from '@/lib/copy';
import { useRunner, withRunner } from '@/lib/runner';
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
    const ok = await copyCommand(shown);
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 1600);
  };

  const slate = tone === 'slate';
  const status = (
    <span className="sr-only" role="status">
      {copied ? 'Copied to clipboard' : ''}
    </span>
  );

  if (accent) {
    return (
      <div
        data-slot="command-copy"
        className={cn(
          'rounded-chip flex items-center gap-3 border',
          size === 'sm' ? 'py-1 pr-1 pl-3' : 'py-1.5 pr-1.5 pl-4',
          slate ? 'on-slate border-slate-line bg-ink text-surface' : 'border-rule bg-surface',
          className,
        )}
      >
        <span
          aria-hidden="true"
          className={cn('font-mono text-sm', slate ? 'text-steel-on-slate' : 'text-steel')}
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
          variant="primary"
          size={size === 'sm' ? 'icon-sm' : 'icon'}
          onClick={copy}
          aria-label={copied ? 'Copied' : `Copy ${shown}`}
        >
          {copied ? <Check className="animate-pop" /> : <Copy />}
        </Button>
        {status}
      </div>
    );
  }

  // A terminal card: a labelled header with the copy control, the command below.
  return (
    <div
      data-slot="command-copy"
      className={cn(
        'rounded-pass overflow-hidden border',
        slate ? 'on-slate border-slate-line bg-ink text-surface' : 'border-rule bg-surface',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between gap-3 border-b',
          size === 'sm' ? 'py-0.5 pr-0.5 pl-3' : 'py-1 pr-1 pl-4',
          slate ? 'border-slate-line text-steel-on-slate' : 'border-rule bg-panel text-steel',
        )}
      >
        <span className="inline-flex items-center gap-2 text-[13px]">
          <SquareTerminal aria-hidden="true" className="size-4" />
          terminal
        </span>
        <Button
          variant={slate ? 'icon-slate' : 'icon'}
          size={size === 'sm' ? 'icon-sm' : 'icon'}
          onClick={copy}
          aria-label={copied ? 'Copied' : `Copy ${shown}`}
        >
          {copied ? <Check className="animate-pop" /> : <Copy />}
        </Button>
      </div>
      <code
        className={cn(
          'condensed block font-mono [overflow-wrap:anywhere] break-words whitespace-pre-wrap',
          size === 'sm' ? 'px-3 py-2.5 text-[12px]' : 'px-4 py-3.5 text-sm',
        )}
      >
        {shown}
      </code>
      {status}
    </div>
  );
};

export { CommandCopy };
