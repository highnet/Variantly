import { cva, type VariantProps } from 'class-variance-authority';
import type { ElementType, ReactNode } from 'react';

import { cn } from '@/lib/utils';

const typographyVariants = cva('', {
  variants: {
    variant: {
      // Gate-display figures: the board's large condensed values.
      display: 'figure text-[clamp(2.5rem,6.2vw,6rem)] text-balance',
      // One step below the hero: DESIGN.md's headline scale.
      headline: 'figure text-[clamp(1.75rem,3vw,2.5rem)] text-balance',
      title: 'figure text-[1.375rem]',
      tag: 'font-mono condensed text-[10px] font-semibold uppercase tracking-[0.08em]',
      caption: 'text-[15px] leading-relaxed text-pretty',
      figure: 'figure text-2xl',
      // Field labels on a pass: small tracked mono caps.
      label:
        'font-mono condensed text-[11px] leading-tight font-medium uppercase tracking-[0.08em]',
      data: 'font-mono condensed text-[13px] leading-snug font-medium tabular-nums',
      lead: 'max-w-[60ch] text-lg leading-relaxed text-pretty',
      body: 'max-w-[68ch] text-base leading-relaxed text-pretty',
      small: 'text-sm leading-relaxed',
    },
    color: {
      inherit: '',
      ink: 'text-ink',
      steel: 'text-steel',
      surface: 'text-surface',
      'steel-on-slate': 'text-steel-on-slate',
    },
  },
  defaultVariants: {
    variant: 'body',
    color: 'inherit',
  },
});

const defaultTag = {
  display: 'h1',
  headline: 'h2',
  title: 'h3',
  figure: 'span',
  tag: 'span',
  caption: 'p',
  label: 'span',
  data: 'span',
  lead: 'p',
  body: 'p',
  small: 'p',
} as const;

type TypographyProps = VariantProps<typeof typographyVariants> & {
  as?: ElementType;
  className?: string;
  children: ReactNode;
  id?: string;
};

const Typography = ({ variant, color, as, className, children, id }: TypographyProps) => {
  const Tag = as ?? defaultTag[variant ?? 'body'];
  return (
    <Tag
      data-slot="typography"
      id={id}
      className={cn(typographyVariants({ variant, color }), className)}
    >
      {children}
    </Tag>
  );
};

export { Typography, typographyVariants };
