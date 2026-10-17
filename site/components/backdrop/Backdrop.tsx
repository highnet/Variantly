'use client';

import { useEffect, useState } from 'react';

import { markLoaded } from '@/lib/loadProgress';
import { calmMotion } from '@/lib/prefs';
import { holdFrame, seekTime } from '@/lib/seek';

import dynamic from 'next/dynamic';
import { useVariant } from '@/lib/variant';
import { BackdropArt } from '@/components/BackdropArt';

import { VARIANTS } from './variants';

// three.js stays out of the first load: the scene arrives after the page is up.
const GlField = dynamic(() => import('./GlField').then((m) => m.GlField), { ssr: false });

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
 * Page-wide decorative layer: the variant's three.js scene, its own static
 * background art (see BackdropArt). Grain lives on the scene's shapes (GlField).
 */
export const Backdrop = () => {
  const key = useVariant();
  const theme = useTheme();
  // Concept styles in globals.css key off html[data-variant].
  useEffect(() => {
    if (key) document.documentElement.dataset.variant = key;
  }, [key]);
  // Reduced motion never loads the scene, so there is nothing to wait for.
  useEffect(() => {
    if (calmMotion() && seekTime() === null) markLoaded('scene');
  }, []);
  useEffect(() => {
    const html = document.documentElement;
    if (seekTime() !== null) {
      html.dataset.seek = '';
      holdFrame('gl');
      holdFrame('title');
    }
    // Past the hero the scene steps back so body copy stays readable.
    const onScroll = () => html.toggleAttribute('data-scrolled', scrollY > 520);
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, []);
  if (!key) return null;
  const v = VARIANTS[key];
  return (
    <div
      className="vy-backdrop pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
    >
      <BackdropArt variant={key} />
      <div className="vy-scene absolute inset-0">
        {/* Reduced motion: the CSS layers only; the three.js chunk never loads. */}
        {(!calmMotion() || seekTime() !== null) && (
          <GlField key={key + theme} scene={v.scene} colors={v.colors[theme]} grain={v.grain} />
        )}
      </div>
    </div>
  );
};
