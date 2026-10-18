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

type GlFieldProps = {
  concept: ConceptId;
  theme: 'light' | 'dark';
  grain: number;
  chroma: number;
};

/*
 * Film grain on what the scene drew, not the whole screen. After the scene
 * renders, the frame is copied into a texture and redrawn through this pass:
 * each pixel moves by a grain value weighted to its luminance (strongest in
 * midtones, gentle in deep darks and bright highlights), with a little
 * independent per-channel noise for chroma. Colour is un-premultiplied first
 * and alpha kept, so empty (transparent) areas stay clean and soft edges fade
 * the grain with them. The noise is keyed to screen pixels only (no clock),
 * so it never shimmers; on a canvas drawn at ~half resolution each grain is
 * about two CSS pixels across, which reads as a coarse film grain.
 */
const grainPass = (amount: number, chroma: number) => {
  let frame = new THREE.FramebufferTexture(1, 1);
  const res = new THREE.Vector2(1, 1);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms: {
        tFrame: { value: frame },
        uRes: { value: res },
        uAmount: { value: amount },
        uChroma: { value: chroma },
      },
      vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `
        uniform sampler2D tFrame;
        uniform vec2 uRes;
        uniform float uAmount;
        uniform float uChroma;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main() {
          vec4 c = texture2D(tFrame, gl_FragCoord.xy / uRes);
          if (c.a < 0.004) { gl_FragColor = c; return; }
          vec3 rgb = c.rgb / c.a;
          float l = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
          float w = (0.3 + 2.8 * l * (1.0 - l)) * smoothstep(0.0, 0.18, l + 0.04);
          vec2 p = floor(gl_FragCoord.xy);
          // Two hashes summed: a triangular (film-like) distribution in -1..1.
          float n = hash(p) + hash(p + 41.7) - 1.0;
          vec3 ch = vec3(hash(p + 7.3), hash(p + 19.1), hash(p + 29.9)) - 0.5;
          rgb += uAmount * w * (n + uChroma * ch);
          gl_FragColor = vec4(clamp(rgb, 0.0, 1.0) * c.a, c.a);
        }
      `,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending,
    }),
  );
  mesh.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(mesh);
  const camera = new THREE.Camera();
  const size = new THREE.Vector2();
  const material = mesh.material;
  return {
    scene,
    // Re-made at the drawing buffer's size whenever the canvas resizes.
    fit: (renderer: THREE.WebGLRenderer) => {
      renderer.getDrawingBufferSize(size);
      if (size.equals(res)) return;
      res.copy(size);
      frame.dispose();
      frame = new THREE.FramebufferTexture(size.x, size.y);
      material.uniforms.tFrame.value = frame;
    },
    apply: (renderer: THREE.WebGLRenderer) => {
      renderer.copyFramebufferToTexture(frame);
      renderer.render(scene, camera);
    },
    dispose: () => frame.dispose(),
  };
};

/*
 * Hosts the active concept's three.js scene (concepts/<id>/scene.ts, loaded
 * on demand); seeks to ?t in seekreel renders. Every concept inherits the
 * same budget: phones, calm motion and the low perf tier paint one still
 * frame; elsewhere it runs at ~24fps only while the hero shows, the tab is
 * visible and the title is not busy animating ('vy:gl-busy').
 */
export const GlField = ({ concept, theme, grain, chroma }: GlFieldProps) => {
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
        if (!dead) stop = run(el, scene, scene.colors[theme], seek, grain, chroma) ?? null;
      })
      .catch(() => {
        markLoaded('scene');
        if (seek !== null) releaseFrame('gl');
      });
    return () => {
      dead = true;
      stop?.();
    };
  }, [concept, theme, grain, chroma]);

  return <div ref={host} className="absolute inset-0" aria-hidden="true" />;
};

const run = (
  el: HTMLDivElement,
  def: ConceptScene,
  colors: string[],
  seek: number | null,
  grain: number,
  chroma: number,
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
  const film = grain > 0 ? grainPass(grain, chroma) : null;

  // Phones get one painted frame of the scene: a moving full-screen WebGL
  // layer behind scrolling content is the costliest thing on the page there.
  const still = seek !== null || phone || calmMotion() || perfTier() === 'low';
  const t0 = performance.now();
  const draw = () => {
    update(seek ?? (still ? 6 : (performance.now() - t0) / 1000), 0);
    renderer.render(scene, camera);
    if (film) {
      renderer.autoClear = false;
      film.apply(renderer);
      renderer.autoClear = true;
    }
  };

  const size = () => {
    const { clientWidth: w, clientHeight: h } = el;
    renderer.setSize(w, h, false);
    film?.fit(renderer);
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
    film?.dispose();
    renderer.dispose();
    el.removeChild(canvas);
  };
};
