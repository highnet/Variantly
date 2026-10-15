'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';

import { useRun } from '@/components/RunProvider';
import { Button } from '@/components/ui/Button';
import { DEMO_VARIANTS } from '@/lib/content';
import { cn } from '@/lib/utils';

const src = (n: number) => `/demo/oak-and-iron/v${n}/index.html`;
const vname = (n: number) => `V${String(n).padStart(2, '0')}`;

/*
 * The real comparison: the Oak & Iron example on the left of the divider, a
 * variant the demo agent produced on the right. Both are the actual pages
 * (same origin), so scrolling one scrolls the other by ratio.
 */
const Compare = () => {
  const { statuses, selected, select, keep, unseen } = useRun();
  const [split, setSplit] = useState(50);
  const [dragging, setDragging] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const before = useRef<HTMLIFrameElement>(null);
  const after = useRef<HTMLIFrameElement>(null);
  const quiet = useRef(0);

  const syncFrom = useCallback((from: HTMLIFrameElement | null, to: HTMLIFrameElement | null) => {
    const fw = from?.contentWindow;
    const tw = to?.contentWindow;
    if (!fw || !tw || Date.now() < quiet.current) return;
    const fe = fw.document.scrollingElement;
    const te = tw.document.scrollingElement;
    if (!fe || !te) return;
    const ratio = fe.scrollTop / Math.max(1, fe.scrollHeight - fw.innerHeight);
    quiet.current = Date.now() + 60;
    te.scrollTop = ratio * Math.max(0, te.scrollHeight - tw.innerHeight);
  }, []);

  const wire = useCallback(
    (frame: HTMLIFrameElement | null, other: () => HTMLIFrameElement | null) => {
      const win = frame?.contentWindow;
      if (!win) return;
      win.addEventListener('scroll', () => syncFrom(frame, other()), { passive: true });
    },
    [syncFrom],
  );

  useEffect(() => {
    const b = before.current;
    const a = after.current;
    const onB = () => wire(b, () => after.current);
    const onA = () => {
      wire(a, () => before.current);
      syncFrom(before.current, a);
    };
    b?.addEventListener('load', onB);
    a?.addEventListener('load', onA);
    return () => {
      b?.removeEventListener('load', onB);
      a?.removeEventListener('load', onA);
    };
  }, [wire, syncFrom]);

  const move = (e: PointerEvent<HTMLElement>) => {
    if (!dragging || !stage.current) return;
    const r = stage.current.getBoundingClientRect();
    setSplit(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)));
  };

  const onGripKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = e.shiftKey ? 10 : 2;
    const next =
      e.key === 'ArrowLeft'
        ? split - step
        : e.key === 'ArrowRight'
          ? split + step
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? 100
              : null;
    if (next === null) return;
    e.preventDefault();
    setSplit(Math.max(0, Math.min(100, next)));
  };

  const readyCount = statuses.filter((s) => s === 'ready').length;
  const current = DEMO_VARIANTS[selected - 1];

  return (
    <div className="rounded-pass border-rule bg-surface shadow-lift overflow-hidden border">
      <div
        ref={stage}
        className="relative h-[min(72vh,680px)] min-h-[420px] touch-none select-none"
        style={{ ['--split' as string]: `${split}%` }}
        onPointerMove={move}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      >
        <iframe
          ref={before}
          src={src(0)}
          title="Oak & Iron, the original"
          className="absolute inset-0 size-full border-0"
        />
        <iframe
          ref={after}
          src={src(selected)}
          title={`${vname(selected)} ${current.direction}`}
          className="absolute inset-0 size-full border-0 [clip-path:inset(0_0_0_var(--split))]"
        />
        {dragging && <div className="absolute inset-0 z-10 cursor-ew-resize" />}
        <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex justify-between">
          <span className="bg-ink text-surface condensed rounded-[3px] px-2 py-1.5 font-mono text-[10px] font-semibold tracking-[0.08em] uppercase">
            Original
          </span>
          <span className="bg-ink text-surface condensed rounded-[3px] px-2 py-1.5 font-mono text-[10px] font-semibold tracking-[0.08em] uppercase">
            {vname(selected)} · {current.direction}
          </span>
        </div>
        <div className="absolute inset-y-0 left-[var(--split)] z-20 w-0">
          <div className="bg-ink absolute inset-y-0 -left-px w-0.5 shadow-[-1px_0_0_rgb(255_255_255/0.7),1px_0_0_rgb(255_255_255/0.7)]" />
          <button
            type="button"
            role="slider"
            aria-label="Before and after divider"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(split)}
            aria-valuetext={`${Math.round(split)}% original`}
            onKeyDown={onGripKey}
            onPointerDown={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            className="rounded-chip bg-ink text-surface condensed focus-visible:outline-alert absolute top-1/2 left-0 grid h-9 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize grid-cols-[auto_1px_auto] items-center font-mono text-[10px] font-bold tracking-[0.08em] shadow-[0_6px_20px_-6px_rgb(13_13_16/0.5)]"
          >
            <span className="px-2.5">BEFORE</span>
            <i className="bg-slate-line h-4.5" />
            <span className="px-2.5">AFTER</span>
          </button>
        </div>
      </div>

      <div className="on-slate bg-slate text-surface flex flex-wrap items-center gap-2 p-2">
        <div role="group" aria-label="Variants" className="flex flex-1 flex-wrap gap-1">
          {DEMO_VARIANTS.map((v, i) => {
            const ready = statuses[i] === 'ready';
            const active = selected === v.n;
            return (
              <button
                key={v.n}
                type="button"
                disabled={!ready}
                aria-current={active}
                aria-label={`${vname(v.n)} ${v.direction}${ready ? '' : ', not ready yet'}`}
                onClick={() => select(v.n)}
                className={cn(
                  'rounded-chip bg-slate-2 ease-out-expo relative grid h-9 min-w-12 cursor-pointer place-items-center px-2 font-mono text-[15px] font-bold [font-stretch:75%] tabular-nums opacity-55 transition-[opacity,transform] duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-25',
                  active &&
                    'bg-surface text-ink min-w-16 -translate-y-0.5 text-2xl opacity-100 shadow-[0_8px_16px_-8px_rgb(0_0_0/0.7)]',
                )}
              >
                {String(v.n).padStart(2, '0')}
                {unseen.has(v.n) && (
                  <span
                    aria-hidden="true"
                    className="bg-alert absolute top-1 right-1 size-1.5 rounded-full"
                  />
                )}
              </button>
            );
          })}
        </div>
        <span className="text-steel-on-slate hidden px-2 text-[13px] md:inline">
          {readyCount < DEMO_VARIANTS.length
            ? `${readyCount} of ${DEMO_VARIANTS.length} ready`
            : current.summary}
        </span>
        <Button
          variant="primary"
          onClick={() => {
            keep(selected);
            document.getElementById('keep')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        >
          Keep {vname(selected)}
        </Button>
      </div>
    </div>
  );
};

export { Compare };
