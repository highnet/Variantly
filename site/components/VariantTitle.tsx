'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { canWebGL } from '@/lib/glTier';
import {
  blendMorph,
  loadMorph,
  morphPose,
  morphTrack,
  planStep,
  type MorphData,
  type MorphPose,
} from '@/lib/glyphMorph';
import { INTRO_FINAL, INTRO_FONTS } from '@/lib/introFonts';
import { calmMotion } from '@/lib/prefs';
import { releaseFrame, seekTime, useSeekTime } from '@/lib/seek';
import { useSiteStore } from '@/lib/store';
import {
  faceAt,
  morphAt,
  msToNextStep,
  scaleAt,
  startDelay,
  stepAt,
  type MorphPhase,
} from '@/lib/titleTiming';
import { useVariant } from '@/lib/variant';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

// The 3D title (three.js and its typefaces) loads after first paint, once idle.
const Letters3D = dynamic(() => import('@/components/Letters3D').then((m) => m.Letters3D), {
  ssr: false,
});

const WORD = 'variantly';
const fontAt = (step: number, index: number) =>
  INTRO_FONTS[faceAt(step, index, INTRO_FONTS.length)];
const FINAL = INTRO_FINAL.map((c) => INTRO_FONTS.indexOf(c));
// A seeked frame of the 2D word is ready once its outlines have loaded and drawn.
const releaseMorphed = () =>
  void loadMorph()
    .catch(() => null)
    .then(() => releaseFrame('title'));
// How long a reveal waits for the outlines before it plays without morphing.
const MORPH_WAIT = 1200;

// One rAF for every morphing 2D letter: each registers a painter while it shifts.
const painters = new Set<(now: number) => void>();
let tickRaf = 0;
const tickAll = (now: number) => {
  painters.forEach((p) => p(now));
  tickRaf = painters.size ? requestAnimationFrame(tickAll) : 0;
};
const addPainter = (p: (now: number) => void) => {
  painters.add(p);
  if (!tickRaf) tickRaf = requestAnimationFrame(tickAll);
  return () => {
    painters.delete(p);
  };
};

// The letter's CSS text-shadow as canvas shadow layers (text-shadow does not
// reach a drawn glyph), bottom layer first.
const shadowLayers = (el: Element) => {
  const ts = getComputedStyle(el).textShadow;
  if (!ts || ts === 'none') return [];
  return ts
    .split(/,(?![^(]*\))/)
    .map((part) => {
      const color =
        part.match(/(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^)]*\)|#[0-9a-f]+/i)?.[0] ??
        'transparent';
      const [x = 0, y = 0, blur = 0] = (part.replace(color, '').match(/-?[\d.]+(?=px)/g) ?? []).map(
        Number,
      );
      return { color, x, y, blur };
    })
    .reverse();
};

type LetterProps = {
  char: string;
  index: number;
  run: number;
  solid: boolean;
  // Whether this run's reveal may start (its outlines are in, or given up on).
  go: boolean;
  // Outline data for this run (null: the reveal swaps fonts instead), and
  // the low power tier, both fixed for the run.
  morph: MorphData | null;
  low: boolean;
  variant: string | null;
};

