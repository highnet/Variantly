'use client';

import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';

import { CommandCopy } from '@/components/CommandCopy';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { DEMO_VARIANTS, SELLING_POINTS } from '@/lib/content';
import { INSTALL } from '@/lib/site';
import { cn } from '@/lib/utils';

const CYCLE_MS = 5200;
const STEP_MS = 38;
const STAGGER_MS = 28;
// The order letters pass the hinge on a real board.
const DRUM = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ&';

const page = (n: number) => `/demo/oak-and-iron/v${n}/index.html`;
const vname = (n: number) => `V${String(n).padStart(2, '0')}`;
const LONGEST = Math.max(...DEMO_VARIANTS.map((v) => v.direction.length));

type FlapCellProps = {
  target: string;
  index: number;
};

/*
 * One split-flap cell. On a new target it steps through the drum one letter
 * at a time, each step turning through the hinge, after a stagger that runs
 * left to right across the word.
 */
const FlapCell = ({ target, index }: FlapCellProps) => {
  const [shown, setShown] = useState(target);
  const showing = useRef(target);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let timer = 0;
    const step = () => {
      if (reduce || showing.current === target) {
        showing.current = target;
        setShown(target);
        return;
      }
      const at = Math.max(0, DRUM.indexOf(showing.current));
      showing.current = DRUM[(at + 1) % DRUM.length];
      setShown(showing.current);
      timer = window.setTimeout(step, STEP_MS);
    };
    timer = window.setTimeout(step, index * STAGGER_MS);
    return () => window.clearTimeout(timer);
  }, [target, index]);

  return (
    <span className={cn('flap-cell', target === ' ' && shown === ' ' && 'is-blank')}>
      <span key={shown} className="animate-flap">
        {shown === ' ' ? ' ' : shown}
      </span>
    </span>
  );
};

type FlapWordProps = {
  word: string;
};

/* The word, padded to the longest direction so the row never changes width. */
const FlapWord = ({ word }: FlapWordProps) => {
  const cells = word.toUpperCase().padEnd(LONGEST, ' ');
  return (
    <span className="inline-flex gap-[0.06em] text-[min(1em,6.3cqi)]" aria-hidden="true">
      {[...cells].map((ch, i) => (
        <FlapCell key={i} target={ch} index={i} />
      ))}
    </span>
  );
};

/*
 * The first viewport: the promise, then the proof. The flap names a
 * direction, the after pane shows that redesign, and both change together
 * until the visitor takes over.
 */
