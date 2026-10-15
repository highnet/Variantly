'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';

import { useRun, type RunStatus } from '@/components/RunProvider';
import { Typography } from '@/components/ui/Typography';
import { DEMO_VARIANTS } from '@/lib/content';
import { cn } from '@/lib/utils';

const LABEL: Record<RunStatus, string> = {
  scheduled: 'Scheduled',
  working: 'Working',
  ready: 'Ready',
};
const ORDER: Record<RunStatus, number> = { ready: 0, working: 1, scheduled: 2 };

type StatusCellProps = {
  status: RunStatus;
  unseen: boolean;
};

const StatusCell = ({ status, unseen }: StatusCellProps) => (
  <span
    className={cn(
      'flap condensed inline-flex min-w-[11ch] items-center justify-center gap-1.5 rounded-[3px] px-2 py-1.5 font-mono text-[11px] leading-none font-bold tracking-[0.06em] uppercase',
      status === 'ready' ? 'flap-light bg-surface text-ink' : 'bg-slate-2 text-steel-on-slate',
      status === 'working' && 'text-surface',
      unseen && 'bg-alert text-ink',
    )}
  >
    <span key={status} className="animate-flap inline-block">
      {LABEL[status]}
    </span>
    {status === 'working' && (
      <span className="inline-flex gap-0.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <i
            key={i}
            className="animate-bar h-2.5 w-[3px] bg-current [animation-delay:calc(var(--i)*150ms)]"
            style={{ ['--i' as string]: i }}
          />
        ))}
      </span>
    )}
  </span>
);

/*
 * The departures board: rows rerank as variants finish (FLIP, identity kept),
 * a finished row holds yellow until it is looked at. It starts on its own the
 * first time it scrolls into view, for readers who never press Generate.
 */
const Board = () => {
  const { statuses, unseen, seen, start, started } = useRun();
  const tbody = useRef<HTMLTableSectionElement>(null);
  const tops = useRef(new Map<string, number>());

  const rows = DEMO_VARIANTS.map((v, i) => ({ ...v, status: statuses[i] })).sort(
    (a, b) => ORDER[a.status] - ORDER[b.status] || a.n - b.n,
  );

  useEffect(() => {
    const el = tbody.current;
    if (!el || started) return;
    const io = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && start(),
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [start, started]);

  useLayoutEffect(() => {
    const el = tbody.current;
    if (!el) return;
    for (const tr of el.querySelectorAll<HTMLTableRowElement>('tr[data-n]')) {
      const top = tr.getBoundingClientRect().top;
      const was = tops.current.get(tr.dataset.n ?? '');
      if (was !== undefined && Math.abs(was - top) > 1) {
        tr.animate([{ transform: `translateY(${was - top}px)` }, { transform: 'none' }], {
          duration: 520,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        });
      }
      tops.current.set(tr.dataset.n ?? '', top);
    }
  });

  const ready = statuses.filter((s) => s === 'ready').length;

  return (
    <div className="on-slate rounded-pass bg-slate text-surface shadow-lift overflow-hidden">
      <div className="border-slate-line flex flex-wrap items-end justify-between gap-3 border-b px-5 py-4">
        <Typography variant="title" as="p">
          {String(DEMO_VARIANTS.length).padStart(2, '0')} variants
        </Typography>
        <Typography variant="label" color="steel-on-slate" as="p" aria-live="polite">
          Demo agent replay · {ready} of {DEMO_VARIANTS.length} ready
        </Typography>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {['Var', 'Direction', 'Status', 'Files'].map((h, i) => (
              <th
                key={h}
                className={cn('px-5 pt-2.5 pb-2 text-left', i === 3 && 'hidden sm:table-cell')}
              >
                <Typography variant="label" color="steel-on-slate">
                  {h}
                </Typography>
              </th>
            ))}
          </tr>
        </thead>
        <tbody ref={tbody}>
          {rows.map((v) => (
            <tr
              key={v.n}
              data-n={v.n}
              tabIndex={0}
              onMouseEnter={() => seen(v.n)}
              onFocus={() => seen(v.n)}
              className="border-slate-line bg-slate hover:bg-slate-2 relative border-t outline-offset-[-2px]"
            >
              <td className="figure w-px px-5 py-3 text-2xl whitespace-nowrap">
                V{String(v.n).padStart(2, '0')}
              </td>
              <td className="px-5 py-3">
                <span className="condensed font-mono text-[13px] font-semibold uppercase">
                  {v.direction}
                </span>
                <span className="text-steel-on-slate mt-0.5 block text-[13px]">
                  {v.status === 'ready'
                    ? v.summary
                    : v.status === 'working'
                      ? 'Agent working in its own worktree…'
                      : 'Waiting for a free slot.'}
                </span>
              </td>
              <td className="w-px px-5 py-3">
                <StatusCell status={v.status} unseen={unseen.has(v.n)} />
              </td>
              <td className="text-steel-on-slate condensed hidden w-px px-5 py-3 font-mono text-[13px] sm:table-cell">
                {v.status === 'ready' ? v.files.length : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export { Board };
