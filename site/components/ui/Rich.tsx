import { Fragment } from 'react';

/*
 * Renders copy with **key words** marked: the marked parts become <strong>
 * in ink, so a skimming eye lands on them first. [Words](https://url)
 * become a link to that third-party site, [Words](#id) or [Words](/path) a link on this site,
 * and `text` inline code.
 */
const Code = ({ text }: { text: string }) => (
  <>
    {text.split(/`([^`]+)`/g).map((part, i) =>
      i % 2 ? (
        <code key={i} className="text-ink font-mono text-[0.92em]">
          {part}
        </code>
      ) : (
        <Fragment key={i}>{part}</Fragment>
      ),
    )}
  </>
);

const Inline = ({ text }: { text: string }) => (
  <>
    {text.split(/\[([^\]]+)\]\((https?:[^)]+|[#/][\w#/-]*)\)/g).map((part, i, all) =>
      i % 3 === 1 ? (
        !all[i + 1].startsWith('http') ? (
          <a key={i} href={all[i + 1]} className="underline underline-offset-2">
            {part}
          </a>
        ) : (
          <a
            key={i}
            href={all[i + 1]}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            {part}
          </a>
        )
      ) : i % 3 === 2 ? null : (
        <Code key={i} text={part} />
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
