import { SquareTerminal } from 'lucide-react';

import { cn } from '@/lib/utils';

type LogoMarkProps = {
  title: string;
  path: string | null;
  className?: string;
};

/*
 * One brand mark in the page's ink. Brands without a public mark get a
 * neutral glyph or their initials, never an invented logo.
 */
const LogoMark = ({ title, path, className }: LogoMarkProps) => {
  if (path) {
    return (
      <svg
        viewBox="0 0 24 24"
        role="img"
        aria-label={title}
        className={cn('fill-current', className)}
      >
        <path d={path} />
      </svg>
    );
  }
  if (title === 'Codex') {
    return <SquareTerminal aria-label={title} className={className} strokeWidth={1.6} />;
  }
  return (
    <span
      role="img"
      aria-label={title}
      className={cn(
        'grid place-items-center rounded-[4px] border border-current font-mono text-[0.55em] font-bold',
        className,
      )}
    >
      {title.slice(0, 2)}
    </span>
  );
};

export { LogoMark };
