'use client';

import { Check, ClipboardCopy, Copy, FileText } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

type PromptCopyProps = {
  prompt: string;
  label?: string;
  tone?: 'light' | 'slate';
  /** Start with the whole prompt shown. */
  preview?: boolean;
  /** A single primary button instead of the prompt card. */
  accent?: boolean;
  className?: string;
};

// Prompts longer than this start clamped behind a show-more pill.
const CLAMP_AT = 90;

/*
 * A prompt for the person's own AI assistant, one click from the clipboard:
 * a card with the prompt text, or, with `accent`, one primary button whose
 * two labels share a grid cell so it keeps one width.
 */
const PromptCopy = ({
  prompt,
  label = 'Copy prompt',
  tone = 'light',
  preview = false,
  accent = false,
  className,
}: PromptCopyProps) => {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(preview);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast('Prompt copied', { body: 'Paste it into your AI assistant.' });
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast('Couldn’t copy', { body: 'Select the text and copy it yourself.', tone: 'warn' });
    }
  };

  const slate = tone === 'slate';

  if (accent) {
    return (
      <Button
        variant="primary"
        size="prompt"
        onClick={copy}
        title={prompt}
        className={cn('w-fit', className)}
      >
        <span className="grid [grid-template-areas:'x'] *:[grid-area:x]">
          <span className={cn('inline-flex items-center gap-1.5', copied && 'invisible')}>
            <ClipboardCopy aria-hidden="true" />
            {label}
          </span>
          <span
            aria-hidden={!copied}
            className={cn(
              'inline-flex items-center justify-center gap-1.5',
              !copied && 'invisible',
            )}
          >
            <Check className="animate-pop" aria-hidden="true" />
            Copied
          </span>
        </span>
      </Button>
    );
  }

  const long = prompt.length > CLAMP_AT;
  return (
    <div className={cn('grid', long && 'pb-4', className)}>
      <div
        data-slot="prompt-copy"
        className={cn(
          'rounded-pass relative border',
          slate ? 'on-slate border-slate-line bg-ink text-surface' : 'border-rule bg-surface',
        )}
      >
        <div
          className={cn(
            'rounded-t-pass flex items-center justify-between gap-3 border-b py-1 pr-1 pl-4',
            slate ? 'border-slate-line text-steel-on-slate' : 'border-rule bg-panel text-steel',
          )}
        >
          <span className="inline-flex items-center gap-2 text-[13px]">
            <FileText aria-hidden="true" className="size-4" />
            Agent prompt
          </span>
          <Button
            variant={slate ? 'icon-slate' : 'icon'}
            size="icon"
            onClick={copy}
            aria-label={copied ? 'Copied' : label}
            title={label}
          >
            {copied ? <Check className="animate-pop" /> : <Copy />}
          </Button>
        </div>
        <p
          className={cn(
            'm-0 px-4 pt-3 text-[14px] leading-relaxed',
            long ? 'pb-6' : 'pb-3.5',
            slate ? 'text-steel-on-slate' : 'text-steel',
          )}
        >
          <span className={cn(long && !open && 'line-clamp-2')}>{prompt}</span>
        </p>
        {long && (
          <Button
            variant={slate ? 'pill-slate' : 'pill'}
            size="pill"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2"
          >
            {open ? 'Show less' : 'Show more'}
          </Button>
        )}
        <span className="sr-only" role="status">
          {copied ? 'Copied to clipboard' : ''}
        </span>
      </div>
    </div>
  );
};

export { PromptCopy };
