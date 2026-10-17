'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { FontLoader, type Font } from 'three/examples/jsm/loaders/FontLoader.js';

import { calmMotion } from '@/lib/prefs';
import { releaseFrame, seekTime } from '@/lib/seek';
import { faceAt, stepAt } from '@/lib/titleTiming';

const WORD = 'variantly';
// Space between letter slots, wide enough that tilts, bevels and the lock-in
// pop never make neighbours touch.
const GAP = 0.75;
// The 3D wardrobe: sans, serif, script-ish and mono faces (three.js examples;
// licences beside them in public/fonts).
const FACES = [
  'helvetiker_bold',
  'optimer_bold',
  'gentilis_bold',
  'droid_serif_bold',
  'droid_sans_mono_regular',
  'helvetiker_regular',
  'optimer_regular',
  'gentilis_regular',
  'droid_serif_regular',
];
// Final lockup: deliberately mismatched, like the 2D card.
const FINAL = [3, 0, 2, 4, 1, 0, 3, 2, 1];
const COLOURS = ['#ff2d87', '#6a3dff', '#00b4e6', '#ff9a00', '#13c27a'];
// Never above 1, so a shifting glyph stays inside its slot.
const scaleAt = (step: number, i: number) => 0.72 + (((step * 13 + i * 29) % 9) / 8) * 0.28;

type Letters3DProps = { run: number };

/*
 * The "variantly" title as glossy extruded letters with the same reveal as the
 * 2D card: every letter shape-shifts through the 3D wardrobe at once, sizes
 * jumping, then slows and locks into a mismatched lockup, popping as it lands.
 * Clear-coated candy colours lit by a studio environment; the word floats and
 * tilts toward the cursor. Seeks to ?t for seekreel.
 */