/* One letter that shape-shifts through the font wardrobe, then locks in. */
const Letter = ({ char, index, run, solid, go, morph, low, variant }: LetterProps) => {
  // 'idle' = resting on the final face, a number = flickering, null = just locked.
  const [live, setLive] = useState<number | null | 'idle'>('idle');
  // performance.now() when this letter's reveal started.
  const t0 = useRef(0);

  useEffect(() => {
    if (seekTime() !== null || calmMotion()) return;
    // Where the 3D word can load, it plays the reveal: the HTML word holds
    // still on its final faces as the poster it fades in over, so the
    // flicker never changes material halfway through.
    if (solid || canWebGL()) return;
    // Without WebGL the HTML word plays the reveal, once its outlines are in.
    if (!go) return;
    const start = performance.now();
    t0.current = start;
    let timer = 0;
    const tick = () => {
      const step = stepAt(performance.now() - start, index);
      setLive(step === null ? null : Math.max(step, 0));
      // Wake exactly when the face next changes, not on a fixed poll.
      if (step !== null)
        timer = window.setTimeout(tick, msToNextStep(performance.now() - start, index) + 4);
    };
    timer = window.setTimeout(tick, startDelay(index));
    return () => clearTimeout(timer);
  }, [index, run, solid, go]);

  // seekreel frames derive the step from ?t instead of the clock.
  const seek = useSeekTime();
  const raw = seek === null ? live : stepAt(seek * 1000, index);
  // Before its start delay (-1) a letter rests on its final face.
  const step = solid || raw === null || raw === 'idle' || raw < 0 ? null : raw;

  // The slot is sized by the final face (invisible), so the word keeps the same
  // width, and stays centred, while the shifting glyph swaps faces on top.
  // Wide faces would spill into the neighbours: shrink the glyph to its slot.
  const slot = useRef<HTMLSpanElement>(null);
  // The 3D word (Letters3D) mirrors this exactly: fit by the glyph's advance,
  // jump in size about the slot centre.
  const glyph = useRef<HTMLSpanElement>(null);
  const ink = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const g = glyph.current;
    const box = slot.current;
    const text = ink.current;
    if (!g || !box || !text || step === null || morph) return;
    const fit = () => {
      const k = Math.min(1, box.offsetWidth / Math.max(1, text.offsetWidth));
      g.style.transform = `scale(${k * scaleAt(step, index)})`;
    };
    fit();
    // A face still loading measures with its fallback: fit again once it lands.
    let live = true;
    void document.fonts.ready.then(() => live && fit());
    return () => {
      live = false;
    };
  }, [step, index, morph]);

  // Morphing: the shifting glyph is drawn on a canvas, lerped between the
  // outlines of this step's face and the next and posed exactly as the font
  // glyph was. Numbers only per frame: no path strings, no garbage.
  const canvas = useRef<HTMLCanvasElement>(null);
  const shifting = step !== null;
  useLayoutEffect(() => {
    const el = canvas.current;
    const box = slot.current;
    const ctx = el?.getContext('2d');
    if (!morph || !shifting || !el || !box || !ctx) return;
    const track = morphTrack(morph, char);
    const phase: MorphPhase = { step: 0, e: 0 };
    const pose: MorphPose = { k: 1, y: 0 };
    const shadows = shadowLayers(box);
    const dpr = Math.min(devicePixelRatio || 1, 3);
    let w = 0;
    let h = 0;
    let pad = 0;
    let fontPx = 16;
    let finalBase = 0;
    let color = '';
    // Layout reads, once per step and on resize, never per frame.
    const measure = () => {
      w = box.offsetWidth;
      h = box.offsetHeight;
      const css = getComputedStyle(box);
      fontPx = parseFloat(css.fontSize) || 16;
      color = css.color;
      const mark = box.querySelector<HTMLElement>('[data-base]');
      finalBase = (mark?.offsetTop ?? h) - h / 2;
      // Room around the slot for a glyph wider than it and its shadows.
      pad = Math.ceil(fontPx * 0.6);
      el.style.left = el.style.top = `${-pad}px`;
      el.style.width = `${w + pad * 2}px`;
      el.style.height = `${h + pad * 2}px`;
      el.width = Math.round((w + pad * 2) * dpr);
      el.height = Math.round((h + pad * 2) * dpr);
    };
    measure();
    let lastStep = -1;
    let lastE = -1;
    let lastFrom = -1;
    let lastTo = -1;
    const paint = (now: number, force = false) => {
      const seekAt = seekTime();
      const ms = seekAt === null ? now - t0.current : seekAt * 1000;
      // Past the lock (React swaps in the final letter next): hold the end.
      if (!morphAt(ms, index, phase)) {
        phase.step = Math.max(lastStep, 0);
        phase.e = 1;
      }
      const toFinal = planStep(morph, track, phase, index, FINAL[index], low);
      if (
        !force &&
        phase.step === lastStep &&
        phase.e === lastE &&
        track.from === lastFrom &&
        track.to === lastTo
      )
        return;
      lastStep = phase.step;
      lastE = phase.e;
      lastFrom = track.from;
      lastTo = track.to;
      blendMorph(track, phase.e);
      morphPose(morph, track, index, phase.e, toFinal, w, h, fontPx, finalBase, pose);
      const k = fontPx * pose.k;
      const ox = pad + w / 2;
      const oy = pad + h / 2 + pose.y;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w + pad * 2, h + pad * 2);
      ctx.beginPath();
      const out = track.out;
      const n = track.n;
      for (let s = 0; s < track.slots; s++) {
        if (!track.live[s]) continue;
        const at = s * n * 2;
        ctx.moveTo(ox + out[at] * k, oy - out[at + 1] * k);
        for (let i = 1; i < n; i++)
          ctx.lineTo(ox + out[at + i * 2] * k, oy - out[at + i * 2 + 1] * k);
        ctx.closePath();
      }
      ctx.fillStyle = color;
      for (const l of shadows) {
        ctx.shadowColor = l.color;
        ctx.shadowOffsetX = l.x * dpr;
        ctx.shadowOffsetY = l.y * dpr;
        ctx.shadowBlur = l.blur * dpr;
        ctx.fill();
      }
      ctx.shadowColor = 'transparent';
      ctx.fill();
    };
    const resize = () => {
      measure();
      paint(performance.now(), true);
    };
    paint(performance.now(), true);
    addEventListener('resize', resize);
    const stop = seekTime() === null ? addPainter(paint) : () => {};
    return () => {
      stop();
      removeEventListener('resize', resize);
    };
    // A new run or concept restyles the letter: measure and draw afresh.
  }, [morph, shifting, char, index, low, run, variant]);

  return (
    <span
      ref={slot}
      className={cn(
        'vy-letter relative inline-block leading-none',
        live === null && seek === null && 'vy-letter-locked',
      )}
    >
      <span className={cn(INTRO_FINAL[index], step !== null && 'invisible')}>
        {char}
        {/* Marks the final glyph's baseline for the 3D word's layout. */}
        <span data-base className="inline-block h-0 w-0" />
      </span>
      {step !== null && morph && (
        <canvas ref={canvas} aria-hidden="true" className="pointer-events-none absolute" />
      )}
      {step !== null && !morph && (
        <span
          ref={glyph}
          aria-hidden="true"
          className={cn('absolute inset-0 flex items-end justify-center', fontAt(step, index))}
        >
          <span ref={ink}>{char}</span>
        </span>
      )}
    </span>
  );
};

