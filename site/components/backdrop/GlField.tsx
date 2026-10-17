'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

import { glTier, markFallback } from '@/lib/glTier';
import { markLoaded } from '@/lib/loadProgress';
import { calmMotion } from '@/lib/prefs';
import { releaseFrame, seekTime } from '@/lib/seek';

import { CONCEPT_LOADERS, type ConceptId } from '@/concepts';
import type { ConceptScene } from '@/concepts/types';
import { perfTier } from '@/lib/perfTier';

type GlFieldProps = { concept: ConceptId; theme: 'light' | 'dark' };

/*
 * Hosts the active concept's three.js scene (concepts/<id>/scene.ts, loaded
 * on demand); seeks to ?t in seekreel renders. Every concept inherits the
 * same budget: phones, calm motion and the low perf tier paint one still
 * frame; elsewhere it runs at ~24fps only while the hero shows, the tab is
 * visible and the title is not busy animating ('vy:gl-busy').
 */
export const GlField = ({ concept, theme }: GlFieldProps) => {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let stop: (() => void) | null = null;
    let dead = false;
    const seek = seekTime();
    void CONCEPT_LOADERS[concept]
      .scene()
      .then(({ scene }) => {
        if (!dead) stop = run(el, scene, scene.colors[theme], seek) ?? null;
      })
      .catch(() => {
        markLoaded('scene');
        if (seek !== null) releaseFrame('gl');
      });
    return () => {
      dead = true;
      stop?.();
    };
  }, [concept, theme]);

  return <div ref={host} className="absolute inset-0" aria-hidden="true" />;
};

const run = (
  el: HTMLDivElement,
  def: ConceptScene,
  colors: string[],
  seek: number | null,
): (() => void) | undefined => {
  // A soft full-screen wash: rendered at ~half resolution, which the blur
  // and grain hide completely.
  const tier = glTier(0.55);
  const phone = tier.coarse || innerWidth < 640;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: tier.antialias,
      alpha: true,
      // Only seekreel captures need the frame kept after compositing.
      preserveDrawingBuffer: seek !== null,
      powerPreference: phone ? 'low-power' : 'default',
    });
  } catch {
    // No WebGL: the CSS blobs carry the backdrop alone.
    markFallback();
    markLoaded('scene');
    if (seek !== null) releaseFrame('gl');
    return;
  }
  renderer.setPixelRatio(tier.pixelRatio);
  const canvas = renderer.domElement;
  canvas.style.width = canvas.style.height = '100%';
  el.appendChild(canvas);
  const scene = new THREE.Scene();
  const { camera, update } = def.build(scene, colors);

  // Phones get one painted frame of the scene: a moving full-screen WebGL
  // layer behind scrolling content is the costliest thing on the page there.
  const still = seek !== null || phone || calmMotion() || perfTier() === 'low';
  const t0 = performance.now();
  const draw = () => {
    update(seek ?? (still ? 6 : (performance.now() - t0) / 1000), 0);
    renderer.render(scene, camera);
  };

  const size = () => {
    const { clientWidth: w, clientHeight: h } = el;
    renderer.setSize(w, h, false);
    if (camera instanceof THREE.PerspectiveCamera) camera.aspect = w / h;
    if (camera instanceof THREE.OrthographicCamera) {
      const half = (5 * w) / h;
      camera.left = -half;
      camera.right = half;
    }
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  };
  size();
  // A resize clears the canvas; a resting scene has to repaint itself.
  const resize = () => {
    size();
    if (!raf) draw();
  };
  addEventListener('resize', resize);

  // Desktop parallax is a CSS transform on the canvas, not a re-render.
  const move = (e: PointerEvent) => {
    const x = (e.clientX / innerWidth - 0.5) * -24;
    canvas.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0) scale(1.04)`;
  };
  if (!still) {
    canvas.style.transition = 'transform 1.2s cubic-bezier(0.2, 0.7, 0.2, 1)';
    addEventListener('pointermove', move, { passive: true });
  }

  // Run only while it shows: the tab is visible and the hero is in view
  // (past it the scene is a faint wash). Otherwise cancel the loop outright.
  let raf = 0;
  const html = document.documentElement;
  // The drift is slow ambient motion: ~24fps is indistinguishable from 60
  // under the blur and leaves the main thread and GPU idle most frames.
  let last = 0;
  const tick = (now: number) => {
    if (now - last >= 1000 / 24) {
      last = now;
      draw();
    }
    raf = requestAnimationFrame(tick);
  };
  // The hero title asks for the frame budget while it animates.
  let busy = false;
  const onBusy = (e: Event) => {
    busy = !!(e as CustomEvent<{ busy: boolean }>).detail?.busy;
    sync();
  };
  const sync = () => {
    const visible =
      !document.hidden &&
      !html.hasAttribute('data-scrolled') &&
      !html.hasAttribute('data-swapping') &&
      !busy &&
      perfTier() !== 'low';
    if (visible && !raf) raf = requestAnimationFrame(tick);
    if (!visible && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
  draw();
  markLoaded('scene');
  const mo = new MutationObserver(sync);
  if (!still) {
    sync();
    document.addEventListener('visibilitychange', sync);
    document.addEventListener('vy:gl-busy', onBusy);
    document.addEventListener('vy:perf', sync);
    mo.observe(html, { attributes: true, attributeFilter: ['data-scrolled', 'data-swapping'] });
  }
  if (seek !== null) releaseFrame('gl');
  return () => {
    cancelAnimationFrame(raf);
    mo.disconnect();
    document.removeEventListener('visibilitychange', sync);
    document.removeEventListener('vy:gl-busy', onBusy);
    document.removeEventListener('vy:perf', sync);
    removeEventListener('resize', resize);
    removeEventListener('pointermove', move);
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      mats.forEach((mat) => {
        Object.values(mat).forEach((v) => v instanceof THREE.Texture && v.dispose());
        mat.dispose();
      });
    });
    renderer.dispose();
    el.removeChild(canvas);
  };
};
