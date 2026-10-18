import * as THREE from 'three';
import { Earcut } from 'three/src/extras/Earcut.js';

import { CONCEPT_BY_ID, CONCEPT_LOADERS, type ConceptId } from '@/concepts';
import type { Built } from '@/concepts/types';
import { blendMorph, loadMorph, morphTrack, planMorph, type MorphData } from '@/lib/glyphMorph';
import { glTier } from '@/lib/glTier';
import { kickGlitch, lensLive, onLensTick } from '@/lib/lens';
import { glitchOn } from '@/lib/lensGlitch';
import {
  disposePool,
  letterShadow,
  loadLook,
  lookPool,
  poolSize,
  type LetterInk,
  type LetterLook,
} from '@/lib/letterLook';
import { morphMesh } from '@/lib/morphMesh';
import { perfTier } from '@/lib/perfTier';
import { lookAt } from '@/lib/titleTiming';

/*
 * The Lens's 3D pass, inside the title's own canvas (one renderer): through
 * the doorway the word is drawn again in the lens concept's faces and
 * materials, over that concept's three.js scene, clipped to the door with
 * the stencil buffer. A letter the door's edge cuts is half one design, half
 * the other: both halves wear one shared morphing outline (lib/glyphMorph,
 * lib/morphMesh) blended from the page's face to the lens face by how much of
 * the letter is inside the door, and placed between the two concepts'
 * layouts; only the material changes at the edge, crisply. The door's outline
 * (with the glitch's band slices and dropouts, from components/Lens.tsx) is
 * the stencil, so the 2D layer and the 3D letters are cut identically.
 *
 * Attached by Letters3D (attachLens); renders only while the door is shown
 * on a desktop at the high perf tier and the title is not mid-reveal.
 */

export type LensHostLetter = {
  ch: string;
  holder: THREE.Object3D;
  mesh: THREE.Mesh;
  extra: THREE.Mesh;
};

export type LensHost = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  // The canvas host (the size of the hero title card) and the page's 2D word.
  el: HTMLDivElement;
  word: HTMLDivElement;
  letters: LensHostLetter[];
  // The page's shadow-catching backdrop.
  backdrop: THREE.Mesh;
  // Final face per letter, and the extrusion the title uses.
  final: number[];
  em: number;
  depth: number;
  bevel: number;
  phone: boolean;
  // Card px -> scene units, read at render time.
  unit: () => number;
  // A full repaint (it calls LensPass.render first).
  paint: () => void;
};

export type LensPass = { render: () => boolean; dispose: () => void };

type Slot = { m: number[]; base: number; box: [number, number, number, number]; fit: number };

type LensLetter = {
  track: ReturnType<typeof morphTrack>;
  morph: ReturnType<typeof morphMesh>;
  // The lens face and the morph progress last written.
  face: number;
  e: number;
  holder: THREE.Object3D;
  // The page's material on the morphing outline (outside the door), and the
  // lens concept's (inside).
  outer: THREE.Mesh;
  outerExtra: THREE.Mesh;
  inner: THREE.Mesh;
  innerExtra: THREE.Mesh;
  // Colour-split copies (glitch only).
  split: [THREE.Mesh, THREE.Mesh];
};

const matrixOf = (el: Element) => {
  const t = getComputedStyle(el).transform;
  return t && t !== 'none' ? new DOMMatrixReadOnly(t) : new DOMMatrixReadOnly();
};

// Where each 2D slot of a word sits (Letters3D's layout, card px): its
// holder matrix in scene units, baseline, box and size.
const slotsOf = (word: HTMLElement, W: number, H: number, unit: number): Slot[] => {
  const tm = matrixOf(word);
  const tcx = word.offsetLeft + word.offsetWidth / 2;
  const tcy = word.offsetTop + word.offsetHeight / 2;
  return [...word.children].map((node) => {
    const s = node as HTMLElement;
    const sm = matrixOf(s);
    const mark = s.querySelector('[data-base]') as HTMLElement | null;
    const w = s.offsetWidth;
    const h = s.offsetHeight;
    const lx = s.offsetLeft + w / 2 - word.offsetWidth / 2 + sm.e;
    const ly = s.offsetTop + h / 2 - word.offsetHeight / 2 + sm.f;
    const m = tm.multiply(sm);
    const cx = tcx + tm.a * lx + tm.c * ly + tm.e;
    const cy = tcy + tm.b * lx + tm.d * ly + tm.f;
    return {
      m: [m.a, -m.c, 0, (cx - W / 2) / unit, -m.b, m.d, 0, -(cy - H / 2) / unit],
      base: (mark?.offsetTop ?? h) - h / 2,
      box: [cx - w / 2, cy - h / 2, w, h],
      fit: w,
    };
  });
};

