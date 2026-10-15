'use client';

import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { TOAST_EVENT, type ToastItem } from '@/lib/toast';
import { cn } from '@/lib/utils';

const ICON = { ok: CircleCheck, info: Info, warn: CircleAlert };

/*
 * Toasts slide up from the bottom right, stack, and leave on their own.
 * The progress line shows how long each one stays; hovering holds it.
 */
const Toaster = () => {
  const [items, setItems] = useState<(ToastItem & { leaving?: boolean })[]>([]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const t = (e as CustomEvent<ToastItem>).detail;
      setItems((list) => [...list.slice(-2), t]);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  const dismiss = (id: number) => {
    setItems((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    window.setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 220);
  };

  return (
    <ol
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-4 left-4 z-60 m-0 grid list-none gap-2 p-0 sm:left-auto sm:w-90"
    >
      {items.map((t) => {
        const Icon = ICON[t.tone];
        return (
          <li
            key={t.id}
            onAnimationEnd={(e) => e.animationName === 'toast-life' && dismiss(t.id)}
            className={cn(
              'group/toast bg-slate on-slate text-surface border-slate-line shadow-dock pointer-events-auto relative grid grid-cols-[auto_1fr_auto] items-start gap-3 overflow-hidden rounded-[12px] border py-3 pr-2 pl-3.5',
              t.leaving ? 'animate-toast-out' : 'animate-toast-in',
            )}
          >
            <span
              className={cn(
                'animate-pop mt-0.5 grid size-6 place-items-center rounded-full [&_svg]:size-4',
                t.tone === 'ok' && 'bg-ok-on-slate/15 text-ok-on-slate',
                t.tone === 'info' && 'bg-surface/10 text-surface',
                t.tone === 'warn' && 'bg-alert/15 text-alert',
              )}
            >
              <Icon aria-hidden="true" />
            </span>
            <span className="grid gap-0.5 pt-0.5">
              <span className="text-[14px] font-semibold">{t.title}</span>
              {t.body && (
                <span className="text-steel-on-slate text-[13px] leading-snug">{t.body}</span>
              )}
            </span>
            <Button
              variant="icon-slate"
              size="icon-sm"
              aria-label="Dismiss"
              onClick={() => dismiss(t.id)}
            >
              <X aria-hidden="true" />
            </Button>
            <span
              aria-hidden="true"
              className={cn(
                'animate-toast-life absolute inset-x-0 bottom-0 h-0.5 origin-left [animation-duration:3200ms] group-hover/toast:[animation-play-state:paused]',
                t.tone === 'ok' && 'bg-ok-on-slate',
                t.tone === 'info' && 'bg-surface/60',
                t.tone === 'warn' && 'bg-alert',
              )}
            />
          </li>
        );
      })}
    </ol>
  );
};

export { Toaster };
