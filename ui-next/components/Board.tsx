'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import clsx from 'clsx';
import { Icon } from './Icon';
import { Segments } from './Progress';
import { Terminal } from './Terminal';
import { api } from '@/lib/api';
import { clearLog, fetchLog } from '@/lib/live';
import { LIVE, STATUS, STEPS, agentLabel, agentShort, clock, compactTokens, directionLabel, elapsed, isPickable, pad, scoreText, stepAt, stepState, statusKey, usageText, usageTitle, madeBy, vname } from '@/lib/format';
import { seen, setState, toast, useStore } from '@/lib/store';
import type { Variant } from '@/lib/types';

const act = async (verb: string, n: number | string) => {
  if (verb === 'retry' && typeof n === 'number') clearLog(n);
  try {
    await api('POST', `${verb}/${n}`, {});
  } catch (err) {
    toast((err as Error).message, true);
  }
};

/** Open compare on a design: the one asked for, else the first finished, else V01. */
export const goCompare = (n?: number) =>
  setState((s) => {
    const vs = s.snap?.variants ?? [];
    const first = vs.find((v) => v.status === 'done')?.n ?? vs.find(isPickable)?.n ?? 'original';
    return { forceBoard: false, wantCompare: true, sel: n ?? (typeof s.sel === 'number' ? s.sel : first) };
  });

const useNow = () => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
};

type StepCellProps = {
  v: Variant;
  last: string;
};

const StepCell = ({ v, last }: StepCellProps) => {
  const at = stepAt(v);
  const live = LIVE.includes(v.status);
  const label = live
    ? `${at + 1}/${STEPS.length} · ${STEPS[at]}`
    : v.status === 'done'
      ? 'All steps done'
      : v.status === 'queued'
        ? `0/${STEPS.length} · Waiting for a free slot`
        : `Stopped at ${STEPS[Math.max(0, at)]}`;
  return (
    <div className="steps" title={last}>
      <Segments v={v} />
      <span className="now-label">{label}</span>
      {live && <span className="last lastline">{last}</span>}
    </div>
  );
};

type StepListProps = {
  v: Variant;
};

const StepList = ({ v }: StepListProps) => (
  <ol className="step-list" aria-label="Steps">
    {STEPS.map((s, i) => {
      const st = stepState(v, i);
      return (
        <li key={s} className={st}>
          {st === 'done' ? '✓' : i + 1} {s}
        </li>
      );
    })}
  </ol>
);

