'use client';

import { ArrowUpRight, Check, Copy } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { copyCommand } from '@/lib/copy';
import { useRunner, withRunner } from '@/lib/runner';
import { cn } from '@/lib/utils';

// Room kept between the bubble and the viewport edge, and the trigger.
const EDGE = 12;
const GAP = 10;
// Hover intent: a short wait before opening, a longer grace before closing so
// the pointer can cross the gap into the bubble.
const OPEN_DELAY = 90;
const CLOSE_DELAY = 160;
// Matches --animate-tip-out.
const OUT_MS = 120;
// Opening one tip closes any other.
const TIP_EVENT = 'variantly:tip';

type Phase = 'closed' | 'open' | 'closing';

/** Where the bubble goes: above the trigger when it fits, else below. */
const place = (trigger: HTMLElement, bubble: HTMLElement, arrow: HTMLElement | null) => {
  // Under the accessibility menu's large text, <html> is zoomed: the rects
  // are in zoomed pixels, the bubble's top/left are not.
  const zoom = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
  const r = trigger.getBoundingClientRect();
  const vw = document.documentElement.clientWidth / zoom;
  const vh = window.innerHeight / zoom;
  const t = {
    top: r.top / zoom,
    bottom: r.bottom / zoom,
    left: r.left / zoom,
    width: r.width / zoom,
  };
  const w = bubble.offsetWidth;
  const h = bubble.offsetHeight;
  const above = t.top - GAP - h >= EDGE;
  const below = t.bottom + GAP + h <= vh - EDGE;
  const side = above || (!below && t.top > vh - t.bottom) ? 'top' : 'bottom';
  const centre = t.left + t.width / 2;
  const left = Math.min(Math.max(centre - w / 2, EDGE), Math.max(EDGE, vw - EDGE - w));
  const top = side === 'top' ? t.top - GAP - h : t.bottom + GAP;
  const arrowX = Math.min(Math.max(centre - left, 14), w - 14);
  bubble.style.left = `${left}px`;
  bubble.style.top = `${top}px`;
  // It grows out of the point nearest its trigger.
  bubble.style.transformOrigin = `${arrowX}px ${side === 'top' ? '100%' : '0%'}`;
  bubble.dataset.side = side;
  if (arrow) arrow.style.left = `${arrowX}px`;
};

type TipProps = {
  /** The words in the text that open the tip. */
  label: ReactNode;
  /** A short bold line at the top of the bubble. */
  title?: ReactNode;
  /** The explanation: one or two plain sentences, or richer content. */
  children: ReactNode;
  /** An outside page to read more. */
  href?: string;
  hrefLabel?: string;
  /** Set when the bubble holds controls (a copy button, a link). */
  interactive?: boolean;
  className?: string;
};

/*
 * A word in the copy that explains itself. It opens on hover, on keyboard
 * focus and on tap; Esc, moving focus away or tapping elsewhere closes it.
 * The bubble lives in the top layer (popover), so no card's overflow or
 * transform can clip it, but it stays right after its trigger in the DOM,
 * so Tab walks from the word into the bubble's controls.
 */
