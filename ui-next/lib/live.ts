'use client';

// The server-sent event stream: snapshot, dev-server and log updates.
import { api } from './api';
import { getState, setState, toast } from './store';
import type { Detect, Form, ServerState, Snapshot } from './types';

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

export const loadDetect = async () => {
  try {
    const detect = await api<Detect>('GET', 'detect');
    const saved = getState().snap?.config;
    const form: Form = { ...detect.suggested, ...(saved ?? {}) } as Form;
    if (!form.routes?.length) form.routes = ['/'];
    form.extras ??= [];
    form.directions = Array.from({ length: 10 }, (_, i) => form.directions?.[i] ?? '');
    form.product ??= { users: '', purpose: '', keep: '' };
    setState({ detect, form });
  } catch (err) {
    toast((err as Error).message, true);
  }
};

export const fetchLog = async (n: number) => {
  if (getState().logs[`v${n}`]) return;
  try {
    const { lines } = await api<{ lines: string[] }>('GET', `log/${n}`);
    setState((s) => ({ logs: { ...s.logs, [`v${n}`]: lines } }));
  } catch {}
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
    setState((s) => {
      const list = [...(s.logs[target] ?? []), ...lines].slice(-400);
      return { logs: { ...s.logs, [target]: list } };
    });
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
