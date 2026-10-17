'use client';

// One store for everything the server pushes (snapshot, servers, logs) and
// the UI state that outlives a single screen (selection, view mode). React
// subscribes with useSyncExternalStore; nothing reloads an iframe unless the
// thing it shows actually changes.
import { useSyncExternalStore } from 'react';
import type { Detect, Form, ServerState, Snapshot } from './types';

export type ToastTone = 'ok' | 'info' | 'warn' | 'error';
export type ToastItem = { id: number; title: string; body?: string; tone: ToastTone; leaving?: boolean };

export type UiState = {
  snap: Snapshot | null;
  detect: Detect | null;
  form: Form | null;
  logs: Record<string, string[]>;
  /** Lines ever seen per log key; `logs` keeps only the last 400. */
  logTotal: Record<string, number>;
  unseen: number[];
  sel: 'original' | number | null;
  mode: 'slider' | 'single' | 'side';
  device: 'desktop' | 'mobile';
  split: number;
  path: string;
  confirming: boolean;
  applying: number | null;
  sitewide: boolean;
  infoOpen: boolean;
  chatOpen: boolean;
  /** Agent output streaming into chat turns that are still running, by turn id. */
  chatLive: Record<string, string[]>;
  forceBoard: boolean;
  wantCompare: boolean;
  openRow: number | null;
  helpOpen: boolean;
  reconnecting: boolean;
  stopped: boolean;
  /** Up to three toasts, oldest first; <Toaster /> shows them. */
  toasts: ToastItem[];
};

let state: UiState = {
  snap: null,
  detect: null,
  form: null,
  logs: {},
  logTotal: {},
  unseen: [],
  sel: null,
  mode: 'slider',
  device: 'desktop',
  split: 50,
  path: '/',
  confirming: false,
  applying: null,
  sitewide: true,
  infoOpen: false,
  chatOpen: false,
  chatLive: {},
  forceBoard: false,
  wantCompare: false,
  openRow: null,
  helpOpen: false,
  reconnecting: false,
  stopped: false,
  toasts: [],
};

const listeners = new Set<() => void>();

export const getState = () => state;

export const setState = (patch: Partial<UiState> | ((s: UiState) => Partial<UiState>)) => {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
  for (const l of listeners) l();
};

export const useStore = <T>(pick: (s: UiState) => T): T =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => pick(state),
    () => pick(state),
  );

export const updateForm = (patch: Partial<Form>) => setState((s) => ({ form: s.form ? { ...s.form, ...patch } : s.form }));

let toastSeq = 0;
/**
 * Show a toast, as the marketing site does: toast(title, { body, tone }).
 * The old toast(message, bad) form still works; bad means the error tone.
 * Toasts stack (three at most) and leave on their own; <Toaster /> times them.
 */
export const toast = (title: string, opts: boolean | { body?: string; tone?: ToastTone } = {}) => {
  const o = typeof opts === 'boolean' ? { tone: opts ? ('error' as const) : ('ok' as const) } : opts;
  const item: ToastItem = { id: ++toastSeq, title, body: o.body, tone: o.tone ?? 'ok' };
  setState((s) => ({ toasts: [...s.toasts.slice(-2), item] }));
  // Reduced motion switches the life-line animation off, so time it here instead.
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    setTimeout(() => dismissToast(item.id), item.tone === 'error' ? 7000 : 3200);
  }
};

export const dismissToast = (id: number) => {
  setState((s) => ({ toasts: s.toasts.map((t) => (t.id === id ? { ...t, leaving: true } : t)) }));
  setTimeout(() => setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 220);
};

export const variantsOf = (s: UiState) => s.snap?.variants ?? [];
export const serverOf = (s: UiState, id: string): ServerState | undefined => (s.snap?.servers ?? []).find((x) => x?.id === id);

/** Mark a variant seen: its "new" pip goes away. */
export const seen = (n: number) => setState((s) => (s.unseen.includes(n) ? { unseen: s.unseen.filter((x) => x !== n) } : {}));
