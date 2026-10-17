// Teaching cards and diagrams: one visual language for every explanatory
// graphic in the film.
//
// - Flat panels on the ground: surface fill, one 1.5px rule, 12px radius, no
//   shadow, no gradient, no texture.
// - One accent (the app's alert yellow) marks the current step only.
// - Martian Mono (condensed) for labels and figures, the system sans for
//   sentences. Every size and gap is a multiple of 8 (type 24px minimum).
// - One motion: 0.4 s ease from 12px below (24px for whole cards).
// - Reveals land on the word the voice says them: edit.mjs resolves each
//   `on` word to an absolute `at` (and `fromOn` / `countOn` likewise).
// - Each card is one block, optically centred in the space above the
//   captions, with its text left-aligned inside.
//
// Everything is a pure function of t, like the rest of the stage.

const DUR = 0.4;
const SVG_NS = 'http://www.w3.org/2000/svg';

// cy is the optical centre of the space above the captions (a little above
// the geometric one). 9:16 keeps clear of the bottom 20% and the right 120px,
// where Shorts, Reels and TikTok draw their own interface.
const FRAME = {
  wide: { cx: 960, cy: 448, w: 1536, node: { w: 256, h: 120, gap: 32, cell: 48 } },
  tall: { cx: 512, cy: 776, w: 896, node: { w: 896, h: 112, gap: 32, cell: 56 } },
};

export function drawCards(tl, t, { span, ease, window_, el, esc, tall }) {
  const f = FRAME[tall ? 'tall' : 'wide'];
  const reveal = (at) => ease(span(at, at + DUR));
  const anchor = document.querySelector('.bug');
  // Under the chrome (logo, chapter, captions), which stays readable.
  const put = (node) => (anchor ? document.body.insertBefore(node, anchor) : document.body.append(node));

  for (const s of tl.scenes) {
    const spec = s.card || (s.diagram && typeof s.diagram === 'object' ? { ...s.diagram, kind: s.diagram.kind ?? 'flow' } : null);
    if (!spec) continue;
    const from = spec.fromAt ?? s.start + (spec.from ?? 0.2);
    const to = spec.untilEnd != null ? s.end - spec.untilEnd : s.end - 0.1;
    const k = window_(from, to, DUR);
    if (k <= 0) continue;

    const veil = el('div', 'tveil');
    veil.style.opacity = String(k);
    const card = el('div', `tcard tcard-${spec.kind}`);
    Object.assign(card.style, {
      left: `${f.cx}px`,
      top: `${f.cy}px`,
      maxWidth: `${f.w}px`,
      opacity: String(k),
      transform: `translate(-50%, calc(-50% + ${((1 - k) * 24).toFixed(2)}px))`,
    });
    if (spec.title) card.append(el('h2', 'tcard-title', esc(spec.title)));

    if (spec.kind === 'learn' || spec.kind === 'recap') list(card, spec.items, reveal, el, esc);
    else if (spec.kind === 'pause') pause(card, spec, s, span, el, esc);
    else if (spec.kind === 'facts') facts(card, spec, reveal, el, esc);
    else if (spec.kind === 'trends') trends(card, spec, reveal, el, esc);
    else if (spec.kind === 'mix') mix(card, spec, reveal, el, esc);
    else flow(card, spec, f, tall, reveal, el, esc, tl);
    if (spec.source) card.append(el('p', 'tsource', esc(spec.source)));

    put(veil);
    put(card);
  }
}

/** Short lines, one at a time; the newest takes the accent marker. */
function list(card, items, reveal, el, esc) {
  const ol = el('ol', 'tlist');
  const live = items.filter((it) => reveal(it.at) > 0).length - 1;
  items.forEach((it, i) => {
    const v = reveal(it.at);
    const li = el('li', i === live ? 'on' : '', `<i></i><span>${esc(it.text)}</span>`);
    Object.assign(li.style, { opacity: String(v), transform: `translateY(${((1 - v) * 12).toFixed(2)}px)` });
    ol.append(li);
  });
  card.append(ol);
}

/** Pause and think: the question, then a countdown that starts when the voice stops. */
function pause(card, spec, s, span, el, esc) {
  const a = spec.countAt ?? s.start + (spec.countFrom ?? 1);
  const secs = spec.seconds ?? 5;
  const left = Math.min(secs, Math.max(0, Math.ceil(secs - (span(a, a + secs) * secs))));
  const k = 1 - span(a, a + secs);
  card.append(
    el('p', 'tpause-q', esc(spec.question)),
    el('div', 'tpause-n', String(left)),
    el('div', 'tpause-bar', `<i style="transform:scaleX(${k.toFixed(4)})"></i>`),
  );
}

/** Before → after rows; each lands as the voice says it. */
function facts(card, spec, reveal, el, esc) {
  const rows = el('div', 'tfacts');
  for (const r of spec.rows) {
    const v = reveal(r.at);
    const o = String(v);
    const y = `translateY(${((1 - v) * 12).toFixed(2)}px)`;
    const cells = [
      el('span', 'l', `${esc(r.label)}${r.note ? `<small>${esc(r.note)}</small>` : ''}`),
      el('span', 'b', esc(r.before)),
      el('span', 'arr', '<svg viewBox="0 0 48 16" aria-hidden="true"><path d="M2 8H44M37 3l7 5-7 5"/></svg>'),
      el('span', 'a', esc(r.after)),
    ];
    for (const c of cells) Object.assign(c.style, { opacity: o, transform: y });
    rows.append(...cells);
  }
  card.append(rows);
}

