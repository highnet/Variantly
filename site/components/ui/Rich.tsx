import { Fragment } from 'react';

/*
 * Renders copy with **key words** marked: the marked parts become <strong>
 * in ink, so a skimming eye lands on them first. [Words](https://url)
 * become a link to that third-party site.
 */
const Inline = ({ text }: { text: string }) => (
  <>
    {text.split(/\[([^\]]+)\]\((https?:[^)]+)\)/g).map((part, i, all) =>
      i % 3 === 1 ? (
        <a
          key={i}
          href={all[i + 1]}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          {part}
        </a>
      ) : i % 3 === 2 ? null : (
        <Fragment key={i}>{part}</Fragment>
      ),
    )}
  </>
);

const Rich = ({ text }: { text: string }) => (
  <>
    {text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
      i % 2 ? (
        <strong key={i} className="text-ink font-semibold">
          <Inline text={part} />
        </strong>
      ) : (
        <Inline key={i} text={part} />
      ),
    )}
  </>
);

export { Rich };
