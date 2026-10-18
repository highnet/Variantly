import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-mono font-bold whitespace-nowrap uppercase tracking-[0.06em] condensed transition-[background,color,transform,opacity] duration-150 ease-out-expo disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer',
  {
    variants: {
      variant: {
        primary: 'bg-alert text-on-alert hover:bg-alert-hover active:translate-y-px',
        ink: 'bg-ink text-surface hover:bg-slate-raised active:translate-y-px',
        outline: 'border border-ink bg-transparent text-ink hover:bg-surface active:translate-y-px',
        'outline-slate':
          'border border-steel-on-slate bg-transparent text-surface hover:bg-slate-raised active:translate-y-px',
        tab: 'border-b-2 border-transparent text-steel hover:text-ink aria-selected:border-ink aria-selected:text-ink',
        icon: 'text-steel hover:bg-panel hover:text-ink',
        'icon-slate': 'text-steel-on-slate hover:bg-slate-raised hover:text-surface',
        // Round header control (theme, accessibility); lit while its menu is open.
        'header-icon':
          'text-steel hover:bg-surface hover:text-ink aria-expanded:bg-surface aria-expanded:text-ink [&_svg]:size-4.5',
        // One option of a segmented control on slate; the pressed one glows green.
        segment:
          'normal-case tracking-normal font-sans text-steel-on-slate hover:text-surface aria-pressed:bg-ok-on-slate aria-pressed:text-ink',
        // A small on/off switch in the slate dock.
        'toggle-slate':
          'text-steel-on-slate hover:text-surface aria-pressed:bg-surface aria-pressed:text-ink',
        // A quiet chip that copies a prompt; same footprint in every state.
        prompt:
          'border border-rule bg-surface text-ink normal-case tracking-normal font-sans hover:border-ink active:translate-y-px',
        'prompt-slate':
          'border border-slate-line bg-transparent text-surface normal-case tracking-normal font-sans hover:bg-ink active:translate-y-px',
        // A numbered cell on the slate dock; the current one lifts, white.
        cell: 'relative bg-slate-raised text-surface opacity-55 tracking-normal tabular-nums [font-stretch:75%] hover:opacity-90 aria-[current=true]:bg-surface aria-[current=true]:text-ink aria-[current=true]:opacity-100 aria-[current=true]:-translate-y-0.5 aria-[current=true]:shadow-cell aria-checked:bg-surface aria-checked:text-ink aria-checked:opacity-100 aria-checked:-translate-y-0.5 aria-checked:shadow-cell',
        // A word inside a headline that is also a button (the hero's "a fresh look").
        'headline-word':
          'inline normal-case tracking-[inherit] font-[inherit] [font-stretch:inherit] text-[length:inherit] leading-[inherit] text-inherit whitespace-normal',
        // A word in running text that opens a tip: dotted underline, the text's own type.
        tip: 'inline [text-transform:inherit]! tracking-[inherit] font-[family-name:inherit] font-[weight:inherit] [font-stretch:inherit] text-[length:inherit] leading-[inherit] text-inherit whitespace-normal text-left underline decoration-dotted decoration-current/55 decoration-[1.5px] underline-offset-[0.22em] cursor-help rounded-[2px] hover:decoration-current aria-expanded:decoration-solid aria-expanded:decoration-current',
        // Words in running text that act as a button, styled as the text around them.
        text: 'inline normal-case tracking-[inherit] font-[family-name:inherit] font-[weight:inherit] [font-stretch:inherit] text-[length:inherit] leading-[inherit] text-inherit whitespace-normal text-left hover:underline',
        // A concept chip in the homepage switcher dock.
        concept:
          'normal-case tracking-normal font-sans text-steel hover:text-ink aria-pressed:bg-ink aria-pressed:text-surface',
        // A tile in the concept picker: the selected one inverts, the
        // keyboard-active one gets the alert ring.
        'concept-tile':
          'normal-case tracking-normal font-sans font-semibold text-ink justify-start text-left hover:bg-panel aria-selected:bg-ink aria-selected:text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
        // The show-more pill that sits on a card's bottom edge.
        pill: 'border border-rule bg-surface text-ink normal-case tracking-normal font-sans hover:border-ink',
        'pill-slate':
          'border border-slate-line bg-ink text-surface normal-case tracking-normal font-sans hover:bg-slate-raised',
        // The before/after divider's handle.
        grip: 'bg-ink text-surface shadow-grip hover:scale-105 focus-visible:outline-alert cursor-ew-resize',
      },
      size: {
        default: 'h-10 rounded-chip px-4.5 text-xs',
        big: 'h-13 rounded-chip px-5.5 text-[13px]',
        small: 'h-8 rounded-chip px-3 text-[11px]',
        tab: 'h-11 px-1 text-xs',
        icon: 'size-9 rounded-chip',
        'icon-sm': 'size-7 rounded-chip',
        round: 'size-9 rounded-full',
        none: '',
        segment: 'rounded-[8px] px-2 py-2.5 text-[13px] font-semibold',
        toggle: 'rounded px-1.5 py-1 text-[10px] gap-1.5 [&_svg]:size-3.5',
        // Wraps on narrow screens instead of running off the edge.
        prompt:
          'min-h-8 rounded-control px-2.5 py-1.5 text-left text-[13px] leading-tight font-semibold whitespace-normal',
        cell: 'h-10 min-w-11 rounded-control px-2 text-[15px] aria-[current=true]:min-w-15 aria-[current=true]:text-2xl',
        // A cell in a fixed grid of them (twenty redesigns, ten to a row): the
        // grid sets the width, so the current one lifts and grows its figure
        // without pushing its neighbours.
        'cell-grid': 'h-9 w-full min-w-0 rounded-control px-0 text-[15px] aria-checked:text-2xl',
        pill: 'h-8 rounded-full px-4 text-[13px] font-semibold',
        // Desktop picker row and the phone sheet's large strip tile.
        tile: 'h-11 w-full rounded-control px-2 text-[13px] gap-2.5',
        'tile-lg':
          'h-32 w-40 shrink-0 snap-start flex-col items-start justify-between rounded-pass p-3 text-lg whitespace-normal',
        // Phone dock arrows: at least 44px to hit.
        touch: 'size-11 rounded-full',
        grip: 'h-11 rounded-full px-2 text-[10px] gap-1 tracking-[0.08em]',
      },
    },
    defaultVariants: {
      variant: 'ink',
      size: 'default',
    },
  },
);

type ButtonProps = ComponentProps<'button'> & VariantProps<typeof buttonVariants>;

const Button = ({ variant, size, className, type = 'button', ...props }: ButtonProps) => (
  <button
    data-slot="button"
    type={type}
    className={cn(buttonVariants({ variant, size }), className)}
    {...props}
  />
);

export { Button, buttonVariants };
