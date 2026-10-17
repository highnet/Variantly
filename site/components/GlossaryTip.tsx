import { Fragment } from 'react';

import { Tip } from '@/components/ui/Tip';
import { GLOSSARY, type GlossaryKey } from '@/lib/glossary';

type GlossaryTipProps = {
  term: GlossaryKey;
  /** The words shown in the text; the term's own label by default. */
  children?: string;
  className?: string;
};

/* A glossary term in running text, explained in a tip. */
const GlossaryTip = ({ term, children, className }: GlossaryTipProps) => {
  const g: { label: string; body: string; href?: string; hrefLabel?: string } = GLOSSARY[term];
  return (
    <Tip label={children ?? g.label} href={g.href} hrefLabel={g.hrefLabel} className={className}>
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
