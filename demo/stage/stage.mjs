// The SeekReel stage: draws one moment of the film from ?t=.
//
// The screen is SeekReel footage (the recording, cut by edit.mjs); the rest is
// overlays drawn from timeline.json. Everything visible is a pure function of
// t, so any frame renders the same on its own. No CSS transitions anywhere.
import { time, span as spanAt, ease, shown, punchIn, captionAt, loadFootage, markReady } from '/_seekreel/stage.js';
import { drawCards } from './cards.mjs';

const t = time();
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const span = (a, b) => spanAt(a, b, t);
const window_ = (a, b, f = 0.4) => shown(a, b, f, t);
const el = (tag, cls, html) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html != null) node.innerHTML = html;
  return node;
};
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

/** The zoom click nearest its peak at t, for the vertical crop's y. */
function zoomAt(clicks) {
  let best = { k: 0, x: 960, y: 540 };
  for (const c of clicks) {
    if (!c.zoom) continue;
    const k = Math.min(ease(span(c.t - 0.9, c.t - 0.2)), 1 - ease(span(c.t + 0.8, c.t + 1.5)));
    if (k > best.k) best = { k, x: c.x, y: c.y };
  }
  return best;
}

/** Vertical crop: follow the cursor's last target, gliding between clicks. */
function focusX(clicks) {
  let x = 960;
  for (const c of clicks) {
    if (c.t - 0.9 > t) break;
    x = x + (c.x - x) * ease(span(c.t - 0.9, c.t - 0.1));
  }
  return clamp(x, 540, 1380);
}


// ------------------------------------------------------------------ cursor
//
// The cursor is drawn here from the recorded path, never filmed. Everything
// is a pure function of t: the spring below is re-simulated from a second
// before t on every frame, so frame N is the same whether rendered alone or
// in sequence.

/** The recorded path at time s: linear between samples. */
function pathAt(path, s) {
  if (!path.length) return null;
  if (s <= path[0][0]) return { x: path[0][1], y: path[0][2] };
  let lo = 0, hi = path.length - 1;
  if (s >= path[hi][0]) return { x: path[hi][1], y: path[hi][2] };
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (path[mid][0] <= s) lo = mid; else hi = mid;
  }
  const [t0, x0, y0] = path[lo], [t1, x1, y1] = path[hi];
  const k = t1 > t0 ? (s - t0) / (t1 - t0) : 0;
  return { x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k };
}

/**
 * A slightly under-damped spring chasing the path: moves land with a small,
 * satisfying settle instead of stopping dead. Returns position and velocity.
 */
function springAt(path, at, { freq = 7.5, damping = 0.72, lookback = 1.2, hz = 240 } = {}) {
  const start = pathAt(path, at - lookback);
  if (!start) return null;
  let x = start.x, y = start.y, vx = 0, vy = 0;
  const w = 2 * Math.PI * freq, dt = 1 / hz;
  for (let s = at - lookback; s < at; s += dt) {
    const target = pathAt(path, s);
    const ax = w * w * (target.x - x) - 2 * damping * w * vx;
    const ay = w * w * (target.y - y) - 2 * damping * w * vy;
    vx += ax * dt; vy += ay * dt;
    x += vx * dt; y += vy * dt;
  }
  return { x, y, vx, vy };
}

/** Press squash: down before the click, a springy rebound after it. */
function pressScale(presses, at) {
  let scale = 1;
  for (const p of presses) {
    const start = p.t - 0.09, end = p.t + Math.max(0, p.hold) ;
    if (at < start || at > end + 0.6) continue;
    if (at <= p.t) scale = Math.min(scale, 1 - 0.2 * ease(clamp((at - start) / 0.09)));
    else if (at <= end) scale = Math.min(scale, 0.8 + 0.06 * ease(clamp((at - p.t) / 0.15)));
    else {
      // Damped rebound: 0.8/0.86 → overshoot ~1.08 → 1.
      const k = (at - end) / 0.6;
      const from = p.hold > 0 ? 0.86 : 0.8;
      const rebound = 1 - (1 - from) * Math.exp(-6 * k) * Math.cos(10 * k);
      scale = Math.min(scale, rebound);
    }
  }
  return scale;
}

