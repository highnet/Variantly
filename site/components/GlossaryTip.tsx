import { Fragment } from 'react';

import { Tip, TipCommand } from '@/components/ui/Tip';
import { GLOSSARY, type GlossaryEntry, type GlossaryKey } from '@/lib/glossary';

type GlossaryTipProps = {
  term: GlossaryKey;
  /** The words shown in the text; the term's own label by default. */
  children?: string;
  className?: string;
};

/* A glossary term in running text, explained in a tip. */
const GlossaryTip = ({ term, children, className }: GlossaryTipProps) => {
  const g: GlossaryEntry = GLOSSARY[term];
  return (
    <Tip
      label={children ?? g.label}
      title={g.title}
      href={g.href}
      hrefLabel={g.hrefLabel}
      interactive={Boolean(g.command)}
      className={className}
    >
      {g.command && <TipCommand command={g.command} className="my-1" />}
      {g.body.split('`').map((part, i) =>
        i % 2 ? (
          <code key={i} className="text-surface font-mono text-[12px]">
            {part}
          </code>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </Tip>
  );
};

export { GlossaryTip };
