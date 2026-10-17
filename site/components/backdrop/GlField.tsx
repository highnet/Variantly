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
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
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
    addEventListener('resize', size);

    let px = 0;
    let ease = 0;
    const move = (e: PointerEvent) => (px = e.clientX / innerWidth - 0.5);
    addEventListener('pointermove', move);

    const seek = seekTime();
    const still = seek !== null || calmMotion();
    let raf = 0;
    const t0 = performance.now();
    const tick = () => {
      ease += (px * 0.3 - ease) * 0.04;
      update(seek ?? (still ? 6 : (performance.now() - t0) / 1000), ease);
      renderer.render(scene, camera);
      if (!still) raf = requestAnimationFrame(tick);
    };
    tick();
    if (seek !== null) releaseFrame('gl');
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('resize', size);
      removeEventListener('pointermove', move);
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [kind, key]);

  return <div ref={host} className="absolute inset-0" aria-hidden="true" />;
};
