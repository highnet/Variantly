'use client';

import { Accessibility, Contrast, Moon, Palette, Sun, Type, ZoomIn } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';

import { Button } from '@/components/ui/Button';
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
      <Button
        variant="header-icon"
        size="round"
        aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
        title={dark ? 'Light theme' : 'Dark theme'}
        onClick={() => set({ theme: dark ? 'light' : 'dark' })}
      >
        {/* Both icons render; html[data-theme] (set before paint by the boot script)
            picks one, so the icon is right on first paint instead of swapping on hydration. */}
        <Sun aria-hidden="true" className="hidden in-data-[theme=dark]:block" />
        <Moon aria-hidden="true" className="in-data-[theme=dark]:hidden" />
      </Button>
      <Button
        variant="header-icon"
        size="round"
        aria-label="Accessibility settings"
        title="Accessibility"
        aria-expanded={open}
        aria-controls="a11y-menu"
        onClick={() => setOpen((o) => !o)}
      >
        <Accessibility aria-hidden="true" />
      </Button>

      {open && prefs && (
        <div
          id="a11y-menu"
          role="dialog"
          aria-label="Accessibility settings"
          className="bg-slate on-slate text-surface border-slate-line shadow-dock fixed inset-x-4 top-16 z-40 grid max-h-[calc(100dvh-5rem)] gap-4 overflow-y-auto rounded-[12px] border p-4 sm:absolute sm:inset-x-auto sm:top-11 sm:right-0 sm:max-h-none sm:w-[300px]"
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
                <Button
                  key={v}
                  variant="segment"
                  size="segment"
                  aria-pressed={prefs.motion === v}
                  onClick={() => set({ motion: v })}
                >
                  {label}
                </Button>
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
