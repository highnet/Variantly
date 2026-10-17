'use client';

import { useEffect, useState, type CSSProperties } from 'react';

import { loadProgress, markLoaded, onLoadProgress } from '@/lib/loadProgress';
import { cn } from '@/lib/utils';

// The terminal concept prints its bar: [#####.....] 52%
const asciiBar = (p: number) => {
  const n = Math.round(p * 10);
  return `[${'#'.repeat(n)}${'.'.repeat(10 - n)}] ${Math.round(p * 100)}%`;
};

/*
 * A slim, per-concept progress bar while the 3D scene, display fonts and the
 * demo stream in after first paint. Driven by real milestones (lib/loadProgress),
 * animated with transform only, styled per concept in globals.css (.vy-loadbar).
 */
const LoadBar = () => {
  const [p, setP] = useState(0);
  useEffect(() => {
    const sync = () => setP(loadProgress());
    const off = onLoadProgress(sync);
    sync();
    document.fonts?.ready.then(() => markLoaded('fonts'));
    // Never hang on a step that can't finish (no WebGL, blocked iframe).
    const t = setTimeout(() => {
      markLoaded('fonts');
      markLoaded('scene');
      markLoaded('demo');
    }, 15000);
    return () => {
      off();
      clearTimeout(t);
    };
  }, []);
  return (
    <div
      role="progressbar"
      aria-label="Loading visuals"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(p * 100)}
      className={cn('vy-loadbar', p >= 1 && 'vy-loadbar-done')}
      style={{ '--p': p } as CSSProperties}
    >
      <span className="vy-loadbar-fill" />
      <span className="vy-loadbar-text" aria-hidden="true">
        {asciiBar(p)}
      </span>
    </div>
  );
};

export { LoadBar };
