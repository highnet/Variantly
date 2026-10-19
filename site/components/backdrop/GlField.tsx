'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

import { glTier, markFallback } from '@/lib/glTier';
import { markLoaded } from '@/lib/loadProgress';
import { calmMotion } from '@/lib/prefs';
import { releaseFrame, seekTime } from '@/lib/seek';

import { CONCEPT_BY_ID, CONCEPT_LOADERS, type ConceptId } from '@/concepts';
import type { Built, ConceptScene } from '@/concepts/types';
import { compilesInParallel, firstDraw } from '@/lib/glWarm';
import { afterFrame, whenIdle } from '@/lib/idle';
import { perfTier } from '@/lib/perfTier';
import { releaseStudio, sceneBsdf, studioFor } from '@/lib/sceneBsdf';
import { keepSceneElapsed, sceneElapsed } from '@/lib/sceneClock';
import { onSwapWarm } from '@/lib/swapWarm';

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
 * independent per-channel noise for chroma. Colour is un-premultiplied first,
 * so empty (transparent) areas stay clean. Soft edges are stippled, like a
 * grainy gradient in print: their alpha is dithered by the same noise, so a
 * fading edge breaks into scattered pixels instead of a smooth blur, while
 * solid areas and the empty ground are left alone.
 *
 * Around the shapes, a grainy halo (the soft glow of a print under
 * a loupe): a blur of the frame taken with a few taps at a random angle per
 * pixel, so the blur itself comes out grainy instead of smooth, laid under the
 * shapes at a strength that tracks the grain and broken up further by noise as
 * it fades. The halo reaches HALO_PX CSS pixels out.
 *
 * The noise is white noise per drawing-buffer pixel from an integer hash
 * (PCG), each sample seeded apart, so it never tiles or forms a pattern at
 * any screen size (the usual fract(sin(dot())) hash drew diagonal, repeating
 * worms on GPUs). It is keyed to pixels only (no clock), so it never
 * shimmers.
 */
