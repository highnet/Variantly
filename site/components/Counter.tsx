import type { ReactNode } from 'react';

import { Typography } from '@/components/ui/Typography';
import { cn } from '@/lib/utils';

type CounterProps = {
  id: string;
  number: number;
  name: string;
  title: string;
  children: ReactNode;
  intro?: ReactNode;
  className?: string;
  compact?: boolean;
};

/*
 * One stop on the journey. The counter sign is numbered because the order is
 * the product's order: check in, watch the board, compare, keep.
 */
const Counter = ({
  id,
  number,
  name,
  title,
  intro,
  children,
  className,
  compact,
}: CounterProps) => (
  <section id={id} aria-labelledby={`${id}-title`} className={cn('scroll-mt-20', className)}>
    <div
      className={cn(
        'mb-6 grid gap-x-8 gap-y-3',
        !compact && 'md:grid-cols-[auto_1fr] md:items-end',
      )}
    >
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="figure rounded-chip bg-ink text-surface grid size-12 place-items-center text-2xl">
          {number}
        </span>
        <Typography variant="label" color="steel">
          Counter {number} · {name}
        </Typography>
      </div>
      <div className="grid gap-2">
        <Typography variant={compact ? 'title' : 'headline'} as="h2" id={`${id}-title`}>
          {title}
        </Typography>
        {intro}
      </div>
    </div>
    {children}
  </section>
);

export { Counter };