// The 2D letter's colours for its 3D look (as Letters3D reads them).
const inkOf = (s: Element, word: Element): LetterInk => {
  const face = getComputedStyle(s).color;
  const drop = getComputedStyle(word)
    .textShadow.split(/,(?![^(]*\))/)
    .map((t) => t.trim())
    .find((t) => /^rgba?\([^)]*\) 0px [1-9]/.test(t));
  return { face, side: drop?.match(/^rgba?\([^)]*\)/)?.[0] ?? face };
};

// Any CSS colour as [r, g, b, a] (0..1), via a 1px canvas.
let probe: CanvasRenderingContext2D | null = null;
const rgbaOf = (css: string): [number, number, number, number] => {
  probe ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!probe) return [0, 0, 0, 0];
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = '#0000';
  probe.fillStyle = css;
  probe.fillRect(0, 0, 1, 1);
  const d = probe.getImageData(0, 0, 1, 1).data;
  return [d[0] / 255, d[1] / 255, d[2] / 255, d[3] / 255];
};

// The lens concept's typeface per letter: a face this letter morphs into
// cleanly from its page face, picked per concept (stable, reproducible).
const lensFace = (data: MorphData, ch: string, from: number, id: string, i: number) => {
  const ok = data.ok[ch];
  const options: number[] = [];
  for (let f = 0; f < data.faces; f++) if (f !== from && ok[from * data.faces + f]) options.push(f);
  if (!options.length) return from;
  const h = (Math.imul(id.charCodeAt(0) + 1, 2654435761) ^ Math.imul(i + 3, 40503)) >>> 0;
  return options[h % options.length];
};

const smooth = (u: number) => {
  const v = Math.min(1, Math.max(0, u));
  return v * v * (3 - 2 * v);
};

const setStencil = (m: THREE.Material, func: THREE.StencilFunc | null) => {
  if (func === null) {
    if (!m.stencilWrite) return;
    m.stencilWrite = false;
    m.stencilFunc = THREE.AlwaysStencilFunc;
    return;
  }
  m.stencilWrite = true;
  m.stencilFunc = func;
  m.stencilRef = 1;
  m.stencilFuncMask = 0xff;
  m.stencilWriteMask = 0;
  m.stencilFail = m.stencilZFail = m.stencilZPass = THREE.KeepStencilOp;
};
const eachMat = (m: THREE.Material | THREE.Material[], f: (m: THREE.Material) => void) =>
  Array.isArray(m) ? m.forEach(f) : f(m);

const NDC_VERT = 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }';