const Board = () => {
  const snap = useStore((s) => s.snap);
  const openRow = useStore((s) => s.openRow);
  const unseen = useStore((s) => s.unseen);
  const logs = useStore((s) => s.logs);
  const now = useNow();
  // Status changes, announced once each (the table itself is not a live region).
  const [said, setSaid] = useState('');
  const [asking, setAsking] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const confirmBtn = useRef<HTMLButtonElement>(null);
  const discardBtn = useRef<HTMLButtonElement>(null);
  const wasAsking = useRef(false);
  useEffect(() => {
    // Focus moves into the confirm bar on open and back to Discard when it closes.
    if (asking) confirmBtn.current?.focus();
    else if (wasAsking.current) discardBtn.current?.focus();
    wasAsking.current = asking;
  }, [asking]);
  const prevStatus = useRef<Record<number, string>>({});
  const statusKeyAll = (snap?.variants ?? []).map((v) => `${v.n}:${v.status}`).join(',');
  useEffect(() => {
    const changed: string[] = [];
    for (const v of snap?.variants ?? []) {
      const was = prevStatus.current[v.n];
      if (was !== undefined && was !== v.status) changed.push(`${vname(v.n)} ${STATUS[v.status]}`);
      prevStatus.current[v.n] = v.status;
    }
    if (changed.length) setSaid(changed.join('. '));
    // keyed on statuses only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusKeyAll]);
  if (!snap) return null;
  const vs = snap.variants;
  // Rows keep their variant order: V01, V02… never reshuffled as they finish.
  const list = [...vs].sort((a, b) => a.n - b.n);

  const starts = vs.map((v) => v.startedAt).filter((x): x is number => Boolean(x));
  const start = starts.length ? Math.min(...starts) : 0;
  const settled = vs.every((v) => ['done', 'failed', 'cancelled'].includes(v.status));
  const end = settled ? Math.max(0, ...vs.map((v) => v.finishedAt ?? 0)) : now;
  const tokens = vs.reduce((sum, v) => sum + (v.usage ? v.usage.inputTokens + v.usage.outputTokens : 0), 0);
  const credits = vs.reduce((sum, v) => sum + (typeof v.credits === 'number' ? v.credits : 0), 0);
  const cost = vs.reduce((sum, v) => sum + (typeof v.costUsd === 'number' ? v.costUsd : 0), 0);
  // A mix reads out each agent and model with its share and its spend.
  const mixed = Boolean(snap.config?.mix?.length) && !(snap.config?.blind && snap.phase !== 'finalized');
  const groups = new Map<string, { n: number; cost: number }>();
  if (mixed) {
    for (const v of vs) {
      const key = agentLabel(v.agent ?? snap.config?.agent ?? '', v.model ?? snap.config?.model);
      const g = groups.get(key) ?? { n: 0, cost: 0 };
      groups.set(key, { n: g.n + 1, cost: g.cost + (typeof v.costUsd === 'number' ? v.costUsd : 0) });
    }
  }
  const readout = [
    ...(mixed
      ? [...groups].map(([key, g]) => `${key} ×${g.n}${g.cost > 0 ? ` $${g.cost.toFixed(2)}` : ''}`)
      : [snap.config?.mix?.length ? 'Agents hidden' : (agentShort[snap.config?.agent ?? ''] ?? snap.config?.agent ?? '')]),
    `Elapsed ${start ? clock(end - start) : '0:00'}`,
    `${vs.filter((v) => v.status === 'done').length} of ${vs.length} ready`,
    tokens > 0 ? `${compactTokens(tokens)} tokens` : null,
    credits > 0 ? `${credits} premium requests` : null,
    cost > 0 ? `$${cost.toFixed(2)}` : null,
  ].filter(Boolean);

  // The terminal follows the row you pick, else the first design at work.
  const selected = vs.find((v) => v.n === openRow) ?? vs.find((v) => LIVE.includes(v.status)) ?? list[0];
  const toggle = (n: number) => {
    setState({ openRow: n });
    fetchLog(n);
  };

  const discard = async () => {
    setDiscarding(true);
    try {
      await api('POST', 'discard', {});
      setState({ forceBoard: false, wantCompare: false });
    } catch (err) {
      toast((err as Error).message, true);
    } finally {
      setDiscarding(false);
      setAsking(false);
    }
  };
  const finalized = snap.phase === 'finalized';

  return (
    <div className={clsx('boardview', selected && 'with-terminal')}>
      <section className="board" aria-labelledby="board-title">
        <header className="board-head">
          <div style={{ display: 'grid', gap: 6 }}>
            <h1 id="board-title" className="figure">
              {pad(vs.length)} variants
            </h1>
            <div className="label readout">
              {readout.map((p) => (
                <span key={String(p)}>{p}</span>
              ))}
            </div>
          </div>
          {asking ? (
            <div
              className="confirm board-confirm"
              role="alertdialog"
              aria-modal="true"
              aria-label={finalized ? 'Start over?' : 'Discard this run?'}
              onKeyDown={(e) => {
                if (e.key !== 'Escape' || discarding) return;
                e.stopPropagation();
                setAsking(false);
              }}
            >
              <span>
                {finalized ? (
                  <>
                    Start over? <span className="muted">The variant you kept stays in your working tree.</span>
                  </>
                ) : (
                  <>
                    Throw away every variant in this run? <span className="muted">Worktrees and branches are deleted.</span>
                  </>
                )}
              </span>
              <button className="btn outline small" type="button" disabled={discarding} onClick={() => setAsking(false)}>
                Cancel
              </button>
              <button ref={confirmBtn} className="btn primary" type="button" disabled={discarding} onClick={discard}>
                {discarding ? 'Discarding…' : finalized ? 'Start over' : 'Discard run'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button ref={discardBtn} className="btn outline" type="button" onClick={() => setAsking(true)}>
                Discard run
              </button>
              <button className="btn primary" type="button" disabled={!vs.some(isPickable)} onClick={() => goCompare()}>
                Compare <Icon name="arrow" />
              </button>
            </div>
          )}
        </header>
        <table>
          <thead>
            <tr>
              <th className="label">Variant</th>
              <th className="label">Direction</th>
              <th className="label">Status</th>
              <th className="label">Time</th>
              <th className="label hide-compact">Files</th>
              <th className="label">Usage</th>
              <th className="label">Step</th>
            </tr>
          </thead>
          <tbody>
            {(snap.config?.audit || snap.baseline) && (
              <tr className="baseline">
                <td className="var figure">Original</td>
                <td className="dir">
                  Your site as it is
                  <span className="summary scores">{snap.baseline ? scoreText(snap.baseline) : snap.baselineError ? `Not scored: ${snap.baselineError}` : 'Scoring with axe-core and Lighthouse…'}</span>
                </td>
                <td>
                  <span className="status" data-s="scheduled">
                    <span className="flap-text">Baseline</span>
                  </span>
                </td>
                <td colSpan={4} />
              </tr>
            )}
            {list.map((v) => {
              const last = logs[`v${v.n}`]?.at(-1) ?? '';
              return [
                <motion.tr
                  key={v.n}
                  layout
                  transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                  className={clsx('clickable', selected?.n === v.n && 'selected')}
                  onClick={() => toggle(v.n)}
                  onMouseEnter={() => seen(v.n)}
                  onFocus={() => seen(v.n)}
                >
                  <td className="var figure">
                    <button
                      type="button"
                      className="row-btn"
                      aria-pressed={selected?.n === v.n}
                      aria-label={`Show ${vname(v.n)} output`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(v.n);
                      }}
                    >
                      {vname(v.n)}
                    </button>
                  </td>
                  <td className="dir">
                    {directionLabel(v.direction, v.picked)}
                    {madeBy(snap, v) && <span className="tag made-by">{madeBy(snap, v)}</span>}
                    {v.summary ? <span className="summary">{v.summary}</span> : v.error ? <span className="summary">{v.error.split('\n')[0]}</span> : null}
                    {v.review && <span className="summary">Review: {v.review}</span>}
                    {v.auditState === 'running' && <span className="summary">Scoring with axe-core and Lighthouse…</span>}
                    {v.auditState === 'failed' && <span className="summary">Not scored: {v.auditError ?? 'the audit failed'}</span>}
                    {v.audit && <span className="summary scores">{scoreText(v.audit, snap.baseline)}</span>}
                  </td>
                  <td>
                    <span className={clsx('status', unseen.includes(v.n) && 'unseen')} data-s={statusKey(v.status)}>
                      <motion.span key={v.status} className="flap-text" initial={{ rotateX: -90, opacity: 0 }} animate={{ rotateX: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                        {STATUS[v.status]}
                      </motion.span>
                      {['running', 'reviewing'].includes(v.status) && (
                        <span className="working-bars" aria-hidden="true">
                          <i />
                          <i />
                          <i />
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="num data">{elapsed(v, now)}</td>
                  <td className="num data hide-compact">{v.files?.length ? String(v.files.length) : '—'}</td>
                  <td className="num data" title={usageTitle(v)}>
                    {usageText(v)}
                  </td>
                  <td className="step-cell">
                    <StepCell v={v} last={last} />
                  </td>
                </motion.tr>,
              ];
            })}
          </tbody>
        </table>
      </section>
      {selected && <Terminal key={selected.n} v={selected} />}
      <p className="sr-only" aria-live="polite">
        {said}
      </p>
    </div>
  );
};

export { Board, StepList, act };
