'use client';

import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { useEffect, useState } from 'react';

import { calmMotion } from '@/lib/prefs';
import { cn } from '@/lib/utils';
import { holdFrame, seekTime } from '@/lib/seek';

import dynamic from 'next/dynamic';
import { useVariant } from '@/lib/variant';

import { VARIANTS } from './variants';

// three.js stays out of the first load: the scene arrives after the page is up.
const GlField = dynamic(() => import('./GlField').then((m) => m.GlField), { ssr: false });

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

type BlobProps = { ramp: [string, string, string]; i: number; sharp?: boolean; id: string };

/*
 * One morph shape painted as a grainy gradient (css-tricks.com/grainy-gradients):
 * a radial ramp (warm core, mid, cool edge fading out) is softened, then run
 * through fractal noise that scatters its pixels, so the colour dithers into
 * grain instead of banding.
 */
const Blob = ({ ramp, i, sharp, id }: BlobProps) => {
  const p = useMotionValue(0);
  const d = useTransform(
    p,
    SHAPES.map((_, k) => k),
    sharp ? SHARP : SHAPES,
  );
  useEffect(() => {
    const seek = seekTime();
    if (seek !== null) {
      const dur = 14 + i * 4;
      const ph = (((seek - i * 1.2) % dur) + dur) % dur;
      const x = (ph / dur) * 4;
      p.set(x <= 3 ? x : 3 * (4 - x));
      return;
    }
    // Phones: no path morph. Each morph frame re-runs the lighting and grain
    // filter; a still shape is filtered once and only its rotation animates.
    if (calmMotion() || innerWidth < 640) return;
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
      className={cn('absolute overflow-visible', pos)}
      animate={seekTime() !== null || calmMotion() ? undefined : { rotate: [0, 18, 0] }}
      transition={{ duration: 30 + i * 6, repeat: Infinity, ease: 'easeInOut' }}
    >
      <defs>
        {/* An opaque body ramp (warm core up-left, cool rim) for the lighting to shape. */}
        <radialGradient id={`${id}-fill`} cx="36%" cy="30%" r="78%">
          <stop offset="0" stopColor={ramp[0]} />
          <stop offset="0.5" stopColor={ramp[1]} />
          <stop offset="1" stopColor={ramp[2]} />
        </radialGradient>
        {/*
          2.5D, then grain: the alpha is blurred into a height map, lit with a
          soft diffuse key and a specular highlight, given a cast shadow, and
          only then scattered through fractal noise, so the volume keeps the
          grainy-gradient texture.
        */}
        <filter id={`${id}-grain`} x="-25%" y="-25%" width="150%" height="160%">
          <feGaussianBlur in="SourceAlpha" stdDeviation={sharp ? 1.6 : 5} result="bump" />
          <feDiffuseLighting
            in="bump"
            surfaceScale={sharp ? 2.5 : 6}
            diffuseConstant="1.15"
            lightingColor="#ffffff"
            result="diffuse"
          >
            <feDistantLight azimuth="235" elevation="42" />
          </feDiffuseLighting>
          <feComposite
            in="SourceGraphic"
            in2="diffuse"
            operator="arithmetic"
            k1="1.05"
            k2="0.12"
            result="shaded"
          />
          <feSpecularLighting
            in="bump"
            surfaceScale={sharp ? 2.5 : 6}
            specularConstant="0.85"
            specularExponent="18"
            lightingColor="#ffffff"
            result="spec"
          >
            <fePointLight x="24" y="14" z="70" />
          </feSpecularLighting>
          <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn" />
          <feComposite
            in="specIn"
            in2="shaded"
            operator="arithmetic"
            k2="0.7"
            k3="1"
            result="lit"
          />
          <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="shadowBlur" />
          <feOffset in="shadowBlur" dx="3" dy="9" result="shadowOff" />
          <feFlood floodColor="#1a1030" floodOpacity="0.28" />
          <feComposite in2="shadowOff" operator="in" result="shadow" />
          <feMerge result="body">
            <feMergeNode in="shadow" />
            <feMergeNode in="lit" />
          </feMerge>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="1.15"
            numOctaves="2"
            seed={i + 3}
            result="noise"
          />
          <feDisplacementMap
            in="body"
            in2="noise"
            scale={sharp ? 5 : 12}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
      <motion.path d={d} fill={`url(#${id}-fill)`} filter={`url(#${id}-grain)`} />
    </motion.svg>
  );
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
  const key = useVariant();
  const theme = useTheme();
  // Concept styles in globals.css key off html[data-variant].
  useEffect(() => {
    if (key) document.documentElement.dataset.variant = key;
  }, [key]);
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
      {v.blobs && (
        <div className="vy-blobs absolute inset-0" style={{ filter: `blur(${v.blur}px)` }}>
          {v.blobs[theme].map((ramp, i) => (
            <Blob
              key={key + theme + i}
              id={`vy-${key}-${theme}-${i}`}
              ramp={ramp}
              i={i}
              sharp={v.sharp}
            />
          ))}
        </div>
      )}
      <div className="vy-scene absolute inset-0">
        <GlField key={key + theme} scene={v.scene} colors={v.colors[theme]} />
      </div>
      <div className="vy-grain absolute inset-0" style={{ opacity: v.grain }} />
    </div>
  );
};