export const attachLens = (host: LensHost): LensPass => {
  const { renderer, camera } = host;
  const html = document.documentElement;
  let disposed = false;
  let busy = false;
  let data: MorphData | null = null;
  void loadMorph()
    .then((d) => (data = d))
    .catch(() => {});

  // ---- The stencil: the door's outline, triangulated (card px -> NDC). ----
  const CAP = 1024;
  const maskPos = new Float32Array(CAP * 3);
  const maskGeo = new THREE.BufferGeometry();
  maskGeo.setAttribute(
    'position',
    new THREE.BufferAttribute(maskPos, 3).setUsage(THREE.DynamicDrawUsage),
  );
  maskGeo.setIndex(
    new THREE.BufferAttribute(new Uint16Array(CAP * 3), 1).setUsage(THREE.DynamicDrawUsage),
  );
  const maskMat = new THREE.ShaderMaterial({
    vertexShader: NDC_VERT,
    fragmentShader: 'void main() { gl_FragColor = vec4(0.0); }',
    colorWrite: false,
    depthWrite: false,
    depthTest: false,
    stencilWrite: true,
    stencilRef: 1,
    stencilFunc: THREE.AlwaysStencilFunc,
    stencilZPass: THREE.ReplaceStencilOp,
  });
  const mask = new THREE.Mesh(maskGeo, maskMat);
  mask.frustumCulled = false;
  const maskScene = new THREE.Scene();
  maskScene.add(mask);
  const updateMask = (W: number, H: number) => {
    const flat: number[] = [];
    const holes: number[] = [];
    const add = (ring: [number, number][]) =>
      ring.forEach(([x, y]) => flat.push((x / W) * 2 - 1, 1 - (y / H) * 2));
    add(lensLive.outline);
    lensLive.holes.forEach((h) => {
      holes.push(flat.length / 2);
      add(h);
    });
    const n = Math.min(CAP, flat.length / 2);
    for (let i = 0; i < n; i++) {
      maskPos[i * 3] = flat[i * 2];
      maskPos[i * 3 + 1] = flat[i * 2 + 1];
      maskPos[i * 3 + 2] = 0;
    }
    const tri = Earcut.triangulate(flat.slice(0, n * 2), holes.length ? holes : undefined, 2);
    const idx = maskGeo.index!;
    const count = Math.min(tri.length, CAP * 3);
    for (let i = 0; i < count; i++) idx.setX(i, tri[i]);
    maskGeo.setDrawRange(0, count);
    maskGeo.attributes.position.needsUpdate = true;
    idx.needsUpdate = true;
  };

  // ---- The hero tint over the lens scene (the card's own background). ----
  const tintMat = new THREE.ShaderMaterial({
    uniforms: { uC: { value: new THREE.Vector4(0, 0, 0, 0) } },
    vertexShader: NDC_VERT,
    fragmentShader: 'uniform vec4 uC; void main() { gl_FragColor = uC; }',
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  setStencil(tintMat, THREE.EqualStencilFunc);
  const tint = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), tintMat);
  tint.frustumCulled = false;
  const tintScene = new THREE.Scene();
  tintScene.add(tint);

  // ---- The lens scene's frame, rendered small and laid into the door. ----
  const rt = new THREE.WebGLRenderTarget(1, 1);
  const copyMat = new THREE.ShaderMaterial({
    uniforms: { tMap: { value: rt.texture } },
    vertexShader:
      'varying vec2 vUv; void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader:
      'uniform sampler2D tMap; varying vec2 vUv; void main() { gl_FragColor = texture2D(tMap, vUv); }',
    transparent: true,
    premultipliedAlpha: true,
    depthTest: false,
    depthWrite: false,
  });
  setStencil(copyMat, THREE.EqualStencilFunc);
  const copy = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), copyMat);
  copy.frustumCulled = false;
  const copyScene = new THREE.Scene();
  copyScene.add(copy);

  // ---- The lens concept's letters, shadow, scene. ----
  const group = new THREE.Group();
  host.scene.add(group);
  const shadowMat = new THREE.ShadowMaterial({ transparent: true, depthWrite: false });
  setStencil(shadowMat, THREE.EqualStencilFunc);
  const shadow = new THREE.Mesh(host.backdrop.geometry, shadowMat);
  shadow.receiveShadow = true;
  group.add(shadow);
  const splitMats = [0, 1].map(() => {
    // Strictly behind: at equal depth the real lens letter stays on top.
    const m = new THREE.MeshBasicMaterial({ color: '#000', depthFunc: THREE.LessDepth });
    setStencil(m, THREE.EqualStencilFunc);
    return m;
  });

  let id: ConceptId | null = null;
  let letters: LensLetter[] = [];
  let pools: LetterLook[][] = [];
  let ready = false;
  let pageSlots: Slot[] = [];
  let lensSlots: Slot[] = [];
  let laid = '';
  let lensScene: { scene: THREE.Scene; built: Built; colors: string[] } | null = null;
  let sceneT0 = performance.now();
  let tintRGBA: [number, number, number, number] = [0, 0, 0, 0];

  const disposeLetters = () => {
    letters.forEach((l) => {
      group.remove(l.holder);
      l.morph.geo.dispose();
    });
    letters = [];
    pools.forEach(disposePool);
    pools = [];
  };
  const disposeScene = () => {
    lensScene?.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      if (m.material) eachMat(m.material, (mat) => mat.dispose());
    });
    lensScene = null;
  };

  const n = poolSize(host.phone);
  const dark = () => html.dataset.theme === 'dark';

  // Dress the lens letters in the lens concept's looks, from its 2D word.
  let dressedFor: HTMLElement | null = null;
  // The lens hero has taken the lens concept (React may lag a frame behind).
  const replicaIs = (want: string | null) =>
    !!lensLive.word &&
    lensLive.word.closest('.vy-lens-root')?.getAttribute('data-variant') === want;
  const dress = () => {
    const word = lensLive.word;
    if (!word || !id || !letters.length || !replicaIs(id)) return;
    dressedFor = word;
    pools.forEach(disposePool);
    const els = [...word.children];
    pools = letters.map((_, i) => lookPool(id!, inkOf(els[i] ?? word, word), dark(), host.phone));
    letters.forEach((l, i) => {
      const look = pools[i][lookAt(null, i, n)];
      l.inner.material = look.body;
      l.innerExtra.visible = !!look.extra;
      if (look.extra) l.innerExtra.material = look.extra;
      l.innerExtra.position.set(...look.offset);
      eachMat(l.inner.material, (m) => setStencil(m, THREE.EqualStencilFunc));
      if (look.extra) setStencil(look.extra, THREE.EqualStencilFunc);
    });
    const shade = letterShadow(id, dark());
    shadowMat.color.set(shade.color);
    shadowMat.opacity = shade.opacity;
    const sw = CONCEPT_BY_ID[id].swatch[dark() ? 'dark' : 'light'];
    splitMats[0].color.set(sw[0]);
    splitMats[1].color.set(sw[2] ?? sw[1]);
    // The card's tint, laid over the lens scene as on the page.
    const card = word.closest('[data-hero-title]');
    tintRGBA = card ? rgbaOf(getComputedStyle(card).backgroundColor) : [0, 0, 0, 0];
    tintMat.uniforms.uC.value.set(...tintRGBA);
    // Compile now, not mid-move.
    const was = group.visible;
    group.visible = true;
    renderer.compile(host.scene, camera);
    group.visible = was;
  };

  const build = (next: ConceptId) => {
    disposeLetters();
    disposeScene();
    ready = false;
    dressedFor = null;
    id = next;
    const d = data;
    if (!d) return;
    letters = host.letters.map((hl, i) => {
      const track = morphTrack(d, hl.ch);
      const face = lensFace(d, hl.ch, host.final[i], next, i);
      planMorph(d, track, host.final[i], face);
      const morph = morphMesh(track, {
        em: host.em,
        depth: host.depth,
        bevel: host.bevel,
        inset: host.bevel * 0.7,
        stride: host.phone ? 2 : 1,
      });
      const holder = new THREE.Object3D();
      holder.matrixAutoUpdate = false;
      const mk = (shadowed: boolean) => {
        const m = new THREE.Mesh(morph.geo);
        m.frustumCulled = false;
        m.castShadow = shadowed;
        holder.add(m);
        return m;
      };
      const outer = mk(true);
      const inner = mk(false);
      // A look's extra layer rides its letter, as in Letters3D.
      const extraOf = (parent: THREE.Mesh) => {
        const m = new THREE.Mesh(morph.geo);
        m.frustumCulled = false;
        m.renderOrder = -1;
        parent.add(m);
        return m;
      };
      const outerExtra = extraOf(outer);
      const innerExtra = extraOf(inner);
      const split = [0, 1].map(() => {
        const m = mk(false);
        m.material = splitMats[0];
        m.layers.set(1);
        return m;
      }) as [THREE.Mesh, THREE.Mesh];
      group.add(holder);
      return { track, morph, face, e: -1, holder, outer, outerExtra, inner, innerExtra, split };
    });
    group.visible = false;
    void loadLook(next)
      .catch(() => null)
      .then(() => {
        if (disposed || id !== next) return;
        laid = '';
        dress();
        ready = true;
        if (lensLive.shown) host.paint();
      });
    // The scene, desktop only: when it arrives it shows under the letters.
    void CONCEPT_LOADERS[next]
      .scene()
      .then(({ scene: def }) => {
        if (disposed || id !== next) return;
        const sc = new THREE.Scene();
        const colors = def.colors[dark() ? 'dark' : 'light'];
        const built = def.build(sc, colors);
        lensScene = { scene: sc, built, colors };
        sceneT0 = performance.now();
      })
      .catch(() => {});
  };

  // Both words' layouts (on show, resize, theme or concept change).
  const layout = () => {
    const word = lensLive.word;
    const W = host.el.clientWidth;
    const H = host.el.clientHeight;
    const key = `${W}x${H}:${id}:${html.dataset.theme}:${!!word}`;
    if (key === laid || !word) return;
    laid = key;
    const unit = host.unit();
    pageSlots = slotsOf(host.word, W, H, unit);
    lensSlots = slotsOf(word, W, H, unit);
    const d = data;
    if (!d) return;
    letters.forEach((l, i) => {
      // The lens face fitted to its slot, as the title fits a wide face.
      const adv = d.glyphs[l.face][host.letters[i].ch].adv * (unit * host.em);
      lensSlots[i].fit = Math.min(1, lensSlots[i].fit / Math.max(1, Math.round(adv)));
      l.e = -1;
    });
  };

  // How much of a page letter's box the door covers, 0..1.
  const cover = (box: Slot['box']) => {
    const r = lensLive.rect;
    const ox = Math.max(0, Math.min(box[0] + box[2], r.x + r.w) - Math.max(box[0], r.x));
    const oy = Math.max(0, Math.min(box[1] + box[3], r.y + r.h) - Math.max(box[1], r.y));
    return (ox * oy) / Math.max(1, box[2] * box[3]);
  };

  const active = () =>
    !disposed &&
    lensLive.shown &&
    lensLive.mode !== 'touch' &&
    !host.phone &&
    !busy &&
    perfTier() !== 'low' &&
    ready &&
    replicaIs(id) &&
    id === lensLive.id &&
    html.dataset.variant !== id;

  const restore: (() => void)[] = [];
  const hide = (o: THREE.Object3D) => {
    if (!o.visible) return;
    o.visible = false;
    restore.push(() => (o.visible = true));
  };
  const outside = (m: THREE.Material | THREE.Material[]) =>
    eachMat(m, (mat) => {
      setStencil(mat, THREE.NotEqualStencilFunc);
      restore.push(() => setStencil(mat, null));
    });

  const render = () => {
    if (lensLive.id && lensLive.id !== id && data) build(lensLive.id);
    if (!active()) {
      lensLive.gl = false;
      lensLive.scene = false;
      group.visible = false;
      return false;
    }
    if (dressedFor !== lensLive.word) {
      laid = '';
      dress();
    }
    layout();
    const W = host.el.clientWidth;
    const H = host.el.clientHeight;
    updateMask(W, H);
    const glitch = lensLive.glitch;
    // Per letter: how far into the door, and the shared outline at that blend.
    letters.forEach((l, i) => {
      const hl = host.letters[i];
      const ps = pageSlots[i];
      const ls = lensSlots[i] ?? ps;
      const raw = smooth((cover(ps.box) - 0.04) / 0.92);
      const e = Math.round(raw * 48) / 48;
      if (l.e >= 0 && l.e < 0.5 !== e < 0.5 && glitchOn()) kickGlitch('rim');
      if (e !== l.e) {
        blendMorph(l.track, e);
        l.morph.update();
        l.e = e;
      }
      const m = l.holder.matrix;
      const a = ps.m;
      const b = ls.m;
      const mix = (k: number) => a[k] + (b[k] - a[k]) * e;
      m.set(mix(0), mix(1), 0, mix(3), mix(4), mix(5), 0, mix(7), 0, 0, 1, 0, 0, 0, 0, 1);
      l.holder.matrixWorldNeedsUpdate = true;
      const unit = host.unit();
      const base = ps.base + (ls.base - ps.base) * e;
      const k = 1 + (ls.fit - 1) * e;
      [l.outer, l.inner, ...l.split].forEach((mesh) => {
        mesh.scale.setScalar(k);
        mesh.position.y = (-base * k) / unit;
      });
      // Fully outside: the page's own letter draws (and casts) as usual.
      const crossing = e > 0;
      l.holder.visible = crossing;
      if (crossing) {
        hide(hl.mesh);
        l.outer.material = hl.mesh.material;
        l.outerExtra.visible = hl.extra.visible;
        l.outerExtra.material = hl.extra.material;
        l.outerExtra.position.copy(hl.extra.position);
      }
      // The face flicker: the lens letters drop out for one frame.
      if (glitch.flicker) hide(l.inner);
    });
    // The page side: everything that is not the lens draws outside the door.
    host.letters.forEach((hl) => {
      outside(hl.mesh.material);
      outside(hl.extra.material);
    });
    letters.forEach((l) => {
      outside(l.outer.material);
      outside(l.outerExtra.material);
    });
    outside(host.backdrop.material);
    shadow.position.copy(host.backdrop.position);
    shadow.scale.copy(host.backdrop.scale);
    group.visible = true;

    const sceneOn = !!lensScene && !lensLive.fast;
    lensLive.gl = true;
    lensLive.scene = sceneOn;
    const autoClear = renderer.autoClear;
    const autoShadow = renderer.shadowMap.autoUpdate;
    renderer.autoClear = false;
    renderer.clear(true, true, true);
    renderer.shadowMap.autoUpdate = false;
    const shadowDue = renderer.shadowMap.needsUpdate;
    renderer.shadowMap.needsUpdate = false;
    renderer.render(maskScene, camera);
    if (sceneOn && lensScene) {
      // Laid out as the page's full-screen backdrop: the viewport mapped
      // into this card-sized canvas.
      const r = lensLive.card;
      const vw = innerWidth;
      const vh = innerHeight;
      const cam = lensScene.built.camera;
      if (cam instanceof THREE.PerspectiveCamera) cam.aspect = vw / vh;
      if (cam instanceof THREE.OrthographicCamera) {
        const half = (5 * vw) / vh;
        cam.left = -half;
        cam.right = half;
      }
      (cam as THREE.PerspectiveCamera).updateProjectionMatrix();
      lensScene.built.update((performance.now() - sceneT0) / 1000, 0);
      // At the backdrop's own resolution (GlField renders at ~0.55x, and
      // the scenes' screen-space patterns are sized in its pixels), then
      // laid into the door.
      const pr = glTier(0.55).pixelRatio;
      const rw = Math.max(1, Math.ceil(W * pr));
      const rh = Math.max(1, Math.ceil(H * pr));
      if (rt.width !== rw || rt.height !== rh) rt.setSize(rw, rh);
      rt.viewport.set(-r.left * pr, (r.top + H - vh) * pr, vw * pr, vh * pr);
      const tone = renderer.toneMapping;
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.setRenderTarget(rt);
      renderer.setClearColor(0x000000, 0);
      renderer.clear(true, true, false);
      renderer.render(lensScene.scene, cam);
      renderer.setRenderTarget(null);
      renderer.toneMapping = tone;
      renderer.render(copyScene, camera);
      if (tintRGBA[3] > 0) renderer.render(tintScene, camera);
      renderer.clearDepth();
    }
    renderer.shadowMap.needsUpdate = shadowDue;
    renderer.render(host.scene, camera);
    renderer.shadowMap.needsUpdate = false;
    // The colour split: two flat copies of the lens letters, offset sideways,
    // drawn behind them (depth keeps the real letters on top).
    if (glitch.split > 0) {
      const unit = host.unit();
      camera.layers.set(1);
      [-1, 1].forEach((side, k) => {
        letters.forEach((l) => {
          if (l.e <= 0) return;
          l.split.forEach((s, j) => (s.visible = j === k));
          l.split[k].material = splitMats[k];
          l.holder.matrix.elements[12] += (side * glitch.split) / unit;
          l.holder.matrixWorldNeedsUpdate = true;
        });
        renderer.render(host.scene, camera);
        letters.forEach((l) => {
          if (l.e <= 0) return;
          l.holder.matrix.elements[12] -= (side * glitch.split) / unit;
          l.holder.matrixWorldNeedsUpdate = true;
        });
      });
      camera.layers.set(0);
    }
    renderer.autoClear = autoClear;
    renderer.shadowMap.autoUpdate = autoShadow;
    restore.forEach((r) => r());
    restore.length = 0;
    return true;
  };

  // Repaint in the same frame the door moved (the UI's loop calls lensTick).
  let wasShown = false;
  const offTick = onLensTick(() => {
    if (disposed || busy) return;
    const shown = lensLive.shown && !host.phone;
    if (shown !== wasShown) {
      wasShown = shown;
      // The title's cursor lean stops while the door is up (the door tilts
      // instead), at once so the stencil lines up with the 2D layer.
      host.el.style.transition = shown ? 'opacity 0.6s ease-out' : '';
      if (shown) host.el.style.transform = '';
      laid = '';
    }
    if (shown || lensLive.gl) host.paint();
  });
  const onBusy = (e: Event) => {
    busy = !!(e as CustomEvent<{ busy: boolean }>).detail?.busy;
  };
  document.addEventListener('vy:gl-busy', onBusy);
  const mo = new MutationObserver(() => {
    laid = '';
    if (id && ready) dress();
  });
  mo.observe(html, { attributes: true, attributeFilter: ['data-theme'] });
  const onResize = () => (laid = '');
  addEventListener('resize', onResize);

  return {
    render,
    dispose: () => {
      disposed = true;
      offTick();
      mo.disconnect();
      document.removeEventListener('vy:gl-busy', onBusy);
      removeEventListener('resize', onResize);
      disposeLetters();
      disposeScene();
      host.scene.remove(group);
      maskGeo.dispose();
      maskMat.dispose();
      tintMat.dispose();
      rt.dispose();
      copyMat.dispose();
      copy.geometry.dispose();
      tint.geometry.dispose();
      shadowMat.dispose();
      splitMats.forEach((m) => m.dispose());
    },
  };
};

// While the door is up the title's cursor lean holds still.
export const lensHoldsTitle = () => lensLive.shown;
