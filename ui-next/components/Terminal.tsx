'use client';

// A design's live agent output, made pleasant to watch: a window bar with
// its name and state, the step strip, and the log with each kind of line
// coloured (commands, tool calls, the direction call-out, errors). New lines
// slide in, a cursor blinks while the agent works, and the view sticks to the
// bottom unless you scroll up to read.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import clsx from 'clsx';
import { act, goCompare } from './Board';
import { Segments } from './Progress';
import { fetchLog } from '@/lib/live';
import { LIVE, STATUS, STEPS, directionLabel, elapsed, stepAt, statusKey, usageText, vname } from '@/lib/format';
import { useStore } from '@/lib/store';
import type { Variant } from '@/lib/types';

type Kind = 'cmd' | 'tool' | 'direction' | 'summary' | 'bad' | 'good' | 'warn' | 'text';

const kindOf = (line: string): Kind => {
  const l = line.trimStart();
  if (l.startsWith('$ ')) return 'cmd';
  if (/^DIRECTION:/i.test(l)) return 'direction';
  if (/^SUMMARY:/i.test(l)) return 'summary';
  if (/^(Failed|Error|✗)|\bECONNREFUSED\b|^ {2}✗/.test(l)) return 'bad';
  if (/^(Warning|↻)/.test(l)) return 'warn';
  if (/^(Committed|Finished|Turn finished)/.test(l)) return 'good';
  if (l.startsWith('→')) return 'tool';
  return 'text';
};

type LineProps = {
  text: string;
  n: number;
  fresh: boolean;
};

const Line = ({ text, n, fresh }: LineProps) => {
  const kind = kindOf(text);
  const body = (() => {
    const t = text.trimStart();
    if (kind === 'cmd')
      return (
        <>
          <span className="t-prompt">$</span> {t.slice(2)}
        </>
      );
    if (kind === 'tool') {
      const [, name = '', rest = ''] = t.match(/^→\s*(\S+)\s?(.*)$/) ?? [];
      return (
        <>
          <span className="t-arrow">→</span> <span className="t-tool">{name}</span> <span className="t-arg">{rest}</span>
        </>
      );
    }
    if (kind === 'direction')
      return (
        <>
          <span className="t-badge">Direction</span> {t.replace(/^DIRECTION:\s*/i, '').replace(/\*/g, '')}
        </>
      );
    if (kind === 'summary')
      return (
        <>
          <span className="t-badge ok">Summary</span> {t.replace(/^SUMMARY:\s*/i, '')}
        </>
      );
    return text;
  })();
  return (
    <motion.div
      className={clsx('t-line', `t-${kind}`)}
      initial={fresh ? { opacity: 0, x: -6 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 34 }}
    >
      <span className="t-n" aria-hidden="true">
        {n}
      </span>
      <span className="t-text">{body}</span>
    </motion.div>
  );
};

type TerminalProps = {
  v: Variant;
};

const Terminal = ({ v }: TerminalProps) => {
  const lines = useStore((s) => s.logs[`v${v.n}`]);
  const total = useStore((s) => s.logTotal[`v${v.n}`] ?? s.logs[`v${v.n}`]?.length ?? 0);
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const seenCount = useRef<number | null>(null);
  const [behind, setBehind] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const live = LIVE.includes(v.status) || v.status === 'queued';

  useEffect(() => {
    fetchLog(v.n);
    seenCount.current = null;
    stick.current = true;
  }, [v.n]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const list = lines ?? [];
  // Only the last 400 lines are kept; `total` counts every line, so numbering,
  // keys and "new output" keep moving once the cap is reached.
  const first = total - list.length;
  // Lines present when this terminal first showed don't animate; new ones do.
  if (seenCount.current === null && lines) seenCount.current = total;

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (stick.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: seenCount.current === total ? 'auto' : 'smooth' });
      setBehind(0);
    } else setBehind((b) => b + 1);
  }, [total]);

  const at = stepAt(v);
  const stepLabel = v.status === 'done' ? 'All steps done' : v.status === 'queued' ? `0/${STEPS.length} · Waiting for a free slot` : LIVE.includes(v.status) ? `${at + 1}/${STEPS.length} · ${STEPS[at]}` : `Stopped at ${STEPS[Math.max(0, at)]}`;

  return (
    <motion.section className="terminal" aria-label={`${vname(v.n)} output`} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 34 }}>
      <header className="t-bar">
        <span className="t-title">
          <span className="figure">{vname(v.n)}</span>
          <span className="t-dir">{directionLabel(v.direction, v.picked)}</span>
        </span>
        <span className="t-meta">
          <span className="data">{elapsed(v, now)}</span>
          <span className="data">{usageText(v)}</span>
          <span className={clsx('t-state', statusKey(v.status))}>
            {LIVE.includes(v.status) && <i className="t-pulse" aria-hidden="true" />}
            {STATUS[v.status]}
          </span>
        </span>
      </header>

      <div className="t-steps">
        <Segments v={v} size="large" />
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={stepLabel} className="t-step" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
            {stepLabel}
          </motion.span>
        </AnimatePresence>
      </div>

      <div
        ref={scroller}
        className="t-screen"
        role="log"
        aria-live="polite"
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 24;
          if (stick.current) setBehind(0);
        }}
      >
        {list.length === 0 && <div className="t-line t-text t-empty">{v.status === 'queued' ? 'Waiting for a free slot…' : 'No output yet.'}</div>}
        {list.map((text, i) => (
          <Line key={first + i} n={first + i + 1} text={text} fresh={first + i >= (seenCount.current ?? Infinity)} />
        ))}
        {live && (
          <div className="t-line t-cursor-line" aria-hidden="true">
            <span className="t-n" />
            <span className="t-cursor" />
          </div>
        )}
      </div>

      <AnimatePresence>
        {behind > 0 && (
          <motion.button
            type="button"
            className="t-jump"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            onClick={() => {
              stick.current = true;
              scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
              setBehind(0);
            }}
          >
            ↓ New output
          </motion.button>
        )}
      </AnimatePresence>

      <footer className="t-foot">
        {v.error && <span className="t-error">{v.error.split('\n')[0]}</span>}
        <span className="t-actions">
          {v.status === 'done' && (
            <button className="btn primary small" type="button" onClick={() => goCompare(v.n)}>
              Compare {vname(v.n)}
            </button>
          )}
          {['failed', 'cancelled'].includes(v.status) && (
            <button className="btn primary small" type="button" onClick={() => act('retry', v.n)}>
              Retry
            </button>
          )}
          {['queued', 'preparing', 'running', 'reviewing'].includes(v.status) && (
            <button className="btn outline small" type="button" onClick={() => act('cancel', v.n)}>
              Stop
            </button>
          )}
        </span>
      </footer>
    </motion.section>
  );
};

export { Terminal };
