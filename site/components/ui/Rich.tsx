import { Fragment, type ReactNode } from 'react';

import { GlossaryTip } from '@/components/GlossaryTip';
import { isGlossaryKey } from '@/lib/glossary';

// [Words](https://url) or {{term}} / {{term|words shown}}.
const TOKEN = /\[([^\]]+)\]\((https?:[^)]+|[#/][\w#/-]*)\)|\{\{([a-z-]+)(?:\|([^}]+))?\}\}/g;

type InlineProps = {
  text: string;
};

/*
 * `text` becomes inline code.
 */
const Code = ({ text }: InlineProps) => (
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

/*
 * [Words](https://url) become a link to that third-party site, [Words](#id)
 * or [Words](/path) a link on this site; {{term}} becomes a glossary tip
 * (lib/glossary.ts).
 */
const Inline = ({ text }: InlineProps) => {
  const out: ReactNode[] = [];
  let at = 0;
  for (const m of text.matchAll(TOKEN)) {
    if (m.index > at) out.push(<Code key={at} text={text.slice(at, m.index)} />);
    const [, words, href, term, shown] = m;
    if (href) {
      out.push(
        href.startsWith('http') ? (
          <a
            key={m.index}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            {words}
          </a>
        ) : (
          <a key={m.index} href={href} className="underline underline-offset-2">
            {words}
          </a>
        ),
      );
    } else if (isGlossaryKey(term)) {
      out.push(
        <GlossaryTip key={m.index} term={term}>
          {shown}
        </GlossaryTip>,
      );
    } else {
      out.push(<Fragment key={m.index}>{shown ?? term}</Fragment>);
    }
    at = m.index + m[0].length;
  }
  if (at < text.length) out.push(<Code key={at} text={text.slice(at)} />);
  return <>{out}</>;
};

type RichProps = {
  text: string;
};

/*
 * Renders copy with **key words** marked: the marked parts become <strong>
 * in ink, so a skimming eye lands on them first.
 */
const Rich = ({ text }: RichProps) => (
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