const Tip = ({ label, title, children, href, hrefLabel, interactive, className }: TipProps) => {
  const id = useId();
  const [phase, setPhase] = useState<Phase>('closed');
  const root = useRef<HTMLSpanElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const bubble = useRef<HTMLSpanElement>(null);
  const arrow = useRef<HTMLSpanElement>(null);
  // Opened by a click or tap: stays until dismissed, hover-out leaves it.
  const pinned = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  // A press inside the tip is in progress (its blur is not a leave).
  const pressing = useRef(false);
  // Focus is being handed back to the trigger: don't reopen on that focus.
  const refocusing = useRef(false);

  const clear = () => window.clearTimeout(timer.current);

  const open = useCallback((pin: boolean) => {
    window.clearTimeout(timer.current);
    pinned.current = pinned.current || pin;
    setPhase('open');
  }, []);

  const close = useCallback(() => {
    window.clearTimeout(timer.current);
    pinned.current = false;
    setPhase((p) => (p === 'open' ? 'closing' : p));
  }, []);

  // Show the popover and place it before the first frame paints.
  useLayoutEffect(() => {
    const el = bubble.current;
    const t = trigger.current;
    if (!el || !t || phase !== 'open') return;
    if (typeof el.showPopover === 'function' && !el.matches(':popover-open')) el.showPopover();
    place(t, el, arrow.current);
    window.dispatchEvent(new CustomEvent(TIP_EVENT, { detail: id }));
  }, [phase, id]);

  // The exit fade, then out of the top layer.
  useEffect(() => {
    if (phase !== 'closing') return;
    const done = window.setTimeout(() => {
      const el = bubble.current;
      if (el?.matches(':popover-open')) el.hidePopover();
      setPhase('closed');
    }, OUT_MS);
    return () => window.clearTimeout(done);
  }, [phase]);

  // While open: follow the trigger, and listen for the ways out.
  useEffect(() => {
    if (phase !== 'open') return;
    const reposition = () => {
      if (trigger.current && bubble.current) place(trigger.current, bubble.current, arrow.current);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const inside = root.current?.contains(document.activeElement);
      close();
      if (inside && document.activeElement !== trigger.current) {
        refocusing.current = true;
        trigger.current?.focus();
        refocusing.current = false;
      }
    };
    const onDown = (e: globalThis.PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) close();
    };
    const onOther = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== id) close();
    };
    window.addEventListener('scroll', reposition, { passive: true, capture: true });
    window.addEventListener('resize', reposition);
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown, true);
    window.addEventListener(TIP_EVENT, onOther);
    return () => {
      window.removeEventListener('scroll', reposition, { capture: true });
      window.removeEventListener('resize', reposition);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener(TIP_EVENT, onOther);
    };
  }, [phase, id, close]);

  useEffect(() => clear, []);

  const onEnter = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    clear();
    if (phase === 'open') return;
    timer.current = window.setTimeout(() => open(false), OPEN_DELAY);
  };

  const onLeave = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    clear();
    if (pinned.current || root.current?.contains(document.activeElement)) return;
    timer.current = window.setTimeout(close, CLOSE_DELAY);
  };

  const onClick = () => {
    // A tap or click pins it open; a second one on a pinned tip closes it.
    if (phase === 'open' && pinned.current) close();
    else open(true);
  };

  const onFocus = () => {
    // Keyboard focus opens it; a mouse press or tap is left to the click.
    if (refocusing.current || pressing.current) return;
    if (trigger.current?.matches(':focus-visible')) open(false);
  };

  const onBlur = (e: FocusEvent) => {
    if (pressing.current) return;
    if (root.current?.contains(e.relatedTarget as Node | null)) return;
    close();
  };

  return (
    <span
      ref={root}
      data-slot="tip"
      data-keep-cycle
      className="inline"
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onPointerDown={() => {
        pressing.current = true;
        window.setTimeout(() => (pressing.current = false), 0);
      }}
      onBlur={onBlur}
    >
      <Button
        ref={trigger}
        variant="tip"
        size="none"
        aria-describedby={id}
        aria-expanded={phase === 'open'}
        onClick={onClick}
        onFocus={onFocus}
        className={className}
      >
        {label}
      </Button>
      <span
        ref={bubble}
        id={id}
        popover="manual"
        role={interactive || href ? undefined : 'tooltip'}
        data-side="top"
        className={cn(
          // Display stays ours (closed = hidden), not the popover's, so the
          // bubble is also right where the popover API is missing.
          'vy-tip on-slate bg-slate text-surface border-slate-line shadow-dock fixed inset-auto z-70 m-0 hidden w-max max-w-[min(20rem,calc(100vw-1.5rem))] overflow-visible rounded-[10px] border p-0 text-left font-sans text-[14px] leading-snug font-normal tracking-normal whitespace-normal normal-case [font-stretch:normal]',
          phase !== 'closed' && 'block',
          phase === 'open' && 'animate-tip-in',
          phase === 'closing' && 'animate-tip-out',
        )}
      >
        <span
          ref={arrow}
          aria-hidden="true"
          className={cn(
            'bg-slate border-slate-line absolute size-2.5 -translate-x-1/2 rotate-45',
            'in-data-[side=top]:-bottom-[5.5px] in-data-[side=top]:border-r in-data-[side=top]:border-b',
            'in-data-[side=bottom]:-top-[5.5px] in-data-[side=bottom]:border-t in-data-[side=bottom]:border-l',
          )}
        />
        <span className="relative grid gap-1.5 px-3.5 py-3">
          {title && <span className="text-surface block text-[13px] font-semibold">{title}</span>}
          <Typography
            as="span"
            variant="small"
            color="steel-on-slate"
            className="block leading-snug"
          >
            {children}
          </Typography>
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-surface inline-flex w-fit items-center gap-1 text-[13px] font-semibold underline underline-offset-2"
            >
              {hrefLabel ?? 'Learn more'}
              <ArrowUpRight aria-hidden="true" className="size-3.5" />
            </a>
          )}
        </span>
      </span>
    </span>
  );
};

type TipCommandProps = {
  command: string;
  className?: string;
};

/* A one-line terminal inside a tip: `$ command` and its copy button. */
const TipCommand = ({ command, className }: TipCommandProps) => {
  const [copied, setCopied] = useState(false);
  const shown = withRunner(command, useRunner());

  const copy = async (e: MouseEvent<HTMLButtonElement>) => {
    const ok = await copyCommand(shown, e.currentTarget);
    setCopied(ok);
    if (ok) window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <span
      data-slot="tip-command"
      className={cn(
        'rounded-chip border-slate-line bg-ink text-surface flex items-center gap-2.5 border py-1 pr-1 pl-3',
        className,
      )}
    >
      <span aria-hidden="true" className="text-steel-on-slate font-mono text-[13px]">
        $
      </span>
      <code className="condensed min-w-0 flex-1 font-mono text-[13px] [overflow-wrap:anywhere]">
        {shown}
      </code>
      <Button
        variant="icon-slate"
        size="icon-sm"
        onClick={copy}
        aria-label={copied ? 'Copied' : `Copy ${shown}`}
      >
        {copied ? <Check className="animate-pop" /> : <Copy />}
      </Button>
      <span className="sr-only" role="status">
        {copied ? 'Copied to clipboard' : ''}
      </span>
    </span>
  );
};

export { Tip, TipCommand };
