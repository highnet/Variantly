'use client';

// While a kept variant is rolled out to the rest of the site: the agent's
// live output, its time and spend, and a way to call the keep off.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Line } from './Terminal';
import { api } from '@/lib/api';
import { clock, directionLabel, usageText, vname } from '@/lib/format';
import { setState, toast, useStore } from '@/lib/store';

// One shared empty list: a fresh [] per read makes useSyncExternalStore see a
// change every time and re-render forever (React error #185).
const NO_LINES: string[] = [];

const Rolling = () => {
  const snap = useStore((s) => s.snap);
  const lines = useStore((s) => s.logs.rollout ?? NO_LINES);
  const [now, setNow] = useState(Date.now());
  const [cancelling, setCancelling] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // History once on arrival (a reload mid-rollout), merged ahead of what streams in.
  useEffect(() => {
    api<{ lines: string[] }>('GET', 'rollout-log')
      .then(({ lines: past }) =>
        setState((s) => {
          const have = s.logs.rollout ?? [];
          return { logs: { ...s.logs, rollout: [...past.filter((l) => !have.includes(l)), ...have] } };
        }),
      )
      .catch(() => {});
  }, []);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  if (!snap) return null;
  const r = snap.rollout;
  const v = snap.variants.find((x) => x.n === (r?.n ?? snap.chosen));

  const cancel = async () => {
    setCancelling(true);
    try {
      await api('POST', 'cancel-rollout', {});
    } catch (err) {
      toast((err as Error).message, true);
      setCancelling(false);
    }
  };

  return (
    <div className="kept rolling">
      <section className="pass" aria-labelledby="rolling-title">
        <div className="pass-main">
          <h1 id="rolling-title" style={{ margin: 0 }}>
            Rolling {v ? vname(v.n) : 'the variant'} out to the whole site
          </h1>
          <p className="hint">
            {v && <>{directionLabel(v.direction, v.picked)}. </>}
            One more agent run carries this style to every other page. Nothing reaches your working tree until it finishes; cancel and nothing is applied.
          </p>
          <section className="terminal" aria-label="Rollout output">
            <header className="t-bar">
              <span className="t-title">Rollout</span>
              <span className="t-meta">
                <span className="data">{r ? clock(now - r.startedAt) : '—'}</span>
                <span className="data">{r ? usageText(r) : '—'}</span>
                <span className="t-state running">
                  <i className="t-pulse" aria-hidden="true" />
                  {cancelling ? 'Cancelling' : 'Working'}
                </span>
              </span>
            </header>
            <div ref={scroller} className="t-screen" role="log" aria-live="polite">
              {lines.length === 0 && <div className="t-line t-text t-empty">Starting…</div>}
              {lines.map((text, i) => (
                <Line key={i} n={i + 1} text={text} fresh={false} />
              ))}
            </div>
          </section>
          <div>
            <button className="btn outline" type="button" disabled={cancelling} onClick={cancel}>
              {cancelling ? 'Cancelling…' : 'Cancel and pick again'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export { Rolling };
