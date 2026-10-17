'use client';

import { Check, ChevronDown, ClipboardCopy, Copy, FileText } from 'lucide-react';
import { useLayoutEffect, useRef, useState, type MouseEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { animateHeight, revealText, squash } from '@/lib/disclose';
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
  const body = useRef<HTMLParagraphElement>(null);
  // The body's height just before a toggle; null when nothing is animating.
  const fromHeight = useRef<number | null>(null);

  // After the clamp changes, spring the card from its old height to the new one.
  useLayoutEffect(() => {
    const el = body.current;
    const from = fromHeight.current;
    if (!el || from === null) return;
    fromHeight.current = null;
    animateHeight(el, from, el.offsetHeight);
    if (open && el.firstElementChild) revealText([el.firstElementChild]);
  }, [open]);

  const toggle = (e: MouseEvent<HTMLButtonElement>) => {
    fromHeight.current = body.current?.offsetHeight ?? null;
    squash(e.currentTarget);
    setOpen((o) => !o);
  };

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
  const long = prompt.length > CLAMP_AT;

  // The prompt itself, clamped behind a crossfading show-more pill when long.
  const toggleButton = long && (
    <Button
      variant={slate ? 'pill-slate' : 'pill'}
      size="pill"
      onClick={toggle}
      aria-expanded={open}
      className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 gap-1.5"
    >
      {/* Both labels share one cell, so the pill keeps its width as they crossfade. */}
      <span className="grid [grid-template-areas:'x'] *:[grid-area:x]">
        <span aria-hidden={open} className={cn('vy-label', open && 'vy-label-off')}>
          Show more
        </span>
        <span aria-hidden={!open} className={cn('vy-label', !open && 'vy-label-off')}>
          Show less
        </span>
      </span>
      <ChevronDown aria-hidden="true" className={cn('vy-chevron size-3.5', open && 'rotate-180')} />
    </Button>
  );
  const promptText = (
    <p
      ref={body}
      className={cn(
        'm-0 px-4 pt-3 text-[14px] leading-relaxed',
        long ? 'pb-6' : 'pb-3.5',
        slate ? 'text-steel-on-slate' : 'text-steel',
      )}
    >
      <span className={cn(long && !open && 'line-clamp-2')}>{prompt}</span>
    </p>
  );

  if (accent) {
    // The button, and right under it the exact words it copies: nobody should
    // paste a prompt into their assistant without seeing it first.
    return (
      <div className={cn('grid gap-3', long && 'pb-4', className)}>
        <Button variant="primary" size="prompt" onClick={copy} title={prompt} className="w-fit">
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
        <div
          data-slot="prompt-copy"
          className={cn(
            'rounded-pass relative border',
            slate ? 'on-slate border-slate-line bg-ink text-surface' : 'border-rule bg-surface',
          )}
        >
          <span
            className={cn(
              'flex items-center gap-2 px-4 pt-2.5 text-[12px]',
              slate ? 'text-steel-on-slate' : 'text-steel',
            )}
          >
            <FileText aria-hidden="true" className="size-3.5" />
            Exactly what you’re copying
          </span>
          {promptText}
          {toggleButton}
        </div>
      </div>
    );
  }

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
        {promptText}
        {toggleButton}
        <span className="sr-only" role="status">
          {copied ? 'Copied to clipboard' : ''}
        </span>
      </div>
    </div>
  );
};

export { PromptCopy };