/*
 * Mixed-type title card: "variantly" spelled in nine mismatched typefaces,
 * each letter flickering through variants before it settles. It plays on
 * load and again whenever the concept switches (clicking does not replay).
 */
export const VariantTitle = () => {
  const [run, setRun] = useState(0);
  const word = useRef<HTMLDivElement>(null);
  // performance.now() when the current reveal started, shared with the 3D word.
  const clock = useRef(0);
  // The 2D word shows first; three.js loads when the browser is idle, and the
  // 3D word crossfades in over it. The HTML word stays for screen readers and
  // as the fallback when WebGL is unavailable.
  const [want3d, setWant3d] = useState(false);
  const [solid, setSolid] = useState(false);
  const onReady = useCallback(() => setSolid(true), []);
  const onFail = useCallback(() => {
    setSolid(false);
    setWant3d(false);
    if (seekTime() !== null) releaseMorphed();
  }, []);
  const variant = useVariant();
  // Each reveal starts once its outlines are in (preloaded, at most
  // MORPH_WAIT ms), or plays the font-swapping reveal throughout: it never
  // changes mode mid-run. The low power tier is read once, here. Reduced
  // motion shows the final lockup and never fetches the outlines.
  const [stage, setStage] = useState<{ run: number; morph: MorphData | null; low: boolean }>();
  useEffect(() => {
    if (calmMotion()) return;
    let live = true;
    const seek = seekTime() !== null;
    const wait = new Promise<null>((done) => setTimeout(() => done(null), MORPH_WAIT));
    const data = loadMorph().catch(() => null);
    void (seek ? data : Promise.race([data, wait])).then((morph) => {
      if (!live) return;
      clock.current = performance.now();
      const low = !seek && document.documentElement.dataset.perf === 'low';
      setStage({ run, morph, low });
    });
    return () => {
      live = false;
    };
  }, [run]);
  const go = stage?.run === run;
  useEffect(() => {
    if (!variant) return;
    if (!canWebGL()) {
      if (seekTime() !== null) releaseMorphed();
      return;
    }
    const go = () => setWant3d(true);
    if (seekTime() !== null) {
      queueMicrotask(go);
      return;
    }
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(go, { timeout: 2500 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(go, 1200);
    return () => clearTimeout(id);
  }, [variant]);
  useEffect(
    // A new concept gets its own title reveal.
    () =>
      useSiteStore.subscribe((s, prev) => {
        if (prev.hydrated && s.variant !== prev.variant) setRun((r) => r + 1);
      }),
    [],
  );
  return (
    <div
      data-hero-title
      // Sized for the 3D word from first paint, so the hero never grows when
      // it takes over.
      className="vy-card border-slate-line relative grid min-h-[clamp(180px,34vw,460px)] place-items-center overflow-hidden border-b px-4 py-14 sm:py-20"
    >
      <div
        ref={word}
        role="img"
        aria-label="variantly"
        className={cn(
          'vy-title relative z-1 flex items-end gap-[0.12em] text-[clamp(2.5rem,16vw,11rem)]',
          solid && 'vy-title-solid',
        )}
      >
        {[...WORD].map((c, i) => (
          <Letter
            key={i}
            char={c}
            index={i}
            run={run}
            solid={solid}
            go={go}
            morph={go ? stage.morph : null}
            low={go && stage.low}
            variant={variant}
          />
        ))}
      </div>
      {want3d && (
        <Letters3D
          run={stage?.run ?? -1}
          low={!!stage?.low}
          clock={clock}
          title={word}
          onReady={onReady}
          onFail={onFail}
        />
      )}
    </div>
  );
};
