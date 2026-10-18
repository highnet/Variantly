// Runs `fn` when the main thread is next idle (at the latest after `timeout`
// ms), off the frame that asked. Returns a cancel. Browsers without idle
// callbacks wait a short timer instead.
export const whenIdle = (fn: () => void, timeout = 500) => {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(fn, { timeout });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(fn, Math.min(timeout, 50));
  return () => clearTimeout(id);
};

// Runs `fn` in a task after the next frame has been produced (straight away,
// in a task, while the tab is hidden and draws no frames). For work that
// must not delay the frame a view transition is about to capture.
export const afterFrame = (fn: () => void) => {
  if (document.hidden) {
    setTimeout(fn, 0);
    return;
  }
  requestAnimationFrame(() => setTimeout(fn, 0));
};
