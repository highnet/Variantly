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
import { DEMO_VARIANTS } from '@/lib/content';
import { INSTALL } from '@/lib/site';
import { cn } from '@/lib/utils';

const CYCLE_MS = 5200;
const FLAP_MS = 520;
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ&';

const page = (n: number) => `/demo/oak-and-iron/v${n}/index.html`;
const vname = (n: number) => `V${String(n).padStart(2, '0')}`;
const LONGEST = Math.max(...DEMO_VARIANTS.map((v) => v.direction.length));

type FlapWordProps = {
  word: string;
};

/*
 * A split-flap word: on change every cell runs through a few letters and
 * lands on its own, staggered left to right, like a departures board.
 */
const FlapWord = ({ word }: FlapWordProps) => {
  const target = word.toUpperCase().padEnd(LONGEST, ' ');
  const [shown, setShown] = useState(target);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = now - start;
      if (reduce || t >= FLAP_MS) {
        setShown(target);
        return;
      }
      const next = [...target]
        .map((ch, i) => {
          const settle = FLAP_MS * 0.35 + (i / target.length) * FLAP_MS * 0.65;
          if (t >= settle || ch === ' ') return ch;
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        })
        .join('');
      setShown(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return (
    <span className="inline-flex flex-wrap gap-0.5" aria-hidden="true">
      {[...shown].map((ch, i) => (
        <span
          key={i}
          className={cn(
            'flap figure bg-slate text-surface inline-grid h-[1.12em] w-[0.78em] place-items-center rounded-[0.08em]',
            target[i] === ' ' && 'bg-slate/35',
            i >= word.length && 'hidden sm:inline-grid',
          )}
        >
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </span>
  );
};

/*
 * The first viewport: the headline names a direction, the after pane shows
 * that redesign, and both change together until the visitor takes over.
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
    f?.contentWindow?.addEventListener(
      'scroll',
      () => {
        syncFrom(f);
      },
      { passive: true },
    );
    f?.contentWindow?.addEventListener('pointerdown', takeOver);
    f?.contentWindow?.addEventListener('wheel', takeOver, { passive: true });
  };

  const choose = (n: number) => {
    takeOver();
    setSelected(n);
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

  const onKeys = (e: KeyboardEvent<HTMLElement>) => {
    const n = Number(e.key);
    if (n >= 1 && n <= DEMO_VARIANTS.length) choose(n);
  };

  const current = DEMO_VARIANTS[selected - 1];

  return (
    <section
      ref={root}
      aria-labelledby="showcase-title"
      className="grid gap-5"
      onKeyDown={onKeys}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('[data-keep-cycle]')) return;
        takeOver();
      }}
    >
      <h1 id="showcase-title" className="figure text-[clamp(2rem,4.4vw,4.25rem)] leading-none">
        <span className="mr-[0.3em] inline-block">Oak &amp; Iron, as</span>
        <span className="sr-only">{current.direction}</span>
        <FlapWord word={current.direction} />
      </h1>

      <div className="rounded-pass border-rule bg-surface shadow-lift overflow-hidden border">
        <div
          ref={stage}
          className="relative h-[min(56vh,640px)] min-h-[380px] touch-none select-none"
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
            <span className="bg-ink text-surface condensed rounded-[3px] px-2 py-1.5 font-mono text-[10px] font-semibold tracking-[0.08em] uppercase">
              Before<span className="hidden sm:inline"> · the original</span>
            </span>
            <span className="bg-ink text-surface condensed rounded-[3px] px-2 py-1.5 font-mono text-[10px] font-semibold tracking-[0.08em] uppercase">
              {vname(selected)} · {current.direction}
            </span>
          </div>

          <div className="absolute inset-y-0 left-[var(--split)] z-20 w-0">
            <div className="bg-ink absolute inset-y-0 -left-px w-0.5 shadow-[-1px_0_0_rgb(255_255_255/0.75),1px_0_0_rgb(255_255_255/0.75)]" />
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
                takeOver();
                setDragging(true);
              }}
              className="group bg-ink text-surface focus-visible:outline-alert absolute top-1/2 left-0 flex h-11 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center gap-1 rounded-full px-2 shadow-[0_10px_30px_-8px_rgb(13_13_16/0.6)] transition-transform duration-200 hover:scale-105"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              <span className="condensed font-mono text-[10px] font-bold tracking-[0.08em]">
                BEFORE
              </span>
              <i className="bg-slate-line mx-1 h-4 w-px" />
              <span className="condensed font-mono text-[10px] font-bold tracking-[0.08em]">
                AFTER
              </span>
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="on-slate bg-slate text-surface flex flex-wrap items-center gap-x-4 gap-y-3 p-2.5">
          <div role="group" aria-label="Variants" className="flex gap-1">
            {DEMO_VARIANTS.map((v) => {
              const active = selected === v.n;
              return (
                <button
                  key={v.n}
                  type="button"
                  aria-current={active}
                  aria-label={`${vname(v.n)} ${v.direction}`}
                  title={`${v.direction} (${v.n})`}
                  onClick={() => choose(v.n)}
                  className={cn(
                    'bg-slate-2 relative grid h-10 min-w-11 cursor-pointer place-items-center rounded-[6px] px-2 font-mono text-[15px] font-bold [font-stretch:75%] tabular-nums opacity-55 transition-[opacity,transform,background] duration-150 hover:opacity-90',
                    active &&
                      'bg-surface text-ink min-w-15 -translate-y-0.5 text-2xl opacity-100 shadow-[0_8px_16px_-8px_rgb(0_0_0/0.7)]',
                  )}
                >
                  {String(v.n).padStart(2, '0')}
                  {active && auto && (
                    <span
                      key={selected}
                      aria-hidden="true"
                      className="bg-alert absolute inset-x-1.5 bottom-1 h-0.5 origin-left animate-[cycle_5.2s_linear_forwards]"
                    />
                  )}
                </button>
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
              The brief it got
            </a>
          </p>
          <div data-keep-cycle className="w-full sm:w-auto">
            <CommandCopy command={INSTALL} tone="slate" accent />
          </div>
        </div>
      </div>
      <p className="text-steel m-0 text-[13px]">
        A fictional shop and six whole-page redesigns of it, each made by Claude Code with the
        Impeccable skill from the brief variantly writes. Press 1–6, or drag the line.
      </p>
    </section>
  );
};

export { Showcase };