const ARROW =
  '<svg viewBox="0 0 32 32" width="58" height="58" aria-hidden="true">' +
  '<path d="M6 3.5 L25.5 18.2 L16.4 19.6 L21.6 28.6 L17.6 30.6 L12.5 21.6 L6 27.6 Z" ' +
  'fill="#0d0d10" stroke="#ffffff" stroke-width="2.4" stroke-linejoin="round"/></svg>';

/** Draw the cursor, its trail and click ripples into `layer` (recording pixels). */
function drawCursor(layer, cursor) {
  if (!cursor?.path?.length || t < cursor.path[0][0]) return;
  const now = springAt(cursor.path, t);
  if (!now) return;
  const speed = Math.hypot(now.vx, now.vy);

  // Ripples: two rings per press, the second a beat later.
  for (const p of cursor.presses) {
    for (const [delay, size, width] of [[0, 92, 5], [0.09, 64, 3]]) {
      const k = (t - p.t - delay) / 0.65;
      if (k < 0 || k > 1) continue;
      const ring = el('div', 'ripple');
      const d = 16 + size * (1 - Math.pow(1 - k, 3));
      Object.assign(ring.style, {
        left: `${p.x - d / 2}px`, top: `${p.y - d / 2}px`, width: `${d}px`, height: `${d}px`,
        borderWidth: `${width * (1 - k * 0.6)}px`, opacity: String(1 - k),
      });
      layer.append(ring);
    }
  }

  // Motion trail: ghosts a few milliseconds behind, only while moving fast.
  const trail = clamp((speed - 600) / 1800);
  if (trail > 0) {
    for (let i = 4; i >= 1; i--) {
      const g = springAt(cursor.path, t - i * 0.014);
      if (!g) continue;
      const ghost = el('div', 'cursor ghost', ARROW);
      ghost.style.transform = `translate(${g.x - 11}px, ${g.y - 7}px)`;
      ghost.style.opacity = String(trail * (0.32 - i * 0.06));
      layer.append(ghost);
    }
  }

  // The cursor: tilts into its motion, squashes on press.
  const tilt = clamp(now.vx / 160, -1, 1) * 10;
  const scale = pressScale(cursor.presses, t);
  const arrow = el('div', 'cursor', ARROW);
  arrow.style.transform = `translate(${now.x - 11}px, ${now.y - 7}px) rotate(${tilt}deg) scale(${scale})`;
  layer.append(arrow);
}

