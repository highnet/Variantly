'use client';

import { useEffect, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

import type { VariantKey } from '@/components/backdrop/variants';
import { glTier, markFallback } from '@/lib/glTier';
import {
  blendMorph,
  faceSequence,
  loadMorph,
  morphPose,
  morphTrack,
  planMorph,
  planStep,
  type MorphData,
  type MorphPose,
  type MorphTrack,
} from '@/lib/glyphMorph';
import { INTRO_FINAL, INTRO_FONTS } from '@/lib/introFonts';
import {
  disposePool,
  letterShadow,
  lookPool,
  poolSize,
  type LetterInk,
  type LetterLook,
} from '@/lib/letterLook';
import { morphMesh } from '@/lib/morphMesh';
import { calmMotion } from '@/lib/prefs';
import { releaseFrame, seekTime } from '@/lib/seek';
import { lookAt, morphAt, REVEAL_MS, stepAt, stepCount, type MorphPhase } from '@/lib/titleTiming';

const WORD = 'variantly';
// The 3D wardrobe is the 2D title's: the same faces in the same order. Each
// letter is one morphing mesh (lib/morphMesh) built from the shared outline
// data (lib/glyphMorph, from the faces scripts/build-3d-fonts.mjs fetched;
// licences in public/fonts/3d), so it flows from face to face exactly as the
// 2D letter does, and rests on its final face as the same mesh. (Three's
// TextGeometry, used for the resting letters before, insets its bevel by
// mitred vectors that shoot out at a font's sharp corners, throwing slabs of
// cap and side across a letter.)
const FINAL = INTRO_FINAL.map((c) => INTRO_FONTS.indexOf(c));
const FINAL_FACES = [...new Set(FINAL)];
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
  // The letter's outline track and its morphing mesh.
  track: MorphTrack;
  morph: ReturnType<typeof morphMesh>;
  // Last morph frame written (step and spring progress; step -1 resting on
  // the final face), so holds cost nothing.
  step: number;
  e: number;
  look: number;
  locked: boolean;
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
  // The current reveal (-1 before the first one starts).
  run: number;
  // The low power tier, read once when that reveal started.
  low: boolean;
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

/*
 * The "variantly" title as extruded letters, a faithful extrusion of the 2D
 * word: same face, size, place, baseline and colour per letter at every step
 * (laid out from the 2D letters' own boxes and transforms), so the 2D word
 * hands off without a jump. Each concept dresses the letters in its surface
 * pool (lib/letterLook), coloured from the 2D letters' CSS, and they cast the
 * concept's shadow on a backdrop just behind them. The loop renders only while
 * letters move and the card is visible; a settled word draws no frames.
 */
export const Letters3D = ({ run, low, clock, title, onReady, onFail }: Letters3DProps) => {
  const host = useRef<HTMLDivElement>(null);
  const replay = useRef(() => {});

  const lowRef = useRef(low);
  useEffect(() => {
    lowRef.current = low;
    replay.current();
  }, [run, low]);

  useEffect(() => {
    const el = host.current;
    const word = title.current;
    if (!el || !word) return;
    let disposed = false;
    let raf = 0;
    const cleanups: (() => void)[] = [];
    const tier = glTier();
    const html = document.documentElement;
    const phone = tier.coarse || innerWidth < 640;
    const seek = seekTime();
    const still = calmMotion();
    // The outlines every face morphs through (the resting word too), and
    // each final face as the 2D webfont: the 3D word takes over only once it
    // can show exactly what the 2D word shows.
    let morphData: MorphData | null = null;
    const probes = FINAL_FACES.map((f) => {
      const p = document.createElement('div');
      p.className = INTRO_FONTS[f];
      p.style.cssText =
        'position:absolute;left:0;top:0;visibility:hidden;font-size:100px;line-height:1;white-space:nowrap';
      p.textContent = 'v';
      el.appendChild(p);
      return { p };
    });
    const allFonts = Promise.all([
      loadMorph().then((d) => (morphData = d)),
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
        // MSAA, except at 2.5x density and up, where it is invisible but
        // multiplies the fill cost.
        antialias: (devicePixelRatio || 1) < 2.5,
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
    // At the screen's full density: the word stays sharp while it moves.
    // Phones and the low power tier (html[data-perf='low']) animate at 2x at
    // most, 30fps, with the shadow map redrawn only when a letter steps,
    // then repaint once at full density, shadow and all, when the word settles.
    const dpr = () => Math.min(devicePixelRatio || 1, 3);
    // Re-read on resize: browser zoom or a move to another screen changes it.
    let fullRatio = dpr();
    renderer.setPixelRatio(fullRatio);
    const light = () => seek === null && (phone || lowRef.current);
    const ratio = (r: number) => {
      if (renderer.getPixelRatio() !== r) renderer.setPixelRatio(r);
    };
    // One busy WebGL context at a time: the backdrop scene pauses while the
    // title animates.
    let busy = false;
    const setBusy = (b: boolean) => {
      if (busy === b) return;
      busy = b;
      document.dispatchEvent(new CustomEvent('vy:gl-busy', { detail: { busy: b } }));
    };
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

    // A one-off paint (resize, new look): full density, fresh shadow.
    const paint = () => {
      ratio(fullRatio);
      renderer.shadowMap.needsUpdate = true;
      renderer.render(scene, camera);
    };

    // Pause for real (no idle rAF) when the tab hides or the card leaves the screen.
    let onScreen = true;
    const visible = () => seek !== null || (!document.hidden && onScreen);
    let wake = () => {};
    let relayout = () => {};
    const vis = () => {
      if (visible()) return wake();
      cancelAnimationFrame(raf);
      raf = 0;
      setBusy(false);
    };
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      vis();
    });
    io.observe(el.parentElement ?? el);
    document.addEventListener('visibilitychange', vis);
    // A resize moves the 2D word and clears the canvas: follow it and repaint
    // in the same frame (no blank, no rebuild, the reveal carries on). The
    // card can change size without the window (and the density without the
    // size), so both are watched; an unchanged size and density is a no-op.
    let laidOut = '';
    const resize = () => {
      fullRatio = dpr();
      if (laidOut === `${el.clientWidth}x${el.clientHeight}@${fullRatio}`) return;
      relayout();
      paint();
    };
    addEventListener('resize', resize);
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    // A move to a screen of another density fires no resize: watch for it.
    let density: MediaQueryList | null = null;
    const onDensity = () => {
      density?.removeEventListener('change', onDensity);
      density = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
      density.addEventListener('change', onDensity);
      resize();
    };
    onDensity();
    cleanups.push(
      () => io.disconnect(),
      () => ro.disconnect(),
      () => density?.removeEventListener('change', onDensity),
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

    // A failed load hands the title back to the 2D word.
    const fail = () => {
      if (disposed) return;
      probes.forEach(({ p }) => p.remove());
      onFail();
    };
    allFonts.catch(fail);
    void allFonts.then(() => {
      if (disposed) return;
      const data = morphData!;
      probes.forEach(({ p }) => p.remove());

      // Each letter's mesh: origin on the baseline at the centre of the
      // advance (where the 2D glyph centres), front face at z = 0, outline
      // exactly the 2D glyph's (the bevel is inset, not grown).
      const letters: Letter[] = [...WORD].map((ch, i) => {
        const track = morphTrack(data, ch);
        const morph = morphMesh(track, {
          em: EM,
          depth: DEPTH,
          bevel: BEVEL,
          inset: BEVEL * 0.7,
          stride: phone ? 2 : 1,
        });
        // Resting on the final face.
        planMorph(data, track, FINAL[i], FINAL[i]);
        blendMorph(track, 0);
        morph.update();
        const mesh = new THREE.Mesh(morph.geo);
        mesh.castShadow = true;
        // The morphing mesh's bound is loose and its caps change: never cull.
        mesh.frustumCulled = false;
        const extra = new THREE.Mesh(morph.geo);
        extra.frustumCulled = false;
        extra.renderOrder = -1;
        mesh.add(extra);
        const holder = new THREE.Object3D();
        holder.matrixAutoUpdate = false;
        holder.add(mesh);
        group.add(holder);
        return {
          ch,
          holder,
          mesh,
          extra,
          track,
          morph,
          step: -1,
          e: 0,
          look: -1,
          locked: true,
        };
      });
      const phase: MorphPhase = { step: 0, e: 0, c: 0 };
      const mpose: MorphPose = { k: 1, y: 0 };

      // Lay the word out over the 2D one. Card px map to scene units at the
      // z = 0 plane (the front faces): 1em of the 2D type = EM units.
      const slots: Slot[] = [];
      let unit = 1;
      let fontPx = 16;
      const layout = () => {
        const W = el.clientWidth;
        const H = el.clientHeight;
        laidOut = `${W}x${H}@${fullRatio}`;
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
          wear(l, i, lookAt(l.locked ? null : 0, i, n));
        });
        paint();
      };
      dress();
      const mo = new MutationObserver(dress);
      mo.observe(html, { attributes: true, attributeFilter: ['data-variant', 'data-theme'] });
      cleanups.push(
        () => mo.disconnect(),
        () => pools.forEach(disposePool),
        () => letters.forEach((l) => l.morph.geo.dispose()),
        () => backdrop.geometry.dispose(),
      );

      // Set every letter for time t (seconds into the reveal).
      // Whether any letter changed step (or locked) in the last pose.
      let stepped = false;
      // A letter at rest on its final face (before its turn, and locked).
      const rest = (l: Letter, i: number) => {
        if (l.step !== -1) {
          planMorph(data, l.track, FINAL[i], FINAL[i]);
          blendMorph(l.track, 0);
          l.morph.update();
          l.step = -1;
          l.e = 0;
          stepped = true;
        }
        wear(l, i, lookAt(null, i, n));
      };
      const pose = (t: number) => {
        stepped = false;
        letters.forEach((l, i) => {
          const ms = t * 1000;
          // Before its start delay a letter rests on its final face, like the
          // still 2D word it takes over from.
          const waiting = stepAt(ms, i) === -1;
          const live = !waiting && morphAt(ms, i, phase);
          const s = slots[i];
          let k = 1;
          let y = s.base;
          l.locked = !live;
          if (!live) rest(l, i);
          else {
            // Shifting: the outline flows from this step's face to the next,
            // posed exactly as the 2D letter (lib/glyphMorph).
            const seq = faceSequence(data, l.ch, i, FINAL[i], stepCount(i), lowRef.current);
            planStep(data, l.track, phase, seq, lowRef.current);
            // Phones redraw the shadow map only now and then: at each step,
            // and midway through its morph.
            if (phase.step !== l.step || (l.e < 0.5 && phase.e >= 0.5)) stepped = true;
            if (phase.step !== l.step || phase.e !== l.e) {
              blendMorph(l.track, phase.e);
              l.morph.update();
              l.step = phase.step;
              l.e = phase.e;
            }
            wear(l, i, lookAt(phase.step, i, n));
            morphPose(data, l.track, phase.e, FINAL[i], s.w, s.h, fontPx, s.base, mpose);
            k = mpose.k;
            y = mpose.y;
          }
          l.mesh.scale.setScalar(k);
          l.mesh.position.y = -y / unit;
        });
        return letters.every((l) => l.locked) && t * 1000 > REVEAL_MS;
      };
      const now = () => seek ?? (still ? 30 : (performance.now() - clock.current) / 1000);

      let last = 0;
      const frame = (stamp = performance.now()) => {
        raf = 0;
        const lite = light();
        // 30fps on phones (whatever the display's rate).
        if (lite && stamp - last < 30) {
          raf = requestAnimationFrame(frame);
          return;
        }
        last = stamp;
        const t = now();
        const settled = pose(t);
        const going = seek === null && !still && !settled && visible();
        if (going && lite) {
          ratio(Math.min(fullRatio, 2));
          renderer.shadowMap.autoUpdate = false;
          if (stepped) renderer.shadowMap.needsUpdate = true;
          renderer.render(scene, camera);
        } else {
          renderer.shadowMap.autoUpdate = true;
          paint();
        }
        setBusy(going);
        if (going) raf = requestAnimationFrame(frame);
      };
      wake = () => {
        if (!raf && seek === null && !still) raf = requestAnimationFrame(frame);
      };
      replay.current = () => wake();

      const takeOver = () => {
        if (disposed) return;
        // The 2D word held still on its final faces: the reveal starts now,
        // in 3D, from that same word.
        if (seek === null && !still) {
          clock.current = performance.now();
        }
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
      setBusy(false);
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
      className="vy-letters3d absolute inset-0 z-2 opacity-0 [transition:opacity_0.6s_ease-out,transform_0.7s_ease-out]"
    />
  );
};
