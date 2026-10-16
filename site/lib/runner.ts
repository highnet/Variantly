'use client';

import { useSyncExternalStore } from 'react';

// Which package runner the reader picked for the commands on the page. Every
// command is written as `npx …` and rewritten here, so one choice updates them
// all and is remembered for next time.

export const RUNNERS = [
  { id: 'npm', label: 'npm', prefix: 'npx' },
  { id: 'pnpm', label: 'pnpm', prefix: 'pnpm dlx' },
  { id: 'yarn', label: 'yarn', prefix: 'yarn dlx' },
  { id: 'bun', label: 'bun', prefix: 'bunx' },
] as const;

export type RunnerId = (typeof RUNNERS)[number]['id'];

const KEY = 'variantly-runner';
const listeners = new Set<() => void>();

const read = (): RunnerId => {
  try {
    const v = localStorage.getItem(KEY);
    return RUNNERS.some((r) => r.id === v) ? (v as RunnerId) : 'npm';
  } catch {
    return 'npm';
  }
};

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const setRunner = (id: RunnerId) => {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // Still switch for this visit.
  }
  current = id;
  listeners.forEach((fn) => fn());
};

let current: RunnerId | null = null;
const snapshot = () => (current ??= read());

export const useRunner = () => useSyncExternalStore(subscribe, snapshot, () => 'npm' as RunnerId);

/** `npx variantly --demo` → `pnpm dlx variantly --demo`, and so on. */
export const withRunner = (command: string, id: RunnerId) => {
  const r = RUNNERS.find((x) => x.id === id) ?? RUNNERS[0];
  return command.startsWith('npx ') ? `${r.prefix} ${command.slice(4)}` : command;
};
