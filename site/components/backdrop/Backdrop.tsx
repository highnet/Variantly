'use client';

import { useEffect, useState, type ComponentType } from 'react';

import dynamic from 'next/dynamic';

import { CONCEPT_BY_ID, CONCEPT_LOADERS, isLive, type ConceptId } from '@/concepts';
import { GrainDefs } from '@/components/backdrop/artKit';
import { markLoaded } from '@/lib/loadProgress';
import { startPerfTier } from '@/lib/perfTier';
import { calmMotion } from '@/lib/prefs';
import { holdFrame, releaseFrame, seekTime } from '@/lib/seek';
import { useConcept } from '@/lib/variant';

// three.js stays out of the first load: the scene arrives after the page is up.
const GlField = dynamic(() => import('./GlField').then((m) => m.GlField), { ssr: false });

const htmlTheme = () => {
  const html = document.documentElement;
  // seekreel renders pin the theme from the URL before the first draw.
  const forced = new URLSearchParams(location.search).get('theme');
  if (forced === 'light' || forced === 'dark') html.dataset.theme = forced;
  return html.dataset.theme === 'dark' ? 'dark' : 'light';
};

// Client-only (ssr: false), so the first render already has the painted
// theme: the scene never builds in light only to rebuild in dark.
const useTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(htmlTheme);
  useEffect(() => {
    const html = document.documentElement;
    const read = () => setTheme(html.dataset.theme === 'dark' ? 'dark' : 'light');
    read();
    const mo = new MutationObserver(read);
    mo.observe(html, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);
  return theme;
};

// A previewed draft's background composition (concepts/<id>/Backdrop.tsx),
// loaded on demand. Live concepts' art is already in the server HTML
// (BackdropPoster), so for them this loads nothing.
const useDraftArt = (key: ConceptId | null) => {
  const [art, setArt] = useState<{ id: ConceptId; Art: ComponentType } | null>(null);
  useEffect(() => {
    if (!key || isLive(key)) return;
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
 * Page-wide decorative layer: the concept's three.js scene, over the
 * background art the server already painted (BackdropPoster; a previewed
 * draft's art loads here). Grain lives on the scene's shapes (GlField).
 * Fixed behind content.
 */
export const Backdrop = () => {
  // html[data-variant] (set before first paint, then by setVariant), not the
  // store: the backdrop starts loading on mount instead of after hydration.
  const key = useConcept();
  const theme = useTheme();
  const art = useDraftArt(key);
  // Reduced motion never loads the scene, so there is nothing to wait for.
  useEffect(() => {
    if (calmMotion() && seekTime() === null) markLoaded('scene');
    startPerfTier();
  }, []);
  // Every route mounts fresh art, so its CSS loops would restart at zero on
  // each navigation. Put them on the wall clock instead: every page (and a
  // reload) shows the same moment of each loop, so the art carries on.
  useEffect(() => {
    if (seekTime() !== null) return;
    const now = Date.now();
    for (const a of document.getAnimations()) {
      const t = (a.effect as KeyframeEffect | null)?.target;
      if (!(a instanceof CSSAnimation) || !t?.closest('.vy-backdrop')) continue;
      const d = a.effect?.getComputedTiming().duration;
      if (typeof d === 'number' && d > 0 && a.effect?.getComputedTiming().iterations === Infinity)
        a.currentTime = now % d;
    }
  }, [key, art]);
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
  const Art = art && art.id === key ? art.Art : null;
  return (
    <div
      className="vy-backdrop pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
    >
      {Art && (
        <div className="vy-blobs vy-art absolute inset-0">
          <GrainDefs />
          <Art key={key} />
        </div>
      )}
      <div className="vy-scene absolute inset-0">
        {/* Reduced motion: the CSS layers only; the three.js chunk never loads.
            Not keyed: GlField cross-fades a concept or theme change itself, so
            the old scene stays up until the new one has drawn. */}
        {(!calmMotion() || seekTime() !== null) && (
          <GlField
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
