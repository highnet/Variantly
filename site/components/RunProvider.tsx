'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { DEMO_VARIANTS } from '@/lib/content';

export type RunStatus = 'scheduled' | 'working' | 'ready';

type RunState = {
  statuses: RunStatus[];
  unseen: Set<number>;
  started: boolean;
  selected: number;
  kept: number | null;
  start: () => void;
  seen: (n: number) => void;
  select: (n: number) => void;
  keep: (n: number) => void;
};

const RunContext = createContext<RunState | null>(null);

// The board replays the demo run in the order the variants finished, at a
// pace that reads; it is an illustration of the board, not a timing.
const STEP_MS = 650;
const PARALLEL = 2;

type RunProviderProps = {
  children: ReactNode;
};

const RunProvider = ({ children }: RunProviderProps) => {
  const count = DEMO_VARIANTS.length;
  const [statuses, setStatuses] = useState<RunStatus[]>(() => Array(count).fill('scheduled'));
  const [unseen, setUnseen] = useState<Set<number>>(() => new Set());
  const [selected, setSelected] = useState(1);
  const [kept, setKept] = useState<number | null>(null);
  const started = useRef(false);
  const [startedState, setStartedState] = useState(false);

  const start = useCallback(() => {
    if (started.current) return;
    started.current = true;
    setStartedState(true);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setStatuses(Array(count).fill('ready'));
      return;
    }
    // Two agents at a time, like the default concurrency.
    let next = 0;
    const launch = () => {
      if (next >= count) return;
      const i = next++;
      setStatuses((s) => s.map((v, j) => (j === i ? 'working' : v)));
      setTimeout(
        () => {
          setStatuses((s) => s.map((v, j) => (j === i ? 'ready' : v)));
          setUnseen((u) => new Set(u).add(i + 1));
          launch();
        },
        STEP_MS * (2 + (i % 3)),
      );
    };
    for (let k = 0; k < PARALLEL; k++) setTimeout(launch, k * STEP_MS);
  }, [count]);

  const seen = useCallback((n: number) => {
    setUnseen((u) => {
      if (!u.has(n)) return u;
      const copy = new Set(u);
      copy.delete(n);
      return copy;
    });
  }, []);

  const select = useCallback(
    (n: number) => {
      setSelected(n);
      seen(n);
    },
    [seen],
  );

  const value = useMemo(
    () => ({
      statuses,
      unseen,
      started: startedState,
      selected,
      kept,
      start,
      seen,
      select,
      keep: setKept,
    }),
    [statuses, unseen, startedState, selected, kept, start, seen, select],
  );

  return <RunContext.Provider value={value}>{children}</RunContext.Provider>;
};

const useRun = () => {
  const ctx = useContext(RunContext);
  if (!ctx) throw new Error('useRun must be used inside RunProvider');
  return ctx;
};

export { RunProvider, useRun };
