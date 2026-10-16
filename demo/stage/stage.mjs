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

const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export async function mount(layout) {
  const tl = await (await fetch('../timeline.json')).json();
  const film = await loadFootage('../.work/footage');
  const tall = layout === 'tall';
  const scene = tl.scenes.find((s) => t >= s.start && t < s.end) ?? tl.scenes.at(-1);
  const first = tl.scenes[0];

  // ---------------------------------------------------------------- screen
  const screen = el('div', 'screen');
  const img = await film.image(t);
  screen.append(img);
  document.body.append(screen);

  const zoom = zoomAt(tl.clicks);
  const scale = 1 + 0.2 * zoom.k;
  if (tall) {
    // 1:1 pixels, a 1080-wide window onto the 1920-wide recording.
    const fx = focusX(tl.clicks);
    img.style.transform = `translate(${540 - fx * scale}px, ${-zoom.y * (scale - 1)}px) scale(${scale})`;
  } else {
    img.style.transform = punchIn(tl.clicks.filter((c) => c.zoom), { scale: 1.2, lead: 0.9, hold: 0.8, ease: 0.7, t });
  }

  // ---------------------------------------------------------------- chrome
  const bug = el('div', 'bug', `<img src="icon.svg" alt=""><span>variantly</span>`);
  document.body.append(bug);

  // Timelapse: a chip with the speed and the real time that has gone by.
  if (scene.speed > 1) {
    const real = (t - scene.start) * scene.speed;
    const chip = el('div', 'chip', `▶▶ ${Math.round(scene.speed)}× &nbsp;${clock(real)}`);
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
        `<div class="kicker"><img src="icon.svg" alt="">${esc(first.title.kicker)}</div><div class="line">${esc(first.title.line)}</div>`,
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
      `<div class="kicker"><img src="icon.svg" alt="">variantly</div><div class="cmd">${esc(outro.cta.command)}</div><div class="url">${esc(outro.cta.url)}</div>`,
    );
    card.style.opacity = ease(span(outro.start + 0.3, outro.start + 1.0));
    document.body.append(veil, card);
  }

  await document.fonts.ready;
  markReady();
}
