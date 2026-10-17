'use client';

import { useEffect, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { FontLoader, type Font } from 'three/examples/jsm/loaders/FontLoader.js';

import type { VariantKey } from '@/components/backdrop/variants';
import { glTier, markFallback } from '@/lib/glTier';
import { INTRO_FINAL, INTRO_FONTS } from '@/lib/introFonts';
import { disposePool, lookPool, type LetterLook } from '@/lib/letterLook';
import { calmMotion } from '@/lib/prefs';
import { releaseFrame, seekTime } from '@/lib/seek';
import { faceAt, stepAt } from '@/lib/titleTiming';

const WORD = 'variantly';
// The 3D wardrobe is the 2D title's: the same Google faces in the same
// order, extruded from typeface JSON built by scripts/build-3d-fonts.mjs
// (only the letters of "variantly"; licences in public/fonts/3d).
const FACE_COUNT = INTRO_FONTS.length;
// The 3D lockup matches the 2D one letter for letter.
const FINAL = INTRO_FINAL.map((c) => INTRO_FONTS.indexOf(c));
// The lockup is mismatched in surface too; neighbours never share a look.
const finalLook = (i: number, n: number) => (i * 5 + 1) % n;
// Surface per flicker step: the same deterministic hash as the faces (on a
// shifted index), so seeked frames are reproducible.
const lookAt = (step: number, i: number, n: number) => faceAt(step, i + 11, n);
// Never above 1, so a shifting glyph stays inside its slot.
const scaleAt = (step: number, i: number) => 0.72 + (((step * 13 + i * 29) % 9) / 8) * 0.28;
const FOV = 22;
const TAN = Math.tan((FOV / 2) * (Math.PI / 180));

type Letter = {
  ch: string;
  mesh: THREE.Mesh;
  extra: THREE.Mesh;
  face: number;
  look: number;
  lockedAt: number;
};

type Letters3DProps = {
  run: number;
  // performance.now() when the current reveal started, shared with the 2D title.
  clock: RefObject<number>;
  onReady: () => void;
  onFail: () => void;
};

/*
 * The "variantly" title as extruded letters with the same reveal as the 2D
 * card: every letter shape-shifts through the 3D wardrobe, then locks into a
 * mismatched lockup. Each concept dresses the letters in its own surface
 * shader pool (lib/letterLook): each flicker step is a face and a surface, and
 * the lockup is mismatched in both. Pools swap in place on concept/theme change.
 * The loop renders only while letters move and the card is visible; the
 * desktop cursor tilt is a CSS transform, so a settled word draws no frames.
 */
export const Letters3D = ({ run, clock, onReady, onFail }: Letters3DProps) => {
  const host = useRef<HTMLDivElement>(null);
  const replay = useRef(() => {});

  useEffect(() => replay.current(), [run]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let raf = 0;
    const cleanups: (() => void)[] = [];
    const tier = glTier();
    const phone = tier.coarse || innerWidth < 640;
    const seek = seekTime();
    const still = calmMotion();
    // Fetch the lock-in faces while the renderer spins up.
    const loader = new FontLoader();
    const fonts: (Font | undefined)[] = [];
    const load = (f: number) =>
      loader.loadAsync(`/fonts/3d/${f}.json`).then((font) => (fonts[f] = font));
    // The lock-in faces first; the rest of the wardrobe trickles in after.
    const finals = [...new Set(FINAL)];
    const lockIn = Promise.all(finals.map(load));
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
      markFallback();
      onFail();
      return;
    }
    renderer.setPixelRatio(tier.pixelRatio);
    // Neutral tone mapping keeps the candy colours saturated under the studio light.
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 0.9;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    // The studio environment only lights three's PBR looks (candy, foil); it
    // is built the first time a pool needs it.
    let envMap: THREE.Texture | null = null;
    const lightStudio = () => {
      if (envMap) return;
      const pmrem = new THREE.PMREMGenerator(renderer);
      envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
      scene.environment = envMap;
      scene.environmentIntensity = 0.55;
    };
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);
    const key = new THREE.DirectionalLight('#ffffff', 1.4);
    key.position.set(-4, 6, 8);
    scene.add(key);
    const rim = new THREE.DirectionalLight('#22c3ee', 1.2);
    rim.position.set(6, -2, -4);
    scene.add(rim);
    const group = new THREE.Group();
    scene.add(group);

    // Word width in scene units, known once the lock-in faces load.
    let wordW = 18;
    const size = () => {
      const { clientWidth: w, clientHeight: h } = el;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      // Fill ~92% of a phone card (~78% on desktop), and keep the letters'
      // height (plus bob and pop) inside the card.
      const fill = phone ? 0.92 : 0.78;
      camera.position.z = Math.max(wordW / fill / (2 * TAN * camera.aspect), 3.4 / (2 * TAN));
      camera.updateProjectionMatrix();
    };
    size();
    const paint = () => renderer.render(scene, camera);

    // Pause for real (no idle rAF) when the tab hides or the card leaves the screen.
    let onScreen = true;
    const visible = () => seek !== null || (!document.hidden && onScreen);
    let wake = () => {};
    const vis = () => {
      if (visible()) return wake();
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      vis();
    });
    io.observe(el.parentElement ?? el);
    document.addEventListener('visibilitychange', vis);
    // A resize clears the canvas: repaint once even when settled.
    const resize = () => {
      size();
      paint();
    };
    addEventListener('resize', resize);
    cleanups.push(
      () => io.disconnect(),
      () => document.removeEventListener('visibilitychange', vis),
      () => removeEventListener('resize', resize),
    );

    // Desktop: the word leans toward the cursor via a CSS transform with a
    // transition, so following the pointer costs no WebGL frames.
    if (!phone && !still && seek === null) {
      const move = (e: PointerEvent) => {
        const x = (e.clientX / innerWidth - 0.5) * 14;
        const y = (e.clientY / innerHeight - 0.5) * -10;
        el.style.transform = `perspective(900px) rotateX(${y.toFixed(2)}deg) rotateY(${x.toFixed(2)}deg)`;
      };
      addEventListener('pointermove', move, { passive: true });
      cleanups.push(() => removeEventListener('pointermove', move));
    }

    void lockIn.then(() => {
      if (disposed) return;
      const rest = [...Array(FACE_COUNT).keys()].filter((f) => !finals.includes(f));
      const next = () => {
        const f = rest.shift();
        if (f !== undefined && !disposed) void load(f).then(() => requestIdleCallbackSafe(next));
      };
      requestIdleCallbackSafe(next);

      // One centred geometry per (letter, face), built on first use.
      const cache = new Map<string, { geo: THREE.BufferGeometry; w: number }>();
      const glyph = (ch: string, f: number) => {
        const k = `${ch}${f}`;
        let g = cache.get(k);
        if (!g) {
          const geo = new TextGeometry(ch, {
            font: fonts[f]!,
            size: 2,
            depth: 0.45,
            curveSegments: phone ? 5 : 8,
            bevelEnabled: true,
            bevelThickness: 0.12,
            bevelSize: 0.07,
            bevelSegments: phone ? 2 : 4,
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
      // A face still loading stands in with a loaded one.
      const ready = (f: number, i: number) => (fonts[f] ? f : FINAL[(i + f) % FINAL.length]);
      // Space between letter slots, wide enough that tilts, bevels and the
      // lock-in pop never make neighbours touch (slots are sized by the final
      // faces, so the word keeps its width while letters shift).
      const gap = phone ? 0.55 : 0.75;
      const widths = [...WORD].map((ch, i) => glyph(ch, FINAL[i]).w);
      wordW = widths.reduce((a, b) => a + b, 0) + gap * (WORD.length - 1);
      size();
      let x = -wordW / 2;
      const letters: Letter[] = [...WORD].map((ch, i) => {
        const geo = glyph(ch, FINAL[i]).geo;
        const mesh = new THREE.Mesh(geo);
        const extra = new THREE.Mesh(geo);
        extra.renderOrder = -1;
        mesh.add(extra);
        mesh.position.x = x + widths[i] / 2;
        x += widths[i] + gap;
        group.add(mesh);
        return { ch, mesh, extra, face: FINAL[i], look: -1, lockedAt: -1 };
      });

      // Dress the letters for the current concept and theme; old materials go.
      const html = document.documentElement;
      let pool: LetterLook[] = [];
      const wear = (l: Letter, k: number) => {
        if (l.look === k) return;
        const look = pool[k];
        l.look = k;
        l.mesh.material = look.body;
        l.extra.visible = !!look.extra;
        if (look.extra) l.extra.material = look.extra;
        l.extra.position.set(...look.offset);
      };
      const dress = () => {
        const variant = (html.dataset.variant ?? 'g') as VariantKey;
        const dark = html.dataset.theme === 'dark';
        disposePool(pool);
        pool = lookPool(variant, dark, phone);
        if (pool.some((l) => l.env)) lightStudio();
        // Warm every look's shader now, so swapping looks mid-flicker never
        // compiles: wear them across the letters, compile, then settle.
        letters.forEach((l, i) => {
          l.look = -1;
          wear(l, i % pool.length);
        });
        renderer.compile(scene, camera);
        letters.forEach((l, i) => {
          l.look = -1;
          wear(l, l.lockedAt >= 0 ? finalLook(i, pool.length) : lookAt(0, i, pool.length));
        });
        paint();
      };
      dress();
      const mo = new MutationObserver(dress);
      mo.observe(html, { attributes: true, attributeFilter: ['data-variant', 'data-theme'] });
      cleanups.push(
        () => mo.disconnect(),
        () => disposePool(pool),
        () => cache.forEach((g) => g.geo.dispose()),
      );

      const frame = () => {
        raf = 0;
        const t = seek ?? (still ? 30 : (performance.now() - clock.current) / 1000);
        // Building an extruded glyph is the expensive part: at most one new
        // one per frame on phones, two on desktop (seeked frames build all).
        let budget = seek === null ? (phone ? 1 : 2) : Infinity;
        letters.forEach((l, i) => {
          const step = stepAt(t * 1000, i);
          let face = step === null ? FINAL[i] : ready(faceAt(Math.max(step, 0), i, FACE_COUNT), i);
          if (face !== l.face) {
            const fresh = !cache.has(`${l.ch}${face}`);
            if (fresh && budget <= 0) face = l.face;
            else {
              if (fresh) budget--;
              l.mesh.geometry = l.extra.geometry = glyph(l.ch, face).geo;
              l.face = face;
            }
          }
          wear(
            l,
            step === null ? finalLook(i, pool.length) : lookAt(Math.max(step, 0), i, pool.length),
          );
          // Shifting glyphs jump in size and shrink to their slot; locked ones pop once.
          const fit = Math.min(1, widths[i] / Math.max(0.1, glyph(l.ch, face).w));
          let s = step === null ? 1 : fit * scaleAt(Math.max(step, 0), i);
          if (step === null) {
            if (l.lockedAt < 0) l.lockedAt = t;
            const k = Math.min(1, (t - l.lockedAt) / 0.45);
            s = 1 + Math.sin(k * Math.PI) * 0.08;
          }
          l.mesh.scale.setScalar(s);
          // A gentle float that eases to rest as each letter lands.
          const calm = step === null ? Math.max(0, 1 - (t - l.lockedAt) / 0.5) : 1;
          l.mesh.position.y = Math.sin(t * 1.4 + i * 0.6) * 0.16 * calm;
          l.mesh.rotation.x = Math.sin(t * 1.1 + i) * 0.07 * calm;
          l.mesh.rotation.y = Math.sin(t * 0.9 + i * 0.8) * 0.05 * calm;
        });
        paint();
        // Once every letter has landed (and popped) the word rests: no more frames.
        const settled = letters.every((l) => l.lockedAt >= 0 && t - l.lockedAt > 0.5);
        if (seek === null && !still && !settled && visible()) raf = requestAnimationFrame(frame);
      };
      wake = () => {
        if (!raf && seek === null && !still) raf = requestAnimationFrame(frame);
      };
      replay.current = () => {
        letters.forEach((l) => (l.lockedAt = -1));
        wake();
      };
      frame();
      el.style.opacity = '1';
      onReady();
      if (seek !== null) releaseFrame('title');
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      replay.current = () => {};
      cleanups.forEach((c) => c());
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) (o.material as THREE.Material).dispose();
      });
      envMap?.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [clock, onReady, onFail]);

  return (
    <div
      ref={host}
      aria-hidden="true"
      className="vy-letters3d absolute inset-0 opacity-0 [transition:opacity_0.5s_ease-out_0.15s,transform_0.7s_ease-out]"
    />
  );
};

const requestIdleCallbackSafe = (cb: () => void) =>
  'requestIdleCallback' in window ? requestIdleCallback(cb, { timeout: 800 }) : setTimeout(cb, 200);
