'use client';

import { useEffect, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { FontLoader, type Font } from 'three/examples/jsm/loaders/FontLoader.js';

import type { VariantKey } from '@/components/backdrop/variants';
import { glTier, markFallback } from '@/lib/glTier';
import { INTRO_FINAL, INTRO_FONTS } from '@/lib/introFonts';
import {
  disposePool,
  letterShadow,
  lookPool,
  poolSize,
  type LetterInk,
  type LetterLook,
} from '@/lib/letterLook';
import { calmMotion } from '@/lib/prefs';
import { releaseFrame, seekTime } from '@/lib/seek';
import { faceAt, lockPop, lookAt, scaleAt, stepAt, stepCount } from '@/lib/titleTiming';

const WORD = 'variantly';
// The 3D wardrobe is the 2D title's: the same faces in the same order,
// extruded from typeface JSON built by scripts/build-3d-fonts.mjs (only the
// letters of "variantly"; licences in public/fonts/3d).
const FACE_COUNT = INTRO_FONTS.length;
const FINAL = INTRO_FINAL.map((c) => INTRO_FONTS.indexOf(c));
const FOV = 22;
const TAN = Math.tan((FOV / 2) * (Math.PI / 180));
// TextGeometry size: scene units per em.
const EM = 2;
const DEPTH = 0.3;
const BEVEL = 0.05;
// The shadow-catching backdrop sits this far behind the letters' front faces.
const BACKDROP_Z = -0.6;

type Letter = {
  ch: string;
  // Placed and shaped like the 2D slot (its transform, rotation, skew).
  holder: THREE.Object3D;
  mesh: THREE.Mesh;
  extra: THREE.Mesh;
  face: number;
  look: number;
  lockedAt: number;
};

// Where a 2D slot sits, in px of the card (y down), relative to the slot centre.
type Slot = {
  // Card-space centre of the slot and the linear part of its CSS transform.
  cx: number;
  cy: number;
  m: [number, number, number, number];
  w: number;
  h: number;
  // Baseline of the locked (final) glyph, from the slot centre.
  base: number;
};

type Letters3DProps = {
  run: number;
  // performance.now() when the current reveal started, shared with the 2D title.
  clock: RefObject<number>;
  // The 2D word: the 3D word is laid out over it, letter for letter.
  title: RefObject<HTMLDivElement | null>;
  onReady: () => void;
  onFail: () => void;
};

// The linear part and translation of an element's CSS transform.
const matrixOf = (el: Element) => {
  const t = getComputedStyle(el).transform;
  return t && t !== 'none' ? new DOMMatrixReadOnly(t) : new DOMMatrixReadOnly();
};
// Glyph cache key for (letter, face), a number so frames allocate no strings.
const keyOf = (ch: string, f: number) => ch.charCodeAt(0) * 64 + f;

/*
 * The "variantly" title as extruded letters, a faithful extrusion of the 2D
 * word: same face, size, place, baseline and colour per letter at every step
 * (laid out from the 2D letters' own boxes and transforms), so the 2D word
 * hands off without a jump. Each concept dresses the letters in its surface
 * pool (lib/letterLook), coloured from the 2D letters' CSS, and they cast the
 * concept's shadow on a backdrop just behind them. The loop renders only while
 * letters move and the card is visible; a settled word draws no frames.
 */
export const Letters3D = ({ run, clock, title, onReady, onFail }: Letters3DProps) => {
  const host = useRef<HTMLDivElement>(null);
  const replay = useRef(() => {});

  useEffect(() => replay.current(), [run]);

  useEffect(() => {
    const el = host.current;
    const word = title.current;
    if (!el || !word) return;
    let disposed = false;
    let raf = 0;
    const cleanups: (() => void)[] = [];
    const tier = glTier();
    const phone = tier.coarse || innerWidth < 640;
    const seek = seekTime();
    const still = calmMotion();
    // Every face of the wardrobe, as 3D outlines and as the 2D webfont: the 3D
    // word takes over only once it can show exactly what the 2D word shows.
    const loader = new FontLoader();
    const fonts: Font[] = [];
    const probes = INTRO_FONTS.map((cls) => {
      const p = document.createElement('div');
      p.className = cls;
      p.style.cssText =
        'position:absolute;left:0;top:0;visibility:hidden;font-size:100px;line-height:1;white-space:nowrap';
      p.textContent = 'v';
      const mark = document.createElement('span');
      mark.style.cssText = 'display:inline-block;width:0;height:0';
      p.appendChild(mark);
      el.appendChild(p);
      return { p, mark };
    });
    const allFonts = Promise.all([
      ...INTRO_FONTS.map((_, f) =>
        loader.loadAsync(`/fonts/3d/${f}.json`).then((font) => (fonts[f] = font)),
      ),
      // The webfont itself, not its metric-matched local fallback (which may
      // not exist on this device, and then fails to load).
      ...probes.map(({ p }) =>
        document.fonts
          .load(`100px ${getComputedStyle(p).fontFamily.split(',')[0]}`, 'variantly')
          .catch(() => []),
      ),
    ]);
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        // The title canvas is small, so MSAA is cheap even on phones.
        antialias: true,
        alpha: true,
        // Only seekreel captures need the frame kept after compositing.
        preserveDrawingBuffer: seek !== null,
        powerPreference: phone ? 'low-power' : 'default',
      });
    } catch {
      probes.forEach(({ p }) => p.remove());
      markFallback();
      onFail();
      return;
    }
    // Always at the screen's full density (with MSAA): the word stays sharp
    // while it moves too.
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 3));
    // Neutral tone mapping keeps the candy colours saturated under the studio light.
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 0.9;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    // The studio environment only lights three's PBR looks (candy); it is
    // built the first time a pool needs it.
    let envMap: THREE.Texture | null = null;
    const lightStudio = () => {
      if (envMap) return;
      const pmrem = new THREE.PMREMGenerator(renderer);
      envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
      scene.environment = envMap;
      scene.environmentIntensity = 0.55;
    };
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 400);
    const key = new THREE.DirectionalLight('#ffffff', 1.4);
    key.position.set(-4, 6, 8);
    scene.add(key);
    const rim = new THREE.DirectionalLight('#22c3ee', 1.2);
    rim.position.set(6, -2, -4);
    scene.add(rim);
    // The shadow: a light that adds no light, only casts onto the backdrop.
    const sun = new THREE.DirectionalLight('#ffffff', 0);
    sun.castShadow = true;
    sun.shadow.mapSize.setScalar(phone ? 512 : 1024);
    sun.shadow.bias = -0.002;
    sun.shadow.normalBias = 0.02;
    scene.add(sun, sun.target);
    const backdropMat = new THREE.ShadowMaterial({ transparent: true, depthWrite: false });
    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), backdropMat);
    backdrop.position.z = BACKDROP_Z;
    backdrop.receiveShadow = true;
    scene.add(backdrop);
    const group = new THREE.Group();
    scene.add(group);

    const paint = () => renderer.render(scene, camera);

    // Pause for real (no idle rAF) when the tab hides or the card leaves the screen.
    let onScreen = true;
    const visible = () => seek !== null || (!document.hidden && onScreen);
    let wake = () => {};
    let relayout = () => {};
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
    // A resize moves the 2D word and clears the canvas: follow it, repaint once.
    const resize = () => {
      relayout();
      paint();
    };
    addEventListener('resize', resize);
    cleanups.push(
      () => io.disconnect(),
      () => document.removeEventListener('visibilitychange', vis),
      () => removeEventListener('resize', resize),
      () => probes.forEach(({ p }) => p.remove()),
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

    void allFonts.then(() => {
      if (disposed) return;
      // Where each face's baseline sits in a 1em, line-height 1 box (from the
      // bottom, in em): the 2D shifting glyph is bottom-aligned in its slot.
      const baseOf = probes.map(
        ({ p, mark }) =>
          (p.getBoundingClientRect().bottom - mark.getBoundingClientRect().top) / 100,
      );
      probes.forEach(({ p }) => p.remove());

      // One geometry per (letter, face), built on first use: origin on the
      // baseline at the centre of the advance (where the 2D glyph centres),
      // front face at z = 0, outline exactly the 2D glyph's (the bevel is
      // inset, not grown).
      const cache = new Map<number, { geo: THREE.BufferGeometry; adv: number }>();
      const glyph = (ch: string, f: number) => {
        const k = keyOf(ch, f);
        let g = cache.get(k);
        if (!g) {
          const font = fonts[f];
          const geo = new TextGeometry(ch, {
            font,
            size: EM,
            depth: DEPTH,
            curveSegments: phone ? 5 : 8,
            bevelEnabled: true,
            bevelThickness: BEVEL,
            bevelSize: BEVEL * 0.7,
            bevelOffset: -BEVEL * 0.7,
            bevelSegments: phone ? 1 : 3,
          });
          const data = font.data as unknown as {
            resolution: number;
            glyphs: Record<string, { ha: number }>;
          };
          const adv = (data.glyphs[ch].ha / data.resolution) * EM;
          geo.translate(-adv / 2, 0, -(DEPTH + BEVEL));
          g = { geo, adv };
          cache.set(k, g);
        }
        return g;
      };

      const letters: Letter[] = [...WORD].map((ch, i) => {
        const geo = glyph(ch, FINAL[i]).geo;
        const mesh = new THREE.Mesh(geo);
        mesh.castShadow = true;
        const extra = new THREE.Mesh(geo);
        extra.renderOrder = -1;
        mesh.add(extra);
        const holder = new THREE.Object3D();
        holder.matrixAutoUpdate = false;
        holder.add(mesh);
        group.add(holder);
        return { ch, holder, mesh, extra, face: FINAL[i], look: -1, lockedAt: -1 };
      });

      // Lay the word out over the 2D one. Card px map to scene units at the
      // z = 0 plane (the front faces): 1em of the 2D type = EM units.
      const slots: Slot[] = [];
      let unit = 1;
      let fontPx = 16;
      const layout = () => {
        const W = el.clientWidth;
        const H = el.clientHeight;
        renderer.setSize(W, H);
        fontPx = parseFloat(getComputedStyle(word).fontSize) || 16;
        unit = fontPx / EM;
        camera.aspect = W / H;
        camera.position.z = H / unit / (2 * TAN);
        camera.updateProjectionMatrix();
        // The title's own transform (rotate, skew) about its centre; its
        // scroll parallax is switched off while the 3D word shows.
        const tm = matrixOf(word);
        const tcx = word.offsetLeft + word.offsetWidth / 2;
        const tcy = word.offsetTop + word.offsetHeight / 2;
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        slots.length = 0;
        [...word.children].forEach((node, i) => {
          const s = node as HTMLElement;
          const sm = matrixOf(s);
          const mark = s.querySelector('[data-base]') as HTMLElement | null;
          const w = s.offsetWidth;
          const h = s.offsetHeight;
          // Slot centre (plus its own translation) relative to the title centre.
          const lx = s.offsetLeft + w / 2 - word.offsetWidth / 2 + sm.e;
          const ly = s.offsetTop + h / 2 - word.offsetHeight / 2 + sm.f;
          const m = tm.multiply(sm);
          slots[i] = {
            cx: tcx + tm.a * lx + tm.c * ly + tm.e,
            cy: tcy + tm.b * lx + tm.d * ly + tm.f,
            m: [m.a, m.b, m.c, m.d],
            w,
            h,
            base: (mark?.offsetTop ?? h) - h / 2,
          };
          minX = Math.min(minX, slots[i].cx - w / 2);
          maxX = Math.max(maxX, slots[i].cx + w / 2);
          minY = Math.min(minY, slots[i].cy - h / 2);
          maxY = Math.max(maxY, slots[i].cy + h / 2);
        });
        // Each holder: the slot's centre in scene units, its CSS linear
        // transform with y flipped (CSS y runs down).
        letters.forEach((l, i) => {
          const s = slots[i];
          const [a, b, c, d] = s.m;
          l.holder.matrix.set(
            a,
            -c,
            0,
            (s.cx - W / 2) / unit,
            -b,
            d,
            0,
            -(s.cy - H / 2) / unit,
            0,
            0,
            1,
            0,
            0,
            0,
            0,
            1,
          );
          l.holder.matrixWorldNeedsUpdate = true;
        });
        // A tight shadow frustum around the word, a backdrop to catch it.
        const cx = ((minX + maxX) / 2 - W / 2) / unit;
        const cy = -((minY + maxY) / 2 - H / 2) / unit;
        const r = Math.max(maxX - minX, maxY - minY) / unit / 2 + EM;
        sun.target.position.set(cx, cy, 0);
        const cam = sun.shadow.camera;
        cam.left = cam.bottom = -r;
        cam.right = cam.top = r;
        cam.near = 0.5;
        cam.far = 60;
        cam.updateProjectionMatrix();
        backdrop.position.set(cx, cy, BACKDROP_Z);
        backdrop.scale.set(W / unit + 4, H / unit + 4, 1);
      };
      const aim = (dir: [number, number, number]) => {
        const v = new THREE.Vector3(...dir).normalize().multiplyScalar(30);
        sun.position.copy(sun.target.position).add(v);
      };
      relayout = () => {
        layout();
        aim(shade.dir);
      };

      // Dress the letters for the current concept and theme, coloured from the
      // 2D letters; old materials go.
      const html = document.documentElement;
      let pools: LetterLook[][] = [];
      let shade = letterShadow('g', false);
      const n = poolSize(phone);
      const wear = (l: Letter, i: number, k: number) => {
        if (l.look === k) return;
        const look = pools[i][k];
        l.look = k;
        l.mesh.material = look.body;
        l.extra.visible = !!look.extra;
        if (look.extra) l.extra.material = look.extra;
        l.extra.position.set(...look.offset);
      };
      // The 2D letter's colour for the face; a concept's stacked text-shadow
      // (a straight drop, like Soft Clay's extrusion) for the sides.
      const inkOf = (s: Element): LetterInk => {
        const face = getComputedStyle(s).color;
        const drop = getComputedStyle(word)
          .textShadow.split(/,(?![^(]*\))/)
          .map((t) => t.trim())
          .find((t) => /^rgba?\([^)]*\) 0px [1-9]/.test(t));
        return { face, side: drop?.match(/^rgba?\([^)]*\)/)?.[0] ?? face };
      };
      const dress = () => {
        const variant = (html.dataset.variant ?? 'g') as VariantKey;
        const dark = html.dataset.theme === 'dark';
        pools.forEach(disposePool);
        const slotsEls = [...word.children];
        pools = letters.map((_, i) => lookPool(variant, inkOf(slotsEls[i]), dark, phone));
        if (pools.some((p) => p.some((l) => l.env))) lightStudio();
        shade = letterShadow(variant, dark);
        backdropMat.color.set(shade.color);
        backdropMat.opacity = shade.opacity;
        sun.shadow.radius = shade.radius;
        relayout();
        // Warm every look's shader now, so swapping looks mid-flicker never
        // compiles: wear each look across the letters and compile.
        for (let k = 0; k < n; k++) {
          letters.forEach((l, i) => {
            l.look = -1;
            wear(l, i, k);
          });
          renderer.compile(scene, camera);
        }
        letters.forEach((l, i) => {
          l.look = -1;
          wear(l, i, lookAt(l.lockedAt >= 0 ? null : 0, i, n));
        });
        paint();
      };
      dress();
      const mo = new MutationObserver(dress);
      mo.observe(html, { attributes: true, attributeFilter: ['data-variant', 'data-theme'] });
      cleanups.push(
        () => mo.disconnect(),
        () => pools.forEach(disposePool),
        () => cache.forEach((g) => g.geo.dispose()),
        () => backdrop.geometry.dispose(),
      );

      // Set every letter for time t (seconds into the reveal). `budget` caps
      // how many new extruded glyphs one frame may build (the costly part).
      let posed = false;
      const pose = (t: number, budget: number) => {
        letters.forEach((l, i) => {
          const step = stepAt(t * 1000, i);
          const live = step === null ? null : Math.max(step, 0);
          let face = live === null ? FINAL[i] : faceAt(live, i, FACE_COUNT);
          if (face !== l.face) {
            const fresh = !cache.has(keyOf(l.ch, face));
            if (fresh && budget <= 0) face = l.face;
            else {
              if (fresh) budget--;
              l.mesh.geometry = l.extra.geometry = glyph(l.ch, face).geo;
              l.face = face;
            }
          }
          wear(l, i, lookAt(live, i, n));
          const s = slots[i];
          // As the 2D glyph: a shifting one is bottom-aligned in its slot,
          // shrunk to fit the slot's width and jumps in size about the slot
          // centre; a locked one sits on its own baseline and pops once.
          let k = 1;
          let base = s.base;
          if (live === null) {
            // Already locked when the 3D word appears (or in a seeked frame):
            // at rest, like the 2D letter it replaces.
            if (l.lockedAt < 0) l.lockedAt = posed ? t : t - 1;
            k = lockPop(t - l.lockedAt);
          } else {
            // The 2D glyph's advance, in whole px like its offsetWidth.
            const adv = Math.round(glyph(l.ch, face).adv * unit);
            k = Math.min(1, s.w / Math.max(1, adv)) * scaleAt(live, i);
            base = s.h / 2 - baseOf[face] * fontPx;
          }
          l.mesh.scale.setScalar(k);
          l.mesh.position.y = (-base * k) / unit;
          // A slight sway while shifting that eases out as the letter lands.
          const calm = live === null ? Math.max(0, 1 - (t - l.lockedAt) / 0.5) : 1;
          l.mesh.rotation.x = Math.sin(t * 1.1 + i) * 0.05 * calm;
          l.mesh.rotation.y = Math.sin(t * 0.9 + i * 0.8) * 0.06 * calm;
        });
        posed = true;
        return letters.every((l) => l.lockedAt >= 0 && t - l.lockedAt > 0.5);
      };
      const now = () => seek ?? (still ? 30 : (performance.now() - clock.current) / 1000);

      const frame = () => {
        raf = 0;
        const t = now();
        const settled = pose(t, seek === null ? (phone ? 1 : 2) : Infinity);
        paint();
        if (seek === null && !still && !settled && visible()) raf = requestAnimationFrame(frame);
      };
      wake = () => {
        if (!raf && seek === null && !still) raf = requestAnimationFrame(frame);
      };
      replay.current = () => {
        letters.forEach((l) => (l.lockedAt = -1));
        wake();
      };

      // Before taking over, build (in idle time) every glyph the rest of the
      // reveal will show, so the 3D word never lags a face behind the 2D one.
      const upcoming = () => {
        const t = now() * 1000;
        const need: [string, number][] = [];
        [...WORD].forEach((ch, i) => {
          const from = stepAt(t, i);
          if (from !== null)
            for (let k = Math.max(from, 0); k < stepCount(i); k++)
              need.push([ch, faceAt(k, i, FACE_COUNT)]);
          need.push([ch, FINAL[i]]);
        });
        return need.filter(([ch, f]) => !cache.has(keyOf(ch, f)));
      };
      const takeOver = () => {
        if (disposed) return;
        const todo = upcoming();
        const until = performance.now() + 8;
        while (todo.length && performance.now() < until) {
          const [ch, f] = todo.shift()!;
          glyph(ch, f);
        }
        if (todo.length && seek === null) return void idle(takeOver);
        frame();
        el.style.opacity = '1';
        onReady();
        if (seek !== null) releaseFrame('title');
      };
      takeOver();
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      replay.current = () => {};
      cleanups.forEach((c) => c());
      envMap?.dispose();
      backdropMat.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [clock, title, onReady, onFail]);

  return (
    <div
      ref={host}
      aria-hidden="true"
      className="vy-letters3d absolute inset-0 z-2 opacity-0 [transition:opacity_0.2s_ease-out,transform_0.7s_ease-out]"
    />
  );
};

const idle = (cb: () => void) =>
  'requestIdleCallback' in window ? requestIdleCallback(cb, { timeout: 300 }) : setTimeout(cb, 16);
