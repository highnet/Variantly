'use client';

import { ChevronLeft, ChevronRight, FileText, MousePointer2, Pause, Play } from 'lucide-react';
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
import { RollingNumber } from '@/components/RollingNumber';
import { RunnerPicker } from '@/components/RunnerPicker';
import { VariantTitle } from '@/components/VariantTitle';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { markLoaded } from '@/lib/loadProgress';
import { EASE } from '@/lib/motion';
import { applyPrefsToFrame, calmMotion, PREFS_EVENT, readPrefs, type Prefs } from '@/lib/prefs';
import { whenIdle } from '@/lib/scrollIdle';
import { DEMO_RUNS, PROMPTS } from '@/lib/content';
import { INSTALL } from '@/lib/site';
import { cn } from '@/lib/utils';

const CYCLE_MS = 12000;
const STEP_MS = 38;
const STAGGER_MS = 28;
// The order letters pass the hinge on a real board.
const DRUM = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ&-0123456789';

// Phones get each design's phone edition: the same bands at the same heights
// in every variant, so a split only a few hundred pixels wide still lines up.
// The before page is the same original for every run.
const page = (base: string, n: number, phone: boolean) =>
  `${n === 0 ? DEMO_RUNS[0].base : base}/v${n}/${phone ? 'phone' : 'index'}.html`;
const PHONE_QUERY = '(max-width: 639px)';
// A still of each page's top, per site theme (scripts/demo-posters.mjs),
// shot at the stage's own shape (1440 x 702 on a desktop, 390 x 523 on a
// phone) so it lands on the live frame's pixels, at 1x/2x and 2x/3x.
const poster = (base: string, n: number, phone: boolean, theme: Theme, x?: number) =>
  `${n === 0 ? DEMO_RUNS[0].base : base}/v${n}/poster-${phone ? 'phone' : 'desktop'}-${theme}${x ? `@${x}x` : ''}.webp`;
const posterSet = (base: string, n: number, phone: boolean, theme: Theme) =>
  phone
    ? `${poster(base, n, phone, theme)} 2x, ${poster(base, n, phone, theme, 3)} 3x`
    : `${poster(base, n, phone, theme)} 1x, ${poster(base, n, phone, theme, 2)} 2x`;
// The density a poster loads at here, so the next one can be warmed in it.
const posterFor = (base: string, n: number, phone: boolean, theme: Theme) => {
  const dpr = window.devicePixelRatio || 1;
  const x = phone ? (dpr > 2 ? 3 : undefined) : dpr > 1 ? 2 : undefined;
  return poster(base, n, phone, theme, x);
};
// The live pages wait for the demo to sit fully in view this long, with the
// page not scrolling for SCROLL_QUIET_MS, unless the visitor uses it first.
const IDLE_IN_VIEW_MS = 1500;
const SCROLL_QUIET_MS = 500;
// How long a freshly loaded live page plays its entrance under the poster.
const FRAME_SETTLE_MS = 1400;

// The swap wipe: a leaning edge (top ahead, like the divider) crossing the
// stage from right to left, uncovering the new redesign behind it.
const SWAP_FROM = 'polygon(125% 0, 125% 0, 125% 100%, 115% 100%)';
const SWAP_TO = 'polygon(-15% 0, 125% 0, 125% 100%, -25% 100%)';
type Theme = Prefs['theme'];
// A pane is one design of one run; the original is the same for every run.
type Pane = { run: number; n: number };
const paneKey = ({ run, n }: Pane) => (n === 0 ? 'before' : `${DEMO_RUNS[run].id}-${n}`);
// A live page counts once it has replaced its poster; a pane that unmounts
// takes its frame with it, so a remount starts over.
const shownLive = (frames: Map<string, HTMLIFrameElement>, key: string) =>
  frames.get(key)?.style.opacity === '1';
