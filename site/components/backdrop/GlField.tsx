'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

import { calmMotion } from '@/lib/prefs';
import { releaseFrame, seekTime } from '@/lib/seek';

import { SCENES } from './scenes';
import type { SceneKind } from './variants';

type GlFieldProps = { scene: SceneKind; colors: string[] };

/* Hosts one variant's three.js scene; seeks to ?t in seekreel renders. */
export const GlField = ({ scene: kind, colors }: GlFieldProps) => {
  const host = useRef<HTMLDivElement>(null);
  const key = colors.join();

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const seek = seekTime();
    const phone = innerWidth < 640;
    const renderer = new THREE.WebGLRenderer({
      // Phones: no MSAA and 1x pixels; the grain hides the difference.
      antialias: !phone,
      alpha: true,
      // Only seekreel captures need the frame kept after compositing.
      preserveDrawingBuffer: seek !== null,
      powerPreference: phone ? 'low-power' : 'default',
    });
    renderer.setPixelRatio(innerWidth < 640 ? 1 : Math.min(devicePixelRatio, 1.5));
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const { camera, update } = SCENES[kind](scene, key.split(','));

    const size = () => {
      const { clientWidth: w, clientHeight: h } = el;
      renderer.setSize(w, h);
      if (camera instanceof THREE.PerspectiveCamera) camera.aspect = w / h;
      if (camera instanceof THREE.OrthographicCamera) {
        const half = (5 * w) / h;
        camera.left = -half;
        camera.right = half;
      }
      (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    };
    size();
    // A resize clears the canvas; a still scene has to repaint itself.
    const resize = () => {
      size();
      if (still) renderer.render(scene, camera);
    };
    addEventListener('resize', resize);

    let px = 0;
    let ease = 0;
    const move = (e: PointerEvent) => (px = e.clientX / innerWidth - 0.5);
    addEventListener('pointermove', move);

    // Phones get one painted frame of the scene: a moving full-screen WebGL
    // layer behind scrolling content is the costliest thing on the page there.
    const still = seek !== null || phone || calmMotion();
    let raf = 0;
    const t0 = performance.now();
    const html = document.documentElement;
    const tick = () => {
      // Hidden tab, or scrolled past the hero where the scene is a faint wash:
      // keep the loop alive but skip the GPU work.
      if (!still && (document.hidden || html.hasAttribute('data-scrolled'))) {
        raf = requestAnimationFrame(tick);
        return;
      }
      ease += (px * 0.3 - ease) * 0.04;
      update(seek ?? (still ? 6 : (performance.now() - t0) / 1000), ease);
      renderer.render(scene, camera);
      if (!still) raf = requestAnimationFrame(tick);
    };
    tick();
    if (seek !== null) releaseFrame('gl');
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('resize', resize);
      removeEventListener('pointermove', move);
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [kind, key]);

  return <div ref={host} className="absolute inset-0" aria-hidden="true" />;
};
