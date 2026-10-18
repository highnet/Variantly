'use client';

import { useEffect, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

import type { VariantKey } from '@/components/backdrop/variants';
import { glTier, markFallback } from '@/lib/glTier';
import { attachLens, lensHoldsTitle, type LensPass } from '@/lib/lens3d';
import {
  blendMorph,
  loadMorph,
  morphPose,
  morphTrack,
  planMorph,
  planStep,
  runSequence,
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
import { colourAt, letterPalette, toRgb, type Lab, type LetterPalette } from '@/lib/titleColor';
import { calmMotion } from '@/lib/prefs';
import { releaseFrame, seekTime } from '@/lib/seek';
import {
  lookAt,
  morphAt,
  spring,
  stepAt,
  titleColorOn,
  titleGlitchOn,
  glitchAt,
  glitchBuffer,
  glitchStrength,
  type Glitch,
  type MorphPhase,
  type Timeline,
} from '@/lib/titleTiming';

// The most one drawn frame advances the title's run, ms (see `now`).
const STALL_MS = 50;
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
// The handover between the 2D and 3D words.
const HANDOVER_MS = 760;
const smooth01 = (u: number) => u * u * (3 - 2 * u);

type Letter = {
  ch: string;
  // Placed and shaped like the 2D slot (its transform, rotation, skew).
  holder: THREE.Object3D;
  mesh: THREE.Mesh;
  // A flat, unlit copy in the 2D letter's colour over the lit letter: fully
  // opaque at the handover from the 2D word, fading as the letter extrudes.
  flat: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  // A look's second layer (a reflection, lifted stitches), when it has one.
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
  // The face colour it last wore (OKLab), when palette colours are on.
  ink: Lab | null;
  // Its glitch accent this frame (on: drawn sliced and split).
  glitch: Glitch;
  glitching: boolean;
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
  // That run's timeline (the reveal, or a concept change's quick morph).
  tl: Timeline;
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
export const Letters3D = ({ run, low, tl, clock, title, onReady, onFail }: Letters3DProps) => {
  const host = useRef<HTMLDivElement>(null);
  const replay = useRef(() => {});

  const lowRef = useRef(low);
  const tlRef = useRef(tl);
  useEffect(() => {
    lowRef.current = low;
    tlRef.current = tl;
    replay.current();
  }, [run, low, tl]);

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
        // The Lens clips its doorway with the stencil (lib/lens3d).
        stencil: true,
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
    // A lost context cannot draw its way back to flat: the 2D word takes over
    // at once.
    const lost = (e: Event) => {
      e.preventDefault();
      onFail();
    };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    cleanups.push(() => renderer.domElement.removeEventListener('webglcontextlost', lost));
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

    // Draws the scene (the letters replace it with one that also draws the
    // glitch accent).
    let draw = () => renderer.render(scene, camera);
    // A one-off paint (resize, new look): full density, fresh shadow. The
    // Lens draws its doorway in the same pass when it is up.
    let lens: LensPass | null = null;
    const paint = () => {
      ratio(fullRatio);
      renderer.shadowMap.needsUpdate = true;
      if (!lens?.render()) draw();
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
        if (lensHoldsTitle()) return;
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
        const flat = new THREE.Mesh(
          morph.geo,
          new THREE.MeshBasicMaterial({
            transparent: true,
            toneMapped: false,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -4,
          }),
        );
        flat.frustumCulled = false;
        flat.renderOrder = 1;
        mesh.add(flat);
        const extra = new THREE.Mesh(morph.geo);
        extra.frustumCulled = false;
        extra.renderOrder = -1;
        extra.visible = false;
        mesh.add(extra);
        const holder = new THREE.Object3D();
        holder.matrixAutoUpdate = false;
        holder.add(mesh);
        group.add(holder);
        return {
          ch,
          holder,
          mesh,
          flat,
          extra,
          track,
          morph,
          step: -1,
          e: 0,
          look: -1,
          locked: true,
          ink: null,
          glitch: glitchBuffer(),
          glitching: false,
        };
      });
      const phase: MorphPhase = { step: 0, e: 0, c: 0 };
      if (seek === null) {
        lens = attachLens({
          renderer,
          scene,
          camera,
          el,
          word,
          letters,
          backdrop,
          final: FINAL,
          em: EM,
          depth: DEPTH,
          bevel: BEVEL,
          phone,
          unit: () => unit,
          paint,
        });
        cleanups.push(() => lens?.dispose());
      }
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
      // Palette colours while morphing (lib/titleColor): per letter its
      // palette, and the colour it wore before a concept change.
      const tint = titleColorOn() && !still;
      const pals: (LetterPalette | null)[] = [];
      const swapFrom: (Lab | null)[] = [];
      const face: Lab = [0, 0, 0];
      const side: Lab = [0, 0, 0];
      const rgb: [number, number, number] = [0, 0, 0];
      const setColour = (m: THREE.Material, lab: Lab) => {
        toRgb(lab, rgb);
        const u = (m as THREE.ShaderMaterial).uniforms?.uA?.value as THREE.Color | undefined;
        const c = u ?? ((m as THREE.MeshStandardMaterial).color as THREE.Color | undefined);
        c?.setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace);
      };
      // The worn look (face, sides) and the flat copy in these colours.
      const paint3 = (l: Letter, f: Lab, sd: Lab) => {
        const [fm, sm] = l.mesh.material as THREE.Material[];
        setColour(fm, f);
        setColour(sm, sd);
        setColour(l.flat.material, f);
        l.ink = [f[0], f[1], f[2]];
      };
      const wear = (l: Letter, i: number, at: number) => {
        // A concept may offer fewer looks than the pool size (Kinetic Type's
        // dark print has two): wrap rather than read past the end.
        const k = at % pools[i].length;
        if (l.look === k) return;
        const look = pools[i][k];
        l.look = k;
        l.mesh.material = look.body;
        l.extra.visible = !!look.extra;
        if (look.extra) l.extra.material = look.extra;
        l.extra.position.set(...(look.offset ?? [0, 0, 0]));
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
        // A concept change morphs each letter from the colour it wore.
        letters.forEach((l, i) => (swapFrom[i] = l.ink ? [...l.ink] : null));
        pools.forEach(disposePool);
        const slotsEls = [...word.children];
        pools = letters.map((l, i) => {
          const ink = inkOf(slotsEls[i]);
          l.flat.material.color.set(ink.face);
          pals[i] = tint ? letterPalette(slotsEls[i], ink.face, ink.side) : null;
          l.ink = null;
          return lookPool(variant, ink, dark, phone);
        });
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
        () =>
          letters.forEach((l) => {
            l.morph.geo.dispose();
            l.flat.material.dispose();
          }),
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
      // The handover between the 2D and 3D words (0 = flat and matte over the
      // 2D word, 1 = fully extruded, lit and shadowed): its extrusion depth
      // on a spring, the flat copy fading, the cast shadow fading in. Seeked
      // frames take it from ?th (default 1), so it can be checked frame by frame.
      let handT0 = 0;
      let handDir: 1 | -1 = 1;
      let handDone: (() => void) | null = null;
      const seekHand = Number(new URLSearchParams(location.search).get('th') ?? 1);
      let depth = 1;
      let flatness = 0;
      let handing = false;
      const hand = (stamp: number) => {
        let u = seek !== null ? seekHand : still ? 1 : (stamp - handT0) / HANDOVER_MS;
        u = Math.min(1, Math.max(0, u));
        handing = seek === null && u < 1;
        const v = handDir > 0 ? u : 1 - u;
        depth = handDir > 0 ? spring(u) : 1 - smooth01(u);
        flatness = 1 - smooth01(Math.min(1, v / 0.55));
        backdropMat.opacity = shade.opacity * smooth01(Math.max(0, (v - 0.25) / 0.75));
        if (!handing && handDone) {
          const done = handDone;
          handDone = null;
          done();
        }
      };
      // The glitch accent (lib/titleTiming): how hard this concept glitches
      // (none on the low power tier), drawn by `draw` below.
      let strength = 0;
      const pose = (t: number) => {
        stepped = false;
        strength =
          titleGlitchOn() && !lowRef.current && !still ? glitchStrength(html.dataset.variant) : 0;
        letters.forEach((l, i) => {
          const ms = t * 1000;
          // Before its start delay a letter rests on its final face, like the
          // still 2D word it takes over from.
          const tl = tlRef.current;
          const waiting = stepAt(ms, i, tl) === -1;
          const live = !waiting && morphAt(ms, i, phase, tl);
          const s = slots[i];
          let k = 1;
          let y = s.base;
          l.locked = !live;
          if (!live) {
            rest(l, i);
            if (tint && pals[i]) paint3(l, pals[i].face, pals[i].side);
          } else {
            // Shifting: the outline flows from this step's face to the next,
            // posed exactly as the 2D letter (lib/glyphMorph).
            const seq = runSequence(data, l.ch, i, FINAL[i], tl, lowRef.current);
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
            if (tint && pals[i]) {
              const seqLen = seq.length - 1;
              const tr = l.track;
              colourAt(
                pals[i],
                i,
                tl,
                seqLen,
                tr.fromStep,
                tr.toStep,
                phase.c,
                swapFrom[i],
                face,
                side,
              );
              paint3(l, face, side);
            }
            morphPose(data, l.track, phase.e, FINAL[i], s.w, s.h, fontPx, s.base, mpose);
            k = mpose.k;
            y = mpose.y;
          }
          // Flat (depth ~0) at the handover from the 2D word, extruding as
          // it lands; a zero scale would leave no normals to light.
          l.mesh.scale.set(k, k, k * Math.max(1e-3, depth));
          l.mesh.position.y = -y / unit;
          l.flat.material.opacity = flatness;
          l.flat.visible = flatness > 0.002;
          l.glitching = live && strength > 0 && glitchAt(ms, i, l.glitch, tl) > 0;
          if (l.glitching) stepped = true;
        });
        return letters.every((l) => l.locked) && t * 1000 > tlRef.current.end;
      };
      // A glitching letter is drawn apart from the rest (camera layer 1):
      // two hard-edged copies in the concept's accents pulled apart sideways
      // (a channel split), then the letter in horizontal bands (scissored),
      // each nudged sideways, a dropped scanline between them. No blur.
      const splitMat = new THREE.MeshBasicMaterial({ toneMapped: false });
      cleanups.push(() => splitMat.dispose());
      [key, rim, sun].forEach((o) => o.layers.enable(1));
      draw = () => {
        if (!letters.some((l) => l.glitching)) {
          renderer.render(scene, camera);
          return;
        }
        const layer = (k: number) =>
          letters.forEach((l) => {
            if (!l.glitching) return;
            l.mesh.layers.set(k);
            l.flat.layers.set(k);
            l.extra.layers.set(k);
          });
        layer(1);
        renderer.render(scene, camera);
        const autoClear = renderer.autoClear;
        const autoShadow = renderer.shadowMap.autoUpdate;
        renderer.autoClear = false;
        renderer.shadowMap.autoUpdate = false;
        camera.layers.set(1);
        const shove = (fontPx * strength) / unit;
        const css = getComputedStyle(html);
        const accents = ['--art-1', '--art-2', '--alert', '--title']
          .map((v) => css.getPropertyValue(v).trim())
          .filter(Boolean);
        scene.overrideMaterial = splitMat;
        [-1, 1].forEach((dir, j) => {
          splitMat.color.set(accents[j] ?? accents[0] ?? '#ffffff');
          letters.forEach((l) => {
            if (l.glitching) l.mesh.position.x = dir * l.glitch.split * shove;
          });
          renderer.render(scene, camera);
        });
        scene.overrideMaterial = null;
        renderer.setScissorTest(true);
        const H = el.clientHeight;
        letters.forEach((l, i) => {
          if (!l.glitching) return;
          const sl = slots[i];
          const top = sl.cy - sl.h * 0.75;
          const band = (sl.h * 1.5) / l.glitch.bands;
          const gap = Math.max(1, fontPx * 0.012);
          for (let b = 0; b < l.glitch.bands; b++) {
            renderer.setScissor(
              sl.cx - sl.w,
              H - (top + band * (b + 1)) + gap,
              sl.w * 2,
              band - gap,
            );
            letters.forEach((o) => {
              if (o.glitching) o.mesh.position.x = o === l ? l.glitch.shift[b] * shove : 1e4;
            });
            renderer.render(scene, camera);
          }
        });
        renderer.setScissorTest(false);
        letters.forEach((l) => (l.mesh.position.x = 0));
        camera.layers.set(0);
        layer(0);
        renderer.autoClear = autoClear;
        renderer.shadowMap.autoUpdate = autoShadow;
      };
      // The run's time, advanced at most STALL_MS per drawn frame: a stalled
      // main thread (a concept switch loading its look) pauses the morph
      // rather than skipping it, so a quick swap still plays on screen.
      let runStart = -1;
      let runMs = 0;
      let lastMs = 0;
      const now = () => {
        if (seek !== null) return seek;
        if (still) return 30;
        const ms = performance.now() - clock.current;
        if (clock.current !== runStart) {
          runStart = clock.current;
          runMs = Math.min(ms, STALL_MS);
        } else runMs += Math.min(STALL_MS, Math.max(0, ms - lastMs));
        lastMs = ms;
        return runMs / 1000;
      };

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
        hand(performance.now());
        const settled = pose(t) && !handing;
        const going = seek === null && !still && !settled && visible();
        if (going && lite) {
          ratio(Math.min(fullRatio, 2));
          renderer.shadowMap.autoUpdate = false;
          if (stepped) renderer.shadowMap.needsUpdate = true;
          draw();
        } else {
          renderer.shadowMap.autoUpdate = true;
          paint();
        }
        setBusy(going);
        if (going) raf = requestAnimationFrame(frame);
      };
      wake = () => {
        if (!raf && seek === null && (!still || handing)) raf = requestAnimationFrame(frame);
      };
      // Back to the 2D word (the low power tier turned on mid-visit): the
      // letters flatten onto their 2D twins, then the 2D word takes over.
      const retire = () => {
        if (handDone || disposed) return;
        handDir = -1;
        handT0 = performance.now();
        handDone = onFail;
        if (still || seek !== null) onFail();
        else wake();
      };
      const perf = new MutationObserver(() => {
        if (html.dataset.perf === 'low') retire();
      });
      perf.observe(html, { attributes: true, attributeFilter: ['data-perf'] });
      cleanups.push(() => perf.disconnect());
      replay.current = () => wake();

      const takeOver = () => {
        if (disposed) return;
        // The 2D word held still on its final faces: the reveal starts now,
        // in 3D, from that same word.
        if (seek === null && !still) {
          clock.current = performance.now();
        }
        // Flat and matte over the 2D word, pixel for pixel: shown at once
        // (no crossfade), and the 2D glyphs hide in the same frame.
        handT0 = performance.now();
        handDir = 1;
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
      className="vy-letters3d absolute inset-0 z-2 opacity-0 [transition:transform_0.7s_ease-out]"
    />
  );
};
