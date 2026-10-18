'use client';

import { RefreshCw } from 'lucide-react';
import { useRef, type MouseEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { CONCEPT_BY_ID } from '@/concepts';
import { burstStyle, type BurstStyle } from '@/lib/burstStyle';
import { EASE } from '@/lib/motion';
import { lensFor } from '@/lib/lensPair';
import { calmMotion } from '@/lib/prefs';
import { currentVariant, pressOrigin, setVariant, useConcept } from '@/lib/variant';

const SPARKS = 26;

/*
 * A burst of confetti and sparks from the word, in the concept's colours and
 * its own shapes (lib/burstStyle.ts), plus a ring. It plays out before the page wipes to the next concept (a
 * view transition would freeze it in the old snapshot).
 */
export const burst = (x: number, y: number, sparks = SPARKS, look?: BurstStyle) => {
  const css = getComputedStyle(document.documentElement);
  const style = look ?? burstStyle();
  const colours =
    style.colours ??
    ['--alert', '--title', '--board-ok', '--alert', '--hero-ink']
      .map((v) => css.getPropertyValue(v).trim())
      .filter(Boolean);
  const layer = document.createElement('div');
  layer.className = 'vy-burst';
  document.body.appendChild(layer);

  const ring = document.createElement('span');
  ring.className = 'vy-burst-ring';
  ring.dataset.shape = style.ring;
  ring.style.left = `${x}px`;
  ring.style.top = `${y}px`;
  ring.style.borderColor = colours[0] ?? 'currentColor';
  layer.appendChild(ring);
  ring.animate(
    [
      { transform: 'translate(-50%, -50%) scale(0.2)', opacity: 0.9 },
      { transform: 'translate(-50%, -50%) scale(3.2)', opacity: 0 },
    ],
    { duration: 480, easing: EASE.outExpo, fill: 'forwards' },
  );

  for (let i = 0; i < sparks; i++) {
    const s = document.createElement('span');
    s.className = 'vy-spark';
    s.textContent = style.glyphs[i % style.glyphs.length];
    if (style.font) s.style.fontFamily = style.font;
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    s.style.color = colours[i % colours.length] ?? 'currentColor';
    s.style.fontSize = `${16 + Math.random() * 20}px`;
    layer.appendChild(s);
    const angle = (i / sparks) * Math.PI * 2 + Math.random() * 0.5;
    const dist = (sparks < SPARKS ? 30 : 90) + Math.random() * (sparks < SPARKS ? 50 : 150);
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    const spin = (Math.random() - 0.5) * 720;
    s.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.3) rotate(0deg)', opacity: 1 },
        {
          transform: `translate(calc(-50% + ${dx * 0.8}px), calc(-50% + ${dy * 0.8}px)) scale(1.15) rotate(${spin * 0.7}deg)`,
          opacity: 1,
          offset: 0.55,
        },
        // a touch of gravity at the end of the flight
        {
          transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 40}px)) scale(0.6) rotate(${spin}deg)`,
          opacity: 0,
        },
      ],
      {
        duration: 900 + Math.random() * 300,
        easing: EASE.outExpo,
        fill: 'forwards',
      },
    );
  }
  // After the longest spark lands (1.2s), not mid-flight.
  window.setTimeout(() => layer.remove(), 1250);
};

/*
 * "a fresh look", in the hero headline, as the thing it promises: a press
 * restyles the whole page as the next concept. A wavy underline and a nudging
 * arrow invite the click; the press squashes, the release springs back with a
 * wobble, a burst flies out, and then the next concept wipes in.
 */
type FreshLookProps = {
  /** The word or phrase shown in the headline. */
  children?: string;
};

export const FreshLook = ({ children = 'a fresh look' }: FreshLookProps) => {
  const self = useRef<HTMLButtonElement>(null);
  const page = useConcept();
  const partner = page ? CONCEPT_BY_ID[lensFor(page)].name : null;

  const next = (e: MouseEvent<HTMLButtonElement>) => {
    // The same concept the Lens door offers ("Try ..."), so the word and the
    // door always agree. The doorway opens from the press (or the word's
    // centre from the keyboard).
    const origin = pressOrigin(e);
    const go = () => setVariant(lensFor(currentVariant()), { origin });
    if (calmMotion()) return go();

    const el = self.current;
    if (el) {
      const r = el.getBoundingClientRect();
      // Keyboard presses have no pointer; burst from the middle of the word.
      const x = e.clientX || r.left + r.width / 2;
      const y = e.clientY || r.top + r.height / 2;
      burst(x, y);
      el.animate(
        [
          { transform: 'scale(0.86, 0.78)' },
          { transform: 'scale(1.16, 1.12) rotate(-3deg)', offset: 0.3 },
          { transform: 'scale(0.95, 0.98) rotate(2deg)', offset: 0.55 },
          { transform: 'scale(1.04) rotate(-1deg)', offset: 0.78 },
          { transform: 'none' },
        ],
        { duration: 640, easing: 'ease-out' },
      );
      // A full turn on the spring that swings past and settles (on top of
      // the hover's half turn, which uses the rotate property).
      el.querySelector('svg')?.animate(
        [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
        { duration: 720, easing: EASE.settle },
      );
    }
    navigator.vibrate?.(12);
    // One-two: the pop and burst land, then the page wipes.
    window.setTimeout(go, 560);
  };

  return (
    <Button
      ref={self}
      variant="headline-word"
      size="none"
      onClick={next}
      title={partner ? `Try ${partner}` : 'Try another look'}
      aria-label={`${children} Try ${partner ?? 'another look'}: restyle this page`}
      className="vy-fresh"
    >
      {children}
      <RefreshCw aria-hidden="true" className="vy-fresh-icon" />
    </Button>
  );
};