const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export async function mount(layout, theme = 'light') {
  document.body.classList.add(layout, theme);
  const tl = await (await fetch(`../timeline.${theme}.json`)).json();
  const film = await loadFootage(`../build/${theme}/footage`);
  const tall = layout === 'tall';
  const scene = tl.scenes.find((s) => t >= s.start && t < s.end) ?? tl.scenes.at(-1);

  // ---------------------------------------------------------------- screen
  const screen = el('div', 'screen');
  const lens = el('div', 'lens');
  // The shot carries the zoom; the frame and the cursor move together in it.
  const shot = el('div', 'shot');
  const img = await film.image(t);
  const pointer = el('div', 'pointer-layer');
  shot.append(img, pointer);
  lens.append(shot);
  screen.append(lens);
  document.body.append(screen);
  if (!scene.montage) drawCursor(pointer, tl.cursor);

  // ---------------------------------------------------------------- camera
  // Punch in on zoomed clicks and, more gently, on spotlit elements; drift a
  // few pixels against the cursor for depth. All of it eased, all from t.
  const cold = scene.montage;
  const spots = tl.spotlights ?? [];
  let focus = zoomAt(tl.clicks);
  let amount = 0.2 * focus.k;
  for (const sp of spots) {
    const k = window_(sp.t0 - 0.3, sp.t1 + 0.2, 0.6) * (sp.zoom ? 1 : 0.55);
    if (0.2 * k > amount) {
      amount = 0.2 * k;
      focus = { x: sp.box[0] + sp.box[2] / 2, y: sp.box[1] + sp.box[3] / 2, k };
    }
  }
  const scale = 1 + amount;
  if (tall) {
    // 1:1 pixels, a 1080-wide window onto the 1920-wide recording.
    const fx = focusX(tl.clicks);
    shot.style.transform = `translate(${540 - fx * scale}px, ${-focus.y * (scale - 1)}px) scale(${scale})`;
  } else {
    shot.style.transform = `translate(${-focus.x * (scale - 1)}px, ${-focus.y * (scale - 1)}px) scale(${scale})`;
    const c = !cold && springAt(tl.cursor?.path ?? [], t);
    if (c) screen.style.translate = `${((c.x - 960) / 960) * -6}px ${((c.y - 540) / 540) * -4}px`;
  }

  // Spotlight: dim everything but one element, in the shot so it zooms with it.
  for (const sp of spots) {
    const k = window_(sp.t0 - 0.25, sp.t1 + 0.15, 0.35);
    if (k <= 0) continue;
    const [x, y, w, h] = sp.box;
    const hole = el('div', 'spot');
    Object.assign(hole.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px`, opacity: String(k) });
    pointer.before(hole);
    if (sp.callout) {
      const note = el('div', 'callout', esc(sp.callout));
      const below = y + h + 150 < 1080;
      Object.assign(note.style, { left: `${Math.min(1920 - 560, Math.max(20, x))}px`, top: `${below ? y + h + 14 : y - 84}px`, opacity: String(k) });
      note.style.transform = `translateY(${(1 - k) * 8}px)`;
      pointer.before(note);
    }
  }

  // ---------------------------------------------------------------- chrome
  const chapter = [...tl.scenes].reverse().find((s) => s.chapter && s.start <= t + 0.001)?.chapter;
  const bug = el('div', 'bug', `<img src="icon.svg" alt=""><span>variantly</span>`);
  document.body.append(bug);
  if (cold) bug.style.opacity = '0';
  // The corner chapter label ("03/12 · Setup") is drawn last, after every
  // card, veil and end card, so the viewer always knows where they are.
  const chapters = Math.max(0, ...tl.scenes.map((s) => s.chapter?.n ?? 0));
  const where = chapter && !cold
    ? el('div', 'step', `${String(chapter.n).padStart(2, '0')}/${String(chapters).padStart(2, '0')} · ${esc(chapter.title)}`)
    : null;

  // Chapter band: the number and title slide in at each chapter's start.
  for (const s of tl.scenes) {
    if (!s.chapter) continue;
    const k = window_(s.start + 0.1, s.start + 2.6, 0.45);
    if (k <= 0) continue;
    const band = el('div', 'band', `<span class="figure">${String(s.chapter.n).padStart(2, '0')}</span><b>${esc(s.chapter.title)}</b>`);
    band.style.opacity = String(k);
    band.style.transform = `translateX(${(1 - ease(k)) * -40}px)`;
    document.body.append(band);
  }

  // Timelapse: the real clock first, at real speed, then how much faster it
  // runs. `fastAt` is where the speed-up starts (edit.mjs cuts a 1× head);
  // `clock.from` is how long the run had already taken when the scene began.
  if (scene.speed > 1) {
    const fastAt = scene.fastAt ?? scene.start;
    const from = scene.clock?.from ?? 0;
    const real = from + (t < fastAt ? t - scene.start : fastAt - scene.start + (t - fastAt) * scene.speed);
    const total = Math.max(1, Math.round((scene.clock?.total ?? (fastAt - scene.start) + (scene.end - fastAt) * scene.speed) / 60));
    const text = t < fastAt
      ? `● Real time · ${clock(real)}`
      : `▶▶ Sped up ${Math.round(scene.speed)}× · ${clock(real)} of ~${total} min`;
    const chip = el('div', 'chip', text);
    chip.style.opacity = window_(scene.start, scene.end, 0.3);
    document.body.append(chip);
  }

  // Keycaps for the keys pressed in compare.
  for (const k of tl.keys ?? []) {
    const v = window_(k.t - 0.05, k.t + 1.1, 0.2);
    if (v <= 0) continue;
    const label = k.key === 'Escape' ? 'Esc' : k.key.length === 1 ? k.key.toUpperCase() : k.key;
    const cap = el('div', 'keycap', esc(label));
    cap.style.opacity = String(v);
    cap.style.transform = `translateY(${(1 - v) * 10}px) scale(${1 - 0.08 * Math.max(0, 1 - (t - k.t) / 0.12)})`;
    document.body.append(cap);
  }

  // ---------------------------------------------------------------- captions
  // On by default; `build.mjs --no-captions` renders a picture without them.
  const cue = tl.burnCaptions === false ? null : captionAt(tl.captions, t);
  if (cue && !scene.cta) document.body.append(el('div', 'caption', `<span>${esc(cue.text)}</span>`));

  // ---------------------------------------------------------------- lower thirds
  for (const s of tl.scenes) {
    if (!s.lower) continue;
    const from = s.start + (s.lower.from ?? 0.6);
    const k = window_(from, Math.min(s.end - 0.2, from + 5), 0.45);
    if (k <= 0) continue;
    const lower = el('div', 'lower', `<b>${esc(s.lower.name)}</b><span>${esc(s.lower.role)}</span>`);
    lower.style.opacity = String(k);
    lower.style.transform = `translateX(${(1 - k) * -24}px)`;
    document.body.append(lower);
  }

  // ---------------------------------------------------------------- terminal cards
  // A terminal shows `lines`, or a `sequence` of panels one after another
  // (the stack montage), or the take's own git output (`diffstat`). Commands
  // start with "$ " and get the film's clean prompt (tl.prompt, e.g.
  // "~/tallyboard $"); lines with a ✗ are marked.
  for (const s of tl.scenes) {
    if (!s.terminal) continue;
    const diff = s.terminal.diffstat;
    const a0 = diff ? s.start + 7 : s.start + (s.terminal.from ?? 0.4);
    const b0 = diff || s.terminal.untilEnd || s.terminal.sequence ? s.end - 0.3 : s.start + 6.5;
    let panel = { title: s.terminal.title, lines: s.terminal.lines ?? [] };
    let a = a0, b = b0;
    if (s.terminal.sequence?.length) {
      const n = s.terminal.sequence.length;
      const each = (b0 - a0) / n;
      const i = clamp(Math.floor((t - a0) / each), 0, n - 1);
      panel = s.terminal.sequence[i];
      a = a0 + i * each;
      b = a + each;
    }
    const k = s.terminal.sequence ? window_(a0, b0, 0.35) : window_(a, b, 0.35);
    if (k <= 0) continue;
    const head = [];
    if (diff && tl.lastCommit) head.push('$ git log --oneline -1', tl.lastCommit);
    const lines = diff
      ? [...head, '$ git diff --stat', ...(tl.diffstat || ' (no changes)').split('\n').map((l) => l.replace(/^\s+/, ' ')),
          ...(s.terminal.branches && tl.branches?.length ? ['$ git branch --list "variantly/*"', ...tl.branches.slice(0, 3).map((x) => `  ${x}`), ...(tl.branches.length > 3 ? [`  … ${tl.branches.length - 3} more`] : [])] : []),
          ...(s.terminal.after ?? [])]
      : panel.lines;
    // Lines appear one by one; commands type out.
    const per = diff ? 0.12 : s.terminal.per ?? 1.1;
    const prompt = esc(s.terminal.prompt ?? panel.prompt ?? tl.prompt ?? '$');
    let html = '';
    lines.forEach((line, i) => {
      const at = a + 0.3 + i * per;
      if (t < at) return;
      const cmd = line.startsWith('$ ');
      const shownText = cmd && !diff ? line.slice(0, 2 + Math.round((line.length - 2) * span(at, at + 0.6))) : line;
      html += cmd
        ? `<span class="prompt">${prompt}</span> ${esc(shownText.slice(2))}\n`
        : `<span class="${line.includes('✗') ? 'bad' : 'dim'}">${esc(shownText)}</span>\n`;
    });
    const title = panel.title ? `<b>${esc(panel.title)}</b>` : '';
    const term = el('div', `term${diff ? ' side' : ''}`, `<div class="bar"><i></i><i></i><i></i>${title}</div><pre>${html}<span class="caret"></span></pre>`);
    term.style.opacity = String(k);
    term.style.transform = `translateY(${(1 - k) * 20}px)`;
    if (!diff) {
      const veil = el('div', 'veil');
      veil.style.opacity = String(0.55 * k);
      document.body.append(veil);
    }
    document.body.append(term);
  }

  // ---------------------------------------------------------------- teaching cards and diagrams
  drawCards(tl, t, { span, ease, window_, el, esc, tall });

  // ---------------------------------------------------------------- kinetic type
  for (const s of tl.scenes) {
    if (!s.kinetic) continue;
    const a = s.start + (s.kinetic.from ?? 0);
    const k = window_(a, s.end + 0.15, 0.4);
    if (k <= 0) continue;
    const words = s.kinetic.text.split(' ');
    const big = words
      .map((w, i) => {
        const v = ease(span(a + i * 0.09, a + i * 0.09 + 0.35));
        return `<span style="opacity:${v};transform:translateY(${(1 - v) * 18}px)">${esc(w)}</span>`;
      })
      .join(' ');
    let sub = '';
    if (s.kinetic.sub) {
      const typed = s.kinetic.sub.slice(0, Math.round(s.kinetic.sub.length * span(a + 1.0, a + 1.8)));
      sub = `<div class="cmd">${esc(typed)}<span class="caret"></span></div>`;
    }
    const veil = el('div', 'veil');
    veil.style.opacity = String(0.95 * k);
    const card = el('div', 'card kinetic', `<div class="big figure">${big}</div>${sub}`);
    card.style.opacity = String(k);
    document.body.append(veil, card);
  }

  // ---------------------------------------------------------------- end card
  const outro = tl.scenes.find((s) => s.cta);
  const outroAt = outro ? outro.cta.fromAt ?? outro.start + 6 : 0;
  if (outro && t >= outroAt) {
    const a = outroAt;
    const k = ease(span(a, a + 0.8));
    const veil = el('div', 'veil');
    veil.style.opacity = String(k);
    const card = el(
      'div',
      'card',
      `<div class="kicker figure"><img src="icon.svg" alt="">variantly</div><div class="cmd">${esc(outro.cta.command)}</div><div class="url">${esc(outro.cta.url)}</div>${
        outro.cta.credit ? `<div class="credit">${esc(outro.cta.credit)}</div>` : ''
      }`,
    );
    card.style.opacity = String(ease(span(a + 0.3, a + 1.1)));
    document.body.append(veil, card);
  }

  if (where) document.body.append(where);

  await document.fonts.ready;
  markReady();
}

/** The thumbnail: a 2×2 grid of four of the variants under the title. */
export async function mountThumbnail(theme = 'light') {
  document.body.classList.add('thumb', theme);
  const tl = await (await fetch(`../timeline.${theme}.json`)).json();
  const film = await loadFootage(`../build/${theme}/footage`);
  const cold = tl.scenes.find((s) => s.montage);
  const at = cold ? [0, 1, 2, 3].map((i) => cold.start + 0.45 + i * 0.9) : [1, 2, 3, 4].map((i) => (tl.duration * i) / 5);
  const grid = el('div', 'grid');
  for (const time of at) grid.append(await film.image(time));
  const title = el('div', 'title', `<div class="kicker figure"><img src="icon.svg" alt="">variantly</div><div class="big figure">Ten redesigns.<br>Keep one.</div><div class="cmd">npx variantly</div>`);
  document.body.append(grid, title);
  await document.fonts.ready;
  markReady();
}
