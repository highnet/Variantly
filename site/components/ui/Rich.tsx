import { Fragment } from 'react';

/*
 * Renders copy with **key words** marked: the marked parts become <strong>
 * in ink, so a skimming eye lands on them first.
 */
const Rich = ({ text }: { text: string }) => (
  <>
    {text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
      i % 2 ? (
        <strong key={i} className="text-ink font-semibold">
          {part}
        </strong>
      ) : (
        <Fragment key={i}>{part}</Fragment>
      ),
    )}
  </>
);

export { Rich };
