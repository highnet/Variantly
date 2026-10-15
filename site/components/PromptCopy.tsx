'use client';

import { Check, ClipboardCopy } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

type PromptCopyProps = {
  prompt: string;
  label?: string;
  tone?: 'light' | 'slate';
  /** Show the prompt text above the button. */
  preview?: boolean;
  className?: string;
};

/*
 * A prompt for the person's own AI assistant, one click from the clipboard.
 * Both labels sit in the same grid cell, so the button keeps one width.
 */
const PromptCopy = ({
  prompt,
  label = 'Copy prompt',
  tone = 'light',
  preview = false,
  className,
}: PromptCopyProps) => {
  const [copied, setCopied] = useState(false);

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
  return (
    <div className={cn('grid gap-2', className)}>
      {preview && (
        <blockquote
          className={cn(
            'm-0 rounded-[4px] border-l-2 px-3 py-2 text-[13px] leading-relaxed',
            slate
              ? 'border-slate-line bg-ink text-steel-on-slate'
              : 'border-rule bg-panel text-steel',
          )}
        >
          {prompt}
        </blockquote>
      )}
      <Button
        variant={slate ? 'prompt-slate' : 'prompt'}
        size="prompt"
        onClick={copy}
        title={preview ? undefined : prompt}
        className="w-fit"
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
    </div>
  );
};

export { PromptCopy };
