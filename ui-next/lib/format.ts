import { getState } from './store';
import type { Audit, Snapshot, Variant, VariantStatus } from './types';

export const pad = (n: number) => String(n).padStart(2, '0');
export const vname = (n: number) => `V${pad(n)}`;
export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Who chose the look: Impeccable, unless the run uses the demo agent. */
const picker = () => (getState().snap?.config?.agent === 'demo' ? 'Demo pick' : 'Impeccable’s pick');

/** A pinned direction in the owner's words, else the world the agent picked (once it names it). */
export const directionLabel = (dir: string | undefined, picked?: string) =>
  dir && dir.trim() ? dir.trim() : picked ? `${picked} (${picker()})` : picker();

export const STATUS: Record<VariantStatus, string> = {
  queued: 'Scheduled',
  preparing: 'Preparing',
  running: 'Working',
  reviewing: 'Reviewing',
  committing: 'Committing',
  done: 'Ready',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export const statusKey = (s: VariantStatus) => (s === 'queued' ? 'scheduled' : s === 'done' ? 'ready' : s);

/** Mirrors src/steps.mjs. */
export const STEPS = ['Setting up', 'Reading the site', 'Choosing a direction', 'Building', 'Checking', 'Writing DESIGN.md', 'Saving'];

export const LIVE: VariantStatus[] = ['preparing', 'running', 'reviewing', 'committing'];

export const stepAt = (v: Variant) => (v.status === 'done' ? STEPS.length : v.status === 'queued' ? -1 : (v.step ?? 0));

export const stepState = (v: Variant, i: number): 'done' | 'now' | '' => {
  const at = stepAt(v);
  return i < at ? 'done' : i === at && LIVE.includes(v.status) ? 'now' : '';
};

export const isPickable = (v: Variant) => !['failed', 'cancelled'].includes(v.status);

export const elapsedMs = (v: Variant, now = Date.now()) => (v.startedAt ? (v.finishedAt ?? now) - v.startedAt : 0);

export const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
};

/** A queued design has not started (a retry keeps its old start time). */
export const elapsed = (v: Variant, now = Date.now()) => (v.startedAt && v.status !== 'queued' ? clock(elapsedMs(v, now)) : '—');

/** Compact token count: 12k, 1.4M. */
export const compactTokens = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n));

/** One variant's spend, as its agent reported it: dollars, credits, or tokens. */
export const usageText = (v: Pick<Variant, 'usage' | 'credits' | 'costUsd'>) => {
  const parts: string[] = [];
  if (v.usage) parts.push(`${compactTokens(v.usage.inputTokens + v.usage.outputTokens)} tok`);
  if (typeof v.credits === 'number') parts.push(`${v.credits} premium requests`);
  if (typeof v.costUsd === 'number') parts.push(`$${v.costUsd.toFixed(2)}`);
  return parts.join(' · ') || '—';
};

export const usageTitle = (v: Variant) =>
  v.usage
    ? `${v.usage.inputTokens.toLocaleString()} in (${(v.usage.cachedInputTokens ?? 0).toLocaleString()} cached) · ${v.usage.outputTokens.toLocaleString()} out`
    : typeof v.credits === 'number'
      ? `${v.credits} premium request${v.credits === 1 ? '' : 's'} (Copilot reports no tokens)`
      : 'No usage reported yet';

/** Against the original only the change matters: "+7", "−3", "same". Without one, the score itself. */
export const vsBase = (n: number | undefined, base?: number) =>
  typeof n !== 'number' ? '–' : typeof base !== 'number' ? String(n) : n === base ? 'same' : `${n > base ? '+' : '−'}${Math.abs(n - base)}`;

/** axe violations against the original: "20 fixed", "2 new", "none fixed". Without one, the count. */
export const axeVsBase = (n: number | undefined, base?: number) =>
  typeof n !== 'number' ? '–' : typeof base !== 'number' ? String(n) : n < base ? `${base - n} fixed` : n > base ? `${n - base} new` : 'none fixed';

export const scoreText = (a: Audit, base?: Audit) =>
  base
    ? `A11y ${vsBase(a.lighthouse.accessibility, base.lighthouse.accessibility)} · Perf ${vsBase(a.lighthouse.performance, base.lighthouse.performance)} · axe ${axeVsBase(a.axe.total, base.axe.total)}`
    : `A11y ${a.lighthouse.accessibility} · Perf ${a.lighthouse.performance} · axe ${a.axe.total}`;

export const agentShort: Record<string, string> = { claude: 'Claude', codex: 'Codex', copilot: 'Copilot', gemini: 'Gemini', cursor: 'Cursor', demo: 'Demo' };

/** "Claude · opus": an agent and, when set, its model. */
export const agentLabel = (agent: string, model?: string) => `${agentShort[agent] ?? agent}${model ? ` · ${model}` : ''}`;

/**
 * Who made a variant: agent and model, always (one agent or a mix). Empty
 * only while a blind run is still choosing.
 */
export const madeBy = (snap: Pick<Snapshot, 'config' | 'phase'> | null | undefined, v: Pick<Variant, 'agent' | 'model'>) => {
  const c = snap?.config;
  if (!c || (c.blind && snap?.phase !== 'finalized')) return '';
  return agentLabel(v.agent ?? c.agent, (v.model ?? c.model) || 'default model');
};

/**
 * The line of a failure worth reading: the agent's own last words when the
 * error carries them ("Last output:"), not the generic exit code.
 */
export const errorHeadline = (error: string) => {
  const [head, tail = ''] = error.split(/Last output:\s*/);
  const last = tail
    .split('\n')
    .map((l) => l.trim().replace(/^Error:\s*/, ''))
    .filter(Boolean)
    .at(-1);
  return last ?? head.split('\n')[0];
};

/** The board's direction cell: the label once there is one, else what is happening instead. */
export const boardDirection = (v: Pick<Variant, 'direction' | 'picked' | 'status'>): { text: string; pending: boolean } => {
  if ((v.direction && v.direction.trim()) || v.picked) return { text: directionLabel(v.direction, v.picked), pending: false };
  if (v.status === 'queued') return { text: 'Waiting for a free slot', pending: true };
  if (LIVE.includes(v.status)) return { text: 'Choosing a direction…', pending: true };
  return { text: directionLabel(v.direction, v.picked), pending: false };
};

/** One short, status-aware progress label for the board. */
export const progressLabel = (v: Variant): string => {
  if (v.status === 'done') return 'Ready';
  if (v.status === 'queued') return 'Scheduled';
  if (v.status === 'failed') return v.error ? `Failed: ${errorHeadline(v.error)}` : 'Failed';
  if (v.status === 'cancelled') return `Cancelled at ${STEPS[Math.max(0, stepAt(v))]}`;
  if (v.status === 'reviewing') return 'Reviewing';
  return STEPS[Math.max(0, stepAt(v))];
};
