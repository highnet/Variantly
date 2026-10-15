'use client';

import { ChevronLeft, ChevronRight, FileText, MousePointer2 } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';

import { CommandCopy } from '@/components/CommandCopy';
import { PromptCopy } from '@/components/PromptCopy';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { DEMO_ORIGINAL_SCORES, DEMO_VARIANTS, PROMPTS } from '@/lib/content';
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

type ScoreProps = {
  label: string;
  value: number;
  was: number;
  /** true when a lower number is the better one */
  lowerIsBetter?: boolean;
};

/* One score with its change from the original, green when it improved. */
const Score = ({ label, value, was, lowerIsBetter = false }: ScoreProps) => {
  const diff = value - was;
  const better = lowerIsBetter ? diff < 0 : diff > 0;
  return (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
      <span className="text-steel-on-slate text-[10px] tracking-[0.08em] uppercase">{label}</span>
      <span className="text-surface text-[15px] font-bold tabular-nums">{value}</span>
      {diff !== 0 && (
        <span
          className={cn(
            'text-[11px] tabular-nums',
            better ? 'text-ok-on-slate' : 'text-fail-on-slate',
          )}
        >
          {diff > 0 ? '+' : '−'}
          {Math.abs(diff)}
        </span>
      )}
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
  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState(false);
  const hoverRef = useRef(false);
  const pos = useRef(50);
  const anim = useRef(0);
  const grip = useRef<HTMLButtonElement>(null);
  const loaded = useRef(new Set<number>());
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

  // Same-origin pages: every pane sits at the same scroll position, in
  // pixels on both axes, so the divider compares the same spot of the page.
  const scrollPos = useRef({ x: 0, y: 0 });

  const applyScroll = (f: HTMLIFrameElement | null) => {
    const e = f?.contentWindow?.document.scrollingElement;
    if (!e) return;
    e.scrollTop = scrollPos.current.y;
    e.scrollLeft = scrollPos.current.x;
  };

  const syncFrom = useCallback((from: HTMLIFrameElement | null) => {
    const fe = from?.contentWindow?.document.scrollingElement;
    if (!fe || Date.now() < quiet.current) return;
    scrollPos.current = { x: fe.scrollLeft, y: fe.scrollTop };
    quiet.current = Date.now() + 80;
    for (const f of frames.current) {
      if (f && f !== from) applyScroll(f);
    }
  }, []);

  /* The fake scrollbar: it reads the visible pane and moves every pane. */
  const track = useRef<HTMLDivElement>(null);
  const thumbDrag = useRef<{ y: number; top: number } | null>(null);

  const metrics = () => {
    const doc = frames.current[selected]?.contentWindow?.document.scrollingElement;
    if (!doc || !track.current) return null;
    const view = doc.clientHeight;
    const full = Math.max(doc.scrollHeight, view);
    const trackH = track.current.clientHeight;
    const thumbH = Math.max(40, (view / full) * trackH);
    return { max: full - view, room: trackH - thumbH, thumbH };
  };

  const paintThumb = () => {
    const m = metrics();
    if (!m || !track.current) return;
    const top = m.max > 0 ? (scrollPos.current.y / m.max) * m.room : 0;
    track.current.style.setProperty('--thumb-h', `${m.thumbH}px`);
    track.current.style.setProperty('--thumb-top', `${top}px`);
    track.current.dataset.empty = String(m.max <= 0);
    track.current.setAttribute(
      'aria-valuenow',
      String(m.max > 0 ? Math.round((scrollPos.current.y / m.max) * 100) : 0),
    );
  };

  const scrollTo = (y: number) => {
    const m = metrics();
    if (!m) return;
    scrollPos.current = { ...scrollPos.current, y: Math.max(0, Math.min(m.max, y)) };
    quiet.current = Date.now() + 80;
    for (const f of frames.current) applyScroll(f);
    paintThumb();
  };

  const onTrackDown = (e: PointerEvent<HTMLDivElement>) => {
    const m = metrics();
    if (!m || !track.current || e.button !== 0) return;
    e.preventDefault();
    takeOver();
    e.currentTarget.setPointerCapture(e.pointerId);
    const r = track.current.getBoundingClientRect();
    const at = e.clientY - r.top;
    const top = m.max > 0 ? (scrollPos.current.y / m.max) * m.room : 0;
    // A press on the track jumps the thumb there, centred under the pointer.
    const start = at >= top && at <= top + m.thumbH ? top : at - m.thumbH / 2;
    thumbDrag.current = { y: e.clientY, top: start };
    scrollTo(m.room > 0 ? (start / m.room) * m.max : 0);
  };
  const onTrackMove = (e: PointerEvent<HTMLDivElement>) => {
    const m = metrics();
    if (!thumbDrag.current || !m || m.room <= 0) return;
    const top = thumbDrag.current.top + (e.clientY - thumbDrag.current.y);
    scrollTo((top / m.room) * m.max);
  };
  const onTrackUp = () => {
    thumbDrag.current = null;
  };

  // A pane that just became visible picks up where the others are.
  const repaint = useEffectEvent(() => paintThumb());
  useEffect(() => {
    quiet.current = Date.now() + 80;
    applyScroll(frames.current[selected]);
    repaint();
  }, [selected]);

  const onFrameLoad = (i: number) => {
    const f = frames.current[i];
    const win = f?.contentWindow;
    if (!f || !win) return;
    loaded.current.add(i);
    if (loaded.current.has(0) && loaded.current.has(1)) setReady(true);
    // The panes are objects on the counter, not embedded documents.
    win.document.documentElement.style.setProperty('scrollbar-width', 'none');
    // The wheel scrolls the page around the demo, not the panes inside it;
    // the fake scrollbar on the right is the one way down a pane.
    win.document.documentElement.style.setProperty('overflow', 'hidden');
    // Some designs ask for smooth scrolling; the panes must jump in lockstep.
    win.document.documentElement.style.setProperty('scroll-behavior', 'auto', 'important');
    applyScroll(f);
    win.addEventListener('scroll', () => syncFrom(f), { passive: true });
    paintThumb();
    // Hover mode: the panes cover the stage edge to edge, so their own
    // clientX is the stage's. A held drag still wins.
    win.addEventListener('pointermove', (e) => {
      // Mouse only: a finger has no hover, it drags the line instead.
      if (!hoverRef.current || e.pointerType !== 'mouse') return;
      if (stage.current?.dataset.dragging === 'true') return;
      cancelAnimationFrame(anim.current);
      setPos((e.clientX / f.clientWidth) * 100);
    });
    win.addEventListener('pointerdown', takeOver);
    // A click on empty space in either half glides the line there; links,
    // buttons, fields and selected text keep their own click.
    win.addEventListener('click', (e) => {
      const t = e.target as Element | null;
      if (
        t?.closest('a, button, input, select, textarea, label, summary, [role=button], [tabindex]')
      )
        return;
      if (win.getSelection()?.toString()) return;
      tween((e.clientX / f.clientWidth) * 100, 320);
    });
    // A click on empty space in either half glides the line there; links,
    // buttons, fields and selected text keep their own click.
    win.addEventListener('click', (e) => {
      const t = e.target as Element | null;
      if (
        t?.closest('a, button, input, select, textarea, label, summary, [role=button], [tabindex]')
      )
        return;
      if (win.getSelection()?.toString()) return;
      tween((e.clientX / f.clientWidth) * 100, 320);
    });
    win.addEventListener('wheel', takeOver, { passive: true });
    win.addEventListener('keydown', (e) => {
      const n = Number(e.key);
      if (n >= 1 && n <= DEMO_VARIANTS.length) choose(n);
    });
  };

  /*
   * The divider writes a CSS variable straight onto the stage: no React
   * state, so a drag never waits on a render and tracks the pointer 1:1.
   */
  const setPos = (raw: number) => {
    let p = Math.max(0, Math.min(100, raw));
    if (p < 3) p = 0;
    else if (p > 97) p = 100;
    const edge = p === 0 || p === 100;
    if (edge && pos.current !== p && 'vibrate' in navigator) navigator.vibrate?.(8);
    pos.current = p;
    const el = stage.current;
    if (!el) return;
    el.style.setProperty('--split', `${p}%`);
    // Labels fade as the divider closes in on them.
    el.style.setProperty('--before-o', String(Math.max(0, Math.min(1, (p - 12) / 10))));
    el.style.setProperty('--after-o', String(Math.max(0, Math.min(1, (88 - p) / 10))));
    grip.current?.setAttribute('aria-valuenow', String(Math.round(p)));
    grip.current?.setAttribute('aria-valuetext', `${Math.round(p)}% original`);
  };

  /* Only for moves the user does not drive directly: jumps, keys, the hint. */
  const tween = (to: number, ms = 220) => {
    cancelAnimationFrame(anim.current);
    const from = pos.current;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min((t - t0) / ms, 1);
      setPos(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  };

  const pct = (e: PointerEvent<HTMLElement>) => {
    const r = stage.current!.getBoundingClientRect();
    return ((e.clientX - r.left) / r.width) * 100;
  };

  const onDown = (e: PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    takeOver();
    e.currentTarget.setPointerCapture(e.pointerId);
    stage.current!.dataset.dragging = 'true';
    tween(pct(e), 160);
  };
  const onMove = (e: PointerEvent<HTMLElement>) => {
    // In follow mode the cursor sits on the line, over this band, so the
    // band has to keep the line moving too or it stalls under the cursor.
    const follow = hoverRef.current && e.pointerType === 'mouse';
    if (stage.current?.dataset.dragging !== 'true' && !follow) return;
    cancelAnimationFrame(anim.current);
    setPos(pct(e));
  };
  const onUp = () => {
    if (stage.current) delete stage.current.dataset.dragging;
  };

  const onGripKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const keys: Record<string, number> = {
      ArrowLeft: pos.current - 5,
      ArrowRight: pos.current + 5,
      Home: 0,
      End: 100,
    };
    if (!(e.key in keys)) return;
    e.preventDefault();
    takeOver();
    tween(keys[e.key], 150);
  };

  // Effects reach the divider through events, so they never re-run for it.
  const placeAt = useEffectEvent((p: number) => setPos(p));
  const sweepTo = useEffectEvent((to: number, ms: number) => tween(to, ms));

  useEffect(() => placeAt(50), []);

  useEffect(() => {
    hoverRef.current = hover;
  }, [hover]);

  // Follow mode needs a mouse; drop it when there isn't one any more.
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const off = () => !mq.matches && setHover(false);
    mq.addEventListener('change', off);
    return () => mq.removeEventListener('change', off);
  }, []);

  // Never leave the stage hidden if a pane is slow to load.
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 4000);
    return () => clearTimeout(t);
  }, []);

  // One sweep the first time the slider is properly on screen, never again.
  useEffect(() => {
    if (!ready || !stage.current) return;
    const timers: number[] = [];
    const io = new IntersectionObserver(
      ([en]) => {
        if (!en.isIntersecting) return;
        io.disconnect();
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        timers.push(window.setTimeout(() => sweepTo(60, 400), 300));
        timers.push(window.setTimeout(() => sweepTo(40, 500), 700));
        timers.push(window.setTimeout(() => sweepTo(50, 400), 1200));
      },
      { threshold: 0.6 },
    );
    io.observe(stage.current);
    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
    };
  }, [ready]);

  const current = DEMO_VARIANTS[selected - 1];

  return (
    <section
      ref={root}
      aria-labelledby="hero-title"
      className="bg-slate on-slate grid"
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('[data-keep-cycle]')) return;
        takeOver();
      }}
    >
      <div className="text-surface">
        <div className="bg-slate border-slate-line mx-auto grid max-w-[1440px] gap-x-10 gap-y-5 px-4 py-7 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:py-9">
          <div className="grid content-start gap-4">
            <Typography
              variant="display"
              id="hero-title"
              className="text-surface text-[clamp(2.25rem,4.2vw,4.25rem)]"
            >
              Your website needs a fresh look
            </Typography>
            <p className="text-steel-on-slate m-0 max-w-[52ch] text-[17px] leading-relaxed">
              One command asks the AI coding assistant you already use to redesign your site several
              different ways. Try each one live, like the shop below, and keep your favourite. Your
              current site stays untouched until you do.
            </p>
          </div>

          <div className="grid content-start gap-4">
            <div data-keep-cycle className="grid gap-2">
              <CommandCopy command={INSTALL} tone="slate" accent />
              <p className="text-steel-on-slate m-0 text-[14px] leading-snug">
                Paste it into a terminal in your website&apos;s folder.{' '}
                <a href="#start-title" className="text-surface underline underline-offset-2">
                  Check what you need first
                </a>
              </p>
              <PromptCopy
                prompt={PROMPTS.setup}
                tone="slate"
                label="No terminal? Copy a prompt for your AI instead"
              />
            </div>
            <div className="border-slate-line grid gap-2.5 border-t pt-4">
              <p
                className="figure [container-type:inline-size] m-0 flex flex-wrap items-center gap-x-[0.3em] gap-y-1 text-[clamp(1.1rem,1.6vw,1.5rem)] leading-none"
                aria-live="polite"
              >
                <span className="text-steel-on-slate">Now showing</span>
                <span className="sr-only">{current.direction}</span>
                <FlapWord word={current.direction} />
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <a
                  href={`/demo/oak-and-iron/v${selected}/BRIEF.md`}
                  className="text-steel-on-slate hover:text-surface inline-flex items-center gap-1 text-[13px] underline underline-offset-2"
                >
                  <FileText className="size-3.5" aria-hidden="true" />
                  What the AI was asked
                </a>
              </div>
              <p className="text-steel-on-slate m-0 text-[13px] leading-snug">
                A made-up furniture shop, redesigned six ways by Claude Code. Drag the line or pick
                a number below.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div
        ref={stage}
        id="demo-stage"
        className={cn(
          'group/stage relative isolate h-[62svh] min-h-[380px] overflow-hidden transition-opacity duration-300 select-none lg:h-[78svh] lg:min-h-[560px]',
          ready ? 'opacity-100' : 'opacity-0',
        )}
      >
        <iframe
          ref={(el) => {
            frames.current[0] = el;
          }}
          onLoad={() => onFrameLoad(0)}
          src={page(0)}
          title="Oak & Iron as it was: the original"
          className="absolute inset-0 size-full border-0 bg-white"
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
        {/* The panes stay scrollable; this band either side of the line is
            the drag surface, so nobody has to hit the grip exactly. */}
        <div
          className="absolute inset-y-0 left-[var(--split)] z-20 w-16 -translate-x-1/2 cursor-ew-resize touch-pan-y group-data-[dragging=true]/stage:inset-x-0 group-data-[dragging=true]/stage:left-0 group-data-[dragging=true]/stage:w-auto group-data-[dragging=true]/stage:translate-x-0"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onLostPointerCapture={onUp}
          onDoubleClick={() => tween(50, 300)}
        />

        <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex justify-between gap-3">
          <Typography
            variant="tag"
            className="bg-ink text-surface rounded-flap px-2 py-1.5 opacity-[var(--before-o,1)]"
          >
            Before<span className="hidden sm:inline"> · today’s site</span>
          </Typography>
          <Typography
            variant="tag"
            className="bg-ink text-surface rounded-flap px-2 py-1.5 opacity-[var(--after-o,1)]"
          >
            After · {current.direction}
          </Typography>
        </div>

        <div
          ref={track}
          role="scrollbar"
          aria-label="Scroll the pages"
          aria-controls="demo-stage"
          aria-orientation="vertical"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
          tabIndex={0}
          onKeyDown={(e) => {
            const view = stage.current?.clientHeight ?? 600;
            const by: Record<string, number> = {
              ArrowDown: 60,
              ArrowUp: -60,
              PageDown: view * 0.9,
              PageUp: -view * 0.9,
            };
            if (e.key === 'Home') scrollTo(0);
            else if (e.key === 'End') scrollTo(Infinity);
            else if (e.key in by) scrollTo(scrollPos.current.y + by[e.key]);
            else return;
            e.preventDefault();
            takeOver();
          }}
          onPointerDown={onTrackDown}
          onPointerMove={onTrackMove}
          onPointerUp={onTrackUp}
          onPointerCancel={onTrackUp}
          title="Drag to scroll the pages"
          className="group/track absolute inset-y-3 right-1.5 z-30 w-3 cursor-grab touch-none rounded-full bg-black/10 focus-visible:outline-2 focus-visible:outline-offset-2 active:cursor-grabbing data-[empty=true]:hidden"
        >
          <div className="bg-ink/70 group-hover/track:bg-ink group-active/track:bg-ink absolute inset-x-0.5 top-[var(--thumb-top,0px)] h-[var(--thumb-h,40px)] rounded-full shadow-[0_0_0_1px_rgb(255_255_255/.5)] transition-colors" />
        </div>

        <div
          data-keep-cycle
          className="bg-slate shadow-grip rounded-chip absolute bottom-3 left-1/2 z-30 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-x-4 gap-y-2 px-2 py-2 font-mono [font-stretch:87.5%]"
        >
          <div role="group" aria-label="Redesigns" className="flex gap-1">
            <Button
              variant="cell"
              size="cell"
              aria-label="Previous redesign"
              title="Previous"
              onClick={() =>
                choose(((selected + DEMO_VARIANTS.length - 2) % DEMO_VARIANTS.length) + 1)
              }
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Button>
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
            <Button
              variant="cell"
              size="cell"
              aria-label="Next redesign"
              title="Next"
              onClick={() => choose((selected % DEMO_VARIANTS.length) + 1)}
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
          <button
            type="button"
            aria-pressed={hover}
            onClick={() => {
              takeOver();
              setHover((h) => !h);
            }}
            title="The line follows your cursor; drag or click inside the pages as usual when off"
            className={cn(
              'text-steel-on-slate hover:text-surface hidden items-center gap-1.5 rounded px-1.5 py-1 text-[10px] tracking-[0.08em] uppercase [@media(hover:hover)_and_(pointer:fine)]:inline-flex',
              hover && 'bg-surface text-ink hover:text-ink',
            )}
          >
            <MousePointer2 className="size-3.5" aria-hidden="true" />
            Follow cursor
          </button>
          <div
            role="group"
            className="flex items-center gap-3 pr-2"
            aria-label={`Scores against the original: accessibility ${current.a11y}, ${current.axe} axe violations`}
            title="Measured by variantly's axe-core and Lighthouse check, against the original page"
          >
            <Score label="A11y" value={current.a11y} was={DEMO_ORIGINAL_SCORES.a11y} />
            <Score label="axe" value={current.axe} was={DEMO_ORIGINAL_SCORES.axe} lowerIsBetter />
          </div>
        </div>

        <div className="pointer-events-none absolute inset-y-0 left-[var(--split)] z-20 w-0">
          {/* A soft shadow the line casts on the after side: depth, not a filter on the page. */}
          <div className="absolute inset-y-0 left-0 w-10 bg-linear-to-r from-black/15 to-transparent" />
          <div className="bg-ink shadow-divider absolute inset-y-0 -left-px w-0.5" />
          <Button
            ref={grip}
            variant="grip"
            size="grip"
            role="slider"
            aria-label="Before and after divider"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={50}
            aria-valuetext="50% original"
            onKeyDown={onGripKey}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onDoubleClick={() => tween(50, 300)}
            className="pointer-events-auto absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 touch-pan-y transition-[scale,box-shadow] duration-200 ease-[cubic-bezier(.3,1.6,.5,1)] group-data-[dragging=true]/stage:scale-115 group-data-[dragging=true]/stage:shadow-[0_6px_20px_rgb(0_0_0/.45)]"
          >
            <ChevronLeft aria-hidden="true" />
            Before
            <i className="bg-slate-line mx-1 h-4 w-px" />
            After
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export { Showcase };
