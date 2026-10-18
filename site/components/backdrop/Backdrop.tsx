'use client';

import { useEffect, useState, type ComponentType } from 'react';

import dynamic from 'next/dynamic';

import { CONCEPT_BY_ID, CONCEPT_LOADERS, type ConceptId } from '@/concepts';
import { markLoaded } from '@/lib/loadProgress';
import { startPerfTier } from '@/lib/perfTier';
import { calmMotion } from '@/lib/prefs';
import { holdFrame, releaseFrame, seekTime } from '@/lib/seek';
import { useVariant } from '@/lib/variant';

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

// The active concept's background composition (concepts/<id>/Backdrop.tsx),
// loaded on demand. The previous one stays up until the next has arrived.
const useConceptArt = (key: ConceptId | null) => {
  const [art, setArt] = useState<{ id: ConceptId; Art: ComponentType } | null>(null);
  useEffect(() => {
    if (!key) return;
    let live = true;
    // Seekreel captures wait for the art before taking the frame.
    const seek = seekTime() !== null;
    if (seek) holdFrame('art');
    void CONCEPT_LOADERS[key]
      .backdrop()
      .then((m) => live && setArt({ id: key, Art: m.default }))
      .catch(() => {})
      .finally(() => seek && releaseFrame('art'));
    return () => {
      live = false;
    };
  }, [key]);
  return art;
};

/*
 * Page-wide decorative layer: the concept's three.js scene, its own background
 * art (concepts/<id>/Backdrop.tsx). Grain lives on the scene's shapes (GlField).
 * Fixed behind content.
 */
export const Backdrop = () => {
  const key = useVariant();
  const theme = useTheme();
  const art = useConceptArt(key);
  // Concept styles (concepts/<id>/concept.css) key off html[data-variant].
  useEffect(() => {
    if (key) document.documentElement.dataset.variant = key;
  }, [key]);
  // Reduced motion never loads the scene, so there is nothing to wait for.
  useEffect(() => {
    if (calmMotion() && seekTime() === null) markLoaded('scene');
    startPerfTier();
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
  const Art = art?.Art;
  return (
    <div
      className="vy-backdrop pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
    >
      <div className="vy-blobs vy-art absolute inset-0">{Art && <Art key={art.id} />}</div>
      <div className="vy-scene absolute inset-0">
        {/* Reduced motion: the CSS layers only; the three.js chunk never loads. */}
        {(!calmMotion() || seekTime() !== null) && (
          <GlField
            key={key + theme}
            concept={key}
            theme={theme}
            grain={CONCEPT_BY_ID[key].grain}
            chroma={CONCEPT_BY_ID[key].grainChroma ?? 0.35}
          />
        )}
      </div>
    </div>
  );
};
