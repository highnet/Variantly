'use client';

import { seekTime } from '@/lib/seek';

/*
 * The page's performance tier: 'high' (full motion) or 'low' (static 3D
 * backdrop frame, backdrop loops paused on their poster frame, the cheapest
 * concept swap). Published as html[data-perf] and a 'vy:perf' event
 * ({ detail: { tier } }) so the title and others can adapt.
 *
 * - `?perf=low|high` forces a tier (remembered for the session).
 * - Otherwise rAF is sampled over ~30 frames after load and again whenever
 *   the tab becomes visible: a median interval >= 28ms (a 30fps cap, e.g.
 *   iOS Low Power Mode, which no API reports) or an average > 24ms means low.
 *   A low result is remembered for the session; a later fast sample (plugged
 *   in) lifts it again.
 */

export type PerfTier = 'low' | 'high';

const KEY = 'variantly:perf';

const read = (): string | null => {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
};
const save = (v: string | null) => {
  try {
    if (v) sessionStorage.setItem(KEY, v);
    else sessionStorage.removeItem(KEY);
  } catch {}
};

export const perfTier = (): PerfTier =>
  typeof document !== 'undefined' && document.documentElement.dataset.perf === 'low'
    ? 'low'
    : 'high';

const publish = (tier: PerfTier) => {
  const html = document.documentElement;
  if ((html.dataset.perf ?? 'high') === tier && html.dataset.perf) return;
  html.dataset.perf = tier;
  document.dispatchEvent(new CustomEvent('vy:perf', { detail: { tier } }));
};

const sample = (frames = 30) =>
  new Promise<PerfTier>((resolve) => {
    const t: number[] = [];
    const f = (now: number) => {
      t.push(now);
      if (t.length <= frames) requestAnimationFrame(f);
      else {
        const d = t
          .slice(2)
          .map((x, i) => x - t[i + 1])
          .sort((a, b) => a - b);
        const median = d[Math.floor(d.length / 2)];
        const mean = d.reduce((s, x) => s + x, 0) / d.length;
        resolve(median >= 28 || mean > 24 ? 'low' : 'high');
      }
    };
    requestAnimationFrame(f);
  });

let started = false;

export const startPerfTier = () => {
  if (started || typeof window === 'undefined') return;
  started = true;
  // Seekreel renders are deterministic captures: always the full tier.
  if (seekTime() !== null) return;
  const forced = new URLSearchParams(location.search).get('perf');
  if (forced === 'low' || forced === 'high') save(`forced:${forced}`);
  const stored = read();
  if (stored?.startsWith('forced:')) return publish(stored.slice(7) as PerfTier);
  publish(stored === 'low' ? 'low' : 'high');
  const check = () =>
    void sample().then((tier) => {
      if (document.hidden) return;
      save(tier === 'low' ? 'low' : null);
      publish(tier);
    });
  // Give the first paint and hydration a moment before judging the frame rate.
  setTimeout(check, 1200);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) setTimeout(check, 300);
  });
};
