'use client';

import { Check, ClipboardCopy } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

type PromptCopyProps = {
  prompt: string;
  label?: string;
  tone?: 'light' | 'slate';
  /** Show the prompt text above the button. */
  preview?: boolean;
  className?: string;
};

/* A prompt for the person's own AI assistant, one click from the clipboard. */
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
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
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
      <button
        type="button"
        onClick={copy}
        title={preview ? undefined : prompt}
        className={cn(
          'inline-flex w-fit items-center gap-1.5 rounded-[4px] border px-2.5 py-1.5 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2',
          slate
            ? 'border-slate-line text-surface hover:bg-ink focus-visible:outline-surface'
            : 'border-rule text-ink hover:border-ink focus-visible:outline-ink',
        )}
      >
        {copied ? (
          <Check className="animate-pop size-3.5" aria-hidden="true" />
        ) : (
          <ClipboardCopy className="size-3.5" aria-hidden="true" />
        )}
        {copied ? 'Copied, paste it into your AI' : label}
      </button>
      <span className="sr-only" role="status">
        {copied ? 'Prompt copied to clipboard' : ''}
      </span>
    </div>
  );
};

export { PromptCopy };
