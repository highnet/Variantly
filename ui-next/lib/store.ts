'use client';

// One store for everything the server pushes (snapshot, servers, logs) and
// the UI state that outlives a single screen (selection, view mode). React
// subscribes with useSyncExternalStore; nothing reloads an iframe unless the
// thing it shows actually changes.
import { useSyncExternalStore } from 'react';
import type { Detect, Form, ServerState, Snapshot } from './types';

export type Toast = { id: number; message: string; bad: boolean } | null;

export type UiState = {
  snap: Snapshot | null;
  detect: Detect | null;
  form: Form | null;
  logs: Record<string, string[]>;
  unseen: number[];
  sel: 'original' | number | null;
  mode: 'slider' | 'single' | 'side';
  device: 'desktop' | 'mobile';
  split: number;
  path: string;
  confirming: boolean;
  applying: number | null;
  infoOpen: boolean;
  forceBoard: boolean;
  wantCompare: boolean;
  openRow: number | null;
  helpOpen: boolean;
  reconnecting: boolean;
  stopped: boolean;
  toast: Toast;
};

let state: UiState = {
  snap: null,
  detect: null,
  form: null,
  logs: {},
  unseen: [],
  sel: null,
  mode: 'slider',
  device: 'desktop',
  split: 50,
  path: '/',
  confirming: false,
  applying: null,
  infoOpen: false,
  forceBoard: false,
  wantCompare: false,
  openRow: null,
  helpOpen: false,
  reconnecting: false,
  stopped: false,
  toast: null,
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
let toastTimer: ReturnType<typeof setTimeout> | undefined;
export const toast = (message: string, bad = false) => {
  clearTimeout(toastTimer);
  setState({ toast: { id: ++toastSeq, message, bad } });
  toastTimer = setTimeout(() => setState({ toast: null }), bad ? 7000 : 3500);
};

export const variantsOf = (s: UiState) => s.snap?.variants ?? [];
export const serverOf = (s: UiState, id: string): ServerState | undefined => (s.snap?.servers ?? []).find((x) => x?.id === id);

/** Mark a variant seen: its "new" pip goes away. */
export const seen = (n: number) => setState((s) => (s.unseen.includes(n) ? { unseen: s.unseen.filter((x) => x !== n) } : {}));
