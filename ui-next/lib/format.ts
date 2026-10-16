import { getState } from './store';
import type { Audit, Variant, VariantStatus } from './types';

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
export const usageText = (v: Variant) => {
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

/** "92 (+7)" against the original, when both were scored. */
export const vsBase = (n: number | undefined, base?: number) =>
  typeof n !== 'number' ? '–' : typeof base === 'number' && base !== n ? `${n} (${n > base ? '+' : ''}${n - base})` : String(n);

export const scoreText = (a: Audit, base?: Audit) =>
  `A11y ${vsBase(a.lighthouse.accessibility, base?.lighthouse.accessibility)} · Perf ${vsBase(a.lighthouse.performance, base?.lighthouse.performance)} · axe ${a.axe.total}${base ? ` (was ${base.axe.total})` : ''}`;

export const agentShort: Record<string, string> = { claude: 'Claude', codex: 'Codex', copilot: 'Copilot', gemini: 'Gemini', cursor: 'Cursor', demo: 'Demo' };
