import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-mono font-bold whitespace-nowrap uppercase tracking-[0.06em] condensed transition-[background,color,transform] duration-150 ease-out-expo active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer',
  {
    variants: {
      variant: {
        primary: 'bg-alert text-ink hover:bg-alert-hover',
        ink: 'bg-ink text-surface hover:bg-slate-2',
        outline: 'border border-ink bg-transparent text-ink hover:bg-surface',
        'outline-slate':
          'border border-steel-on-slate bg-transparent text-surface hover:bg-slate-2',
        tab: 'border-b-2 border-transparent text-steel hover:text-ink aria-selected:border-ink aria-selected:text-ink',
        icon: 'text-steel hover:bg-panel hover:text-ink',
      },
      size: {
        default: 'h-10 rounded-chip px-4.5 text-xs',
        big: 'h-13 rounded-chip px-5.5 text-[13px]',
        small: 'h-8 rounded-chip px-3 text-[11px]',
        tab: 'h-11 px-1 text-xs',
        icon: 'size-9 rounded-chip',
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
