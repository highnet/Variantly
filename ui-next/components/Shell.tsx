'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Board } from './Board';
import { ViewSkeleton } from './Skeleton';
import { Checkin } from './Checkin';
import { Compare } from './Compare';
import { Mark } from './Icon';
import { Kept } from './Kept';
import { Prefs } from './Prefs';
import { Rolling } from './Rolling';
import { setState, useStore, type UiState } from '@/lib/store';

type View = 'loading' | 'checkin' | 'board' | 'compare' | 'rolling' | 'kept' | 'stopped';

const pickView = (s: UiState): View => {
  if (s.stopped) return 'stopped';
  if (!s.snap) return 'loading';
  if (s.snap.phase === 'finalized') return 'kept';
  if (s.snap.phase === 'rolling-out') return 'rolling';
  if (s.snap.phase === 'setup') return 'checkin';
  const anyDone = s.snap.variants.some((v) => v.status === 'done');
  if (s.forceBoard || (!anyDone && !s.wantCompare)) return 'board';
  return 'compare';
};

const PHASE: Record<string, string> = { setup: '', generating: 'Generating', ready: 'Ready to compare', 'rolling-out': 'Rolling out site-wide', finalized: 'Kept' };

const KEYS: [string, string][] = [
  ['1–9, 0', 'show variant 1–10'],
  ['← →', 'previous / next variant'],
  ['o', 'show the original'],
  ['s', 'cycle slider · single · side by side'],
  ['m', 'switch desktop · phone'],
  ['i', 'show or hide details'],
  ['c', 'chat with the agent about this variant'],
  ['[ ]', 'nudge the slider'],
  ['Esc', 'close panels'],
];

const Shell = () => {
  const view = useStore(pickView);
  const repo = useStore((s) => s.snap?.repo ?? '');
  const phase = useStore((s) => (s.reconnecting ? 'Reconnecting…' : (PHASE[s.snap?.phase ?? ''] ?? '')));
  const helpOpen = useStore((s) => s.helpOpen);
  const toast = useStore((s) => s.toast);

  useEffect(() => {
    document.body.dataset.view = view;
  }, [view]);

  // Esc closes the key list on every screen, not just in compare.
  useEffect(() => {
    if (!helpOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setState({ helpOpen: false });
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [helpOpen]);

  return (
    <>
      <a className="skip-link" href="#view">
        Skip to content
      </a>
      <header className="bar">
        <a className="wordmark" href="/" aria-label="variantly home">
          <span className="mark">
            <Mark />
          </span>
          variantly
        </a>
        <span className="bar-project">{repo}</span>
        <span className="bar-phase" aria-live="polite">
          {phase}
        </span>
        <span className="bar-spacer" />
        <button className="ghost" type="button" aria-expanded={helpOpen} aria-controls="help" onClick={() => setState({ helpOpen: !helpOpen })}>
          Keys
        </button>
        <Prefs />
      </header>
      <main id="view" tabIndex={-1}>
        {view === 'loading' && <ViewSkeleton label="Connecting to variantly…" />}
        {view === 'stopped' && <div className="loading">variantly has stopped. You can close this tab.</div>}
        {view === 'checkin' && <Checkin />}
        {view === 'board' && <Board />}
        {view === 'compare' && <Compare />}
        {view === 'rolling' && <Rolling />}
        {view === 'kept' && <Kept />}
      </main>
      <aside id="help" className="help" hidden={!helpOpen}>
        <h2>Keys in compare</h2>
        <dl>
          {KEYS.map(([k, d]) => (
            <div key={k} style={{ display: 'contents' }}>
              <dt>
                <kbd>{k}</kbd>
              </dt>
              <dd>{d}</dd>
            </div>
          ))}
        </dl>
      </aside>
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            className={toast.bad ? 'toast bad' : 'toast'}
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export { Shell };
