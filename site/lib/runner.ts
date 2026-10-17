'use client';

import { useSiteStore, type RunnerId } from '@/lib/store';

export type { RunnerId };

// Which package runner the reader picked for the commands on the page. Every
// command is written for npm (`npx …`, `npm i -g …`) and rewritten here, so
// one choice updates them all and is remembered for next time.

export const RUNNERS = [
  { id: 'npm', label: 'npm', prefix: 'npx', global: 'npm i -g' },
  { id: 'pnpm', label: 'pnpm', prefix: 'pnpm dlx', global: 'pnpm add -g' },
  { id: 'yarn', label: 'yarn', prefix: 'yarn dlx', global: 'yarn global add' },
  { id: 'bun', label: 'bun', prefix: 'bunx', global: 'bun add -g' },
] as const satisfies readonly { id: RunnerId; label: string; prefix: string; global: string }[];

export const setRunner = (id: RunnerId) => useSiteStore.getState().setRunner(id);

// npm until the persisted choice is read, matching the server render.
export const useRunner = () => useSiteStore((s) => (s.hydrated ? s.runner : 'npm'));

/** `npx variantly --demo` → `pnpm dlx variantly --demo`; `npm i -g x` → `bun add -g x`. */
export const withRunner = (command: string, id: RunnerId) => {
  const r = RUNNERS.find((x) => x.id === id) ?? RUNNERS[0];
  if (command.startsWith('npx ')) return `${r.prefix} ${command.slice(4)}`;
  if (command.startsWith('npm i -g ')) return `${r.global} ${command.slice(9)}`;
  return command;
};
