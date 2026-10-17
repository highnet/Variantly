'use client';

// The server-sent event stream: snapshot, dev-server and log updates.
import { api } from './api';
import { getState, setState, toast } from './store';
import { LIVE } from './format';
import type { Detect, Form, ServerState, Snapshot } from './types';

const CAP = 400;
/** Which agent logs were loaded from the server this run (`${runId}:v3`). */
const fetched = new Set<string>();

const lastStatus = new Map<number, string>();

/** Remember which variants just finished, so their dock cell gets a pip. */
const noteStatusChanges = (snap: Snapshot) => {
  const fresh: number[] = [];
  for (const v of snap.variants) {
    const prev = lastStatus.get(v.n);
    if (prev !== undefined && prev !== v.status && (v.status === 'done' || v.status === 'failed')) fresh.push(v.n);
    lastStatus.set(v.n, v.status);
  }
  return fresh;
};

/** Forget everything tied to the previous run: its logs, dialogs and selection. */
export const resetRun = () => {
  lastStatus.clear();
  fetched.clear();
  setState({ logs: {}, logTotal: {}, confirming: false, applying: null, infoOpen: false, path: '/', openRow: null });
  // A new run starts the wizard at its first step, not where the last one left off.
  const url = new URL(window.location.href);
  if (url.searchParams.has('step')) {
    url.searchParams.delete('step');
    window.history.replaceState(null, '', url);
  }
};

/** Drop one design's logs (a retry starts it over). */
export const clearLog = (n: number) => {
  fetched.delete(`${getState().snap?.runId ?? ''}:v${n}`);
  setState((s) => {
    const logs = { ...s.logs };
    const logTotal = { ...s.logTotal };
    for (const k of [`v${n}`, `pool:v${n}`]) {
      delete logs[k];
      delete logTotal[k];
    }
    return { logs, logTotal };
  });
};

/**
 * The server keys agent output, dev-server output and audit output all by
 * target id ("v3"), with the same payload shape. While the agent works, its
 * lines are what matter; once it has stopped, anything more for that target
 * is the dev server or the audit, kept apart under "pool:v3". The original
 * only ever has dev-server and audit output.
 */
const logKey = (target: string) => {
  const m = /^v(\d+)$/.exec(target);
  if (!m) return target === 'original' ? 'pool:original' : target;
  const v = getState().snap?.variants.find((x) => x.n === Number(m[1]));
  return !v || v.status === 'queued' || LIVE.includes(v.status) ? target : `pool:${target}`;
};

const appendLog = (key: string, lines: string[]) =>
  setState((s) => {
    const all = [...(s.logs[key] ?? []), ...lines];
    return {
      logs: { ...s.logs, [key]: all.slice(-CAP) },
      logTotal: { ...s.logTotal, [key]: (s.logTotal[key] ?? s.logs[key]?.length ?? 0) + lines.length },
    };
  });

export const loadDetect = async () => {
  try {
    const detect = await api<Detect>('GET', 'detect');
    // A re-check (after an install or sign-in) keeps what the person has
    // already picked; only the first load starts from the suggestion.
    const saved = getState().snap?.config;
    const current = getState().form;
    const form: Form = { ...detect.suggested, ...(saved ?? {}), ...(current ?? {}) } as Form;
    if (!form.routes?.length) form.routes = ['/'];
    form.extras ??= [];
    form.directions = Array.from({ length: 10 }, (_, i) => form.directions?.[i] ?? '');
    form.product ??= { users: '', purpose: '', keep: '' };
    setState({ detect, form });
  } catch (err) {
    toast((err as Error).message, true);
  }
};

/** Load a design's agent log history once, merged with lines that already streamed in. */
export const fetchLog = async (n: number) => {
  const key = `v${n}`;
  const run = getState().snap?.runId ?? '';
  if (fetched.has(`${run}:${key}`)) return;
  fetched.add(`${run}:${key}`);
  try {
    const { lines } = await api<{ lines: string[] }>('GET', `log/${n}`);
    setState((s) => {
      const have = s.logs[key] ?? [];
      // The streamed lines usually repeat the end of the history: skip the overlap.
      let k = Math.min(have.length, lines.length);
      while (k > 0 && !have.slice(0, k).every((l, i) => l === lines[lines.length - k + i])) k--;
      const merged = [...lines, ...have.slice(k)];
      const total = Math.max(merged.length, (s.logTotal[key] ?? 0) + lines.length - k);
      return { logs: { ...s.logs, [key]: merged.slice(-CAP) }, logTotal: { ...s.logTotal, [key]: total } };
    });
  } catch {
    fetched.delete(`${run}:${key}`);
  }
};

export const connect = () => {
  const es = new EventSource('/api/events');
  es.addEventListener('state', (e) => {
    const snap = JSON.parse((e as MessageEvent).data) as Snapshot;
    const prev = getState().snap?.phase;
    const fresh = noteStatusChanges(snap);
    const backToSetup = prev && prev !== snap.phase && snap.phase === 'setup';
    setState((s) => ({
      snap,
      reconnecting: false,
      unseen: [...new Set([...s.unseen, ...fresh])],
      ...(backToSetup ? { detect: null, form: null, wantCompare: false, forceBoard: false } : {}),
    }));
    if (backToSetup) resetRun();
  });
  es.addEventListener('server', (e) => {
    const srv = JSON.parse((e as MessageEvent).data) as ServerState;
    setState((s) => {
      if (!s.snap) return {};
      const list = [...(s.snap.servers ?? [])];
      const i = list.findIndex((x) => x?.id === srv.id);
      if (i >= 0) list[i] = srv;
      else list.push(srv);
      return { snap: { ...s.snap, servers: list } };
    });
  });
  es.addEventListener('log', (e) => {
    const { target, lines } = JSON.parse((e as MessageEvent).data) as { target: string; lines: string[] };
    appendLog(logKey(target), lines);
  });
  es.addEventListener('chat', (e) => {
    const { n, id, line, done } = JSON.parse((e as MessageEvent).data) as { n: number; id: string; line?: string; done?: boolean };
    if (done) {
      // The final text arrives with the next snapshot; drop the live lines and
      // reload the variant so the change shows.
      setState((s) => {
        const { [id]: _gone, ...rest } = s.chatLive;
        return { chatLive: rest };
      });
      const frame = document.querySelector<HTMLIFrameElement>('iframe[title="Variant"]');
      if (frame?.src && getState().sel === n) frame.src = frame.src;
      return;
    }
    if (line) setState((s) => ({ chatLive: { ...s.chatLive, [id]: [...(s.chatLive[id] ?? []), line].slice(-40) } }));
  });
  es.addEventListener('installed', (e) => {
    const { agent, code, what = '', tail = [] } = JSON.parse((e as MessageEvent).data) as { agent: string; code: number; what?: string; tail?: string[] };
    const thing = /impeccable/.test(what) ? `Impeccable for ${agent}` : agent;
    toast(code === 0 ? `Installed ${thing}.` : `Installing ${thing} failed (exit ${code}): ${tail.filter(Boolean).slice(-2).join(' ')}`, code !== 0);
    loadDetect();
  });
  es.addEventListener('problem', (e) => toast((JSON.parse((e as MessageEvent).data) as { message: string }).message, true));
  es.onerror = () => {
    if (getState().snap) setState({ reconnecting: true });
  };
  return () => es.close();
};
