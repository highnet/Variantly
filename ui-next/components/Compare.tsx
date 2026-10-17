'use client';

/*
 * Compare: the original and a design, as a slider, one at a time, or side by
 * side, at desktop or phone width. Iframes are set imperatively and only
 * when what they show changes, so React re-renders never reload a page.
 * A design still being built shows its progress card instead; when it
 * finishes, the card celebrates for a moment before the preview takes over.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import clsx from 'clsx';
import { act, goCompare } from './Board';
import { Chat } from './Chat';
import { Icon, Mark } from './Icon';
import { ProgressCard } from './Progress';
import { PageSkeleton } from './Skeleton';
import { api } from '@/lib/api';
import { fetchLog } from '@/lib/live';
import { LIVE, STATUS, directionLabel, isPickable, pad, plural, scoreText, vname, vsBase, axeVsBase } from '@/lib/format';
import { getState, seen, serverOf, setState, toast, useStore, type UiState } from '@/lib/store';
import type { Audit, ServerState, Variant } from '@/lib/types';

type Side = 'before' | 'after';

const targetUrl = (srv: ServerState | undefined, path: string) => (srv ? `http://${window.location.hostname}:${srv.proxyPort}${path}` : '');

const select = (sel: 'original' | number) => {
  if (getState().sel === sel) return;
  setState({ sel, confirming: false });
  if (typeof sel === 'number') seen(sel);
};

const pickable = (s: UiState) => (s.snap?.variants ?? []).filter(isPickable).map((v) => v.n);

/** Keys work the same whether focus is here or inside a preview frame. */
const handleKey = (key: string) => {
  const s = getState();
  if (key === 'Escape') {
    setState({ confirming: false, infoOpen: false, chatOpen: false, helpOpen: false });
    return;
  }
  const ready = pickable(s);
  if (/^[0-9]$/.test(key)) {
    const n = key === '0' ? 10 : Number(key);
    if (ready.includes(n)) select(n);
    return;
  }
  if (key === 'o') return select('original');
  if (key === 's') {
    const modes = ['slider', 'single', 'side'] as const;
    return setState({ mode: modes[(modes.indexOf(s.mode) + 1) % modes.length] });
  }
  if (key === 'm') return setState({ device: s.device === 'mobile' ? 'desktop' : 'mobile' });
  if (key === 'i') return setState({ infoOpen: !s.infoOpen, chatOpen: false });
  if (key === 'c') return setState({ chatOpen: !s.chatOpen, infoOpen: false });
  if (key === '[') return setState({ split: Math.max(0, s.split - 5) });
  if (key === ']') return setState({ split: Math.min(100, s.split + 5) });
  if ((key === 'ArrowLeft' || key === 'ArrowRight') && ready.length) {
    const list: ('original' | number)[] = ['original', ...ready];
    const i = list.indexOf(s.sel ?? 'original');
    select(list[(i + (key === 'ArrowRight' ? 1 : list.length - 1)) % list.length]);
  }
};

type WaitCardProps = {
  name: string;
  srv?: ServerState;
  target: string;
};

const WaitCard = ({ name, srv, target }: WaitCardProps) => {
  const failed = srv?.state === 'failed';
  return (
    <div className="wait-card">
      <header>
        <span className="figure">{name}</span>
        <span className="status" data-s={failed ? 'failed' : 'scheduled'}>
          <span className="flap-text">{failed ? 'Failed' : 'Starting'}</span>
        </span>
      </header>
      <pre>{failed ? `${srv?.error}\n\n${(srv?.log ?? []).slice(-14).join('\n')}` : (srv?.log ?? []).slice(-14).join('\n') || 'Starting the dev server…'}</pre>
      {failed && (
        <div className="actions on-slate">
          <button className="btn outline small" type="button" onClick={() => api('POST', `ensure/${target}`, {}).catch((err: Error) => toast(err.message, true))}>
            Try again
          </button>
        </div>
      )}
    </div>
  );
};

type ScorePanelProps = {
  v: Variant | null;
};

