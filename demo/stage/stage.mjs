// The SeekReel stage: draws one moment of the film from ?t=.
//
// The screen is SeekReel footage (the recording, cut by edit.mjs); the rest is
// overlays drawn from timeline.json. Everything visible is a pure function of
// t, so any frame renders the same on its own. No CSS transitions anywhere.
import { time, span as spanAt, ease, shown, punchIn, captionAt, loadFootage, markReady } from '/_seekreel/stage.js';

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
  const first = tl.scenes[0];

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
  drawCursor(pointer, tl.cursor);

  const zoom = zoomAt(tl.clicks);
  const scale = 1 + 0.2 * zoom.k;
  if (tall) {
    // 1:1 pixels, a 1080-wide window onto the 1920-wide recording.
    const fx = focusX(tl.clicks);
    shot.style.transform = `translate(${540 - fx * scale}px, ${-zoom.y * (scale - 1)}px) scale(${scale})`;
  } else {
    shot.style.transform = punchIn(tl.clicks.filter((c) => c.zoom), { scale: 1.2, lead: 0.9, hold: 0.8, ease: 0.7, t });
  }

  // ---------------------------------------------------------------- chrome
  const bug = el('div', 'bug', `<img src="icon.svg" alt=""><span>variantly</span>`);
  document.body.append(bug);
  // A board-style step marker: which scene of how many.
  const index = tl.scenes.indexOf(scene);
  if (scene.step) {
    const step = el('div', 'step', `${String(index + 1).padStart(2, '0')} / ${String(tl.scenes.length).padStart(2, '0')} · ${esc(scene.step)}`);
    step.style.opacity = window_(scene.start, scene.end, 0.3);
    document.body.append(step);
  }

  // Timelapse: a chip with the speed and the real time that has gone by.
  if (scene.speed > 1) {
    const real = (t - scene.start) * scene.speed;
    const chip = el('div', 'chip', `▶▶ ${Math.round(scene.speed)}× · ${clock(real)} real time`);
    chip.style.opacity = window_(scene.start, scene.end, 0.3);
    document.body.append(chip);
  }

  // ---------------------------------------------------------------- captions
  const cue = captionAt(tl.captions, t);
  if (cue && !scene.cta) {
    const caption = el('div', 'caption', `<span>${esc(cue.text)}</span>`);
    document.body.append(caption);
  }

  // ---------------------------------------------------------------- intro card
  if (first.title) {
    const k = 1 - ease(span(first.start + 3.0, first.start + 3.7));
    if (k > 0) {
      const veil = el('div', 'veil');
      veil.style.opacity = 0.94 * k;
      const card = el(
        'div',
        'card',
        `<div class="kicker figure"><img src="icon.svg" alt="">${esc(first.title.kicker)}</div><div class="line">${esc(first.title.line)}</div>`,
      );
      card.style.opacity = k;
      card.style.transform = `translateY(${(1 - ease(span(0, 0.8))) * 30}px)`;
      document.body.append(veil, card);
      bug.style.opacity = 1 - k;
    }
  }

  // ---------------------------------------------------------------- presenter
  // A lower third naming who is speaking, once the title card has cleared.
  if (first.presenter) {
    const k = window_(first.start + 3.6, first.end - 0.2, 0.45);
    if (k > 0) {
      const lower = el('div', 'lower', `<b>${esc(first.presenter.name)}</b><span>${esc(first.presenter.role)}</span>`);
      lower.style.opacity = k;
      lower.style.transform = `translateX(${(1 - k) * -24}px)`;
      document.body.append(lower);
    }
  }

  // ---------------------------------------------------------------- terminal
  const launch = tl.scenes.find((s) => s.terminal);
  if (launch) {
    const a = launch.start;
    const shown = window_(a, a + 3.4, 0.35);
    if (shown > 0) {
      const command = launch.terminal;
      const typed = command.slice(0, Math.round(command.length * span(a + 0.35, a + 1.25)));
      const answered = t > a + 1.6;
      const term = el(
        'div',
        'term',
        `<div class="bar"><i></i><i></i><i></i></div><pre><span class="prompt">$</span> ${esc(typed)}${answered ? '' : '<span class="caret"></span>'}${
          answered ? `\n<span class="dim">  ➜  opening the wizard in your browser</span>` : ''
        }</pre>`,
      );
      term.style.opacity = shown;
      term.style.transform = `translateY(${(1 - shown) * 20}px)`;
      const veil = el('div', 'veil');
      veil.style.opacity = 0.55 * shown;
      document.body.append(veil, term);
    }
  }

  // ---------------------------------------------------------------- outro
  const outro = tl.scenes.find((s) => s.cta);
  if (outro && t >= outro.start) {
    const k = ease(span(outro.start, outro.start + 0.7));
    const veil = el('div', 'veil');
    veil.style.opacity = k;
    const card = el(
      'div',
      'card',
      `<div class="kicker figure"><img src="icon.svg" alt="">variantly</div><div class="cmd">${esc(outro.cta.command)}</div><div class="url">${esc(outro.cta.url)}</div>`,
    );
    card.style.opacity = ease(span(outro.start + 0.3, outro.start + 1.0));
    document.body.append(veil, card);
  }

  await document.fonts.ready;
  markReady();
}
