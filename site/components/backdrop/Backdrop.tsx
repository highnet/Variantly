'use client';

import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { useEffect, useState } from 'react';

import { calmMotion } from '@/lib/prefs';
import { holdFrame, releaseFrame, seekTime } from '@/lib/seek';

import { GlField } from './GlField';
import { VARIANTS, type VariantKey } from './variants';

// Each blob morphs through these outlines; all share one command structure so
// the path string interpolates point for point.
const SHAPES = [
  'M50,8 C74,8 92,26 92,50 C92,74 74,92 50,92 C26,92 8,74 8,50 C8,26 26,8 50,8Z',
  'M50,4 C80,14 96,30 88,56 C80,84 62,96 40,90 C14,84 2,62 10,38 C18,16 30,0 50,4Z',
  'M54,10 C70,2 98,22 90,46 C84,66 96,88 66,94 C40,98 18,90 10,66 C2,40 34,20 54,10Z',
  'M46,6 C66,14 76,4 90,26 C100,46 84,60 86,78 C88,96 56,96 38,88 C16,80 4,60 8,40 C12,20 28,0 46,6Z',
];

// Hard-edged geometry for the Bauhaus variant: circle, square, triangle, arch,
// written with the same command count so they still morph point for point.
const SHARP = [
  'M50,10 C72,10 90,28 90,50 C90,72 72,90 50,90 C28,90 10,72 10,50 C10,28 28,10 50,10Z',
  'M12,12 C40,12 60,12 88,12 C88,40 88,60 88,88 C60,88 40,88 12,88 C12,60 12,40 12,12Z',
  'M50,8 C60,26 70,44 92,88 C70,88 50,88 28,88 C18,88 12,88 8,88 C26,52 38,30 50,8Z',
  'M14,90 C14,40 30,12 50,12 C70,12 86,40 86,90 C70,90 60,90 50,90 C40,90 28,90 14,90Z',
];

const Blob = ({ color, i, sharp }: { color: string; i: number; sharp?: boolean }) => {
  const p = useMotionValue(0);
  const d = useTransform(p, SHAPES.map((_, k) => k), sharp ? SHARP : SHAPES);
  useEffect(() => {
    const seek = seekTime();
    if (seek !== null) {
      const dur = 14 + i * 4;
      const ph = (((seek - i * 1.2) % dur) + dur) % dur;
      const x = (ph / dur) * 4;
      p.set(x <= 3 ? x : 3 * (4 - x));
      return;
    }
    if (calmMotion()) return;
    const c = animate(p, [0, 1, 2, 3, 0], {
      duration: 14 + i * 4,
      repeat: Infinity,
      ease: 'easeInOut',
      delay: i * 1.2,
    });
    return () => c.stop();
  }, [p, i]);
  const pos = [
    'left-[-6%] top-[8%] size-[44vmax]',
    'right-[-10%] top-[-6%] size-[38vmax]',
    'left-[38%] top-[46%] size-[30vmax]',
  ][i];
  return (
    <motion.svg
      viewBox="0 0 100 100"
      className={`absolute ${pos}`}
      animate={seekTime() !== null || calmMotion() ? undefined : { rotate: [0, 18, 0] }}
      transition={{ duration: 30 + i * 6, repeat: Infinity, ease: 'easeInOut' }}
    >
      <motion.path d={d} fill={color} filter={`url(#vy-grain-${i})`} />
      <defs>
        <filter id={`vy-grain-${i}`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={i + 3} />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.4 1.1" />
          <feComposite in="SourceGraphic" operator="in" />
        </filter>
      </defs>
    </motion.svg>
  );
};

const pick = (): VariantKey => {
  const v = new URLSearchParams(location.search).get('v');
  return v && 'bcdef'.includes(v) && v.length === 1 ? (v as VariantKey) : 'a';
};

const useTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    const html = document.documentElement;
    // seekreel renders pin the theme from the URL before the first draw.
    const forced = new URLSearchParams(location.search).get('theme');
    if (forced === 'light' || forced === 'dark') html.dataset.theme = forced;
    const read = () => setTheme(html.dataset.theme === 'dark' ? 'dark' : 'light');
    read();
    const mo = new MutationObserver(read);
    mo.observe(html, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);
  return theme;
};

/*
 * Page-wide decorative layer: the variant's three.js scene, its SVG morph
 * shapes (noise-textured), and a film-grain overlay. Fixed behind content.
 */
export const Backdrop = () => {
  const [key, setKey] = useState<VariantKey | null>(null);
  const theme = useTheme();
  useEffect(() => {
    const k = pick();
    const html = document.documentElement;
    html.dataset.variant = k;
    if (seekTime() !== null) {
      html.dataset.seek = '';
      holdFrame('gl');
      holdFrame('title');
    }
    setKey(k);
    // Past the hero the scene steps back so body copy stays readable.
    const onScroll = () => html.toggleAttribute('data-scrolled', scrollY > 520);
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, []);
  if (!key) return null;
  const v = VARIANTS[key];
  return (
    <div className="vy-backdrop pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {v.blobs && (
        <div className="vy-blobs absolute inset-0" style={{ filter: `blur(${v.blur}px)` }}>
          {v.blobs[theme].map((c, i) => (
            <Blob key={c + i} color={c} i={i} sharp={v.sharp} />
          ))}
        </div>
      )}
      <div className="vy-scene absolute inset-0">
        <GlField key={theme} scene={v.scene} colors={v.colors[theme]} />
      </div>
      <div className="vy-grain absolute inset-0" style={{ opacity: v.grain }} />
    </div>
  );
};