const ScorePanel = ({ v }: ScorePanelProps) => {
  const snap = useStore((s) => s.snap);
  if (!snap?.config?.audit && !(v ? v.audit : snap?.baseline)) return null;
  const a: Audit | undefined = v ? v.audit : snap?.baseline;
  const base = v ? snap?.baseline : undefined;
  const failed = v ? v.auditState === 'failed' && v.auditError : snap?.baselineError;
  const running = v ? v.auditState === 'running' : !a && !failed;
  const rows: [string, number, number | undefined, typeof vsBase][] = a
    ? [
        ['Accessibility', a.lighthouse.accessibility, base?.lighthouse.accessibility, vsBase],
        ['Performance', a.lighthouse.performance, base?.lighthouse.performance, vsBase],
        ['Best practices', a.lighthouse.bestPractices, base?.lighthouse.bestPractices, vsBase],
        ['SEO', a.lighthouse.seo, base?.lighthouse.seo, vsBase],
        [base ? 'axe issues' : 'axe violations', a.axe.total, base?.axe.total, axeVsBase],
      ]
    : [];
  return (
    <div className="scores-panel">
      <div className="label">{base ? 'Against your original · axe-core and Lighthouse' : 'Scores · axe-core and Lighthouse'}</div>
      {a ? (
        <dl className="scores-grid">
          {rows.map(([k, n, b, show]) => (
            <div key={k} style={{ display: 'contents' }}>
              <dt>{k}</dt>
              <dd className="data">{show(n, b)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="hint">{running ? 'Scoring…' : failed ? `Not scored: ${failed}` : 'Not scored yet.'}</p>
      )}
      {a && a.axe.violations.length > 0 && (
        <ul>
          {a.axe.violations.slice(0, 5).map((x) => (
            <li key={x.help}>
              <strong>{x.impact}</strong> {x.help} ({x.nodes}×)
            </li>
          ))}
        </ul>
      )}
      {!running && (
        <button className="btn outline small" type="button" onClick={() => act('audit', v ? `v${v.n}` : 'original')}>
          {a ? 'Score again' : 'Score now'}
        </button>
      )}
    </div>
  );
};

const Info = () => {
  const open = useStore((s) => s.infoOpen);
  const sel = useStore((s) => s.sel);
  const v = useStore((s) => s.snap?.variants.find((x) => x.n === s.sel) ?? null);
  const runId = useStore((s) => s.snap?.runId);
  const lines = useStore((s) => (typeof s.sel === 'number' ? s.logs[`v${s.sel}`] : undefined));
  // Server chatter alone ("static server on …") isn't worth a log panel.
  const log = (lines ?? []).filter((l) => l.trim() && !/^static server on /.test(l));
  useEffect(() => {
    if (open && typeof sel === 'number') fetchLog(sel);
  }, [open, sel]);
  const close = (
    <button className="icon-btn" type="button" aria-label="Close details" onClick={() => setState({ infoOpen: false })}>
      <Icon name="close" />
    </button>
  );
  return (
    <AnimatePresence>
      {open && (
        <motion.aside className="info" aria-label="Variant details" initial={{ x: 24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 24, opacity: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 36 }}>
          {!v ? (
            <>
              <header>
                <span className="figure">Original</span>
                {close}
              </header>
              <div className="body">
                Your current checkout, as it is.
                <ScorePanel v={null} />
              </div>
            </>
          ) : (
            <>
              <header>
                <div>
                  <div className="figure">{vname(v.n)}</div>
                  <div className="label">{directionLabel(v.direction, v.picked)}</div>
                </div>
                {close}
              </header>
              <div className="body">
                {v.summary && <p style={{ margin: 0 }}>{v.summary}</p>}
                {v.review && (
                  <p style={{ margin: 0 }}>
                    <span className="label">Review </span>
                    {v.review}
                  </p>
                )}
                <ScorePanel v={v} />
                <div>
                  <div className="label">{plural(v.files.length, 'file')} changed</div>
                  <ul>
                    {v.files.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
                <div className="label">Branch {runId ? `variantly/${runId}/v${v.n}` : ''}</div>
              </div>
              {log.length > 0 && <pre>{log.join('\n')}</pre>}
            </>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

const Dock = () => {
  const vs = useStore((s) => s.snap?.variants ?? []);
  const sel = useStore((s) => s.sel);
  const unseen = useStore((s) => s.unseen);
  const mode = useStore((s) => s.mode);
  const device = useStore((s) => s.device);
  const path = useStore((s) => s.path);
  const confirming = useStore((s) => s.confirming);
  const applying = useStore((s) => s.applying);
  const sitewide = useStore((s) => s.sitewide);
  const infoOpen = useStore((s) => s.infoOpen);
  const chatOpen = useStore((s) => s.chatOpen);
  const [draft, setDraft] = useState(path);
  const apply = useRef<HTMLButtonElement>(null);
  const keepBtn = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);
  useEffect(() => setDraft(path), [path]);
  useEffect(() => {
    // Focus moves into the dialog on open and back to Keep when it closes.
    if (confirming) apply.current?.focus();
    else if (wasConfirming.current) keepBtn.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);

  const keep = async (n: number) => {
    setState({ applying: n });
    try {
      await api('POST', `finalize/${n}`, { sitewide });
      setState({ confirming: false });
    } catch (err) {
      toast((err as Error).message, true);
      setState({ confirming: false });
    } finally {
      setState({ applying: null });
    }
  };

  const chosen = vs.find((x) => x.n === sel);
  if (confirming && chosen) {
    return (
      <nav className="dock" aria-label="Variants">
        <div
          className="confirm"
          role="alertdialog"
          aria-modal="true"
          aria-label="Keep this variant?"
          onKeyDown={(e) => {
            if (e.key !== 'Escape' || applying) return;
            e.stopPropagation();
            setState({ confirming: false });
          }}
        >
          <span>
            Apply <strong>{vname(chosen.n)}</strong> ({directionLabel(chosen.direction, chosen.picked)}) to your working tree? <span className="muted">{plural(chosen.files.length, 'file')}. The others stay as branches.</span>
            <label className="muted" style={{ display: 'block', marginTop: 6 }}>
              <input type="checkbox" checked={sitewide} disabled={Boolean(applying)} onChange={(e) => setState({ sitewide: e.target.checked })} /> Restyle the rest of the site to match (one more agent run)
            </label>
          </span>
          <button className="btn outline small" type="button" disabled={Boolean(applying)} onClick={() => setState({ confirming: false })}>
            Cancel
          </button>
          <button ref={apply} className="btn primary" type="button" disabled={Boolean(applying)} onClick={() => keep(chosen.n)}>
            {applying ? (sitewide ? 'Rolling out…' : 'Applying…') : `Apply ${vname(chosen.n)}`}
          </button>
        </div>
      </nav>
    );
  }

  const modeBtn = (m: UiState['mode'], label: string) => (
    <button type="button" aria-pressed={mode === m} aria-label={label} title={`${label} (s)`} onClick={() => setState({ mode: m })}>
      <Icon name={m} />
    </button>
  );
  const deviceBtn = (d: UiState['device'], label: string) => (
    <button type="button" aria-pressed={device === d} aria-label={label} title={`${label} (m)`} onClick={() => setState({ device: d })}>
      <Icon name={d} />
    </button>
  );

  return (
    <nav className="dock" aria-label="Variants">
      <span className="mark" title="variantly">
        <Mark />
      </span>
      <div className="cells" role="group" aria-label="Show">
        <button className="cell orig" type="button" aria-current={sel === 'original'} title="Original (o)" onClick={() => select('original')}>
          Original
        </button>
        {vs.map((v) => {
          const pip = unseen.includes(v.n) ? 'pip' : v.status === 'failed' ? 'pip fail' : ['running', 'reviewing', 'preparing', 'committing', 'queued'].includes(v.status) ? 'pip work' : '';
          return (
            <button
              key={v.n}
              className="cell"
              type="button"
              data-n={v.n}
              disabled={!isPickable(v)}
              aria-current={sel === v.n}
              aria-label={`${vname(v.n)} ${directionLabel(v.direction, v.picked)}, ${STATUS[v.status]}`}
              title={`${vname(v.n)} · ${directionLabel(v.direction, v.picked)} · ${STATUS[v.status]}${v.n <= 10 ? ` (${v.n % 10})` : ''}`}
              onClick={() => select(v.n)}
            >
              {pad(v.n)}
              {pip && <span className={pip} aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      <span className="sep" aria-hidden="true" />
      <div className="modes" role="group" aria-label="View">
        {modeBtn('slider', 'Slider')}
        {modeBtn('single', 'Single')}
        {modeBtn('side', 'Side by side')}
      </div>
      <div className="modes" role="group" aria-label="Screen size">
        {deviceBtn('desktop', 'Desktop')}
        {deviceBtn('mobile', 'Phone')}
      </div>
      <input
        className="path"
        value={draft}
        aria-label="Page path"
        spellCheck={false}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          let p = draft.trim() || '/';
          if (!p.startsWith('/')) p = `/${p}`;
          setState({ path: p });
          e.currentTarget.blur();
        }}
      />
      <span className="sep" aria-hidden="true" />
      <button className="icon-btn" type="button" title="Board" aria-label="Show the board" onClick={() => setState({ forceBoard: true })}>
        <Icon name="board" />
      </button>
      <button className="icon-btn" type="button" title="Chat with the agent (c)" aria-label="Chat with the agent" aria-pressed={chatOpen} onClick={() => setState({ chatOpen: !chatOpen, infoOpen: false })}>
        <Icon name="chat" />
      </button>
      <button className="icon-btn" type="button" title="Details (i)" aria-label="Variant details" aria-pressed={infoOpen} onClick={() => setState({ infoOpen: !infoOpen, chatOpen: false })}>
        <Icon name="info" />
      </button>
      {chosen?.status === 'done' && (
        <button ref={keepBtn} className="btn primary" type="button" onClick={() => setState({ confirming: true })}>
          Keep {vname(chosen.n)}
        </button>
      )}
    </nav>
  );
};

/** Hold a just-finished design's card on screen briefly so it can celebrate. */
const useJustDone = (v: Variant | undefined) => {
  const [hold, setHold] = useState<number | null>(null);
  const prev = useRef<string | undefined>(undefined);
  // Keyed on number and status only: the snapshot object changes every few
  // seconds (live usage), and re-running on that would cancel the timer.
  const key = v ? `${v.n}:${v.status}` : undefined;
  useEffect(() => {
    const was = prev.current;
    prev.current = key;
    if (!key || !was) return;
    const [n, status] = key.split(':');
    const [wasN, wasStatus] = was.split(':');
    // Any live status (running, reviewing, committing) straight to done.
    if (n === wasN && status === 'done' && LIVE.includes(wasStatus as Variant['status'])) setHold(Number(n));
  }, [key]);
  useEffect(() => {
    if (hold === null) return;
    const t = setTimeout(() => setHold(null), 1600);
    return () => clearTimeout(t);
  }, [hold]);
  return hold;
};

const Compare = () => {
  const snap = useStore((s) => s.snap);
  const sel = useStore((s) => s.sel);
  const mode = useStore((s) => s.mode);
  const device = useStore((s) => s.device);
  const split = useStore((s) => s.split);
  const path = useStore((s) => s.path);
  const applying = useStore((s) => s.applying);
  const confirming = useStore((s) => s.confirming);
  const infoOpen = useStore((s) => s.infoOpen);
  const chatOpen = useStore((s) => s.chatOpen);
  const logs = useStore((s) => s.logs);
  const frames = { before: useRef<HTMLIFrameElement>(null), after: useRef<HTMLIFrameElement>(null) };
  const shown = useRef<Record<Side, { target: string; path: string }>>({ before: { target: '', path: '' }, after: { target: '', path: '' } });
  const compareRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [tucked, setTucked] = useState(false);
  // `?recording=1` keeps the dock shown, for filming the app.
  const pinned = useRef(typeof location !== 'undefined' && new URLSearchParams(location.search).get('recording') === '1');
  const [flag, setFlag] = useState<Variant | null>(null);

  const vs = snap?.variants ?? [];
  const live = vs.filter(isPickable);

  // Keep the selection on something that can be shown.
  useEffect(() => {
    if (sel === 'original') return;
    if (!live.some((v) => v.n === sel)) setState({ sel: vs.find((v) => v.status === 'done')?.n ?? live[0]?.n ?? 'original' });
  }, [sel, live, vs]);

  const current = vs.find((v) => v.n === sel);
  const hold = useJustDone(current);
  const building = current && (current.status !== 'done' || hold === current.n) ? current : undefined;
  const lastVariant = useRef<number | null>(null);
  if (typeof sel === 'number') lastVariant.current = sel;
  const variantTarget = sel === 'original' ? (lastVariant.current ? `v${lastVariant.current}` : '') : sel ? `v${sel}` : '';
  let effMode = sel === 'original' ? 'single' : mode;
  if (building && effMode === 'slider') effMode = 'side';

  const want: Record<Side, string> = {
    before: effMode !== 'single' || sel === 'original' ? 'original' : '',
    after: building ? '' : variantTarget,
  };
  const srvBefore = snap ? serverOf(getState(), want.before) : undefined;
  const srvAfter = snap && want.after ? serverOf(getState(), want.after) : undefined;
  const srv: Record<Side, ServerState | undefined> = { before: srvBefore, after: srvAfter };

  // A pane between pointing at a page and that page arriving shows a skeleton.
  const [pending, setPending] = useState<Record<Side, boolean>>({ before: false, after: false });
  const settle = (side: Side) => setPending((p) => (p[side] ? { ...p, [side]: false } : p));

  // Point each frame at its target, only when the target or path changes.
  // A sleeping server is woken once; a failed one waits for "Try again".
  const woken = useRef(new Set<string>());
  useEffect(() => {
    if (applying) return;
    for (const side of ['before', 'after'] as Side[]) {
      const target = want[side];
      if (!target) continue;
      const s = srv[side];
      if (s && s.state !== 'sleeping') woken.current.delete(target);
      if (s?.state === 'sleeping' && !woken.current.has(target)) {
        woken.current.add(target);
        api('POST', `ensure/${target}`, {}).catch(() => {});
      }
      if (s?.state !== 'ready') continue;
      const el = frames[side].current;
      const cur = shown.current[side];
      if (el && (cur.target !== target || cur.path !== path)) {
        el.src = targetUrl(s, path);
        shown.current[side] = { target, path };
        setPending((p) => (p[side] ? p : { ...p, [side]: true }));
      }
    }
  });

  // Chrome recedes after a moment and comes back on any intent to use it.
  const wake = useCallback(() => {
    setTucked(false);
  }, []);
  useEffect(() => {
    if (tucked || pinned.current) return;
    const t = setTimeout(() => {
      const s = getState();
      if (!s.confirming && !s.infoOpen && !compareRef.current?.contains(document.activeElement)) setTucked(true);
    }, 2200);
    return () => clearTimeout(t);
  }, [tucked, sel, mode]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => e.clientY > window.innerHeight - 120 && wake();
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      wake();
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (t?.getAttribute('role') === 'slider' && e.key.startsWith('Arrow')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      handleKey(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    };
    // Preview frames report navigation, scroll and keys through frame.js.
    const onMessage = (e: MessageEvent) => {
      const msg = e.data as { variantly?: boolean; type?: string; path?: string; ratio?: number; key?: string };
      if (!msg?.variantly) return;
      const side = (['before', 'after'] as Side[]).find((k) => frames[k].current?.contentWindow === e.source);
      if (!side) return;
      const other = frames[side === 'before' ? 'after' : 'before'].current;
      if ((msg.type === 'nav' || msg.type === 'ready') && msg.path && msg.path !== getState().path) {
        shown.current[side].path = msg.path;
        setState({ path: msg.path });
      }
      if (msg.type === 'scroll' || msg.type === 'focus') setTucked(true);
      if (msg.type === 'scroll') other?.contentWindow?.postMessage({ variantly: true, type: 'scrollTo', ratio: msg.ratio }, '*');
      if (msg.type === 'key' && msg.key) {
        wake();
        handleKey(msg.key);
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('keydown', onKey);
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('message', onMessage);
    };
    // frames are stable refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wake]);

  // The flag: what you are looking at, for a moment after switching.
  useEffect(() => {
    if (!current) return setFlag(null);
    setFlag(current);
    const t = setTimeout(() => setFlag(null), 4500);
    return () => clearTimeout(t);
    // only on a new selection
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);

  const setSplitFrom = (clientX: number) => {
    const r = compareRef.current?.getBoundingClientRect();
    if (r) setState({ split: Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)) });
  };

  const paneWait = (side: Side) => {
    const target = want[side];
    if (!target) return null;
    const s = srv[side];
    if (s?.state === 'ready') return null;
    return (
      <div className="pane-wait">
        <WaitCard name={target === 'original' ? 'Original' : vname(Number(target.slice(1)))} srv={s} target={target} />
      </div>
    );
  };

  return (
    <div
      ref={compareRef}
      className={clsx('compare', tucked && !confirming && !infoOpen && 'tucked')}
      data-panes-ready={!pending.before && !pending.after ? 'true' : 'false'}
      style={{ ['--split' as string]: `${split}%` }}
    >
      <div className="stage" data-mode={effMode} data-device={device} data-show={sel === 'original' ? 'original' : 'variant'}>
        <div className="pane before">
          <iframe ref={frames.before} title="Original" allow="clipboard-read; clipboard-write" onLoad={() => settle('before')} />
          <PageSkeleton className={clsx(!pending.before && 'done')} />
          {paneWait('before')}
        </div>
        <div className="pane after">
          <iframe ref={frames.after} title="Variant" allow="clipboard-read; clipboard-write" style={{ visibility: building ? 'hidden' : undefined }} onLoad={() => settle('after')} />
          <PageSkeleton className={clsx((!pending.after || building) && 'done')} />
          {building ? (
            <div className="pane-wait">
              <ProgressCard key={building.n} v={building} last={logs[`v${building.n}`]?.at(-1)} />
            </div>
          ) : (
            paneWait('after')
          )}
        </div>
      </div>
      <div className="drag-shield" hidden={!dragging} />
      <div className="divider">
        <button
          className="grip"
          type="button"
          role="slider"
          aria-label="Before and after divider"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(split)}
          aria-valuetext={`${Math.round(split)}% original`}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 10 : 2;
            const to = e.key === 'ArrowLeft' ? split - step : e.key === 'ArrowRight' ? split + step : e.key === 'Home' ? 0 : e.key === 'End' ? 100 : null;
            if (to === null) return;
            e.preventDefault();
            e.stopPropagation();
            setState({ split: Math.max(0, Math.min(100, to)) });
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            setDragging(true);
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => dragging && setSplitFrom(e.clientX)}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
        >
          <span>Before</span>
          <i />
          <span>After</span>
        </button>
      </div>
      <div className="tags" aria-hidden="true">
        <span className="tag">Original</span>
        <span className="tag">{current ? `${vname(current.n)} · ${directionLabel(current.direction, current.picked)}` : ''}</span>
      </div>
      <AnimatePresence>
        {flag && (
          <motion.div key={flag.n} className="flag" role="status" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ type: 'spring', stiffness: 420, damping: 32 }}>
            <span>
              <strong>{directionLabel(flag.direction, flag.picked)}</strong>
              {flag.summary ? ` — ${flag.summary}` : ''}
              {flag.audit && <span className="flag-scores">{scoreText(flag.audit, snap?.baseline)}</span>}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      <Info />
      <Chat />
      <Dock />
    </div>
  );
};

export { Compare, goCompare };
