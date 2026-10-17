'use client';

import { Fragment, useState } from 'react';
import { motion } from 'motion/react';
import { CommandBlock } from './CommandBlock';
import { PromptCopy } from './PromptCopy';
import { api } from '@/lib/api';
import { resetRun } from '@/lib/live';
import { directionLabel, madeBy, pad, plural, scoreText, usageText, vname } from '@/lib/format';
import { setState, toast, useStore } from '@/lib/store';

const Kept = () => {
  const snap = useStore((s) => s.snap);
  const [starting, setStarting] = useState(false);
  const [siteUrl, setSiteUrl] = useState('');
  if (!snap) return null;
  const n = snap.chosen;
  const v = snap.variants.find((x) => x.n === n);
  const r = snap.result ?? { files: [], conflicts: [], depsChanged: false };

  // What the person's own agent needs to carry on: what was kept, where, the
  // design notes to follow, and what to check. Tool output never counts.
  const files = r.files.filter((f) => !f.startsWith('.playwright-mcp/'));
  const who = v ? madeBy(snap, v) : '';
  const handoff = [
    `I just kept a redesign of this site, made with variantly. ${n === null ? 'The kept variant' : vname(n)}, "${directionLabel(v?.direction ?? '', v?.picked)}"${who ? ` (made by ${who})` : ''}, is applied to my working tree in ${snap.repo} as uncommitted changes.`,
    files.includes('DESIGN.md') ? 'Read DESIGN.md first: it describes the visual system this redesign uses. Follow it for anything you change.' : '',
    files.length ? `Changed files: ${files.join(', ')}.` : '',
    r.rollout ? `It was already carried to the rest of the site (${r.rollout}).` : r.rolloutError ? 'Only the redesigned pages changed; the rest of the site still has the old style.' : '',
    siteUrl
      ? `The site is running locally at ${siteUrl}; use it to check your changes in a browser.`
      : 'The site isn’t running yet: start it with your dev command (or the “Open your site” button in variantly) and check your changes in a browser.',
    'Please:',
    '1. Review the diff (git diff) for anything broken, missing or off-brand.',
    '2. Check every page at desktop and phone widths, and fix layout, contrast and accessibility problems, keeping to the design.',
    '3. Don’t commit. When you’re done, summarise what you changed.',
    `The other variants are on the branches variantly/${snap.runId}/v1, v2 and so on, if I want to borrow something from one.`,
  ]
    .filter(Boolean)
    .join('\n');

  const newRun = async () => {
    try {
      await api('POST', 'discard', {});
      resetRun();
      setState({ detect: null, form: null });
    } catch (err) {
      toast((err as Error).message, true);
    }
  };

  const openSite = async () => {
    // Opened now, inside the click, so the browser doesn't block it as a popup.
    const tab = window.open('about:blank', '_blank');
    setStarting(true);
    try {
      const { url } = await api<{ url: string }>('POST', 'open-site', {});
      setSiteUrl(url);
      if (tab) tab.location.href = url;
      else window.open(url, '_blank', 'noopener');
      toast('Your site is running', { body: url });
    } catch (err) {
      tab?.close();
      toast('Could not start your site', { body: (err as Error).message, tone: 'error' });
    } finally {
      setStarting(false);
    }
  };

  const openFolder = async () => {
    try {
      await api('POST', 'open-folder', {});
    } catch (err) {
      toast('Could not open the folder', { body: (err as Error).message, tone: 'error' });
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
          <div className="where">
            <p>{n === null ? 'The kept variant' : vname(n)} is now in your project folder, as uncommitted changes:</p>
            <p className="where-path">{snap.repo}</p>
            <div className="where-actions">
              <button className="btn primary" type="button" onClick={openSite} disabled={starting} aria-busy={starting}>
                {starting ? 'Starting…' : 'Open your site'}
              </button>
              <button className="btn outline" type="button" onClick={openFolder}>
                Open folder
              </button>
            </div>
            <p className="hint">
              The other variants stay as git branches named variantly/{snap.runId}/vN until you remove them (see Next).
            </p>
          </div>
          <div className="handoff">
            <h2>Hand off to your agent</h2>
            <p className="hint">Paste this into Claude Code, Copilot or any agent to review and finish the redesign.</p>
            <PromptCopy prompt={handoff} />
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
              Changed in your project (not committed): {plural(r.files.length, 'file')}
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
