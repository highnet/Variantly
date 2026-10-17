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
import { FreshLook } from '@/components/FreshLook';
import { PageSkeleton } from '@/components/PageSkeleton';
import { PromptCopy } from '@/components/PromptCopy';
import { RunnerPicker } from '@/components/RunnerPicker';
import { VariantTitle } from '@/components/VariantTitle';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { applyPrefsToFrame, calmMotion, PREFS_EVENT, readPrefs, type Prefs } from '@/lib/prefs';
import { DEMO_ORIGINAL_SCORES, DEMO_VARIANTS, PROMPTS } from '@/lib/content';
import { INSTALL } from '@/lib/site';
import { cn } from '@/lib/utils';

const CYCLE_MS = 12000;
const STEP_MS = 38;
const STAGGER_MS = 28;
// The order letters pass the hinge on a real board.
const DRUM = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ&';

// Phones get each design's phone edition: the same bands at the same heights
// in every variant, so a split only a few hundred pixels wide still lines up.
const page = (n: number, phone: boolean) =>
  `/demo/oak-and-iron/v${n}/${phone ? 'phone' : 'index'}.html`;
const PHONE_QUERY = '(max-width: 639px)';
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
    const reduce = calmMotion();
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

/*
 * One score with its change from the original, green when it improved. A
 * count where lower is better reads "51 fixed" rather than a minus sign,
 * so an improvement never looks like a loss.
 */