const HALO_PX = 34;
const HALO_TAPS = 12;

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
        uRadius: { value: HALO_PX },
        // Grain 0.2 and up carries a full halo; faint grain, a faint one.
        uHalo: { value: Math.min(0.85, amount * 4) },
      },
      vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `
        uniform sampler2D tFrame;
        uniform vec2 uRes;
        uniform float uAmount;
        uniform float uChroma;
        uniform float uRadius;
        uniform float uHalo;
        uint pcg(uint v) {
          uint s = v * 747796405u + 2891336453u;
          uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
          return (w >> 22u) ^ w;
        }
        // Uniform in 0..1 for pixel p and an independent stream k.
        float hash(uvec2 p, uint k) {
          return float(pcg(p.x + pcg(p.y + pcg(k)))) * (1.0 / 4294967295.0);
        }
        void main() {
          uvec2 p = uvec2(gl_FragCoord.xy);
          vec4 c = texture2D(tFrame, gl_FragCoord.xy / uRes);

          // The halo: a stochastic blur, taps on a golden-angle spiral turned
          // by a random angle per pixel, so it is grainy by construction.
          vec4 glow = vec4(0.0);
          float turn = hash(p, 7u) * 6.2831853;
          float jitter = hash(p, 8u);
          for (int i = 0; i < ${HALO_TAPS}; i++) {
            float a = turn + float(i) * 2.3999632;
            float r = uRadius * sqrt((float(i) + jitter) / ${HALO_TAPS}.0);
            glow += texture2D(tFrame, (gl_FragCoord.xy + r * vec2(cos(a), sin(a))) / uRes);
          }
          glow /= ${HALO_TAPS}.0;
          float ha = glow.a * uHalo * (1.0 - c.a);
          // Broken up as it fades: the outer reach is mostly specks.
          ha *= smoothstep(0.0, 1.0, 0.35 + 1.3 * hash(p, 9u) - 0.6 * (1.0 - glow.a));
          ha = clamp(ha, 0.0, 1.0);
          vec3 hrgb = glow.a > 0.004 ? glow.rgb / glow.a : vec3(0.0);

          if (c.a < 0.004) {
            gl_FragColor = vec4(hrgb * ha, ha);
            return;
          }
          vec3 rgb = c.rgb / c.a;
          float l = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
          float w = (0.5 + 2.0 * l * (1.0 - l)) * smoothstep(0.0, 0.12, l + 0.03);
          // Two hashes summed: a triangular (film-like) distribution in -1..1.
          float n = hash(p, 1u) + hash(p, 2u) - 1.0;
          vec3 ch = vec3(hash(p, 3u), hash(p, 4u), hash(p, 5u)) - 0.5;
          rgb = clamp(rgb + uAmount * w * (n + uChroma * ch), 0.0, 1.0);
          // Stipple the soft edges: strongest half way out, none where the
          // shape is solid or the ground is empty.
          float edge = 4.0 * c.a * (1.0 - c.a);
          float a = clamp(c.a + 2.5 * uAmount * edge * (hash(p, 6u) - 0.5), 0.0, 1.0);
          // The shape over its own halo (premultiplied).
          gl_FragColor = vec4(rgb * a + hrgb * ha, a + ha);
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
      material.uniforms.uRadius.value = HALO_PX * renderer.getPixelRatio();
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

type Theme = 'light' | 'dark';

// The canvas fades in over the server-painted art instead of popping in, on
// load and (faster, the wipe already moves) on every concept or theme swap.
const FADE_MS = 800;
const SWAP_FADE_MS = 400;
// How fast the previous concept's scene leaves on a concept change.
const OUT_MS = 160;

// Frees a scene's geometry, materials and their textures.
const disposeScene = (scene: THREE.Object3D) =>
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    mats.forEach((mat) => {
      Object.values(mat).forEach((v) => v instanceof THREE.Texture && v.dispose());
      mat.dispose();
    });
  });

// Whoever holds a stage, and how to make them let go of it. A spare owner
// (a scene built ahead, or parked by a theme flip) is let go of first.
type Owner = { evict: () => void; spare: boolean };

type Stage = {
  renderer: THREE.WebGLRenderer;
  owner: Owner | null;
  // When it was last taken (the longest-held stage is the one to evict).
  since: number;
  // The last scene it held, disposed only once the next one's shaders have
  // compiled, so the programs both use (the grain pass, the BSDF) stay
  // compiled across the swap.
  spent: (() => void) | null;
};

/*
 * The renderers every scene draws with, kept for the page's life: a new
 * WebGL context per swap (and its studio environment and compiled shaders)
 * was the costliest thing a swap did. Two at most, since a swap shows the
 * outgoing and the incoming scene at once, each on its own canvas.
 */
const stagePool = (seek: number | null) => {
  const tier = glTier(0.55);
  const phone = tier.coarse || innerWidth < 640;
  const stages: Stage[] = [];
  let failed = false;
  let gone = false;
  let clock = 0;
  const make = () => {
    if (failed || gone) return null;
    try {
      const renderer = new THREE.WebGLRenderer({
        antialias: tier.antialias,
        alpha: true,
        // Only seekreel captures need the frame kept after compositing.
        preserveDrawingBuffer: seek !== null,
        powerPreference: phone ? 'low-power' : 'default',
      });
      // Reading a program's logs waits for it to link, which undoes
      // parallel shader compilation: checked in development only.
      renderer.debug.checkShaderErrors = process.env.NODE_ENV !== 'production';
      // At the first stage's size: sizing a drawing buffer reallocates it,
      // which a swap should not have to do.
      const first = stages[0]?.renderer;
      if (first) {
        const at = first.getSize(new THREE.Vector2());
        renderer.setDrawingBufferSize(at.x, at.y, first.getPixelRatio());
      }
      const stage: Stage = { renderer, owner: null, since: 0, spent: null };
      stages.push(stage);
      // Its studio environment (sceneBsdf), made ahead in idle time.
      whenIdle(() => !gone && studioFor(renderer), 3000);
      return stage;
    } catch {
      failed = true;
      return null;
    }
  };
  const oldest = (list: Stage[]) =>
    list.reduce<Stage | null>((a, b) => (a && a.since <= b.since ? a : b), null);
  return {
    // A stage for `owner`: a free one, else a new one (up to two), else one
    // a spare owner holds; `force` then takes the longest-held one (never
    // `keep`, the scene still on screen).
    take: (owner: Owner, force: boolean, keep: Stage | null = null): Stage | null => {
      let s = stages.find((st) => !st.owner) ?? (stages.length < 2 ? make() : null);
      if (!s) {
        const others = stages.filter((st) => st !== keep);
        s = oldest(others.filter((st) => st.owner?.spare)) ?? (force ? oldest(others) : null);
        s?.owner?.evict();
      }
      if (!s) return null;
      s.owner = owner;
      s.since = ++clock;
      return s;
    },
    // `owner` lets go of its stage; its scene waits in `spent`.
    free: (s: Stage, owner: Owner, dispose: () => void) => {
      if (gone || s.owner !== owner) return dispose();
      s.owner = null;
      s.spent?.();
      s.spent = dispose;
    },
    // A newer scene's shaders are in: the previous scene can go.
    settle: (s: Stage) => {
      s.spent?.();
      s.spent = null;
    },
    // The second stage, made in idle time so the first swap does not have to.
    spare: () => {
      if (stages.length < 2) make();
    },
    dispose: () => {
      stages.forEach((s) => s.owner?.evict());
      gone = true;
      stages.forEach((s) => {
        s.spent?.();
        s.spent = null;
        releaseStudio(s.renderer);
        s.renderer.dispose();
      });
      stages.length = 0;
    },
  };
};

type Stages = ReturnType<typeof stagePool>;

// A concept's scene built on a stage, its shaders compiling: ahead of its
// swap (the warm-up), parked by a theme flip, or held by a run.
type Prepared = Owner & {
  stage: Stage;
  concept: ConceptId;
  theme: Theme;
  scene: THREE.Scene;
  built: Built;
  // Every shader the scene uses has compiled (in parallel, off the main
  // thread, where the GPU allows) and been drawn with once, unseen.
  ready: Promise<unknown>;
  // The grain pass over it (null: no grain).
  film: ReturnType<typeof grainPass> | null;
  dead: boolean;
  drop: () => void;
};

const prepare = (
  pool: Stages,
  force: boolean,
  keep: Stage | null,
  def: ConceptScene,
  concept: ConceptId,
  theme: Theme,
  grain: number,
  chroma: number,
): Prepared | null => {
  const owner: Owner = { evict: () => {}, spare: true };
  const stage = pool.take(owner, force, keep);
  if (!stage) return null;
  const { renderer } = stage;
  const scene = new THREE.Scene();
  let built: Built;
  let bsdf: (() => void) | null = null;
  try {
    built = def.build(scene, def.colors[theme]);
    // The scene's lit meshes on the Principled BSDF, in the title's photo
    // studio (lib/sceneBsdf); hand-written shaders are left as authored.
    bsdf = sceneBsdf(renderer, scene);
  } catch (e) {
    pool.free(stage, owner, () => disposeScene(scene));
    throw e;
  }
  const film = grain > 0 ? grainPass(grain, chroma) : null;
  const { camera } = built;
  const ready = Promise.all([
    renderer.compileAsync(scene, camera),
    film && renderer.compileAsync(film.scene, camera),
  ]).then(() => {
    if (p.dead || compilesInParallel(renderer)) return;
    // Where the GPU cannot compile in parallel, a program's first draw waits
    // for its whole link: drawn once now (one pixel, on the detached canvas,
    // lib/glWarm) rather than in the first frame that shows.
    firstDraw(renderer, scene, camera);
    if (film) firstDraw(renderer, film.scene, camera);
  });
  const p: Prepared = Object.assign(owner, {
    stage,
    concept,
    theme,
    scene,
    built,
    ready,
    film,
    dead: false,
    drop: () => {
      if (p.dead) return;
      p.dead = true;
      pool.free(stage, p, () => {
        bsdf?.();
        disposeScene(scene);
        if (p.film) {
          disposeScene(p.film.scene);
          p.film.dispose();
        }
      });
    },
  });
  p.evict = p.drop;
  return p;
};

type Run = {
  concept: ConceptId;
  theme: Theme;
  // Settles once the scene is fully faded in (or never will be).
  shown: Promise<void>;
  stop: () => void;
  // Off screen, but its scene kept built on its stage for a quick return.
  park: () => Prepared | null;
  // Fades its canvas (from wherever it is) to an opacity.
  fadeTo: (to: number, ms: number) => Promise<void>;
  canvas: () => HTMLCanvasElement | null;
  stage: () => Stage | null;
};

/*
 * Hosts the active concept's three.js scene (concepts/<id>/scene.ts, loaded
 * on demand); seeks to ?t in seekreel renders. Every concept inherits the
 * same budget: phones, calm motion and the low perf tier paint one still
 * frame; elsewhere it runs at ~24fps only while the hero shows, the tab is
 * visible and the title is not busy animating ('vy:gl-busy').
 *
 * Scenes draw on long-lived renderers (stagePool). A concept swap's next
 * scene is built and compiled before the swap starts (lib/swapWarm), so
 * nothing heavy runs inside its view transition. A theme flip parks the
 * outgoing scene, so flipping back crossfades to it without a rebuild, and
 * a flip back before the new scene has faded in just fades it away again.
 */
export const GlField = ({ concept, theme, grain, chroma }: GlFieldProps) => {
  const host = useRef<HTMLDivElement>(null);
  // The scene on screen, and every run whose canvas is still up (the one on
  // screen last). A theme change builds the next one beside it and retires
  // the rest only once the next has drawn and faded in, so the swap never
  // shows an empty frame. A concept change instead fades the old scenes out
  // at once: their shapes belong to the previous concept and must not sit
  // over the new concept's art while the next scene loads.
  const shown = useRef<Run | null>(null);
  const runs = useRef<Run[]>([]);
  const shownConcept = useRef(concept);
  const pool = useRef<Stages | null>(null);
  // The next concept's scene, built ahead of its swap; the other theme's,
  // parked by the last theme flip.
  const next = useRef<Prepared | null>(null);
  const parked = useRef<Prepared | null>(null);
  const themeNow = useRef(theme);

  useEffect(() => {
    themeNow.current = theme;
  }, [theme]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let dead = false;
    const seek = seekTime();
    const instant = seek !== null || calmMotion();
    pool.current ??= stagePool(seek);
    const stages = pool.current;
    // Off screen: a scene of this concept is parked (a theme flip may come
    // back to it), any other is freed.
    const retire = (r: Run) => {
      runs.current = runs.current.filter((o) => o !== r);
      if (r.concept !== shownConcept.current) return r.stop();
      const p = r.park();
      if (!p) return;
      parked.current?.drop();
      parked.current = p;
    };
    if (shownConcept.current !== concept) {
      shownConcept.current = concept;
      const old = runs.current;
      runs.current = [];
      shown.current = null;
      parked.current?.drop();
      parked.current = null;
      old.forEach((r) => (instant ? r.stop() : void r.fadeTo(0, OUT_MS).then(r.stop)));
    }
    // A quick flip back: the scene it wants is still up under (or over) the
    // one that replaced it. Bring it back rather than build it again.
    const cur = shown.current;
    const back = runs.current.find((r) => r !== cur && r.concept === concept && r.theme === theme);
    if (back) {
      shown.current = back;
      runs.current = [...runs.current.filter((r) => r !== back), back];
      const others = runs.current.filter((r) => r !== back);
      const b = back.canvas();
      // Over the others: fade it back in. Under them: fade them away.
      const over = others.every((o) => {
        const c = o.canvas();
        return !c || !b || !!(c.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      });
      const ms = instant ? 0 : SWAP_FADE_MS;
      const done = over
        ? back.fadeTo(1, ms)
        : Promise.all([back.fadeTo(1, ms), ...others.map((o) => o.fadeTo(0, ms))]);
      void done.then(() => {
        if (shown.current === back) others.forEach(retire);
      });
      return;
    }
    void CONCEPT_LOADERS[concept]
      .scene()
      .then(({ scene }) => {
        if (dead) return;
        const prev = shown.current;
        // Built ahead (the swap's warm-up), or parked by a theme flip: no
        // build, its shaders already compiled.
        const fits = (p: Prepared | null) =>
          !!p && !p.dead && p.concept === concept && p.theme === theme;
        let warm: Prepared | null = null;
        if (fits(next.current)) {
          warm = next.current;
          next.current = null;
        } else if (fits(parked.current)) {
          warm = parked.current;
          parked.current = null;
        }
        // One built ahead for this concept in the other theme is stale.
        if (next.current?.concept === concept) {
          next.current.drop();
          next.current = null;
        }
        const r = run(el, stages, scene, concept, theme, seek, grain, chroma, prev, warm);
        shown.current = r;
        runs.current = [...runs.current, r];
        // The spare renderer, once the first scene is up.
        if (!prev && seek === null) void r.shown.then(() => whenIdle(stages.spare, 4000));
        // The rest go once the new scene has faded in over them.
        void r.shown.then(() => {
          if (shown.current === r) runs.current.filter((o) => o !== r).forEach(retire);
        });
      })
      .catch(() => {
        markLoaded('scene');
        if (seek !== null) releaseFrame('gl');
      });
    return () => {
      dead = true;
    };
  }, [concept, theme, grain, chroma]);

  // A swap about to happen (lib/swapWarm): build the next concept's scene on
  // a free renderer and start compiling it while the old page still shows.
  useEffect(() => {
    if (seekTime() !== null) return;
    return onSwapWarm(async (v) => {
      if (v === shownConcept.current) return;
      const { scene: def } = await CONCEPT_LOADERS[v].scene();
      const stages = pool.current;
      const t = themeNow.current;
      if (!stages || v === shownConcept.current) return;
      const have = next.current;
      if (have && !have.dead && have.concept === v && have.theme === t) return;
      have?.drop();
      const meta = CONCEPT_BY_ID[v];
      next.current = prepare(
        stages,
        false,
        shown.current?.stage() ?? null,
        def,
        v,
        t,
        meta.grain,
        meta.grainChroma ?? 0.35,
      );
      return next.current?.ready;
    });
  }, []);

  useEffect(
    () => () => {
      runs.current.forEach((r) => r.stop());
      runs.current = [];
      shown.current = null;
      next.current?.drop();
      next.current = null;
      parked.current?.drop();
      parked.current = null;
      pool.current?.dispose();
      pool.current = null;
    },
    [],
  );

  return <div ref={host} className="absolute inset-0" aria-hidden="true" />;
};

const run = (
  el: HTMLDivElement,
  pool: Stages,
  def: ConceptScene,
  concept: ConceptId,
  theme: Theme,
  seek: number | null,
  grain: number,
  chroma: number,
  prev: Run | null,
  warm: Prepared | null,
): Run => {
  const html = document.documentElement;
  let stopped = false;
  let job: Prepared | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let teardown = () => {};
  let cancel = () => {};
  let settle = () => {};
  const shown = new Promise<void>((r) => (settle = r));
  // Off screen; true when it had a scene to keep.
  const end = () => {
    if (stopped) return false;
    stopped = true;
    cancel();
    teardown();
    canvas = null;
    settle();
    return true;
  };
  const stop = () => {
    if (end()) job?.drop();
  };
  const park = () => {
    const p = job;
    if (!end() || !p || p.dead) return null;
    p.evict = p.drop;
    p.spare = true;
    return p;
  };
  const fadeTo = (to: number, ms: number) => {
    const c = canvas;
    if (!c) return Promise.resolve();
    const from = Number(getComputedStyle(c).opacity);
    c.getAnimations()
      .filter((a) => !(a instanceof CSSTransition))
      .forEach((a) => a.cancel());
    c.style.opacity = to === 1 ? '' : String(to);
    if (!ms || Math.abs(from - to) < 0.01) return Promise.resolve();
    return c
      .animate([{ opacity: from }, { opacity: to }], {
        duration: ms * Math.abs(to - from),
        easing: 'ease-out',
      })
      .finished.then(
        () => {},
        () => {},
      );
  };

  const begin = () => {
    if (stopped) return;
    let broken = false;
    try {
      job = warm ?? prepare(pool, true, prev?.stage() ?? null, def, concept, theme, grain, chroma);
    } catch {
      broken = true;
    }
    if (!job) {
      // No WebGL (a forced take only fails without any renderer): the CSS
      // blobs carry the backdrop alone.
      if (!broken) markFallback();
      markLoaded('scene');
      if (seek !== null) releaseFrame('gl');
      settle();
      return;
    }
    const own = job;
    own.evict = stop;
    own.spare = false;
    void own.ready.then(() => {
      if (stopped) return;
      // Drawn after the frame a view transition captures, never in it.
      if (seek !== null) show(own, own.film);
      else afterFrame(() => !stopped && show(own, own.film));
    });
  };

  const show = (p: Prepared, film: ReturnType<typeof grainPass> | null) => {
    const { renderer } = p.stage;
    const { scene } = p;
    const { camera, update } = p.built;
    // Its shaders are in: the stage's previous scene can go now.
    pool.settle(p.stage);
    const tier = glTier(0.55);
    const phone = tier.coarse || innerWidth < 640;
    const still = seek !== null || phone || calmMotion() || perfTier() === 'low';
    // Drawn at the screen's own resolution so the grain stays fine and the
    // shapes crisp: up to 2x for the one still frame phones paint (below), 1.5x
    // for a moving scene.
    // The host is shown overscaled (the parallax scale on .vy-scene, 1.14, and
    // the pointer drift's scale(1.04) on a moving canvas): the drawing buffer
    // takes that scale too, or the overscale upsamples it and softens the grain.
    const overscale = () => {
      const box = el.getBoundingClientRect().width / (el.clientWidth || 1);
      return (box > 1 ? box : 1) * (still ? 1 : 1.04);
    };
    const ratio = () =>
      seek !== null
        ? glTier(0.55).pixelRatio
        : (def.pixelArt ? 1 : Math.min(devicePixelRatio || 1, still ? 2 : 1.5)) * overscale();
    const cv = renderer.domElement;
    canvas = cv;
    // Stacked, so an outgoing scene can stay under the incoming one.
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
    const fade = seek === null && !calmMotion();
    if (fade) cv.style.opacity = '0';
    el.appendChild(cv);

    // Phones get one painted frame of the scene: a moving full-screen WebGL
    // layer behind scrolling content is the costliest thing on the page there.
    // The scene's clock runs only while the loop does: paused (the title
    // morphing, a swap, scrolled away) it holds, so resuming carries on from the
    // same frame instead of jumping ahead by the pause. It starts where the
    // last page's scene left off, so the drift carries across routes.
    let t0 = performance.now() - sceneElapsed() * 1000;
    let pausedAt = 0;
    const elapsed = () => ((pausedAt || performance.now()) - t0) / 1000;
    const draw = () => {
      update(seek ?? (still ? 6 : elapsed()), 0);
      renderer.render(scene, camera);
      if (film) {
        renderer.autoClear = false;
        film.apply(renderer);
        renderer.autoClear = true;
      }
    };

    // Sized to its host (fixed, full viewport): drawing-buffer size, pixel
    // ratio (re-clamped, so a DPR or zoom change never leaves it blurry or
    // oversized) and the camera's projection, keeping the orthographic
    // camera's own height. The scene itself is never rebuilt.
    const half = camera instanceof THREE.OrthographicCamera ? (camera.top - camera.bottom) / 2 : 0;
    let sized = { w: 0, h: 0, dpr: 0 };
    const was = new THREE.Vector2();
    const size = () => {
      const { clientWidth: w, clientHeight: h } = el;
      const dpr = ratio();
      if (!w || !h || (w === sized.w && h === sized.h && dpr === sized.dpr)) return false;
      sized = { w, h, dpr };
      // The stage may already be this size (its last scene drew at it):
      // re-sizing reallocates the drawing buffer, so only when it changed,
      // in one step.
      renderer.getSize(was);
      if (was.x !== w || was.y !== h || renderer.getPixelRatio() !== dpr)
        renderer.setDrawingBufferSize(w, h, dpr);
      film?.fit(renderer);
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
    // Nor does the parallax overscale switching on or off (a class on <html>).
    const scaled = new MutationObserver(resize);
    scaled.observe(html, { attributes: true, attributeFilter: ['class'] });

    // Desktop parallax is a CSS transform on the canvas, not a re-render.
    const move = (e: PointerEvent) => {
      const x = (e.clientX / innerWidth - 0.5) * -24;
      cv.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0) scale(1.04)`;
    };
    if (!still) {
      // Overscaled from the start, so the buffer (sized for scale(1.04)) is
      // never shown at a fractional, unmatched scale before the first move.
      cv.style.transform = 'translate3d(0px, 0, 0) scale(1.04)';
      cv.style.transition = 'transform 1.2s cubic-bezier(0.2, 0.7, 0.2, 1)';
      addEventListener('pointermove', move, { passive: true });
    }

    // Run only while it shows: the tab is visible and the hero is in view
    // (past it the scene is a faint wash). Otherwise cancel the loop outright.
    let raf = 0;
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
      if (visible && !raf) {
        if (pausedAt) t0 += performance.now() - pausedAt;
        pausedAt = 0;
        raf = requestAnimationFrame(tick);
      }
      if (!visible && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
        pausedAt = performance.now();
      }
    };
    draw();
    // Fade only once the first frame is on screen: the draw reaches the
    // compositor a frame after it is issued. Opacity is composited, so the
    // fade costs no repaint. Shown (and the scenes under it free to go) once
    // the fade has finished.
    let fading = 0;
    if (fade) {
      fading = requestAnimationFrame(() => {
        fading = requestAnimationFrame(() => {
          fading = 0;
          void fadeTo(1, prev ? SWAP_FADE_MS : FADE_MS).then(settle);
        });
      });
    } else settle();
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
    const keep = () => !still && seek === null && keepSceneElapsed(elapsed());
    addEventListener('pagehide', keep);
    teardown = () => {
      keep();
      removeEventListener('pagehide', keep);
      cancelAnimationFrame(raf);
      cancelAnimationFrame(pending);
      cancelAnimationFrame(fading);
      ro.disconnect();
      mo.disconnect();
      scaled.disconnect();
      document.removeEventListener('visibilitychange', sync);
      document.removeEventListener('vy:gl-busy', onBusy);
      document.removeEventListener('vy:perf', sync);
      removeEventListener('resize', resize);
      removeEventListener('pointermove', move);
      cv.getAnimations().forEach((a) => a.cancel());
      cv.remove();
    };
  };

  // A scene built ahead is ready to go. Otherwise it is built at once,
  // except inside a concept swap (its view transition's update), where the
  // build waits for idle time.
  if (warm || seek !== null || !html.hasAttribute('data-swapping')) begin();
  else cancel = whenIdle(begin, 300);
  return {
    concept,
    theme,
    shown,
    stop,
    park,
    fadeTo,
    canvas: () => canvas,
    stage: () => job?.stage ?? null,
  };
};
