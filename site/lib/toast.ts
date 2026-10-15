// A tiny toast bus: anything can call toast(); <Toaster /> shows them.

export type ToastTone = 'ok' | 'info' | 'warn';
export type ToastItem = { id: number; title: string; body?: string; tone: ToastTone };

export const TOAST_EVENT = 'variantly:toast';
let seq = 0;

export const toast = (title: string, opts: { body?: string; tone?: ToastTone } = {}) => {
  if (typeof window === 'undefined') return;
  const detail: ToastItem = { id: ++seq, title, body: opts.body, tone: opts.tone ?? 'ok' };
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail }));
};
