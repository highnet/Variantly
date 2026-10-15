import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-mono font-bold whitespace-nowrap uppercase tracking-[0.06em] condensed transition-[background,color,transform,opacity] duration-150 ease-out-expo disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer',
  {
    variants: {
      variant: {
        primary: 'bg-alert text-ink hover:bg-alert-hover active:translate-y-px',
        ink: 'bg-ink text-surface hover:bg-slate-raised active:translate-y-px',
        outline: 'border border-ink bg-transparent text-ink hover:bg-surface active:translate-y-px',
        'outline-slate':
          'border border-steel-on-slate bg-transparent text-surface hover:bg-slate-raised active:translate-y-px',
        tab: 'border-b-2 border-transparent text-steel hover:text-ink aria-selected:border-ink aria-selected:text-ink',
        icon: 'text-steel hover:bg-panel hover:text-ink',
        'icon-slate': 'text-steel-on-slate hover:bg-slate-raised hover:text-surface',
        // A quiet chip that copies a prompt; same footprint in every state.
        prompt:
          'border border-rule bg-surface text-ink normal-case tracking-normal font-sans hover:border-ink active:translate-y-px',
        'prompt-slate':
          'border border-slate-line bg-transparent text-surface normal-case tracking-normal font-sans hover:bg-ink active:translate-y-px',
        // A numbered cell on the slate dock; the current one lifts, white.
        cell: 'relative bg-slate-raised text-surface opacity-55 tracking-normal tabular-nums [font-stretch:75%] hover:opacity-90 aria-[current=true]:bg-surface aria-[current=true]:text-ink aria-[current=true]:opacity-100 aria-[current=true]:-translate-y-0.5 aria-[current=true]:shadow-cell',
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
        prompt: 'h-8 rounded-control px-2.5 text-[13px] font-semibold',
        cell: 'h-10 min-w-11 rounded-control px-2 text-[15px] aria-[current=true]:min-w-15 aria-[current=true]:text-2xl',
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
