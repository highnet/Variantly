'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { readPrefs, savePrefs, type Prefs as PrefsT } from '@/lib/prefs';

type Aid = 'readable' | 'large' | 'contrast' | 'calm';

const AIDS: [Aid, string, string][] = [
  ['readable', 'Readable font', 'Clearer letters, more spacing'],
  ['large', 'Larger text', 'Everything a little bigger'],
  ['contrast', 'High contrast', 'Stronger colours'],
  ['calm', 'Calm colours', 'Fewer shadows, less saturation'],
];

const MOTION: ['full' | 'calm', string][] = [
  ['full', 'Full animations'],
  ['calm', 'Calmer (less)'],
];

/** Header theme switch and reading-aids menu, as in the legacy ui/. */
const Prefs = () => {
  const [p, setP] = useState<PrefsT | null>(null);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => setP(readPrefs()), []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      toggle.current?.focus();
    };
    addEventListener('pointerdown', onDown);
    addEventListener('keydown', onKey);
    return () => {
      removeEventListener('pointerdown', onDown);
      removeEventListener('keydown', onKey);
    };
  }, [open]);

  const set = (patch: Partial<PrefsT>) => {
    const next = { ...readPrefs(), ...patch };
    savePrefs(next);
    setP(next);
  };

  const dark = p?.theme === 'dark';
  return (
    <div className="prefs" ref={root}>
      <button
        className="bar-btn"
        type="button"
        aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
        title={dark ? 'Light theme' : 'Dark theme'}
        onClick={() => set({ theme: dark ? 'light' : 'dark' })}
      >
        <Icon name={dark ? 'sun' : 'moon'} />
      </button>
      <button
        ref={toggle}
        className="bar-btn"
        type="button"
        aria-label="Accessibility settings"
        title="Accessibility"
        aria-expanded={open}
        aria-controls="prefs-menu"
        onClick={() => setOpen(!open)}
      >
        <Icon name="access" />
      </button>
      <div className="prefs-menu" id="prefs-menu" role="dialog" aria-label="Accessibility settings" hidden={!open}>
        <fieldset>
          <legend>Motion</legend>
          <div className="prefs-motion">
            {MOTION.map(([v, label]) => (
              <button key={v} type="button" aria-pressed={p?.motion === v} onClick={() => set({ motion: v })}>
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Reading aids</legend>
          {AIDS.map(([k, label, hint]) => (
            <label className="prefs-aid" key={k}>
              <input type="checkbox" checked={!!p?.[k]} onChange={(e) => set({ [k]: e.target.checked })} />
              <span>
                <strong>{label}</strong>
                <span>{hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
      </div>
    </div>
  );
};

export { Prefs };
