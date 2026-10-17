import { useSyncExternalStore } from 'react';

// Seek mode for seekreel renders: `?t=<seconds>` freezes every animated
// effect at that timestamp instead of running off the clock.
export const seekTime = (): number | null => {
  if (typeof location === 'undefined') return null;
  const t = new URLSearchParams(location.search).get('t');
  return t === null ? null : Number(t) || 0;
};

const pending = new Set<string>();
let armed = false;

// Each seekable effect holds the frame open until it has drawn.
export const holdFrame = (id: string) => {
  pending.add(id);
};

export const releaseFrame = (id: string) => {
  pending.delete(id);
  if (pending.size || armed) return;
  armed = true;
  void document.fonts.ready.then(() =>
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        // `?y=<0..1>` scrolls the page to that fraction for scrolled shots.
        const y = Number(new URLSearchParams(location.search).get('y') || 0);
        const max = document.documentElement.scrollHeight - innerHeight;
        scrollTo({ top: Math.round(y * max), behavior: 'instant' });
        document.documentElement.toggleAttribute('data-scrolled', scrollY > 520);
        document.documentElement.setAttribute('data-seekreel-ready', '1');
        parent.postMessage('seekreel-ready', '*');
      }),
    ),
  );
};

const still = () => () => {};

// seekTime() as render-safe state: null on the server and outside renders.
export const useSeekTime = () => useSyncExternalStore(still, seekTime, () => null);