export const Letters3D = ({ run }: Letters3DProps) => {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let stopObserving = () => {};
    let raf = 0;
    const phone = innerWidth < 640;
    const renderer = new THREE.WebGLRenderer({
      // Phones: no MSAA and 1x pixels; the grain hides the difference.
      antialias: !phone,
      alpha: true,
      // Only seekreel captures need the frame kept after compositing.
      preserveDrawingBuffer: seekTime() !== null,
      powerPreference: phone ? 'low-power' : 'default',
    });
    renderer.setPixelRatio(phone ? 1 : Math.min(devicePixelRatio, 2));
    // Neutral tone mapping keeps the candy colours saturated under the studio light.
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 0.9;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.55;
    const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 200);
    const key = new THREE.DirectionalLight('#ffffff', 1.4);
    key.position.set(-4, 6, 8);
    scene.add(key);
    const rim = new THREE.DirectionalLight('#22c3ee', 1.2);
    rim.position.set(6, -2, -4);
    scene.add(rim);
    const group = new THREE.Group();
    scene.add(group);

    const size = () => {
      const { clientWidth: w, clientHeight: h } = el;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      // Visible width is 2·z·tan(fov/2)·aspect; keep ~22 units (the word plus margin).
      camera.position.z = Math.max(21, 22 / (2 * Math.tan((11 * Math.PI) / 180) * (w / h)));
      camera.updateProjectionMatrix();
    };
    size();
    // A settled word has stopped its loop; a resize (a phone's URL bar
    // sliding) clears the canvas, so it paints one more frame.
    let repaint = () => {};
    const resize = () => {
      size();
      repaint();
    };
    addEventListener('resize', resize);
    let px = 0;
    let py = 0;
    const move = (e: PointerEvent) => {
      px = e.clientX / innerWidth - 0.5;
      py = e.clientY / innerHeight - 0.5;
    };
    addEventListener('pointermove', move);

    const loader = new FontLoader();
    void Promise.all(FACES.map((f) => loader.loadAsync(`/fonts/${f}.typeface.json`))).then(
      (fonts: Font[]) => {
        if (disposed) return;
        // One centred geometry per (letter, face), built on first use.
        const cache = new Map<string, { geo: THREE.BufferGeometry; w: number }>();
        const glyph = (ch: string, f: number) => {
          const k = `${ch}${f}`;
          let g = cache.get(k);
          if (!g) {
            const geo = new TextGeometry(ch, {
              font: fonts[f],
              size: 2,
              depth: 0.45,
              curveSegments: innerWidth < 640 ? 5 : 8,
              bevelEnabled: true,
              bevelThickness: 0.12,
              bevelSize: 0.07,
              bevelSegments: innerWidth < 640 ? 2 : 4,
            });
            geo.computeBoundingBox();
            const b = geo.boundingBox!;
            const w = b.max.x - b.min.x;
            geo.translate(-b.min.x - w / 2, -1, -0.22);
            g = { geo, w };
            cache.set(k, g);
          }
          return g;
        };
        // Slots are sized by the final faces, so the word keeps its width (and
        // stays centred) while letters shift.
        const widths = [...WORD].map((ch, i) => glyph(ch, FINAL[i]).w);
        const total = widths.reduce((a, b) => a + b, 0) + GAP * (WORD.length - 1);
        let x = -total / 2;
        const letters = [...WORD].map((ch, i) => {
          const mesh = new THREE.Mesh(
            glyph(ch, FINAL[i]).geo,
            // Clearcoat is a second lighting pass per pixel; phones skip it.
            phone
              ? new THREE.MeshStandardMaterial({
                  color: COLOURS[i % COLOURS.length],
                  roughness: 0.18,
                  metalness: 0.05,
                })
              : new THREE.MeshPhysicalMaterial({
                  color: COLOURS[i % COLOURS.length],
                  roughness: 0.22,
                  metalness: 0.05,
                  clearcoat: 1,
                  clearcoatRoughness: 0.08,
                }),
          );
          mesh.position.x = x + widths[i] / 2;
          x += widths[i] + GAP;
          group.add(mesh);
          return { ch, mesh, face: FINAL[i], lockedAt: -1 };
        });

        const seek = seekTime();
        const still = calmMotion();
        const t0 = performance.now();
        let tx = 0;
        let ty = 0;
        const card = el.parentElement;
        let onScreen = true;
        const io = new IntersectionObserver(([e]) => (onScreen = e.isIntersecting));
        if (card) io.observe(card);
        stopObserving = () => io.disconnect();
        const frame = () => {
          // Off screen or in a hidden tab: skip the render, keep the clock.
          if (seek === null && !still && (!onScreen || document.hidden)) {
            raf = requestAnimationFrame(frame);
            return;
          }
          const t = seek ?? (still ? 30 : (performance.now() - t0) / 1000);
          // Building an extruded glyph is the expensive part: at most two new
          // ones per frame (seeked frames build all), others swap a frame later.
          let budget = seek === null ? 2 : Infinity;
          letters.forEach((l, i) => {
            const step = stepAt(t * 1000, i);
            let face = step === null ? FINAL[i] : faceAt(Math.max(step, 0), i, FACES.length);
            if (face !== l.face) {
              const fresh = !cache.has(`${l.ch}${face}`);
              if (fresh && budget <= 0) face = l.face;
              else {
                if (fresh) budget--;
                l.mesh.geometry = glyph(l.ch, face).geo;
                l.face = face;
              }
            }
            // Shifting glyphs jump in size and shrink to their slot; locked ones pop once.
            const fit = Math.min(1, widths[i] / Math.max(0.1, glyph(l.ch, face).w));
            let s = step === null ? 1 : fit * scaleAt(Math.max(step, 0), i);
            if (step === null) {
              if (l.lockedAt < 0) l.lockedAt = t;
              const k = Math.min(1, (t - l.lockedAt) / 0.45);
              s = 1 + Math.sin(k * Math.PI) * 0.08;
            }
            l.mesh.scale.setScalar(s);
            l.mesh.position.y = Math.sin(t * 1.4 + i * 0.6) * 0.16;
            l.mesh.rotation.x = Math.sin(t * 1.1 + i) * 0.07;
            l.mesh.rotation.y = Math.sin(t * 0.9 + i * 0.8) * 0.05;
          });
          tx += (py * 0.35 - tx) * 0.06;
          ty += (px * 0.35 - ty) * 0.06;
          group.rotation.set(tx, ty, 0);
          renderer.render(scene, camera);
          // Phones have no cursor to follow: once every letter has landed
          // (and popped), the word rests and the loop stops.
          const settled = phone && letters.every((l) => l.lockedAt >= 0 && t - l.lockedAt > 0.5);
          if (seek === null && !still && !settled) raf = requestAnimationFrame(frame);
          else repaint = () => renderer.render(scene, camera);
        };
        frame();
        if (seek !== null) releaseFrame('title');
      },
    );

    return () => {
      disposed = true;
      stopObserving();
      cancelAnimationFrame(raf);
      removeEventListener('resize', resize);
      removeEventListener('pointermove', move);
      pmrem.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [run]);

  return <div ref={host} aria-hidden="true" className="vy-letters3d absolute inset-0" />;
};