const Showcase = () => {
  const [selected, setSelected] = useState(1);
  const [auto, setAuto] = useState(true);
  const [split, setSplit] = useState(50);
  const [dragging, setDragging] = useState(false);
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const frames = useRef<(HTMLIFrameElement | null)[]>([]);
  const quiet = useRef(0);
  const visible = useRef(true);

  const takeOver = useCallback(() => setAuto(false), []);

  const choose = useCallback(
    (n: number) => {
      takeOver();
      setSelected(n);
    },
    [takeOver],
  );

  // Cycle while untouched, on screen and in a visible tab.
  useEffect(() => {
    if (!auto) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const io = new IntersectionObserver(([e]) => (visible.current = e.isIntersecting), {
      threshold: 0.3,
    });
    if (root.current) io.observe(root.current);
    const timer = setInterval(() => {
      if (!visible.current || document.hidden) return;
      setSelected((n) => (n % DEMO_VARIANTS.length) + 1);
    }, CYCLE_MS);
    return () => {
      clearInterval(timer);
      io.disconnect();
    };
  }, [auto]);

  // 1–6 work from page load, not only once focus is inside the showcase.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const n = Number(e.key);
      if (n >= 1 && n <= DEMO_VARIANTS.length) choose(n);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choose]);

  // Same-origin pages: keep every pane at the same scroll ratio.
  const syncFrom = useCallback((from: HTMLIFrameElement | null) => {
    const fw = from?.contentWindow;
    const fe = fw?.document.scrollingElement;
    if (!fw || !fe || Date.now() < quiet.current) return;
    const ratio = fe.scrollTop / Math.max(1, fe.scrollHeight - fw.innerHeight);
    quiet.current = Date.now() + 80;
    for (const f of frames.current) {
      if (!f || f === from) continue;
      const w = f.contentWindow;
      const e = w?.document.scrollingElement;
      if (w && e) e.scrollTop = ratio * Math.max(0, e.scrollHeight - w.innerHeight);
    }
  }, []);

  const onFrameLoad = (i: number) => {
    const f = frames.current[i];
    const win = f?.contentWindow;
    if (!f || !win) return;
    // The panes are objects on the counter, not embedded documents.
    win.document.documentElement.style.setProperty('scrollbar-width', 'none');
    win.addEventListener('scroll', () => syncFrom(f), { passive: true });
    win.addEventListener('pointerdown', takeOver);
    win.addEventListener('wheel', takeOver, { passive: true });
    win.addEventListener('keydown', (e) => {
      const n = Number(e.key);
      if (n >= 1 && n <= DEMO_VARIANTS.length) choose(n);
    });
  };

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
    takeOver();
    setSplit(Math.max(0, Math.min(100, next)));
  };

  const current = DEMO_VARIANTS[selected - 1];

  return (
    <section
      ref={root}
      aria-labelledby="hero-title"
      className="grid gap-6"
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('[data-keep-cycle]')) return;
        takeOver();
      }}
    >
      <div className="grid gap-5">
        <Typography
          variant="display"
          id="hero-title"
          className="text-[clamp(2.5rem,4.6vw,4.75rem)]"
        >
          Your website needs a fresh look
        </Typography>
        <ul className="border-rule m-0 grid list-none grid-cols-2 border-y p-0 md:grid-cols-4">
          {SELLING_POINTS.map((point) => (
            <li key={point} className="py-3 pr-4 text-[15px] leading-snug font-semibold md:py-4">
              {point}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-3">
        <p
          className="figure [container-type:inline-size] m-0 flex flex-wrap items-center gap-x-[0.3em] gap-y-1 text-[clamp(1.5rem,3vw,2.5rem)] leading-none"
          aria-live="polite"
        >
          <span>Oak &amp; Iron, as</span>
          <span className="sr-only">{current.direction}</span>
          <FlapWord word={current.direction} />
        </p>

        <div className="rounded-pass border-rule bg-surface shadow-lift overflow-hidden border">
          <div
            ref={stage}
            className="relative h-[min(52vh,660px)] min-h-[360px] touch-none select-none"
            style={{ ['--split' as string]: `${split}%` }}
            onPointerMove={move}
            onPointerUp={() => setDragging(false)}
            onPointerCancel={() => setDragging(false)}
          >
            <iframe
              ref={(el) => {
                frames.current[0] = el;
              }}
              onLoad={() => onFrameLoad(0)}
              src={page(0)}
              title="Oak & Iron as it was: the original"
              className="absolute inset-0 size-full border-0"
            />
            {DEMO_VARIANTS.map((v) => (
              <iframe
                key={v.n}
                ref={(el) => {
                  frames.current[v.n] = el;
                }}
                onLoad={() => onFrameLoad(v.n)}
                src={page(v.n)}
                title={`${vname(v.n)}: ${v.direction}`}
                aria-hidden={v.n !== selected}
                tabIndex={v.n === selected ? 0 : -1}
                loading={v.n === 1 ? 'eager' : 'lazy'}
                className={cn(
                  'absolute inset-0 size-full border-0 transition-opacity duration-500 [clip-path:inset(0_0_0_var(--split))]',
                  v.n === selected ? 'opacity-100' : 'pointer-events-none opacity-0',
                )}
              />
            ))}
            {dragging && <div className="absolute inset-0 z-10 cursor-ew-resize" />}

            <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex justify-between gap-3">
              <Typography variant="tag" className="bg-ink text-surface rounded-flap px-2 py-1.5">
                Before<span className="hidden sm:inline"> · the original</span>
              </Typography>
              <Typography variant="tag" className="bg-ink text-surface rounded-flap px-2 py-1.5">
                {vname(selected)} · {current.direction}
              </Typography>
            </div>

            <div className="absolute inset-y-0 left-[var(--split)] z-20 w-0">
              <div className="bg-ink shadow-divider absolute inset-y-0 -left-px w-0.5" />
              <Button
                variant="grip"
                size="grip"
                role="slider"
                aria-label="Before and after divider"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(split)}
                aria-valuetext={`${Math.round(split)}% original`}
                onKeyDown={onGripKey}
                onPointerDown={(e) => {
                  e.preventDefault();
                  takeOver();
                  setDragging(true);
                }}
                className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2"
              >
                <ChevronLeft aria-hidden="true" />
                Before
                <i className="bg-slate-line mx-1 h-4 w-px" />
                After
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          </div>

          <div className="on-slate bg-slate text-surface flex flex-wrap items-center gap-x-4 gap-y-3 p-2.5">
            <div role="group" aria-label="Variants" className="flex gap-1">
              {DEMO_VARIANTS.map((v) => {
                const active = selected === v.n;
                return (
                  <Button
                    key={v.n}
                    variant="cell"
                    size="cell"
                    aria-current={active}
                    aria-label={`${vname(v.n)} ${v.direction}`}
                    title={`${v.direction} (${v.n})`}
                    onClick={() => choose(v.n)}
                  >
                    {String(v.n).padStart(2, '0')}
                    {active && auto && (
                      <span
                        key={selected}
                        aria-hidden="true"
                        className="bg-ink/50 absolute inset-x-1.5 bottom-1 h-0.5 origin-left animate-[cycle_5.2s_linear_forwards]"
                      />
                    )}
                  </Button>
                );
              })}
            </div>
            <p className="text-steel-on-slate m-0 min-w-0 flex-1 basis-64 text-[13px] leading-snug">
              <span className="text-surface font-semibold">{current.direction}.</span>{' '}
              {current.summary}{' '}
              <a
                href={`/demo/oak-and-iron/v${selected}/BRIEF.md`}
                className="text-surface inline-flex items-center gap-1 underline"
              >
                <FileText className="size-3.5" aria-hidden="true" />
                Read the brief
              </a>
            </p>
            <div data-keep-cycle className="w-full sm:w-auto">
              <CommandCopy command={INSTALL} tone="slate" accent />
            </div>
          </div>
        </div>

        <Typography variant="caption" color="ink">
          Six redesigns of a fictional shop, each made by Claude Code with Impeccable from the brief
          variantly writes. Press 1–6, or drag the line.
        </Typography>
      </div>
    </section>
  );
};

export { Showcase };
