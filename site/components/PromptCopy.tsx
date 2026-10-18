'use client';

import { Check, ChevronDown, ClipboardCopy, Copy, FileText } from 'lucide-react';
import { useLayoutEffect, useRef, useState, type MouseEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { animateHeight, revealText, squash } from '@/lib/disclose';
import { copyPrompt } from '@/lib/copy';
import { cn } from '@/lib/utils';

type PromptCopyProps = {
  prompt: string;
  label?: string;
  tone?: 'light' | 'slate';
  /** Start with the whole prompt shown. */
  preview?: boolean;
  /** A single primary button instead of the prompt card. */
  accent?: boolean;
  /** A quiet copy button with the prompt's full text under it, instead of the card. */
  chip?: boolean;
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
  chip = false,
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

  const copy = async (e: MouseEvent<HTMLButtonElement>) => {
    const ok = await copyPrompt(prompt, e.currentTarget);
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 1600);
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

  if (chip) {
    // The exact words sit right under the button, never only in a tooltip:
    // nobody should paste a prompt into their assistant without reading it.
    return (
      <div className={cn('grid justify-items-start gap-2.5', className)}>
        <Button
          variant={slate ? 'prompt-slate' : 'prompt'}
          size="prompt"
          onClick={copy}
          className="w-fit gap-1.5"
        >
          {copied ? (
            <Check aria-hidden="true" className="animate-pop" />
          ) : (
            <Copy aria-hidden="true" />
          )}
          <span className="grid [grid-template-areas:'x'] *:[grid-area:x]">
            <span className={cn(copied && 'invisible')}>{label}</span>
            <span aria-hidden={!copied} className={cn(!copied && 'invisible')}>
              Copied
            </span>
          </span>
        </Button>
        <blockquote
          className={cn(
            'm-0 max-w-[62ch] border-l pl-3.5 text-[14px] leading-relaxed',
            slate ? 'border-slate-line text-steel-on-slate' : 'border-rule text-steel',
          )}
        >
          <span className="sr-only">Prompt: </span>
          {prompt}
        </blockquote>
        <span className="sr-only" role="status">
          {copied ? 'Copied to clipboard' : ''}
        </span>
      </div>
    );
  }

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