/** The season's trends: palette, name and essence, in two columns. */
function trends(card, spec, reveal, el, esc) {
  const ol = el('ol', 'ttrends');
  spec.items.forEach((it) => {
    const v = reveal(it.at);
    const sw = (it.swatch ?? []).map((c) => `<i style="background:${esc(c)}"></i>`).join('');
    const li = el('li', '', `<span class="sw">${sw}</span><b>${esc(it.name)}</b><span class="e">${esc(it.essence ?? '')}</span>`);
    Object.assign(li.style, { opacity: String(v), transform: `translateY(${((1 - v) * 12).toFixed(2)}px)` });
    ol.append(li);
  });
  card.append(ol);
}

/** A mix as the wizard shows it: rows of agent · model · count, then the reasons. */
function mix(card, spec, reveal, el, esc) {
  const table = el('div', 'tmix');
  for (const r of spec.rows) {
    const v = reveal(r.at);
    const row = el('div', 'tmix-row', `<span class="ag">${esc(r.agent)}</span><span class="md">${esc(r.model)}</span><span class="ct">${esc(String(r.count))}</span>`);
    Object.assign(row.style, { opacity: String(v), transform: `translateY(${((1 - v) * 12).toFixed(2)}px)` });
    table.append(row);
  }
  if (spec.total) {
    const v = reveal(spec.rows.at(-1).at + 0.35);
    const foot = el('p', 'tmix-foot', esc(spec.total));
    foot.style.opacity = String(v);
    table.append(foot);
  }
  card.append(table);
  if (spec.items?.length) list(card, spec.items, reveal, el, esc);
}

/**
 * A flow: boxes left to right (top to bottom in 9:16) joined by thin arrows,
 * the group centred in the frame. A node may carry a `stack` of cells (the
 * ten variants). The newest revealed node takes the accent.
 */
function flow(card, spec, f, tall, reveal, el, esc, tl) {
  const nodes = spec.nodes.map((n) => (n.stack === 'branches' ? { ...n, stack: branchStack(tl) } : n));
  const n = nodes.length;
  const live = nodes.filter((nd) => reveal(nd.at) > 0).length - 1;
  const box = f.node;
  const stackH = (nd) => (nd.stack ? 16 + Math.ceil(nd.stack.length / 5) * (box.cell + 8) - 8 : 0);
  let pos, W, H;
  if (tall) {
    let y = 0;
    pos = nodes.map((nd) => {
      const p = { x: 0, y, w: box.w, h: box.h + stackH(nd) };
      y += p.h + box.gap;
      return p;
    });
    W = box.w;
    H = y - box.gap;
  } else {
    // As wide as fits, on the 8px grid; the group is centred by the card.
    const w = Math.min(n <= 4 ? 320 : box.w, Math.floor((f.w - box.gap * (n - 1)) / n / 8) * 8);
    pos = nodes.map((nd, i) => ({ x: i * (w + box.gap), y: 0, w, h: box.h }));
    W = w * n + box.gap * (n - 1);
    H = box.h + Math.max(0, ...nodes.map(stackH));
  }
  const wrap = el('div', 'tflow');
  Object.assign(wrap.style, { width: `${W}px`, height: `${H}px` });

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'tflow-lines');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', String(W));
  svg.setAttribute('height', String(H));
  svg.innerHTML = '<defs><marker id="tarrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto"><path d="M1 1L8 5L1 9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>';
  for (let i = 1; i < (spec.connect === false ? 0 : n); i++) {
    const a = pos[i - 1], b = pos[i];
    // The connector draws itself just before its node lands.
    const v = reveal(nodes[i].at - DUR * 0.75);
    if (v <= 0) continue;
    const [x1, y1, x2, y2] = tall
      ? [a.x + a.w / 2, a.y + a.h + 6, b.x + b.w / 2, b.y - 6]
      : [a.x + a.w + 6, box.h / 2, b.x - 6, box.h / 2];
    const len = Math.hypot(x2 - x1, y2 - y1);
    const line = document.createElementNS(SVG_NS, 'line');
    Object.entries({ x1, y1, x2, y2, 'stroke-dasharray': len, 'stroke-dashoffset': ((1 - v) * len).toFixed(2) }).forEach(([key, val]) => line.setAttribute(key, String(val)));
    if (v >= 0.98) line.setAttribute('marker-end', 'url(#tarrow)');
    svg.append(line);
  }
  wrap.append(svg);

  nodes.forEach((nd, i) => {
    const v = reveal(nd.at);
    if (v <= 0) return;
    const p = pos[i];
    const node = el('div', `tnode${i === live ? ' on' : ''}`, `<b>${esc(nd.label)}</b>${nd.sub ? `<span>${esc(nd.sub)}</span>` : ''}`);
    Object.assign(node.style, { left: `${p.x}px`, top: `${p.y}px`, width: `${p.w}px`, height: `${box.h}px`, opacity: String(v), transform: `translateY(${((1 - v) * 12).toFixed(2)}px)` });
    wrap.append(node);
    if (nd.stack) {
      const grid = el('div', 'tstack');
      Object.assign(grid.style, { left: `${p.x}px`, top: `${p.y + box.h + 16}px`, width: `${p.w}px`, gridAutoRows: `${box.cell}px`, opacity: String(v) });
      nd.stack.forEach((label, j) => {
        const cell = el('i', '', esc(label));
        cell.style.opacity = String(reveal(nd.at + 0.06 * (j + 1)));
        grid.append(cell);
      });
      wrap.append(grid);
    }
  });
  card.append(wrap);
}

/** V01…V10 from the run's real branches, or the expected names. */
function branchStack(tl) {
  const count = tl.branches?.length || 10;
  return Array.from({ length: Math.min(10, count) }, (_, i) => `V${String(i + 1).padStart(2, '0')}`);
}