const vname = (n: number) => `V${String(n).padStart(2, '0')}`;
const LONGEST = Math.max(...DEMO_RUNS.flatMap((r) => r.variants.map((v) => v.direction.length)));
// Sized so the longest direction's cells fill the row at most.
const FLAP_SIZE = `min(1em, ${(88 / LONGEST).toFixed(2)}cqi)`;

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
    let idle = () => {};
    // Each flip waits for the page to be still: nothing flips under a scroll.
    const next = (ms: number) => (timer = window.setTimeout(() => (idle = whenIdle(step)), ms));
    const step = () => {
      if (reduce || showing.current === target) {
        showing.current = target;
        setShown(target);
        return;
      }
      const at = Math.max(0, DRUM.indexOf(showing.current));
      showing.current = DRUM[(at + 1) % DRUM.length];
      setShown(showing.current);
      next(STEP_MS);
    };
    next(index * STAGGER_MS);
    return () => {
      window.clearTimeout(timer);
      idle();
    };
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
    <span className="inline-flex gap-[0.06em]" style={{ fontSize: FLAP_SIZE }} aria-hidden="true">
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
      {/* Only the change against the original: nobody reads the new value. */}
      <span
        className={cn(
          'text-[15px] font-bold tabular-nums',
          diff === 0 ? 'text-surface' : better ? 'text-ok-on-slate' : 'text-fail-on-slate',
        )}
      >
        {diff === 0 ? (
          'same'
        ) : lowerIsBetter ? (
          <>
            <RollingNumber value={diff} /> {better ? 'fixed' : 'new'}
          </>
        ) : (
          <>
            {diff > 0 ? '+' : '−'}
            <RollingNumber value={diff} />
          </>
        )}
      </span>
    </span>
  );
};

/*
 * The first viewport: the promise, then the proof. The flap names a
 * direction, the after pane shows that redesign, and both change together
 * until the visitor takes over.
 */
