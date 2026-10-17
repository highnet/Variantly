'use client';

// A prompt for the person's own agent, one click from the clipboard. The same
// card as the site's PromptCopy: "Agent prompt" header with a copy button, the
// prompt text clamped behind a Show more pill when long.
import { useState } from 'react';
import clsx from 'clsx';
import { toast } from '@/lib/store';

type PromptCopyProps = {
  prompt: string;
  label?: string;
};

// Prompts longer than this start clamped behind a show-more pill.
const CLAMP_AT = 90;

const Svg = ({ d, className }: { d: string; className?: string }) => (
  <svg className={clsx('pc-icon', className)} viewBox="0 0 24 24" aria-hidden="true">
    <path d={d} />
  </svg>
);

// lucide: file-text, copy, check, chevron-down
const FILE = 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z M14 2v4a2 2 0 0 0 2 2h4 M10 9H8 M16 13H8 M16 17H8';
const COPY = 'M8 8h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2Z M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2';
const CHECK = 'M20 6 9 17l-5-5';
const CHEVRON = 'm6 9 6 6 6-6';

const PromptCopy = ({ prompt, label = 'Copy prompt' }: PromptCopyProps) => {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const long = prompt.length > CLAMP_AT;

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

  return (
    <div className={clsx('prompt-copy', long && 'is-long')}>
      <div className="pc-card">
        <div className="pc-head">
          <span className="pc-title">
            <Svg d={FILE} />
            Agent prompt
          </span>
          <button className="pc-copy" type="button" onClick={copy} aria-label={copied ? 'Copied' : label} title={label}>
            {copied ? <Svg d={CHECK} className="pc-pop" /> : <Svg d={COPY} />}
          </button>
        </div>
        <p className="pc-body">
          <span className={clsx(long && !open && 'pc-clamp')}>{prompt}</span>
        </p>
        {long && (
          <button className="pc-more" type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {/* Both labels share one cell, so the pill keeps its width. */}
            <span className="pc-labels">
              <span aria-hidden={open} className={clsx(open && 'pc-off')}>
                Show more
              </span>
              <span aria-hidden={!open} className={clsx(!open && 'pc-off')}>
                Show less
              </span>
            </span>
            <Svg d={CHEVRON} className={clsx('pc-chevron', open && 'pc-flip')} />
          </button>
        )}
        <span className="sr-only" role="status">
          {copied ? 'Copied to clipboard' : ''}
        </span>
      </div>
    </div>
  );
};

export { PromptCopy };
