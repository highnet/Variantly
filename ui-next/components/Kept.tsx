'use client';

import { Fragment } from 'react';
import { motion } from 'motion/react';
import { CommandBlock } from './CommandBlock';
import { api } from '@/lib/api';
import { resetRun } from '@/lib/live';
import { directionLabel, madeBy, pad, plural, scoreText, usageText, vname } from '@/lib/format';
import { setState, toast, useStore } from '@/lib/store';

const Kept = () => {
  const snap = useStore((s) => s.snap);
  if (!snap) return null;
  const n = snap.chosen;
  const v = snap.variants.find((x) => x.n === n);
  const r = snap.result ?? { files: [], conflicts: [], depsChanged: false };

  const newRun = async () => {
    try {
      await api('POST', 'discard', {});
      resetRun();
      setState({ detect: null, form: null });
    } catch (err) {
      toast((err as Error).message, true);
    }
  };

  const shutdown = async () => {
    await api('POST', 'shutdown', {}).catch(() => {});
    setState({ stopped: true });
  };

  return (
    <div className="kept">
      <motion.section
        className="pass"
        aria-labelledby="kept-title"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: [0.98, 1.02, 1] }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      >
        <div className="pass-main">
          <h1 id="kept-title" className="figure big" style={{ margin: 0 }}>
            {n === null ? 'Kept' : vname(n)}
          </h1>
          <div>
            <h2>{directionLabel(v?.direction ?? '', v?.picked)}</h2>
            {v?.summary && (
              <p className="hint" style={{ fontSize: 15 }}>
                {v.summary}
              </p>
            )}
            {v?.review && <p className="hint">Review: {v.review}</p>}
            {v?.audit && <p className="hint data">{scoreText(v.audit, snap.baseline)}</p>}
          </div>
          {r.conflicts.length > 0 && <p className="note bad">Merged with your own edits, with conflicts in {r.conflicts.join(', ')}. Resolve the conflict markers in those files.</p>}
          {r.rollout && (
            <p className="hint">
              Rolled out site-wide: {r.rollout}
              {snap.rollout && <span className="data"> · {usageText(snap.rollout)}</span>}
            </p>
          )}
          {r.rolloutError && <p className="note alert">The site-wide rollout failed ({r.rolloutError}), so only the pages this variant redesigned changed.</p>}
          {r.depsChanged && <p className="note alert">This variant changed dependency files. Run your install command.</p>}
          <div>
            <div className="label" style={{ marginBottom: 8 }}>
              Applied to your working tree, unstaged: {plural(r.files.length, 'file')}
            </div>
            <ul>
              {r.files.map((f, i) => (
                <motion.li key={f} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.04 }}>
                  {f}
                </motion.li>
              ))}
            </ul>
          </div>
          <div>
            <h2>Next</h2>
            <ol>
              <li>
                Review the change. Nothing is committed.
                <CommandBlock command="git diff" />
              </li>
              <li>
                Tune single elements in your agent.
                <CommandBlock command="/impeccable live" />
              </li>
              <li>
                The other variants are kept as branches (variantly/{snap.runId}/…). This removes them:
                <CommandBlock command="npx variantly clean" />
              </li>
            </ol>
          </div>
        </div>
        <aside className="stub">
          <dl>
            <div>
              <dt className="label">Variant</dt>
              <dd>
                {n === null ? '—' : `${vname(n)} of ${pad(snap.variants.length)}`}
              </dd>
            </div>
            {v && madeBy(snap, v) && (
              <div>
                <dt className="label">Made by</dt>
                <dd>{madeBy(snap, v)}</dd>
              </div>
            )}
            <div>
              <dt className="label">Files</dt>
              <dd>{r.files.length}</dd>
            </div>
            <div>
              <dt className="label">Branch</dt>
              <dd className="branch">
                {n === null
                  ? '—'
                  : `variantly/${snap.runId}/v${n}`.split('/').map((part, i, all) => (
                      <Fragment key={i}>
                        <span>{i < all.length - 1 ? `${part}/` : part}</span>
                        <wbr />
                      </Fragment>
                    ))}
              </dd>
            </div>
          </dl>
          <div style={{ display: 'grid', gap: 8 }}>
            <button className="btn primary" type="button" autoFocus onClick={newRun}>
              Start a new run
            </button>
            <button className="btn outline" type="button" onClick={shutdown}>
              Stop variantly
            </button>
          </div>
          <div className="scan" aria-hidden="true" />
        </aside>
      </motion.section>
    </div>
  );
};

export { Kept };