const Showcase = () => {
  const [runIdx, setRunIdx] = useState(0);
  const run = DEMO_RUNS[runIdx];
  const variants = run.variants;
  const count = variants.length;
  const [selected, setSelected] = useState(1);
  // Each redesign is a full page with its own fonts; mount only the one
  // showing (and the one wiping out under it), plus the next in the cycle
  // once the browser is idle, never all twenty at once.
  const [mounted, setMounted] = useState<Set<number>>(() => new Set([1]));
  // Until the visitor uses the demo, or it sits idle in full view, the panes
  // are still posters: two live pages (HTML, CSS, web fonts) loading while a
  // phone scrolls past was the page's worst scroll hitch.
  const [live, setLive] = useState(false);
  const [phone, setPhone] = useState(false);
  const goLive = useCallback(() => setLive(true), []);
  // The site theme picks the posters; unknown until hydrated, so no poster
  // is fetched in the wrong theme.
  const [theme, setTheme] = useState<Theme | null>(null);
  const lastScroll = useRef(0);
  const scrolling = () => performance.now() - lastScroll.current < SCROLL_QUIET_MS;
  useEffect(() => {
    const syncTheme = () => setTheme(readPrefs().theme);
    syncTheme();
    const onScroll = () => (lastScroll.current = performance.now());
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    const next = (selected % count) + 1;
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    let id = 0;
    let retry = 0;
    const warm = () => {
      // Never start a page load mid-scroll; try again once it settles.
      if (scrolling()) {
        retry = window.setTimeout(() => (id = idle(warm) as number), SCROLL_QUIET_MS);
        return;
      }
      if (theme) new Image().src = posterFor(run.base, next, phone, theme);
      // A touch device warms only the next poster, never a whole page.
      const coarse = window.matchMedia('(pointer: coarse)').matches;
      setMounted((m) => {
        const want = live && !coarse ? [selected, next] : [selected];
        return m.size === want.length && want.every((n) => m.has(n)) ? m : new Set(want);
      });
    };
    id = idle(warm) as number;
    return () => {
      (window.cancelIdleCallback ?? window.clearTimeout)(id);
      clearTimeout(retry);
    };
  }, [selected, count, live, phone, theme, run.base]);
  const [auto, setAuto] = useState(true);
  // Calm mode (the site's setting, which follows reduced motion by default)
  // never starts the tour by itself; Play still starts it on request.
  const [calm, setCalm] = useState(false);
  // What a screen reader hears after the visitor picks a design or a run;
  // the tour's own changes stay quiet.
  const [said, setSaid] = useState('');
  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState(false);
  const hoverRef = useRef(false);
  const pos = useRef(50);
  const anim = useRef(0);
  const grip = useRef<HTMLButtonElement>(null);
  const wired = useRef(new WeakSet<Document>());
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  // Live panes and their wrappers, by paneKey: a run switch keeps the old
  // run's pane drawn under the new one, so numbers alone would collide.
  const frames = useRef(new Map<string, HTMLIFrameElement>());
  // Each redesign sits in a wrapper the swap wipe clips, apart from the
  // divider's own clip on the frame.
  const swaps = useRef(new Map<string, HTMLDivElement>());
  // Swaps waiting on a page that hasn't loaded yet, run from onFrameLoad.
  const waiting = useRef(new Map<string, () => void>());
  // Posters that have arrived, by URL (a run or theme change is a new URL).
  const posterLoaded = useRef(new Set<string>());
  // The redesign kept fully drawn under the one coming in, until the new
  // one has something to show. Set while rendering the new selection, so
  // the old pane never unmounts first: a switch never shows a blank pane.
  const [under, setUnder] = useState<Pane | null>(null);
  const [was, setWas] = useState(selected);
  const [wasRun, setWasRun] = useState(runIdx);
  // Where a newly picked run starts: its first design, or its last when the
  // phone's back button steps across from the run after it.
  const [runStart, setRunStart] = useState(1);
  if (wasRun !== runIdx) {
    // The old run's pane stays drawn underneath until the new one arrives.
    setWasRun(runIdx);
    setSelected(runStart);
    setWas(runStart);
    setUnder({ run: wasRun, n: was });
    setMounted(new Set([runStart]));
  } else if (was !== selected) {
    setWas(selected);
    setUnder({ run: runIdx, n: was });
    setMounted((m) => (m.has(selected) ? m : new Set(m).add(selected)));
  }
  const selKey = paneKey({ run: runIdx, n: selected });
  const selKeyRef = useRef(selKey);
  useEffect(() => {
    selKeyRef.current = selKey;
  }, [selKey]);
  const raf = useRef(0);
  const want = useRef(50);
  const quiet = useRef(0);
  const visible = useRef(true);

  const takeOver = useCallback(() => setAuto(false), []);

  const choose = useCallback(
    (n: number) => {
      takeOver();
      goLive();
      setSelected(n);
      const v = variants[n - 1];
      if (v) setSaid(`Showing ${vname(n)}, ${v.direction}`);
    },
    [takeOver, goLive, variants],
  );
  const chooseRun = (i: number, start = 1) => {
    takeOver();
    goLive();
    setRunStart(start);
    setRunIdx(i);
    const r = DEMO_RUNS[i];
    const v = r.variants[start - 1];
    setSaid(`${r.label}: ${r.variants.length} redesigns. Showing ${vname(start)}, ${v.direction}`);
  };

  // Calm mode, now and whenever the visitor changes it, pauses the tour.
  useEffect(() => {
    const sync = (c: boolean) => {
      setCalm(c);
      if (c) setAuto(false);
    };
    sync(calmMotion());
    const onPrefs = (e: Event) => sync((e as CustomEvent<Prefs>).detail.motion === 'calm');
    window.addEventListener(PREFS_EVENT, onPrefs);
    return () => window.removeEventListener(PREFS_EVENT, onPrefs);
  }, []);

  // Cycle while untouched (or after Play), on screen and in a visible tab.
  useEffect(() => {
    if (!auto) return;
    const io = new IntersectionObserver(([e]) => (visible.current = e.isIntersecting), {
      threshold: 0.3,
    });
    if (root.current) io.observe(root.current);
    const timer = setInterval(() => {
      // No swap (and so no page load) while the visitor is scrolling.
      if (!visible.current || document.hidden || scrolling()) return;
      setSelected((n) => (n % count) + 1);
    }, CYCLE_MS);
    return () => {
      clearInterval(timer);
      io.disconnect();
    };
  }, [auto, count]);

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
    for (const f of frames.current.values()) {
      if (f !== from) applyScroll(f);
    }
  }, []);

  /* The fake scrollbar: it reads the visible pane and moves every pane. */
  const track = useRef<HTMLDivElement>(null);
  const thumbDrag = useRef<{ y: number; top: number } | null>(null);

  const metrics = () => {
    const doc = frames.current.get(selKey)?.contentWindow?.document.scrollingElement;
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
    for (const f of frames.current.values()) applyScroll(f);
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
    applyScroll(frames.current.get(selKey) ?? null);
    repaint();
  }, [selKey]);

  const onFrameLoad = (key: string) => {
    const f = frames.current.get(key);
    const win = f?.contentWindow;
    // Each document is wired once, whichever of load or mount sees it first.
    if (!f || !win || wired.current.has(win.document)) return;
    wired.current.add(win.document);
    // The poster underneath stays in view while the page plays its own
    // entrance, then the settled live page takes its place in one cut: the
    // poster is hidden as the frame shows, so the two never overlap (a fade
    // showed both pages' text at once, doubled).
    window.setTimeout(
      () => {
        if (!f.isConnected) return;
        f.style.opacity = '1';
        if (f.parentElement) f.parentElement.dataset.live = 'true';
        waiting.current.get(key)?.();
        if (shownLive(frames.current, 'before') && shownLive(frames.current, selKeyRef.current)) {
          setReady(true);
          markLoaded('demo');
        }
      },
      calmMotion() ? 0 : FRAME_SETTLE_MS,
    );
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
      queuePos((e.clientX / f.clientWidth) * 100);
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
    // The grip and the drag band move by transform, in pixels: moving them
    // with left would lay the stage out again on every frame of a drag.
    el.style.setProperty('--split-x', `${(el.clientWidth * p) / 100}px`);
    // Labels fade as the divider closes in on them.
    el.style.setProperty('--before-o', String(Math.max(0, Math.min(1, (p - 12) / 10))));
    el.style.setProperty('--after-o', String(Math.max(0, Math.min(1, (88 - p) / 10))));
    grip.current?.setAttribute('aria-valuenow', String(Math.round(p)));
    grip.current?.setAttribute(
      'aria-valuetext',
      `${Math.round(p)}% before, ${100 - Math.round(p)}% after`,
    );
  };

  /* Pointer events can outpace the screen; paint the latest once a frame. */
  const queuePos = (p: number) => {
    want.current = p;
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      setPos(want.current);
    });
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
    goLive();
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
    queuePos(pct(e));
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
    goLive();
    tween(keys[e.key], 150);
  };

  // Effects reach the divider through events, so they never re-run for it.
  const placeAt = useEffectEvent((p: number) => setPos(p));
  const sweepTo = useEffectEvent((to: number, ms: number) => tween(to, ms));

  useEffect(() => placeAt(50), []);

  // The pixel position follows the stage's width.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(() => placeAt(pos.current));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /*
   * Changing redesign or run: the new one wipes in over the old behind a
   * leaning edge, like the concept swap, while the old one stays fully drawn
   * underneath. (A crossfade let the original show through mid-way and
   * faded in pages that were still blank.) A pane with nothing to show yet
   * is held back until its poster or page arrives, for a second at most;
   * in calm mode it then simply replaces the old one, with no wipe.
   */
  useEffect(() => {
    if (under === null) return;
    const from = under;
    const el = swaps.current.get(selKey);
    if (!el) return;
    const queue = waiting.current;
    const animate = !calm;
    // Hidden until it has something to show, so the old pane stays in view.
    el.style.clipPath = animate ? SWAP_FROM : 'inset(0 0 0 100%)';
    let wipe: Animation | undefined;
    let timer = 0;
    let gone = false;
    const done = () => setUnder((u) => (u === from ? null : u));
    const run = () => {
      queue.delete(selKey);
      clearTimeout(timer);
      if (wipe || gone) return;
      el.style.clipPath = '';
      if (!animate) return done();
      wipe = el.animate([{ clipPath: SWAP_FROM }, { clipPath: SWAP_TO }], {
        duration: 680,
        easing: EASE.wipe,
      });
      wipe.onfinish = done;
    };
    // Wipe in only once there is something to show: the poster or the page.
    const still = theme && posterFor(DEMO_RUNS[runIdx].base, selected, phone, theme);
    if (shownLive(frames.current, selKey) || (still && posterLoaded.current.has(still))) run();
    else {
      queue.set(selKey, run);
      timer = window.setTimeout(run, 1000);
    }
    return () => {
      gone = true;
      queue.delete(selKey);
      clearTimeout(timer);
      wipe?.cancel();
      el.style.clipPath = '';
    };
  }, [under, selKey, calm, theme, runIdx, selected, phone]);

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

  // On phones the site's floating chrome steps aside while the demo is in
  // view: html[data-demo-focus] tells it to tuck away.
  useEffect(() => {
    // The stage and its dock, not the hero copy above them.
    const el = stage.current?.parentElement;
    if (!el) return;
    const mq = window.matchMedia(`${PHONE_QUERY}, (pointer: coarse)`);
    const html = document.documentElement;
    const io = new IntersectionObserver(([en]) => {
      if (en.isIntersecting && mq.matches) html.dataset.demoFocus = '';
      else delete html.dataset.demoFocus;
    });
    io.observe(el);
    return () => {
      io.disconnect();
      delete html.dataset.demoFocus;
    };
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
    frames.current.forEach((f, key) => {
      const doc = f.contentWindow?.document;
      if (doc?.readyState === 'complete' && doc.URL !== 'about:blank') onFrameLoad(key);
    });
  });
  useEffect(() => wireEarly(), []);

  // Theme or reading aids changed: restyle every loaded pane.
  useEffect(() => {
    const onPrefs = (e: Event) => {
      const p = (e as CustomEvent<Prefs>).detail;
      setTheme(p.theme);
      for (const f of frames.current.values()) {
        const doc = f.contentWindow?.document;
        if (doc?.body) applyPrefsToFrame(doc, p);
      }
    };
    window.addEventListener(PREFS_EVENT, onPrefs);
    return () => window.removeEventListener(PREFS_EVENT, onPrefs);
  }, []);

  // Go live by itself once the demo has sat fully in view for a moment with
  // the page still, so a visitor scrolling past never pays for two pages.
  useEffect(() => {
    if (live || !stage.current) return;
    let since = 0;
    let timer = 0;
    const check = () => {
      if (since && performance.now() - since >= IDLE_IN_VIEW_MS && !scrolling()) setLive(true);
      else timer = window.setTimeout(check, 250);
    };
    const io = new IntersectionObserver(
      ([en]) => {
        clearTimeout(timer);
        since = en.intersectionRatio >= 0.95 ? performance.now() : 0;
        if (since) timer = window.setTimeout(check, IDLE_IN_VIEW_MS);
      },
      { threshold: [0, 0.95] },
    );
    io.observe(stage.current);
    return () => {
      io.disconnect();
      clearTimeout(timer);
    };
  }, [live]);

  // The stage shows once both posters (or both live pages) have arrived.
  const shown = useRef(new Set<string>());
  const onVariantPoster = (key: string, src: string) => {
    // currentSrc is absolute; posterFor gives the path.
    posterLoaded.current.add(new URL(src, window.location.href).pathname);
    waiting.current.get(key)?.();
    if (key === selKey) onPosterLoad('after');
  };
  const onPosterLoad = (key: string) => {
    shown.current.add(key);
    if (shown.current.has('before') && shown.current.has('after')) {
      setReady(true);
      markLoaded('demo');
    }
  };

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

  const current = variants[selected - 1] ?? variants[0];
  const original = run.original;
  const prevN = ((selected + count - 2) % count) + 1;
  const nextN = (selected % count) + 1;
  // Phones step through every run as one list: past a run's end, on to the
  // next run's first design (and back to the previous run's last).
  const total = DEMO_RUNS.reduce((t, r) => t + r.variants.length, 0);
  const position = DEMO_RUNS.slice(0, runIdx).reduce((t, r) => t + r.variants.length, 0) + selected;
  const step = (by: 1 | -1) => {
    if (selected + by >= 1 && selected + by <= count) return choose(selected + by);
    const i = (runIdx + by + DEMO_RUNS.length) % DEMO_RUNS.length;
    chooseRun(i, by > 0 ? 1 : DEMO_RUNS[i].variants.length);
  };
  const cells = useRef<(HTMLButtonElement | null)[]>([]);
  // Arrow keys move through the numbers, focus following the selection.
  const onCellsKey = (e: KeyboardEvent<HTMLDivElement>) => {
    // Up and down move a whole row of ten, staying in the same column.
    const row = Math.min(10, count);
    const to: Record<string, number> = {
      ArrowLeft: prevN,
      ArrowRight: nextN,
      ArrowUp: ((selected - 1 - row + count) % count) + 1,
      ArrowDown: ((selected - 1 + row) % count) + 1,
      Home: 1,
      End: count,
    };
    if (!(e.key in to)) return;
    e.preventDefault();
    choose(to[e.key]);
    cells.current[to[e.key]]?.focus();
  };

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
              One website. Four redesigns. <FreshLook>You pick.</FreshLook>
            </Typography>
            <p className="text-steel-on-slate m-0 max-w-[52ch] text-[17px] leading-relaxed">
              Your AI coding agent redesigns your{' '}
              <strong className="text-surface">actual site</strong>{' '}
              <strong className="text-surface">in parallel</strong>. Compare{' '}
              <strong className="text-surface">live versions</strong>, keep the best, and{' '}
              <strong className="text-surface">review the code</strong> before it ships.
            </p>
            <ul className="text-steel-on-slate m-0 grid list-none gap-1.5 p-0 text-[15px] leading-snug">
              <li>
                <span className="text-surface font-semibold">Real code:</span> each design is a git
                branch in its own worktree, made by the agent you already use.
              </li>
              <li>
                <span className="text-surface font-semibold">Your call:</span> nothing touches your
                files until you press Keep, and then it lands as an unstaged diff.
              </li>
              <li>
                <span className="text-surface font-semibold">Free and MIT-licensed:</span> the AI
                work runs on your own plan.{' '}
                <a href="#demo-stage" className="text-surface underline underline-offset-2">
                  Try the comparison below
                </a>{' '}
                or{' '}
                <a href="/safety" className="text-surface underline underline-offset-2">
                  see what it does to your repo
                </a>
                .
              </li>
            </ul>
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
                <div className="mt-3 grid gap-2">
                  <p className="m-0">
                    Rather be walked through it? Paste this into any AI chat (Claude, ChatGPT, or
                    your editor&apos;s chat):
                  </p>
                  <PromptCopy
                    chip
                    tone="slate"
                    prompt={PROMPTS.walkthrough}
                    label="Copy walk-me-through prompt"
                  />
                </div>
              </details>
            </div>
            <div className="border-slate-line grid gap-2.5 border-t pt-4">
              {/* Not a live region: the tour changes this every few seconds.
                  The visitor's own picks are announced by the status below. */}
              <p className="figure [container-type:inline-size] m-0 flex flex-wrap items-center gap-x-[0.3em] gap-y-1 text-[clamp(1.1rem,1.6vw,1.5rem)] leading-none">
                <span className="text-steel-on-slate">Now showing</span>
                <span className="sr-only">{current.direction}</span>
                <FlapWord word={current.direction} />
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <a
                  href={`${run.base}/v${selected}/BRIEF.md`}
                  className="text-steel-on-slate hover:text-surface inline-flex items-center gap-1 text-[13px] underline underline-offset-2"
                >
                  <FileText className="size-3.5" aria-hidden="true" />
                  What the AI was asked
                </a>
              </div>
              {/* Every run's copy shares one grid cell, the others invisible,
                  so switching runs never changes the height above the demo
                  (that moved the page under the visitor's thumb). */}
              <div className="grid">
                {DEMO_RUNS.map((r, i) => (
                  <div
                    key={r.id}
                    aria-hidden={i !== runIdx}
                    className={cn(
                      'col-start-1 row-start-1 grid content-start gap-2.5',
                      i !== runIdx && 'invisible',
                    )}
                  >
                    <p className="text-steel-on-slate m-0 text-[13px] leading-snug">{r.brief}</p>
                    <p className="text-steel-on-slate m-0 text-[13px] leading-snug">
                      <strong className="text-surface">Illustrative example:</strong> a made-up
                      shop, not customer work, redesigned{' '}
                      <strong className="text-surface">
                        {r.variants.length === 20
                          ? 'twenty'
                          : r.variants.length === 10
                            ? 'ten'
                            : r.variants.length}{' '}
                        ways
                      </strong>{' '}
                      by Claude Code. <strong className="text-surface">Drag the line</strong> or
                      pick a number.
                    </p>
                  </div>
                ))}
              </div>
              <p id="demo-status" role="status" className="sr-only">
                {said}
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
          role="group"
          aria-roledescription="before and after comparison"
          aria-label={`Before: the original Oak & Iron page. After: ${vname(selected)}, ${current.direction}`}
          onClick={goLive}
          className={cn(
            'group/stage relative isolate h-[62svh] min-h-[380px] overflow-hidden select-none lg:h-[78svh] lg:min-h-[560px]',
          )}
        >
          <PageSkeleton
            className={cn(
              'z-10',
              ready && 'pointer-events-none opacity-0 [&_.skeleton]:animate-none!',
            )}
          />
          {auto && ready && !calm && (
            <div
              key={selected}
              aria-hidden="true"
              className="bg-alert absolute inset-x-0 top-0 z-30 h-1 origin-left animate-[cycle_12s_linear_forwards] in-data-[motion=calm]:hidden motion-reduce:hidden"
            />
          )}
          {/* Each pane is a poster first; its live page mounts over it and
              lands on the same pixels, so the handoff never shows a blank.
              The posters are pictures of what the frames will hold, so
              assistive tech skips them; the stage's label says what is
              shown. Pane wrappers let clicks through to the frames: the
              after pane's wrapper spans the whole stage, and used to swallow
              every click on the before side. */}
          <div className="group/pane pointer-events-none absolute inset-0">
            {theme && (
              // eslint-disable-next-line @next/next/no-img-element -- pre-sized static WebP
              <img
                src={poster(run.base, 0, phone, theme)}
                srcSet={posterSet(run.base, 0, phone, theme)}
                alt=""
                aria-hidden="true"
                decoding="async"
                onLoad={() => onPosterLoad('before')}
                className="absolute inset-0 size-full bg-white object-cover object-top group-data-[live=true]/pane:invisible"
              />
            )}
            {live && (
              <iframe
                ref={(el) => {
                  if (el) frames.current.set('before', el);
                  else frames.current.delete('before');
                }}
                onLoad={() => onFrameLoad('before')}
                src={page(run.base, 0, phone)}
                title="Before: Oak & Iron as it was, the original"
                className="pointer-events-auto absolute inset-0 size-full border-0 bg-white opacity-0"
              />
            )}
          </div>
          {[
            ...(under && under.run !== runIdx ? [under] : []),
            ...variants
              .filter((v) => v.n === selected || under?.n === v.n || mounted.has(v.n))
              .map((v) => ({ run: runIdx, n: v.n })),
          ].map((pane) => {
            const key = paneKey(pane);
            const r = DEMO_RUNS[pane.run];
            const v = r.variants[pane.n - 1];
            const isUnder = under !== null && paneKey(under) === key;
            const isSel = key === selKey;
            return (
              <div
                key={key}
                ref={(el) => {
                  if (el) swaps.current.set(key, el);
                  else swaps.current.delete(key);
                }}
                className={cn(
                  'group/pane pointer-events-none absolute inset-0',
                  isSel ? 'z-[2]' : isUnder ? 'z-[1]' : 'invisible',
                )}
              >
                {theme && (
                  // eslint-disable-next-line @next/next/no-img-element -- pre-sized static WebP
                  <img
                    src={poster(r.base, pane.n, phone, theme)}
                    srcSet={posterSet(r.base, pane.n, phone, theme)}
                    alt=""
                    aria-hidden="true"
                    decoding="async"
                    onLoad={(e) => onVariantPoster(key, e.currentTarget.currentSrc)}
                    className="vy-split-clip absolute inset-0 size-full object-cover object-top group-data-[live=true]/pane:invisible"
                  />
                )}
                {live && (
                  <iframe
                    ref={(el) => {
                      if (el) frames.current.set(key, el);
                      else frames.current.delete(key);
                    }}
                    onLoad={() => onFrameLoad(key)}
                    src={page(r.base, pane.n, phone)}
                    title={`After: ${vname(pane.n)}, ${v.direction}`}
                    aria-hidden={!isSel}
                    tabIndex={isSel ? 0 : -1}
                    className={cn(
                      'vy-split-clip absolute inset-0 size-full border-0 bg-white opacity-0',
                      isSel && 'pointer-events-auto',
                    )}
                  />
                )}
              </div>
            );
          })}
          {/* The panes stay scrollable; this band either side of the line is
            the drag surface, so nobody has to hit the grip exactly. */}
          <div
            className="absolute inset-y-0 left-0 z-20 w-16 translate-x-[calc(var(--split-x,50vw)-50%)] cursor-ew-resize touch-pan-y group-data-[dragging=true]/stage:inset-x-0 group-data-[dragging=true]/stage:left-0 group-data-[dragging=true]/stage:w-auto group-data-[dragging=true]/stage:translate-x-0"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onLostPointerCapture={onUp}
            onDoubleClick={() => tween(50, 300)}
          />

          {/* Visual tags; the stage's own label names both sides. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-3 top-3 z-20 flex justify-between gap-3"
          >
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
            className={cn(
              'group/track absolute inset-y-3 right-1 z-30 w-2 cursor-grab touch-none rounded-full bg-black/10 focus-visible:outline-2 focus-visible:outline-offset-2 active:cursor-grabbing data-[empty=true]:hidden sm:right-1.5 sm:w-3',
              // Posters don't scroll; the bar arrives with the live pages.
              !live && 'hidden',
            )}
          >
            <div className="bg-ink/70 group-hover/track:bg-ink group-active/track:bg-ink absolute inset-x-0.5 top-[var(--thumb-top,0px)] h-[var(--thumb-h,40px)] rounded-full shadow-[0_0_0_1px_rgb(255_255_255/.5)] transition-colors" />
          </div>

          {/* The divider leans slightly; the clip, its shadow and the line share one
            edge in globals.css (.vy-split-*), so they meet at any height. */}
          <div className="vy-split-shade pointer-events-none absolute inset-0 z-20" />
          <div className="vy-split-line pointer-events-none absolute inset-0 z-20" />
          <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-0 translate-x-[var(--split-x,50vw)]">
            <Button
              ref={grip}
              variant="grip"
              size="grip"
              role="slider"
              aria-label="Before and after divider"
              aria-controls="demo-stage"
              aria-orientation="horizontal"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={50}
              aria-valuetext="50% before, 50% after"
              onKeyDown={onGripKey}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              onDoubleClick={() => tween(50, 300)}
              className="pointer-events-auto absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 touch-pan-y transition-[scale,box-shadow] duration-200 ease-(--ease-spring-pop) group-data-[dragging=true]/stage:scale-115 group-data-[dragging=true]/stage:shadow-[0_6px_20px_rgb(0_0_0/.45)] max-sm:h-10 max-sm:gap-0 max-sm:px-1.5"
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
          className="bg-slate border-slate-line sm:shadow-grip sm:rounded-chip flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t px-2 py-2 font-mono [font-stretch:87.5%] max-sm:pb-[calc(88px+env(safe-area-inset-bottom))] sm:absolute sm:inset-x-3 sm:bottom-3 sm:z-30 sm:mx-auto sm:w-fit sm:border-t-0"
        >
          {DEMO_RUNS.length > 1 && (
            // Which batch of redesigns: a segmented switch in an ink well,
            // like the dock's mode switch, the pressed run lit green.
            <div
              role="group"
              aria-label="Redesign run"
              className="bg-ink rounded-control flex gap-0.5 p-0.5 max-sm:hidden lg:flex-col"
            >
              {DEMO_RUNS.map((r, i) => (
                <Button
                  key={r.id}
                  variant="segment"
                  size="segment"
                  aria-pressed={i === runIdx}
                  title={r.brief}
                  onClick={() => i !== runIdx && chooseRun(i)}
                  className="gap-1.5 rounded-[6px] px-2.5 py-1.5 max-sm:flex-1"
                >
                  {r.label}
                  <span className="font-mono text-[11px] tabular-nums opacity-70">
                    {r.variants.length}
                    <span className="sr-only"> redesigns</span>
                  </span>
                </Button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1">
            <Button
              variant="cell"
              size="cell"
              aria-label="Previous redesign"
              className="hidden sm:inline-flex"
              title="Previous"
              onClick={() => choose(prevN)}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Button>
            <Button
              variant="cell"
              size="cell"
              aria-label="Previous redesign"
              className="sm:hidden"
              onClick={() => step(-1)}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Button>
            {/* Ten to a row, so twenty fit a phone in two rows and every
                number stays in view. */}
            <div
              id="demo-picker"
              role="radiogroup"
              aria-label={`${run.label} redesigns, 1 to ${count}`}
              onKeyDown={onCellsKey}
              className="hidden gap-1 sm:grid sm:grid-cols-[repeat(10,2.5rem)]"
            >
              {variants.map((v) => {
                const active = selected === v.n;
                return (
                  <Button
                    key={v.n}
                    ref={(el) => {
                      cells.current[v.n] = el;
                    }}
                    variant="cell"
                    size="cell-grid"
                    role="radio"
                    aria-checked={active}
                    aria-label={`${String(v.n).padStart(2, '0')} ${v.direction}`}
                    title={`${v.direction} (${v.n})`}
                    tabIndex={active ? 0 : -1}
                    onClick={() => choose(v.n)}
                  >
                    {String(v.n).padStart(2, '0')}
                    {active && auto && !calm && (
                      <span
                        key={selected}
                        aria-hidden="true"
                        className="bg-ink/50 absolute inset-x-1.5 bottom-1 h-0.5 origin-left animate-[cycle_12s_linear_forwards] motion-reduce:hidden"
                      />
                    )}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="cell"
              size="cell"
              aria-label="Next redesign"
              className="hidden sm:inline-flex"
              title="Next"
              onClick={() => choose(nextN)}
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
            <span
              aria-hidden="true"
              className="text-surface min-w-24 text-center text-[15px] tabular-nums sm:hidden"
            >
              {String(position).padStart(2, '0')} / {total}
            </span>
            <Button
              variant="cell"
              size="cell"
              aria-label="Next redesign"
              className="sm:hidden"
              onClick={() => step(1)}
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
          {/* The dock stays one band on desktop: tour controls stack over the
              scores beside the grid instead of adding a row over the demo. */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 lg:grid lg:justify-items-start">
            {/* WCAG 2.2.2: the tour moves on its own, so it can be paused (and
              any interaction with the demo stops it too). */}
            <div className="flex items-center gap-3">
              <Button
                variant="toggle-slate"
                size="toggle"
                onClick={() => {
                  goLive();
                  setAuto((a) => !a);
                  setSaid(auto ? 'Tour paused' : 'Tour playing');
                }}
                title={auto ? 'Stop cycling through the redesigns' : 'Cycle through the redesigns'}
              >
                {auto ? (
                  <Pause className="size-3.5" aria-hidden="true" />
                ) : (
                  <Play className="size-3.5" aria-hidden="true" />
                )}
                {auto ? 'Pause tour' : 'Play tour'}
              </Button>
              <Button
                variant="toggle-slate"
                size="toggle"
                aria-pressed={hover}
                onClick={() => {
                  takeOver();
                  goLive();
                  setHover((h) => !h);
                }}
                title="The line follows your cursor; drag or click inside the pages as usual when off"
                className="hidden [@media(hover:hover)_and_(pointer:fine)]:inline-flex"
              >
                <MousePointer2 className="size-3.5" aria-hidden="true" />
                Follow cursor
              </Button>
            </div>
            <div
              role="group"
              className="flex items-center gap-3 pr-2"
              aria-label={`Against the original: accessibility ${current.a11y - original.a11y >= 0 ? 'up' : 'down'} ${Math.abs(current.a11y - original.a11y)}, ${original.axe - current.axe} axe violations fixed`}
              title="Measured by variantly's axe-core and Lighthouse check, against the original page"
            >
              <Score label="A11y" value={current.a11y} was={original.a11y} />
              <Score label="axe" value={current.axe} was={original.axe} lowerIsBetter />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export { Showcase };
