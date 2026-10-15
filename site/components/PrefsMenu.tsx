'use client';

import { Accessibility, Contrast, Moon, Palette, Sun, Type, ZoomIn } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';

import { PREFS_EVENT, PREFS_KEY, readPrefs, savePrefs, type Prefs } from '@/lib/prefs';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const AIDS: {
  key: 'readable' | 'large' | 'contrast' | 'calm';
  label: string;
  hint: string;
  icon: ReactNode;
}[] = [
  {
    key: 'readable',
    label: 'Readable font',
    hint: 'Clearer letters, more spacing',
    icon: <Type />,
  },
  { key: 'large', label: 'Larger text', hint: 'Everything a little bigger', icon: <ZoomIn /> },
  { key: 'contrast', label: 'High contrast', hint: 'Stronger colours', icon: <Contrast /> },
  { key: 'calm', label: 'Calm colours', hint: 'Fewer shadows, less saturation', icon: <Palette /> },
];

const iconButton =
  'text-steel hover:text-ink hover:bg-surface focus-visible:outline-ink grid size-9 place-items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 [&_svg]:size-[18px]';

/* The theme switch and the accessibility menu, side by side in the header. */
const PrefsMenu = () => {
  // The stored string is the snapshot; the server has none, so the
  // controls render once the browser knows the saved choice.
  const raw = useSyncExternalStore(
    (cb) => {
      window.addEventListener(PREFS_EVENT, cb);
      window.addEventListener('storage', cb);
      return () => {
        window.removeEventListener(PREFS_EVENT, cb);
        window.removeEventListener('storage', cb);
      };
    },
    () => {
      try {
        return localStorage.getItem(PREFS_KEY) ?? '';
      } catch {
        return '';
      }
    },
    () => null,
  );
  const prefs = useMemo<Prefs | null>(() => (raw === null ? null : readPrefs()), [raw]);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (
        e instanceof KeyboardEvent ? e.key === 'Escape' : !root.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const set = (patch: Partial<Prefs>) => {
    if (!prefs) return;
    savePrefs({ ...prefs, ...patch });
    if (patch.theme)
      toast(patch.theme === 'dark' ? 'Dark theme on' : 'Light theme on', { tone: 'info' });
  };

  const dark = prefs?.theme === 'dark';

  return (
    <div ref={root} className="relative flex items-center gap-1">
      <button
        type="button"
        className={iconButton}
        aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
        title={dark ? 'Light theme' : 'Dark theme'}
        onClick={() => set({ theme: dark ? 'light' : 'dark' })}
      >
        {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
      </button>
      <button
        type="button"
        className={cn(iconButton, open && 'bg-surface text-ink')}
        aria-label="Accessibility settings"
        title="Accessibility"
        aria-expanded={open}
        aria-controls="a11y-menu"
        onClick={() => setOpen((o) => !o)}
      >
        <Accessibility aria-hidden="true" />
      </button>

      {open && prefs && (
        <div
          id="a11y-menu"
          role="dialog"
          aria-label="Accessibility settings"
          className="bg-slate on-slate text-surface border-slate-line shadow-dock absolute top-11 right-0 z-40 grid w-[300px] gap-4 rounded-[12px] border p-4"
        >
          <fieldset className="m-0 grid gap-2 border-0 p-0">
            <legend className="mb-2 text-[13px] font-bold">Motion</legend>
            <div className="bg-ink grid grid-cols-2 gap-1 rounded-[10px] p-1">
              {(
                [
                  ['full', 'Full animations'],
                  ['calm', 'Calmer (less)'],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={prefs.motion === v}
                  onClick={() => set({ motion: v })}
                  className={cn(
                    'focus-visible:outline-surface rounded-[8px] px-2 py-2.5 text-[13px] font-semibold transition-colors focus-visible:outline-2',
                    prefs.motion === v
                      ? 'bg-ok-on-slate text-ink'
                      : 'text-steel-on-slate hover:text-surface',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="m-0 grid gap-2 border-0 p-0">
            <legend className="mb-2 text-[13px] font-bold">Reading aids</legend>
            {AIDS.map((a) => (
              <label
                key={a.key}
                className={cn(
                  'border-slate-line hover:border-steel-on-slate grid cursor-pointer grid-cols-[1.25rem_1fr] items-start gap-3 rounded-[10px] border p-3 transition-colors',
                  prefs[a.key] && 'border-ok-on-slate',
                )}
              >
                <input
                  type="checkbox"
                  className="accent-ok-on-slate mt-0.5 size-4"
                  checked={prefs[a.key]}
                  onChange={(e) => set({ [a.key]: e.target.checked })}
                />
                <span className="grid gap-0.5">
                  <span className="[&_svg]:text-ok-on-slate flex items-center gap-1.5 text-[14px] font-semibold [&_svg]:size-4">
                    {a.icon}
                    {a.label}
                  </span>
                  <span className="text-steel-on-slate text-[12px]">{a.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
        </div>
      )}
    </div>
  );
};

export { PrefsMenu };
