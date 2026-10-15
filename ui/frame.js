/*
 * Injected into every preview (the original and each variant) by the preview
 * proxy. It lets the comparison view keep both panes on the same page and at
 * the same scroll position, and forwards the picker's shortcuts when focus is
 * inside a preview. It has no other effect on the page.
 */
(() => {
  if (window.top === window || window.__variantlyFrame) return;
  window.__variantlyFrame = true;
  const script = document.currentScript;
  const id = script?.dataset.variantly ?? '';
  const post = (msg) => window.parent.postMessage({ variantly: true, id, ...msg }, '*');

  let quietUntil = 0;
  const scroller = () => document.scrollingElement || document.documentElement;
  const ratio = () => {
    const el = scroller();
    const max = el.scrollHeight - window.innerHeight;
    return max > 0 ? el.scrollTop / max : 0;
  };

  let raf = 0;
  addEventListener(
    'scroll',
    () => {
      if (Date.now() < quietUntil || raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        post({ type: 'scroll', ratio: ratio(), y: scroller().scrollTop });
      });
    },
    { passive: true },
  );

  const where = () => location.pathname + location.search + location.hash;
  let last = '';
  const reportNav = () => {
    const now = where();
    if (now === last) return;
    last = now;
    post({ type: 'nav', path: now, title: document.title });
  };
  for (const method of ['pushState', 'replaceState']) {
    const original = history[method];
    history[method] = function (...args) {
      const result = original.apply(this, args);
      queueMicrotask(reportNav);
      return result;
    };
  }
  addEventListener('popstate', reportNav);
  addEventListener('hashchange', reportNav);
  addEventListener('DOMContentLoaded', reportNav);
  reportNav();

  addEventListener('keydown', (e) => {
    const t = e.target;
    const typing = t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^[0-9]$/.test(e.key) || ['ArrowLeft', 'ArrowRight', '[', ']', 'o', 's', 'c', 'Escape'].includes(e.key)) {
      post({ type: 'key', key: e.key });
    }
  });
  addEventListener('pointerdown', () => post({ type: 'focus' }), { passive: true });

  addEventListener('message', (e) => {
    if (e.source !== window.parent || !e.data?.variantly) return;
    const msg = e.data;
    if (msg.type === 'scrollTo') {
      quietUntil = Date.now() + 200;
      const el = scroller();
      const max = el.scrollHeight - window.innerHeight;
      el.scrollTop = msg.mode === 'pixels' ? msg.y : Math.round((msg.ratio ?? 0) * Math.max(0, max));
    }
    if (msg.type === 'hello') post({ type: 'ready', path: where(), ratio: ratio() });
  });

  post({ type: 'ready', path: where(), ratio: 0 });
})();
