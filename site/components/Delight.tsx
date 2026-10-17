'use client';

import { inView } from 'motion';
import { useEffect } from 'react';

import { burst } from '@/components/FreshLook';
import { animateHeight, revealText, stillMotion } from '@/lib/disclose';
import { EASE } from '@/lib/motion';
import { calmMotion } from '@/lib/prefs';
import { lowPerf, onScrollStart, scrolling, touchUI, whenIdle } from '@/lib/scrollIdle';
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
 * themselves out (11), <details> spring open and shut (12), the demo divider
 * peeks to show it drags (13), the favicon follows the concept (16) and the
 * header frosts once scrolled (17). Motion-heavy parts skip calm/reduced
 * motion and seekreel frames.
 */
export const Delight = () => {
  useEffect(() => {
    favicon();
    const unsub = useSiteStore.subscribe((s, prev) => {
      if (s.variant !== prev.variant) requestAnimationFrame(favicon);
    });
    const header = document.querySelector('header');
    const calm = calmMotion() || seekTime() !== null;
    const stops: (() => void)[] = [unsub];

    // 17 · glass header, 5 · steps progress, 10 · hero parallax
    const steps = document.querySelector<HTMLElement>('main > div ol');
    const items = steps ? ([...steps.children] as HTMLElement[]) : [];
    // Touch and low-power: no per-frame scrubbing and no parallax. The steps
    // light up (and their numerals fill in one CSS transition) from an
    // observer, applied once the scroll settles.
    const light = touchUI() || lowPerf();
    if (light && steps) {
      // Steps already in the lit zone at mount start lit, set in the same
      // frame as the classes that enable the fill, so nothing drains and
      // refills. One rect read pass, then writes.
      const lit = items.map((el) => el.getBoundingClientRect().top < innerHeight * 0.75);
      items.forEach((el, i) => lit[i] && el.classList.add('vy-step-on', 'vy-step-done'));
      steps.style.setProperty('--steps-p', (lit.filter(Boolean).length / items.length).toFixed(3));
      document.documentElement.classList.add('vy-steps-touch');
    }
    steps?.classList.add('vy-steps');
    // Fill transitions switch on only after the mount state has painted.
    let armed = 0;
    if (light && steps)
      armed = requestAnimationFrame(() => {
        armed = requestAnimationFrame(() =>
          document.documentElement.classList.add('vy-steps-anim'),
        );
      });
    const drifting = light
      ? []
      : [...document.querySelectorAll<HTMLElement>('.vy-scene, .vy-blobs, .vy-title')];
    let glass = false;
    let lastY = '';
    let frame = 0;
    const paint = () => {
      frame = 0;
      const y = scrollY;
      if (y > 24 !== glass) {
        glass = y > 24;
        header?.classList.toggle('vy-header-glass', glass);
      }
      if (light) return;
      if (steps) {
        // The one layout read of the frame; writes follow.
        const r = steps.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (innerHeight * 0.75 - r.top) / r.height));
        steps.style.setProperty('--steps-p', p.toFixed(3));
        items.forEach((el, i, all) => {
          // Each numeral fills over its own stretch of the progress line.
          const fill = calm ? 1 : Math.min(1, Math.max(0, (p * all.length - i) / 0.7));
          el.style.setProperty('--fill', fill.toFixed(2));
          el.classList.toggle('vy-step-on', p >= (i + 0.4) / all.length);
          // The pop plays once, the first time a numeral is full.
          if (fill >= 1) el.classList.add('vy-step-done');
        });
      }
      if (!calm && y < innerHeight * 1.5) {
        // Set on the three drifting layers only: a custom property on <html>
        // would restyle the whole document on every scroll frame.
        const v = `${y}px`;
        if (v !== lastY) {
          lastY = v;
          drifting.forEach((el) => el.style.setProperty('--px-y', v));
        }
      }
    };
    // One read-and-write pass per frame, however fast the scroll events come.
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    paint();
    addEventListener('scroll', onScroll, { passive: true });
    stops.push(() => {
      removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    });
    if (light && steps) {
      const root = document.documentElement;
      const on = new Set<Element>();
      let pending: () => void = () => {};
      const apply = () => {
        items.forEach((el) => {
          if (on.has(el)) el.classList.add('vy-step-on', 'vy-step-done');
        });
        const p = items.filter((el) => el.classList.contains('vy-step-on')).length / items.length;
        steps.style.setProperty('--steps-p', p.toFixed(3));
      };
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => e.isIntersecting && on.add(e.target));
          pending();
          if (calm) apply();
          else pending = whenIdle(apply);
        },
        // A step lights once it is in the upper three quarters of the screen.
        { rootMargin: '0px 0px -25% 0px' },
      );
      items.forEach((el) => io.observe(el));
      stops.push(() => {
        io.disconnect();
        pending();
        cancelAnimationFrame(armed);
        root.classList.remove('vy-steps-touch', 'vy-steps-anim');
      });
    }

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
        { duration: 420, easing: EASE.springPop },
      );
    };
    document.addEventListener('click', onClick);
    stops.push(() => document.removeEventListener('click', onClick));

    // 12 · springy <details>: the same height spring as the show-more pill
    const onSummary = (e: MouseEvent) => {
      const summary = (e.target as HTMLElement).closest('summary');
      const d = summary?.parentElement;
      if (
        !summary ||
        !(d instanceof HTMLDetailsElement) ||
        !d.classList.contains('vy-more') ||
        stillMotion()
      )
        return;
      e.preventDefault();
      const from = d.offsetHeight;
      const body = [...d.children].filter((c) => c.tagName !== 'SUMMARY');
      if (d.open) {
        d.classList.add('vy-closing');
        animateHeight(d, from, summary.offsetHeight, () => {
          d.open = false;
          d.classList.remove('vy-closing');
        });
      } else {
        d.open = true;
        animateHeight(d, from, d.offsetHeight);
        revealText(body);
      }
    };
    document.addEventListener('click', onSummary);
    stops.push(() => document.removeEventListener('click', onSummary));

    if (calm) return () => stops.forEach((s) => s());

    // 7 · scores roll up: see RollingNumber

    // 11 · commands below the fold type themselves out once. The text stays
    // React's: the untyped tail is hidden with a CSS highlight (no DOM
    // mutation), so a runner switch mid-typing simply shows the new command.
    // Touch and low-power show commands fully typed. On desktop typing starts
    // only while the page is still, and a scroll finishes it at once.
    const typing = !light && typeof Highlight === 'function' && 'highlights' in CSS;
    const typingNow = new Set<() => void>();
    stops.push(onScrollStart(() => [...typingNow].forEach((f) => f())));
    const untyped = typing ? new Highlight() : null;
    if (untyped) CSS.highlights.set('vy-untyped', untyped);
    document
      .querySelectorAll<HTMLElement>('main > div [data-slot="command-copy"] code')
      .forEach((el) => {
        const text = el.firstChild;
        // Skip ones on screen already, and ones in the hidden agent view.
        if (!untyped || !(text instanceof Text) || !el.offsetParent) return;
        if (el.getBoundingClientRect().top < innerHeight) return;
        const full = text.length;
        const range = new Range();
        range.setStart(text, 0);
        range.setEnd(text, full);
        untyped.add(range);
        let timer = 0;
        let cancelIdle = () => {};
        const finish = () => {
          clearTimeout(timer);
          cancelIdle();
          typingNow.delete(finish);
          untyped.delete(range);
        };
        stops.push(finish);
        stops.push(
          inView(el, () => {
            // Scrolled in mid-gesture: type once the page is still, if the
            // command is still on screen; otherwise just show it.
            if (scrolling()) cancelIdle = whenIdle(start);
            else start();
          }),
        );
        const start = () => {
          const r = el.getBoundingClientRect();
          if (r.bottom < 0 || r.top > innerHeight) return finish();
          typingNow.add(finish);
          let i = 0;
          const tick = () => {
            // React re-rendered the text (runner switch): show it all.
            if (el.firstChild !== text || text.length !== full) return finish();
            range.setStart(text, ++i);
            if (i < full) timer = window.setTimeout(tick, 28 + Math.random() * 30);
            else finish();
          };
          timer = window.setTimeout(tick, 200);
        };
        stops.push(
          useSiteStore.subscribe((s, prev) => {
            if (s.runner !== prev.runner) finish();
          }),
        );
      });
    if (untyped) stops.push(() => CSS.highlights.delete('vy-untyped'));

    // 13 · the demo divider's one-time peek lives in Showcase (sweepTo), so
    // it plays once and moves the grip with the line.

    return () => stops.forEach((s) => s());
  }, []);

  return null;
};
