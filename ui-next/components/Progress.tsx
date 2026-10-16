'use client';

// A variant's progress, made to feel earned: segments snap full with a
// spring (staggered, after a beat of anticipation), the live segment
// shimmers at its leading edge, the step number rolls rather than jumps,
// and finishing gets one small, local celebration. Reduced motion keeps the
// colour and check changes and drops the movement (MotionConfig in page.tsx).
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import clsx from 'clsx';
import { LIVE, STEPS, clock, directionLabel, elapsedMs, stepAt, stepState, vname } from '@/lib/format';
import type { Variant } from '@/lib/types';

const SPRING = { type: 'spring', stiffness: 180, damping: 18 } as const;

type SegmentsProps = {
  v: Variant;
  size?: 'small' | 'large';
};

/** One segment per step. Each fills with a spring when its step completes. */
const Segments = ({ v, size = 'small' }: SegmentsProps) => (
  <div className={clsx('seg-track', size)} aria-hidden="true">
    {STEPS.map((s, i) => {
      const st = stepState(v, i);
      return (
        <span key={s} className={clsx('seg', st)}>
          <motion.i
            className="seg-fill"
            initial={false}
            animate={{ width: st === 'done' ? '100%' : st === 'now' ? '35%' : '0%' }}
            transition={{ ...SPRING, delay: 0.15 + i * 0.05 }}
          />
          {st === 'now' && <i className="seg-shine" />}
        </span>
      );
    })}
  </div>
);

type CheckProps = {
  on: boolean;
};

/** A dot that draws itself into a checkmark. */
const Check = ({ on }: CheckProps) => (
  <svg className="tick" viewBox="0 0 16 16" aria-hidden="true">
    <motion.circle cx="8" cy="8" r="7" initial={false} animate={{ scale: on ? 1 : 0.55 }} transition={SPRING} />
    <motion.path d="M4.5 8.3l2.2 2.2 4.8-5" initial={false} animate={{ pathLength: on ? 1 : 0, opacity: on ? 1 : 0 }} transition={{ duration: 0.25, ease: 'easeOut', delay: on ? 0.15 : 0 }} />
  </svg>
);

/** A few particles from the end of the bar: small, local, once. */
const Burst = () => (
  <span className="burst" aria-hidden="true">
    {Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2;
      return (
        <motion.i
          key={i}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: Math.cos(a) * (28 + (i % 3) * 10), y: Math.sin(a) * (22 + (i % 2) * 10), opacity: 0, scale: 0.4 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      );
    })}
  </span>
);

type ProgressCardProps = {
  v: Variant;
  last?: string;
};

const ProgressCard = ({ v, last }: ProgressCardProps) => {
  const reduce = useReducedMotion();
  const at = stepAt(v);
  const done = v.status === 'done';
  const shown = Math.max(0, Math.min(at + (done ? 0 : 1), STEPS.length));
  const prevAt = useRef(at);
  const [delta, setDelta] = useState(0);
  const [celebrate, setCelebrate] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const gained = at - prevAt.current;
    prevAt.current = at;
    if (gained > 0 && !done) {
      setDelta((d) => d + 1);
    }
    if (done && gained > 0) {
      setCelebrate(true);
      navigator.vibrate?.(10);
      const t = setTimeout(() => setCelebrate(false), 900);
      return () => clearTimeout(t);
    }
  }, [at, done]);

  const next = (LIVE.includes(v.status) || v.status === 'queued') && at + 1 < STEPS.length ? STEPS[at + 1] : null;

  return (
    <motion.div
      className={clsx('progress-card', done && 'is-done')}
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={celebrate && !reduce ? { opacity: 1, y: 0, scale: [1, 1.03, 1] } : { opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
      whileTap={{ scale: 0.98 }}
    >
      <header>
        <span className="figure">{vname(v.n)}</span>
        <span className="progress-count" aria-live="polite">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={done ? 'done' : shown} initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 30 }}>
              {done ? '✓ Done' : `${shown} of ${STEPS.length}`}
            </motion.span>
          </AnimatePresence>
          <AnimatePresence>
            {delta > 0 && !done && (
              <motion.span key={delta} className="delta" initial={{ y: 0, opacity: 0 }} animate={{ y: -18, opacity: [0, 1, 0] }} transition={{ duration: 1.1, ease: 'easeOut' }}>
                +1 step
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </header>

      <div className="progress-body">
        <p className="progress-dir">{directionLabel(v.direction, v.picked)}</p>
        <div className="progress-bar">
          <Segments v={v} size="large" />
          {celebrate && !reduce && <Burst />}
        </div>
        <p className="progress-now">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={done ? 'd' : at} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
              {done ? 'Ready to compare.' : LIVE.includes(v.status) ? STEPS[Math.max(0, at)] : v.status === 'queued' ? `0/${STEPS.length} · Waiting for a free slot` : `Stopped at ${STEPS[Math.max(0, at)]}`}
            </motion.span>
          </AnimatePresence>
          {next && <span className="progress-next">Next: {next}</span>}
        </p>
        <ol className="progress-steps">
          {STEPS.map((s, i) => {
            const st = stepState(v, i);
            return (
              <li key={s} className={st}>
                <Check on={st === 'done' || done} />
                <span>{s}</span>
              </li>
            );
          })}
        </ol>
        <p className="progress-time">
          {v.status === 'queued' ? 'It starts as soon as a slot frees up. You can look at other variants meanwhile.' : (<><span className="data">{clock(elapsedMs(v, now))}</span> {done ? 'in total.' : 'so far. You can look at other variants meanwhile.'}</>)}
        </p>
      </div>
      {last && !done && <pre className="progress-last">{last}</pre>}
    </motion.div>
  );
};

export { ProgressCard, Segments };