const Score = ({ label, value, was, lowerIsBetter = false }: ScoreProps) => {
  const diff = value - was;
  const better = lowerIsBetter ? diff < 0 : diff > 0;
  return (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
      <span className="text-steel-on-slate text-[10px] tracking-[0.08em] uppercase">{label}</span>
      <span data-score className="text-surface text-[15px] font-bold tabular-nums">
        {value}
      </span>
      {diff !== 0 && (
        <span
          className={cn(
            'text-[11px] tabular-nums',
            better ? 'text-ok-on-slate' : 'text-fail-on-slate',
          )}
        >
          {lowerIsBetter
            ? `${Math.abs(diff)} ${better ? 'fixed' : 'new'}`
            : `${diff > 0 ? '+' : '−'}${Math.abs(diff)}`}
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
  const [phone, setPhone] = useState(false);
  const hoverRef = useRef(false);
  const pos = useRef(50);
  const anim = useRef(0);
  const grip = useRef<HTMLButtonElement>(null);
  const loaded = useRef(new Set<number>());
  const wired = useRef(new WeakSet<Document>());
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
    if (calmMotion()) return;
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
    // Each document is wired once, whichever of load or mount sees it first.
    if (!f || !win || wired.current.has(win.document)) return;
    wired.current.add(win.document);
    loaded.current.add(i);
    if (loaded.current.has(0) && loaded.current.has(1)) setReady(true);
    // The panes are objects on the counter, not embedded documents.
    win.document.documentElement.style.setProperty('scrollbar-width', 'none');
    // The wheel scrolls the page around the demo, not the panes inside it;
    // the fake scrollbar on the right is the one way down a pane.
    win.document.documentElement.style.setProperty('overflow', 'hidden');
    // The site's theme and reading aids reach into the demo too.
    applyPrefsToFrame(win.document, readPrefs());
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
        t?.closest(
          'a[href], button, input, select, textarea, label, summary, [role=button], [tabindex]',
        )
      )
        return;
      if (win.getSelection()?.toString()) return;
      tween((e.clientX / f.clientWidth) * 100, 320);
    });
    win.addEventListener('wheel', takeOver, { passive: true });
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

  useEffect(() => {
    const mq = window.matchMedia(PHONE_QUERY);
    const sync = () => setPhone(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Follow mode needs a mouse; drop it when there isn't one any more.
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const off = () => !mq.matches && setHover(false);
    mq.addEventListener('change', off);
    return () => mq.removeEventListener('change', off);
  }, []);

  // A pane that finished loading before hydration never fired onLoad here.
  const wireEarly = useEffectEvent(() => {
    frames.current.forEach((f, i) => {
      const doc = f?.contentWindow?.document;
      if (doc?.readyState === 'complete' && doc.URL !== 'about:blank') onFrameLoad(i);
    });
  });
  useEffect(() => wireEarly(), []);

  // Theme or reading aids changed: restyle every loaded pane.
  useEffect(() => {
    const onPrefs = (e: Event) => {
      const p = (e as CustomEvent<Prefs>).detail;
      for (const f of frames.current) {
        const doc = f?.contentWindow?.document;
        if (doc?.body) applyPrefsToFrame(doc, p);
      }
    };
    window.addEventListener(PREFS_EVENT, onPrefs);
    return () => window.removeEventListener(PREFS_EVENT, onPrefs);
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
        if (calmMotion()) return;
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
        <VariantTitle />
        <div
          data-hero-grid
          className="bg-slate border-slate-line mx-auto grid max-w-[1440px] gap-x-16 gap-y-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:py-16"
        >
          <div data-hero-copy className="grid content-start gap-6">
            <Typography
              variant="display"
              id="hero-title"
              className="text-surface text-[clamp(2.25rem,4.2vw,4.25rem)]"
            >
              Your website needs <FreshLook />
            </Typography>
            <p className="text-steel-on-slate m-0 max-w-[52ch] text-[17px] leading-relaxed">
              <strong className="text-surface">One command.</strong> Your own AI assistant redesigns
              your site <strong className="text-surface">several ways</strong>,{' '}
              <strong className="text-surface">from scratch</strong>: no preset themes. Try each{' '}
              <strong className="text-surface">live</strong>,{' '}
              <strong className="text-surface">keep one</strong>.
            </p>
          </div>

          <div data-hero-side className="grid content-start gap-6">
            <div data-keep-cycle className="grid gap-3">
              <PromptCopy
                prompt={PROMPTS.setup}
                tone="slate"
                accent
                label="Copy prompt for your AI"
              />
              <RunnerPicker tone="slate" />
              <CommandCopy command={INSTALL} tone="slate" accent />
              <details className="text-steel-on-slate text-[14px] leading-snug">
                <summary className="text-surface cursor-pointer underline underline-offset-2">
                  Never used a terminal? Start here
                </summary>
                <ol className="m-0 mt-2 grid list-decimal gap-1.5 pl-5">
                  <li>
                    Open your website&apos;s folder in your code editor (for example{' '}
                    <a
                      href="https://code.visualstudio.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-surface underline underline-offset-2"
                    >
                      VS Code
                    </a>
                    ).
                  </li>
                  <li>
                    Open a terminal: in VS Code, use the menu{' '}
                    <strong className="text-surface">Terminal → New Terminal</strong>.
                  </li>
                  <li>
                    Already have one running something like{' '}
                    <code className="text-surface">npm run dev</code>? Leave it running and open a{' '}
                    <strong className="text-surface">second</strong> terminal with the{' '}
                    <strong className="text-surface">+</strong> button at the top of the terminal
                    panel.
                  </li>
                  <li>
                    Click into the new terminal, paste the command above, and press{' '}
                    <strong className="text-surface">Enter</strong>.
                  </li>
                </ol>
              </details>
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
                A made-up shop, redesigned <strong className="text-surface">six ways</strong> by
                Claude Code. <strong className="text-surface">Drag the line</strong> or pick a
                number.
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Phones get the stage to themselves: the dock drops below it, so
          nothing but the line sits over the two narrow halves. */}
      <div className="relative">
        <div
          ref={stage}
          id="demo-stage"
          className={cn(
            'group/stage relative isolate h-[62svh] min-h-[380px] overflow-hidden select-none lg:h-[78svh] lg:min-h-[560px]',
          )}
        >
          <PageSkeleton className={cn('z-10', ready && 'pointer-events-none opacity-0')} />
          {auto && ready && (
            <div
              key={selected}
              aria-hidden="true"
              className="bg-alert absolute inset-x-0 top-0 z-30 h-1 origin-left animate-[cycle_12s_linear_forwards] motion-reduce:hidden"
            />
          )}
          <iframe
            ref={(el) => {
              frames.current[0] = el;
            }}
            onLoad={() => onFrameLoad(0)}
            src={page(0, phone)}
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
              src={page(v.n, phone)}
              title={`${vname(v.n)}: ${v.direction}`}
              aria-hidden={v.n !== selected}
              tabIndex={v.n === selected ? 0 : -1}
              loading={v.n === 1 ? 'eager' : 'lazy'}
              className={cn(
                'vy-split-clip absolute inset-0 size-full border-0 transition-opacity duration-1000 ease-in-out',
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
              className="bg-ink text-surface rounded-flap px-1.5 py-1 text-[10px] opacity-[var(--before-o,1)] sm:px-2 sm:py-1.5 sm:text-[length:inherit]"
            >
              Before<span className="hidden sm:inline"> · today’s site</span>
            </Typography>
            <Typography
              variant="tag"
              className="bg-ink text-surface rounded-flap mr-4 px-1.5 py-1 text-[10px] opacity-[var(--after-o,1)] sm:mr-0 sm:px-2 sm:py-1.5 sm:text-[length:inherit]"
            >
              After<span className="hidden sm:inline"> · {current.direction}</span>
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
            className="group/track absolute inset-y-3 right-1 z-30 w-2 cursor-grab touch-none rounded-full bg-black/10 focus-visible:outline-2 focus-visible:outline-offset-2 active:cursor-grabbing data-[empty=true]:hidden sm:right-1.5 sm:w-3"
          >
            <div className="bg-ink/70 group-hover/track:bg-ink group-active/track:bg-ink absolute inset-x-0.5 top-[var(--thumb-top,0px)] h-[var(--thumb-h,40px)] rounded-full shadow-[0_0_0_1px_rgb(255_255_255/.5)] transition-colors" />
          </div>

          {/* The divider leans slightly; the clip, its shadow and the line share one
            edge in globals.css (.vy-split-*), so they meet at any height. */}
          <div className="vy-split-shade pointer-events-none absolute inset-0 z-20" />
          <div className="vy-split-line pointer-events-none absolute inset-0 z-20" />
          <div className="pointer-events-none absolute inset-y-0 left-[var(--split)] z-20 w-0">
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
              className="pointer-events-auto absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 touch-pan-y transition-[scale,box-shadow] duration-200 ease-[cubic-bezier(.3,1.6,.5,1)] group-data-[dragging=true]/stage:scale-115 group-data-[dragging=true]/stage:shadow-[0_6px_20px_rgb(0_0_0/.45)] max-sm:h-10 max-sm:gap-0 max-sm:px-1.5"
            >
              <ChevronLeft aria-hidden="true" />
              <span className="hidden sm:inline">Before</span>
              <i className="bg-slate-line mx-1 hidden h-4 w-px sm:block" />
              <span className="hidden sm:inline">After</span>
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </div>
        <div
          data-keep-cycle
          className="bg-slate border-slate-line sm:shadow-grip sm:rounded-chip flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t px-2 py-2 font-mono [font-stretch:87.5%] sm:absolute sm:bottom-3 sm:left-1/2 sm:z-30 sm:max-w-[calc(100%-1.5rem)] sm:-translate-x-1/2 sm:border-t-0"
        >
          <div role="group" aria-label="Redesigns" className="flex flex-wrap justify-center gap-1">
            <Button
              variant="cell"
              size="cell"
              aria-label="Previous redesign"
              className="hidden sm:inline-flex"
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
                      className="bg-ink/50 absolute inset-x-1.5 bottom-1 h-0.5 origin-left animate-[cycle_12s_linear_forwards]"
                    />
                  )}
                </Button>
              );
            })}
            <Button
              variant="cell"
              size="cell"
              aria-label="Next redesign"
              className="hidden sm:inline-flex"
              title="Next"
              onClick={() => choose((selected % DEMO_VARIANTS.length) + 1)}
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
          <Button
            variant="toggle-slate"
            size="toggle"
            aria-pressed={hover}
            onClick={() => {
              takeOver();
              setHover((h) => !h);
            }}
            title="The line follows your cursor; drag or click inside the pages as usual when off"
            className="hidden [@media(hover:hover)_and_(pointer:fine)]:inline-flex"
          >
            <MousePointer2 className="size-3.5" aria-hidden="true" />
            Follow cursor
          </Button>
          <div
            role="group"
            className="flex items-center gap-3 pr-2"
            aria-label={`Scores against the original: accessibility ${current.a11y} (was ${DEMO_ORIGINAL_SCORES.a11y}), ${current.axe} axe violations (was ${DEMO_ORIGINAL_SCORES.axe})`}
            title="Measured by variantly's axe-core and Lighthouse check, against the original page"
          >
            <Score label="A11y" value={current.a11y} was={DEMO_ORIGINAL_SCORES.a11y} />
            <Score label="axe" value={current.axe} was={DEMO_ORIGINAL_SCORES.axe} lowerIsBetter />
          </div>
        </div>
      </div>
    </section>
  );
};

export { Showcase };
