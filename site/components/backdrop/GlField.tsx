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

type GlFieldProps = { concept: ConceptId; theme: 'light' | 'dark'; grain: number };

/*
 * Film grain applied to what the scene drew, not the whole screen: the pass
 * scales each pixel by (1 + noise), so empty (transparent) and dark areas stay
 * clean and only the shapes pick up texture. Alpha is left untouched.
 */
const grainPass = (amount: number) => {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms: { uAmount: { value: amount } },
      vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `
        uniform float uAmount;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main() { gl_FragColor = vec4(vec3(hash(floor(gl_FragCoord.xy)) * uAmount), 0.0); }
      `,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.DstColorFactor,
      blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.ZeroFactor,
      blendDstAlpha: THREE.OneFactor,
    }),
  );
  mesh.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(mesh);
  return { scene, camera: new THREE.Camera() };
};

/*
 * Hosts the active concept's three.js scene (concepts/<id>/scene.ts, loaded
 * on demand); seeks to ?t in seekreel renders. Every concept inherits the
 * same budget: phones, calm motion and the low perf tier paint one still
 * frame; elsewhere it runs at ~24fps only while the hero shows, the tab is
 * visible and the title is not busy animating ('vy:gl-busy').
 */
export const GlField = ({ concept, theme, grain }: GlFieldProps) => {
  const host = useRef<HTMLDivElement>(null);
  // The scene on screen. A concept or theme change builds the next one beside
  // it and retires this one only once the next has drawn and faded in, so a
  // swap never shows an empty frame.
  const shown = useRef<(() => void) | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let dead = false;
    const seek = seekTime();
    void CONCEPT_LOADERS[concept]
      .scene()
      .then(({ scene }) => {
        if (dead) return;
        const prev = shown.current;
        shown.current = run(el, scene, scene.colors[theme], seek, grain, !!prev) ?? null;
        if (!prev) return;
        // Retire the old scene after the new one's fade (FADE_MS).
        if (seek !== null || calmMotion()) prev();
        else setTimeout(prev, FADE_MS * 0.6 + 50);
      })
      .catch(() => {
        markLoaded('scene');
        if (seek !== null) releaseFrame('gl');
      });
    return () => {
      dead = true;
    };
  }, [concept, theme, grain]);

  useEffect(
    () => () => {
      shown.current?.();
      shown.current = null;
    },
    [],
  );

  return <div ref={host} className="absolute inset-0" aria-hidden="true" />;
};

// The canvas fades in instead of popping, on load and on every swap.
const FADE_MS = 450;

const run = (
  el: HTMLDivElement,
  def: ConceptScene,
  colors: string[],
  seek: number | null,
  grain: number,
  swap: boolean,
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
  // Stacked, so an outgoing scene can stay under the incoming one.
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
  const fade = seek === null && !calmMotion();
  el.appendChild(canvas);
  const scene = new THREE.Scene();
  const { camera, update } = def.build(scene, colors);
  const film = grain > 0 ? grainPass(grain) : null;

  // Phones get one painted frame of the scene: a moving full-screen WebGL
  // layer behind scrolling content is the costliest thing on the page there.
  const still = seek !== null || phone || calmMotion() || perfTier() === 'low';
  const t0 = performance.now();
  const draw = () => {
    update(seek ?? (still ? 6 : (performance.now() - t0) / 1000), 0);
    renderer.render(scene, camera);
    if (film) {
      renderer.autoClear = false;
      renderer.render(film.scene, film.camera);
      renderer.autoClear = true;
    }
  };

  // Sized to its host (fixed, full viewport): drawing-buffer size, pixel
  // ratio (re-clamped, so a DPR or zoom change never leaves it blurry or
  // oversized) and the camera's projection, keeping the orthographic
  // camera's own height. The scene itself is never rebuilt.
  const half = camera instanceof THREE.OrthographicCamera ? (camera.top - camera.bottom) / 2 : 0;
  let sized = { w: 0, h: 0, dpr: 0 };
  const size = () => {
    const { clientWidth: w, clientHeight: h } = el;
    const dpr = glTier(0.55).pixelRatio;
    if (!w || !h || (w === sized.w && h === sized.h && dpr === sized.dpr)) return false;
    sized = { w, h, dpr };
    if (dpr !== renderer.getPixelRatio()) renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    if (camera instanceof THREE.OrthographicCamera) {
      camera.left = (-half * w) / h;
      camera.right = (half * w) / h;
      camera.updateProjectionMatrix();
    }
    return true;
  };
  size();
  // Resizing clears the drawing buffer, so every resize repaints at once,
  // running loop or still frame alike (no blank frame until the next tick).
  // Batched to one per frame: a drag or rotation fires many.
  let pending = 0;
  const resize = () => {
    if (pending) return;
    pending = requestAnimationFrame(() => {
      pending = 0;
      if (size()) draw();
    });
  };
  const ro = new ResizeObserver(resize);
  ro.observe(el);
  // Zoom and DPR changes resize nothing the observer sees.
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
  if (fade) {
    // First draw lands, then the canvas fades up (the opacity is composited,
    // so it costs no repaint). A swap fades faster: the wipe already moves.
    canvas.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: swap ? FADE_MS * 0.6 : FADE_MS,
      easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
    });
  }
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
    cancelAnimationFrame(pending);
    ro.disconnect();
    mo.disconnect();
    document.removeEventListener('visibilitychange', sync);
    document.removeEventListener('vy:gl-busy', onBusy);
    document.removeEventListener('vy:perf', sync);
    removeEventListener('resize', resize);
    removeEventListener('pointermove', move);
    [scene, film?.scene].forEach((sc) =>
      sc?.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        mats.forEach((mat) => {
          Object.values(mat).forEach((v) => v instanceof THREE.Texture && v.dispose());
          mat.dispose();
        });
      }),
    );
    renderer.dispose();
    el.removeChild(canvas);
  };
};
