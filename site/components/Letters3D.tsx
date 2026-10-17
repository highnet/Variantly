'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

import { calmMotion } from '@/lib/prefs';
import { releaseFrame, seekTime } from '@/lib/seek';

const WORD = 'variantly';
// Candy colours, one per letter, cycling.
const COLOURS = ['#ff5fa2', '#7c5cff', '#22c3ee', '#ffb020', '#3ddc97'];

type Letters3DProps = { run: number };

/*
 * The "variantly" title as real extruded letters. Each letter drops in on a
 * stagger with a springy spin (like the 2D title's lock-in), then the word
 * floats in a slow wave and tilts toward the cursor. Seeks to ?t for seekreel.
 */
export const Letters3D = ({ run }: Letters3DProps) => {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let raf = 0;
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0, 14);
    scene.add(new THREE.HemisphereLight('#ffffff', '#7c5cff', 1.6));
    const key = new THREE.DirectionalLight('#ffffff', 2.4);
    key.position.set(-4, 6, 8);
    scene.add(key);
    const rim = new THREE.DirectionalLight('#22c3ee', 1.6);
    rim.position.set(6, -2, -4);
    scene.add(rim);
    const group = new THREE.Group();
    scene.add(group);

    const size = () => {
      const { clientWidth: w, clientHeight: h } = el;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      // Keep the whole word in frame on narrow screens.
      // Visible width is 2·z·tan(fov/2)·aspect; keep ~17 units (the word plus margin).
      camera.position.z = Math.max(14, 17 / (2 * Math.tan((16 * Math.PI) / 180) * (w / h)));
      camera.updateProjectionMatrix();
    };
    size();
    addEventListener('resize', size);
    let px = 0;
    let py = 0;
    const move = (e: PointerEvent) => {
      px = e.clientX / innerWidth - 0.5;
      py = e.clientY / innerHeight - 0.5;
    };
    addEventListener('pointermove', move);

    new FontLoader().load('/fonts/helvetiker_bold.typeface.json', (font) => {
      if (disposed) return;
      const letters: { mesh: THREE.Mesh; x: number }[] = [];
      let cursor = 0;
      [...WORD].forEach((ch, i) => {
        const geo = new TextGeometry(ch, {
          font,
          size: 2,
          depth: 0.7,
          curveSegments: 10,
          bevelEnabled: true,
          bevelThickness: 0.12,
          bevelSize: 0.07,
          bevelSegments: 5,
        });
        geo.computeBoundingBox();
        const box = geo.boundingBox!;
        const w = box.max.x - box.min.x;
        geo.translate(-box.min.x - w / 2, -1, -0.35);
        const mesh = new THREE.Mesh(
          geo,
          new THREE.MeshStandardMaterial({
            color: COLOURS[i % COLOURS.length],
            roughness: 0.28,
            metalness: 0.15,
          }),
        );
        letters.push({ mesh, x: cursor + w / 2 });
        cursor += w + 0.18;
        group.add(mesh);
      });
      letters.forEach((l) => (l.mesh.position.x = l.x - cursor / 2));

      const seek = seekTime();
      const still = calmMotion();
      const t0 = performance.now();
      let tx = 0;
      let ty = 0;
      const frame = () => {
        const t = seek ?? (still ? 10 : (performance.now() - t0) / 1000);
        letters.forEach(({ mesh }, i) => {
          // Drop-in: 0..1 per letter, staggered, with an overshooting spring.
          const k = Math.min(1, Math.max(0, (t - 0.15 - i * 0.09) / 0.9));
          const spring = 1 - Math.exp(-6 * k) * Math.cos(9 * k);
          mesh.position.y = (1 - spring) * 7 + Math.sin(t * 1.4 + i * 0.6) * 0.18 * k;
          mesh.rotation.x = (1 - spring) * -2.4 + Math.sin(t * 1.1 + i) * 0.08;
          mesh.rotation.y = (1 - spring) * 1.6 + Math.sin(t * 0.9 + i * 0.8) * 0.12;
          mesh.scale.setScalar(0.2 + 0.8 * Math.min(1, k * 1.6));
        });
        tx += (py * 0.35 - tx) * 0.06;
        ty += (px * 0.6 - ty) * 0.06;
        group.rotation.set(tx, ty, 0);
        renderer.render(scene, camera);
        if (seek === null && !still) raf = requestAnimationFrame(frame);
      };
      frame();
      if (seek !== null) releaseFrame('title');
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      removeEventListener('resize', size);
      removeEventListener('pointermove', move);
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [run]);

  return <div ref={host} aria-hidden="true" className="vy-letters3d absolute inset-0" />;
};
