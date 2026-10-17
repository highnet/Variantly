'use client';

// The marketing site's toaster, in plain CSS: toasts slide up from the bottom
// right, stack (three at most), and leave on their own. The progress line
// shows how long each one stays; hovering holds it.
import { dismissToast, useStore, type ToastTone } from '@/lib/store';

const ICON: Record<ToastTone, React.ReactNode> = {
  ok: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </>
  ),
  warn: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </>
  ),
  error: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </>
  ),
};

const svg = (children: React.ReactNode, size = 16) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const Toaster = () => {
  const items = useStore((s) => s.toasts);
  return (
    <ol className="toaster" aria-live="polite">
      {items.map((t) => (
        <li
          key={t.id}
          className={`toast toast-${t.tone}${t.leaving ? ' leaving' : ''}`}
          onAnimationEnd={(e) => e.animationName === 'toast-life' && dismissToast(t.id)}
        >
          <span className="toast-icon">{svg(ICON[t.tone])}</span>
          <span className="toast-text">
            <span className="toast-title">{t.title}</span>
            {t.body && <span className="toast-body">{t.body}</span>}
          </span>
          <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => dismissToast(t.id)}>
            {svg(<path d="M18 6 6 18M6 6l12 12" />)}
          </button>
          <span className="toast-life" aria-hidden="true" />
        </li>
      ))}
    </ol>
  );
};

export { Toaster };
