'use client';

import { animate, inView } from 'motion';
import { useEffect } from 'react';

import { burst } from '@/components/FreshLook';
import { calmMotion } from '@/lib/prefs';
import { seekTime } from '@/lib/seek';
import { useSiteStore } from '@/lib/store';

// The favicon redrawn in the current concept's accent (idea 16).
const favicon = () => {
  const accent =
    getComputedStyle(document.documentElement).getPropertyValue('--alert').trim() || '#ffd400';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#121216"/><path d="M19.5 0H24a8 8 0 0 1 8 8v16a8 8 0 0 1-8 8h-11.5Z" fill="${accent}"/><rect x="5" y="9" width="8" height="2" rx="1" fill="#fff" opacity=".7"/><rect x="5" y="14" width="6" height="2" rx="1" fill="#fff" opacity=".7"/><rect x="5" y="19" width="7.5" height="2" rx="1" fill="#fff" opacity=".7"/><rect x="20" y="7" width="7" height="7" rx="1.5" fill="#121216"/><rect x="18" y="17" width="9" height="2.5" rx="1.25" fill="#121216"/><rect x="16.5" y="22" width="8" height="2.5" rx="1.25" fill="#121216"/><path d="M19.5 0 12.5 32" stroke="#fff" stroke-width="1.6"/><circle cx="16" cy="16" r="3.2" fill="#fff" stroke="#121216" stroke-width="1.4"/></svg>`;
  let link = document.querySelector<HTMLLinkElement>('link[data-vy-icon]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    link.dataset.vyIcon = '';
    document.head.appendChild(link);
  }
  link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

/*
 * Small homepage delights, wired once:
 * copy buttons pop and burst (4), "How it works" fills a progress line as you
 * scroll it (5), scores count up (7), the hero parallaxes (10), commands type
 * themselves out (11), <details> open with a spring (12), the demo divider
 * peeks to show it drags (13), the favicon follows the concept (16) and the
 * header frosts once scrolled (17). Motion-heavy parts skip reduced motion.
 */
export const Delight = () => {
  useEffect(() => {
    favicon();
    const unsub = useSiteStore.subscribe((s, prev) => {
      if (s.variant !== prev.variant) requestAnimationFrame(favicon);
    });
    const root = document.documentElement;
    const header = document.querySelector('header');
    const calm = calmMotion() || seekTime() !== null;
    const stops: (() => void)[] = [unsub];

    // 17 · glass header, 5 · steps progress, 10 · hero parallax
    const steps = document.querySelector<HTMLElement>('main > div ol');
    steps?.classList.add('vy-steps');
    const onScroll = () => {
      header?.classList.toggle('vy-header-glass', scrollY > 24);
      if (steps) {
        const r = steps.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (innerHeight * 0.75 - r.top) / r.height));
        steps.style.setProperty('--steps-p', p.toFixed(3));
        [...steps.children].forEach((li, i, all) =>
          li.classList.toggle('vy-step-on', p >= (i + 0.4) / all.length),
        );
      }
      if (!calm && scrollY < innerHeight * 1.5) {
        root.style.setProperty('--px-y', `${scrollY}px`);
      }
    };
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    stops.push(() => removeEventListener('scroll', onScroll));

    // 4 · copy pop + burst
    const onClick = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>(
        'button[aria-label^="Copy"], button[aria-label="Copied"]',
      );
      if (!btn || calm) return;
      const r = btn.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, 10);
      btn.animate(
        [
          { transform: 'scale(0.8)' },
          { transform: 'scale(1.2) rotate(-6deg)', offset: 0.4 },
          { transform: 'none' },
        ],
        { duration: 420, easing: 'cubic-bezier(0.34, 1.6, 0.5, 1)' },
      );
    };
    document.addEventListener('click', onClick);
    stops.push(() => document.removeEventListener('click', onClick));

    // 12 · springy <details>
    const onToggle = (e: Event) => {
      const d = e.target as HTMLDetailsElement;
      if (calm || !(d instanceof HTMLDetailsElement) || !d.open) return;
      const body = [...d.children].filter((c) => c.tagName !== 'SUMMARY') as HTMLElement[];
      animate(
        body,
        { opacity: [0, 1], transform: ['translateY(-8px) scaleY(0.92)', 'none'] },
        { type: 'spring', stiffness: 300, damping: 20 },
      );
    };
    document.addEventListener('toggle', onToggle, true);
    stops.push(() => document.removeEventListener('toggle', onToggle, true));

    if (calm) return () => stops.forEach((s) => s());

    // 7 · scores count up the first time they show
    document.querySelectorAll<HTMLElement>('[data-score]').forEach((el) => {
      stops.push(
        inView(el, () => {
          const to = Number(el.textContent) || 0;
          animate(0, to, {
            duration: 1.1,
            ease: [0.16, 1, 0.3, 1],
            onUpdate: (v) => (el.textContent = String(Math.round(v))),
          });
        }),
      );
    });

    // 11 · commands below the fold type themselves out once
    document
      .querySelectorAll<HTMLElement>('main > div [data-slot="command-copy"] code')
      .forEach((el) => {
        // Skip ones on screen already, and ones in the hidden agent view.
      if (!el.offsetParent || el.getBoundingClientRect().top < innerHeight) return;
        const full = el.textContent ?? '';
        el.style.minHeight = `${el.offsetHeight}px`;
        el.textContent = '';
        el.classList.add('vy-typing');
        stops.push(
          inView(el, () => {
            let i = 0;
            const tick = () => {
              // React may have re-rendered the text (runner switch): stop typing.
              if (!el.classList.contains('vy-typing')) return;
              el.textContent = full.slice(0, ++i);
              if (i < full.length) setTimeout(tick, 28 + Math.random() * 30);
              else setTimeout(() => el.classList.remove('vy-typing'), 600);
            };
            setTimeout(tick, 200);
          }),
        );
        const restore = useSiteStore.subscribe((s, prev) => {
          if (s.runner !== prev.runner) el.classList.remove('vy-typing');
        });
        stops.push(restore);
      });

    // 13 · the before/after divider peeks once when the demo shows
    const stage = document.getElementById('demo-stage');
    if (stage) {
      stops.push(
        inView(
          stage,
          () => {
            const grip = document.querySelector<HTMLElement>(
              '[aria-label="Before and after divider"]',
            );
            const start = Number(grip?.getAttribute('aria-valuenow') ?? 50);
            animate(0, 1, {
              duration: 1.4,
              ease: 'easeInOut',
              onUpdate: (t) =>
                stage.style.setProperty('--split', `${start - Math.sin(t * Math.PI * 2) * 12}%`),
              onComplete: () => stage.style.setProperty('--split', `${start}%`),
            });
          },
          { amount: 0.5 },
        ),
      );
    }

    return () => stops.forEach((s) => s());
  }, []);

  return null;
};
