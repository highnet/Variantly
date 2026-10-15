// variantly local app. One page, four views: check-in, board, compare, kept.
// State arrives over server-sent events; views mount once and update in
// place so the comparison iframes never reload by accident.

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Tiny hyperscript. Attributes starting with "on" become listeners. */
const h = (tag, attrs = {}, ...children) => {
  const el = document.createElementNS(
    tag === 'svg' || tag === 'path' || tag === 'rect' || tag === 'circle' || tag === 'line' || tag === 'polyline'
      ? 'http://www.w3.org/2000/svg'
      : 'http://www.w3.org/1999/xhtml',
    tag,
  );
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.setAttribute('class', v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'value') el.value = v;
    else if (k in el && !(el instanceof SVGElement) && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
};

/** append() that skips null and false, like h() does for children. */
const put = (el, ...kids) => el.append(...kids.flat().filter((k) => k !== null && k !== undefined && k !== false));

const icon = (name) => {
  const paths = {
    slider: ['M3 5h18v14H3z', 'M12 3v18'],
    single: ['M3 5h18v14H3z'],
    side: ['M3 5h8v14H3z', 'M13 5h8v14h-8z'],
    board: ['M4 6h16', 'M4 10h16', 'M4 14h16', 'M4 18h10'],
    info: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 11v6', 'M12 7.5v.5'],
    plus: ['M12 5v14', 'M5 12h14'],
    minus: ['M5 12h14'],
    close: ['M6 6l12 12', 'M18 6L6 18'],
    arrow: ['M5 12h14', 'M13 6l6 6-6 6'],
    refresh: ['M20 11a8 8 0 1 0-2.3 5.7', 'M20 5v6h-6'],
    desktop: ['M3 4h18v12H3z', 'M8 20h8', 'M12 16v4'],
    mobile: ['M7 3h10v18H7z', 'M11 18h2'],
    check: ['M5 12.5l4.5 4.5L19 7.5'],
    alert: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 7.5v5.5', 'M12 16.2v.3'],
    copy: ['M9 9h11v11H9z', 'M5 15H4V4h11v1'],
    handoff: ['M4 12h11', 'M11 6l6 6-6 6', 'M20 4v16'],
    sun: ['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', 'M12 2v2', 'M12 20v2', 'M4.9 4.9l1.4 1.4', 'M17.7 17.7l1.4 1.4', 'M2 12h2', 'M20 12h2', 'M4.9 19.1l1.4-1.4', 'M17.7 6.3l1.4-1.4'],
    moon: ['M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z'],
    access: ['M12 3.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z', 'M5 8.5l7 1.5 7-1.5', 'M12 10v5', 'M8.5 21l3.5-6 3.5 6'],
  };
  return h(
    'svg',
    { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' },
    (paths[name] ?? []).map((d) => h('path', { d })),
  );
};

const mark = () =>
  h('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }, [
    h('rect', { x: 3, y: 4, width: 4, height: 16, fill: 'currentColor' }),
    h('rect', { x: 9, y: 4, width: 2, height: 16, fill: 'currentColor' }),
    h('rect', { x: 13, y: 4, width: 4, height: 16, fill: 'currentColor' }),
    h('rect', { x: 19, y: 4, width: 2, height: 16, fill: 'currentColor' }),
  ]);

const pad = (n) => String(n).padStart(2, '0');
const vname = (n) => `V${pad(n)}`;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// API ---------------------------------------------------------------------

const api = async (method, route, body) => {
  const res = await fetch(`/api/${route}`, {
    method,
    headers: { 'content-type': 'application/json', ...(method === 'POST' ? { 'x-variantly': '1' } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
};

/*
 * Toasts stack bottom right, pop in with an icon, show the time they have
 * left and can be dismissed. toast(message, bad) keeps its old shape;
 * pass { title } to put a headline above the message.
 */
const toast = (message, bad = false, opts = {}) => {
  const stack = $('#toasts');
  const life = opts.life ?? (bad ? 7000 : 3500);
  const item = h('li', { class: `toast${bad ? ' bad' : ''}` }, [
    h('span', { class: 'toast-icon' }, icon(bad ? 'alert' : opts.icon ?? 'check')),
    h('span', { class: 'toast-text' }, [opts.title ? h('strong', {}, opts.title) : null, h('span', {}, message)]),
    h('button', { class: 'toast-close', type: 'button', 'aria-label': 'Dismiss', onClick: () => leave() }, icon('close')),
    h('span', { class: 'toast-life', style: { animationDuration: `${life}ms` } }),
  ]);
  const leave = () => {
    item.classList.add('leaving');
    setTimeout(() => item.remove(), 220);
  };
  item.querySelector('.toast-life').addEventListener('animationend', leave);
  while (stack.children.length > 2) stack.firstElementChild.remove();
  stack.append(item);
};

// State -------------------------------------------------------------------

const S = {
  snap: null, // server snapshot
  detect: null,
  form: null,
  view: '',
  forceBoard: false,
  openSegment: null,
  openRow: null,
  lastStatus: new Map(), // n -> status
  unseen: new Set(), // n
  logs: new Map(), // target -> string[]
  sel: null, // 'original' | number
  mode: 'slider',
  split: 50,
  path: '/',
  confirming: false,
  infoOpen: false,
};

const variants = () => S.snap?.variants ?? [];
const done = () => variants().filter((v) => v.status === 'done');
/** A pinned direction in the owner's words, else the world Impeccable picked (once the agent names it). */
const directionLabel = (dir, picked) => (dir && dir.trim() ? dir.trim() : picked ? `${picked} (Impeccable’s pick)` : 'Impeccable’s pick');
const server = (id) => (S.snap?.servers ?? []).find((s) => s?.id === id);

const STATUS = {
  queued: 'Scheduled',
  preparing: 'Preparing',
  running: 'Working',
  reviewing: 'Reviewing',
  committing: 'Committing',
  done: 'Ready',
  failed: 'Failed',
  cancelled: 'Cancelled',
};
/** Mirrors src/steps.mjs. */
const STEPS = ['Setting up', 'Reading the site', 'Choosing a direction', 'Building', 'Checking', 'Writing DESIGN.md', 'Saving'];
const stepAt = (v) => (v.status === 'done' ? STEPS.length : v.status === 'queued' ? -1 : v.step ?? 0);
const stepState = (v, i) => {
  const at = stepAt(v);
  return i < at ? 'done' : i === at && ['preparing', 'running', 'committing'].includes(v.status) ? 'now' : '';
};
const stepCell = (v, last) => {
  const at = stepAt(v);
  const live = ['preparing', 'running', 'committing'].includes(v.status);
  const label = live ? `${at + 1}/${STEPS.length} · ${STEPS[at]}` : v.status === 'done' ? 'All steps done' : v.status === 'queued' ? 'Waiting for a free slot' : `Stopped at: ${STEPS[Math.max(0, at)]}`;
  return h('div', { class: 'steps', title: last }, [
    h('div', { class: 'track', 'aria-hidden': 'true' }, STEPS.map((_, i) => h('i', { class: stepState(v, i) }))),
    h('span', { class: 'now-label' }, label),
    live ? h('span', { class: 'last lastline' }, last) : null,
  ]);
};
const stepList = (v) =>
  h('ol', { class: 'step-list', 'aria-label': 'Steps' }, STEPS.map((s, i) => h('li', { class: stepState(v, i) }, `${stepState(v, i) === 'done' ? '✓' : i + 1} ${s}`)));

const statusKey = (s) => (s === 'queued' ? 'scheduled' : s === 'done' ? 'ready' : s);

const noteStatusChanges = () => {
  for (const v of variants()) {
    const prev = S.lastStatus.get(v.n);
    if (prev !== undefined && prev !== v.status && (v.status === 'done' || v.status === 'failed')) S.unseen.add(v.n);
    S.lastStatus.set(v.n, v.status);
  }
};

// Routing between views -----------------------------------------------------

const pickView = () => {
  if (!S.snap) return 'loading';
  if (S.snap.phase === 'finalized') return 'kept';
  if (S.snap.phase === 'setup' && !variants().length) return 'checkin';
  if (S.snap.phase === 'setup') return 'checkin';
  if (S.forceBoard || (!done().length && !S.wantCompare)) return 'board';
  return 'compare';
};

const render = () => {
  const view = pickView();
  document.body.dataset.view = view;
  const main = $('#view');
  $('#project').textContent = S.snap?.repo ?? '';
  const phase = { setup: '', generating: 'Generating', ready: 'Ready to compare', finalized: 'Kept' }[S.snap?.phase] ?? '';
  $('#phase').textContent = phase;

  if (view !== S.view) {
    S.view = view;
    main.replaceChildren();
    if (view === 'loading') main.append(h('div', { class: 'loading' }, 'Connecting to variantly…'));
    if (view === 'checkin') mountCheckin(main);
    if (view === 'board') mountBoardView(main);
    if (view === 'compare') mountCompare(main);
    if (view === 'kept') mountKept(main);
  }
  if (view === 'checkin') updateCheckin();
  if (view === 'board') updateBoardView();
  if (view === 'compare') updateCompare();
};

// Check-in ------------------------------------------------------------------

const agentShort = { claude: 'Claude', codex: 'Codex', copilot: 'Copilot', demo: 'Demo' };

/*
 * The check-in is a short wizard: Setup → Designs → Your site → Review.
 * S.form is the one source of truth; steps only read and write it, so Back
 * never loses anything. The step lives in the URL (?step=designs) and the
 * draft in localStorage, so refresh and the browser's back button work.
 */
const WIZ = [
  { id: 'setup', name: 'Setup', title: 'Your setup', next: 'Continue to designs' },
  { id: 'designs', name: 'Designs', title: 'What should we make?', next: 'Continue' },
  { id: 'site', name: 'Your site', title: 'About your site', next: 'Review' },
  { id: 'review', name: 'Review', title: 'Ready when you are' },
];
const DRAFT_KEY = 'variantly:draft';

const wizIndex = () => {
  const id = new URLSearchParams(location.search).get('step');
  const i = WIZ.findIndex((w) => w.id === id);
  return i < 0 ? 0 : Math.min(i, S.wizReached ?? 0);
};

const saveDraft = () => {
  try {
    localStorage.setItem(`${DRAFT_KEY}:${S.detect?.repo}`, JSON.stringify(S.form));
  } catch {}
};
const loadDraft = () => {
  try {
    return JSON.parse(localStorage.getItem(`${DRAFT_KEY}:${S.detect?.repo}`) ?? 'null');
  } catch {
    return null;
  }
};

const goStep = (i, { push = true } = {}) => {
  S.wizReached = Math.max(S.wizReached ?? 0, i);
  const url = new URL(location.href);
  url.searchParams.set('step', WIZ[i].id);
  if (push) history.pushState({ step: i }, '', url);
  else history.replaceState({ step: i }, '', url);
  saveDraft();
  refreshWizard(true);
};
addEventListener('popstate', () => S.view === 'checkin' && refreshWizard(true));

/** Re-draw the current step; `focus` moves focus to its heading (a new step). */
const refreshWizard = (focus = false) => {
  const main = $('#wizard');
  if (!main) return;
  saveDraft();
  const at = wizIndex();
  const step = WIZ[at];
  const blocks = blockers();
  const form = h('form', {
    class: 'wiz-step panel',
    'aria-labelledby': 'wiz-title',
    onSubmit: (e) => {
      e.preventDefault();
      if (step.id === 'review') return generate({ currentTarget: $('#wiz-go') });
      if (step.id === 'setup' && blocks.length) return $('.note.bad button, .note.bad')?.focus();
      goStep(at + 1);
    },
  }, [
    h('h2', { id: 'wiz-title', class: 'figure title', tabindex: -1 }, step.title),
    ...stepBody[step.id](blocks),
    h('div', { class: 'wiz-nav' }, [
      at > 0 ? h('button', { class: 'btn outline', type: 'button', onClick: () => history.back() }, 'Back') : h('span'),
      step.id === 'review'
        ? h('button', { class: 'btn primary big', type: 'submit', id: 'wiz-go', disabled: blocks.length > 0 }, `Make ${plural(S.form.count, 'design')}`, icon('arrow'))
        : h('button', { class: 'btn primary', type: 'submit', disabled: step.id === 'setup' && blocks.length > 0 }, step.next, icon('arrow')),
    ]),
  ]);
  main.replaceChildren(
    h('ol', { class: 'wiz-steps', 'aria-label': 'Steps' }, WIZ.map((w, i) =>
      h('li', {}, i <= (S.wizReached ?? 0) && i !== at
        ? h('button', { type: 'button', class: 'wiz-chip done', onClick: () => goStep(i) }, `${i + 1} ${w.name}`)
        : h('span', { class: cn('wiz-chip', i === at && 'now'), 'aria-current': i === at ? 'step' : null }, `${i + 1} ${w.name}`)),
    )),
    form,
  );
  $('#wiz-live').textContent = `Step ${at + 1} of ${WIZ.length}: ${step.title}`;
  if (focus) $('#wiz-title').focus();
};

const cn = (...xs) => xs.filter(Boolean).join(' ');

const check = (ok, text, detail) =>
  h('li', { class: cn('check', ok ? 'ok' : 'bad') }, [h('span', { class: 'mark', 'aria-hidden': 'true' }, ok ? '✓' : '!'), h('span', {}, [h('strong', {}, text), detail ? h('span', { class: 'detail' }, ` · ${detail}`) : null])]);

const notesList = (notes) =>
  notes.length ? h('ul', { class: 'notes' }, notes.map(([kind, text, action]) => h('li', { class: `note ${kind}` }, [h('span', {}, text), action ?? null]))) : null;

const stepBody = {
  setup: (blocks) => {
    const v = segmentValues();
    const a = selectedAgent();
    const agentOk = S.form.agent === 'demo' || (a?.installed && a.signedIn !== false && a.impeccable);
    return [
      h('ul', { class: 'checks' }, [
        S.detect.hasCommits ? check(true, `${v.from.figure} app found`, v.from.sub) : check(false, 'No commits yet'),
        check(Boolean(agentOk), agentOk ? `${a?.name ?? 'Demo agent'} ready` : `${a?.name ?? S.form.agent} needs a hand`, v.via.sub),
      ]),
      notesList([...blocks, ...advisories()]),
      h('details', { class: 'more', open: S.openSegment === 'from' || S.openSegment === 'via' }, [
        h('summary', {}, 'Use a different app or agent'),
        h('div', { class: 'segments', role: 'group' }, [segmentButton('from', 'Your app'), segmentButton('via', 'Your agent')]),
        h('div', { class: 'drawer', id: 'drawer', hidden: true }),
      ]),
    ];
  },
  designs: () => {
    const f = S.form;
    return [
      h('fieldset', { class: 'field picks' }, [
        h('legend', { class: 'label' }, 'How many designs?'),
        h('div', { class: 'pick-row' }, [2, 4, 6].map((n) =>
          h('label', { class: 'pick' }, [h('input', { type: 'radio', name: 'count', checked: f.count === n, onChange: () => ((f.count = n), refreshWizard()) }), h('span', {}, String(n))]),
        )),
        h('p', { class: 'hint' }, f.agent === 'demo' ? 'The demo agent costs nothing.' : `Each design is one ${selectedAgent()?.name ?? 'agent'} session on your account, about 10–20 minutes, ${f.concurrency} at a time.`),
      ]),
      h('fieldset', { class: 'field picks' }, [
        h('legend', { class: 'label' }, 'Which pages?'),
        h('div', { class: 'pick-row' }, [...new Set([...(S.detect.routes ?? ['/']), ...f.routes])].map((r) => pick(r === '/' ? 'Home' : r, f.routes.includes(r), (on) => {
          f.routes = on ? [...f.routes, r] : f.routes.filter((x) => x !== r);
          if (!f.routes.length) f.routes = ['/'];
        }))),
        h('input', { class: 'input', 'aria-label': 'Add a page', placeholder: 'Add a page, e.g. /pricing, then Enter', onKeydown: (e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          const r = e.target.value.trim();
          if (!r) return;
          f.routes = [...new Set([...f.routes, r.startsWith('/') ? r : `/${r}`])];
          refreshWizard();
        } }),
        h('p', { class: 'hint' }, 'Just the home page is fastest. Each extra page adds time to every design.'),
      ]),
      h('fieldset', { class: 'field picks' }, [
        h('legend', { class: 'label' }, 'Extras (optional)'),
        h('div', { class: 'pick-row' }, (S.detect.extras ?? []).map((x) => pick(x.label, (f.extras ?? []).includes(x.id), (on) => {
          f.extras = on ? [...(f.extras ?? []), x.id] : (f.extras ?? []).filter((id) => id !== x.id);
        }, x.hint))),
      ]),
      h('details', { class: 'more', open: ['to', 'seats', 'checks'].includes(S.openSegment) }, [
        h('summary', {}, 'More settings'),
        h('div', { class: 'segments', role: 'group' }, [segmentButton('to', 'Approach'), segmentButton('seats', 'Variants'), segmentButton('checks', 'Quality')]),
        h('div', { class: 'drawer', id: 'drawer', hidden: true }),
      ]),
    ];
  },
  site: () => {
    const field = (key, label, placeholder) =>
      h('label', { class: 'field' }, [
        h('span', { class: 'label' }, label),
        h('textarea', { class: 'input', rows: 2, placeholder, value: S.form.product?.[key] ?? '', onInput: (e) => ((S.form.product = { ...(S.form.product ?? {}), [key]: e.target.value }), saveDraft()) }),
      ]);
    return [
      h('p', { class: 'hint' }, S.detect.hasProduct
        ? 'Your PRODUCT.md already tells the designers about your site. Add anything else below, or just continue.'
        : 'Optional. A few words help the designers aim at your audience instead of guessing. Skip it if you like.'),
      S.detect.hasProduct ? null : field('users', 'Who is it for?', 'e.g. People furnishing a first home'),
      S.detect.hasProduct ? null : field('purpose', 'What does it offer?', 'e.g. Handmade oak and steel furniture, delivered by the maker'),
      S.detect.hasProduct ? null : field('keep', 'What must stay?', 'e.g. The logo, the name, prices in euros'),
      h('label', { class: 'field' }, [
        h('span', { class: 'label' }, 'Anything else?'),
        h('textarea', { class: 'input', rows: 2, placeholder: 'e.g. Less corporate. It should feel like a workshop.', value: S.form.brief, onInput: (e) => ((S.form.brief = e.target.value), saveDraft()) }),
      ]),
    ];
  },
  review: (blocks) => {
    const f = S.form;
    const v = segmentValues();
    const a = selectedAgent();
    const answered = ['users', 'purpose', 'keep'].filter((k) => f.product?.[k]?.trim()).length + (f.brief?.trim() ? 1 : 0);
    const extras = (S.detect.extras ?? []).filter((x) => f.extras?.includes(x.id)).map((x) => x.label);
    const row = (label, value, step) =>
      h('div', { class: 'review-row' }, [h('dt', { class: 'label' }, label), h('dd', {}, value), h('dd', {}, h('button', { type: 'button', class: 'link', onClick: () => goStep(step) }, 'Edit'))]);
    return [
      h('dl', { class: 'review' }, [
        row('App', `${v.from.figure} · ${f.appRel || 'repo root'}`, 0),
        row('Agent', f.agent === 'demo' ? 'Demo agent (no AI)' : a?.name ?? f.agent, 0),
        row('Designs', `${f.count}, ${f.approach === 'refine' ? 'refining your current look' : 'each a new look Impeccable picks'}`, 1),
        row('Pages', f.routes.map((r) => (r === '/' ? 'Home' : r)).join(', '), 1),
        row('Extras', extras.length ? extras.join(', ') : 'None', 1),
        row('Your site', S.detect.hasProduct ? 'From your PRODUCT.md' : answered ? `${answered} answer${answered === 1 ? '' : 's'}` : 'Skipped', 2),
      ]),
      notesList(blocks),
      h('p', { class: 'hint' }, f.agent === 'demo' ? 'Nothing is spent.' : `Uses ${plural(f.count * (checkOn('review') ? 2 : 1), 'session')} on your ${a?.name ?? 'agent'} account. Your files aren't touched until you keep one.`),
    ];
  },
};

const mountCheckin = (main) => {
  if (!S.detect) {
    main.append(h('div', { class: 'loading' }, 'Looking at your project…'));
    loadDetect();
    return;
  }
  const d = S.detect;
  if (!S.draftLoaded) {
    S.draftLoaded = true;
    // A refresh or deep link keeps its step; Make is still gated on blockers.
    S.wizReached = Math.max(0, WIZ.findIndex((w) => w.id === new URLSearchParams(location.search).get('step')));
    const draft = !S.snap?.config && loadDraft();
    if (draft) Object.assign(S.form, draft);
  }
  main.append(
    h('div', { class: 'setup wizard-wrap' }, [
      h('header', { class: 'setup-head' }, [
        h('h1', { class: 'figure display' }, `Redesign ${d.name}`),
        h('p', { class: 'setup-meta' }, [d.branch, d.head, d.repo].filter(Boolean).join(' · ')),
      ]),
      h('div', { id: 'wizard' }),
      h('p', { id: 'wiz-live', class: 'sr-only', 'aria-live': 'polite' }),
    ]),
  );
  refreshWizard();
};

const segmentButton = (id, label) =>
  h(
    'button',
    {
      class: 'segment',
      type: 'button',
      'data-seg': id,
      'aria-expanded': 'false',
      'aria-controls': 'drawer',
      onClick: () => {
        S.openSegment = S.openSegment === id ? null : id;
        updateCheckin(true);
      },
    },
    [h('span', { class: 'label' }, label), h('span', { class: 'figure' }), h('span', { class: 'sub' })],
  );

const loadDetect = async () => {
  try {
    S.detect = await api('GET', 'detect');
    const saved = S.snap?.config;
    S.form = { ...S.detect.suggested, ...(saved ?? {}) };
    if (!S.form.routes?.length) S.form.routes = ['/'];
    S.form.extras ??= [];
    S.form.directions = Array.from({ length: 10 }, (_, i) => S.form.directions?.[i] ?? '');
    S.form.product = S.form.product ?? { users: '', purpose: '', keep: '' };
    S.view = '';
    render();
  } catch (err) {
    toast(err.message, true);
  }
};

const selectedCandidate = () => S.detect.candidates.find((c) => c.rel === S.form.appRel && c.stackId === S.form.stackId);
const selectedAgent = () => S.detect.agents.find((a) => a.id === S.form.agent);

/** The checks around Impeccable: key, title, short name, what it does. */
const CHECKS = [
  ['browser', 'Let the agent see its variant', 'browser', 'Each agent gets a headless browser (Playwright MCP) on its own live variant: it screenshots its work at desktop and phone widths and fixes what it sees.'],
  ['review', 'Review pass', 'review', 'When the design is built, the agent runs again: Impeccable’s critique and audit, fed with the scores, then fixes the worst problems without changing the direction. A second session per variant.'],
  ['audit', 'Scores', 'scores', 'axe-core and Lighthouse on the original and every variant: accessibility, performance, best practices, SEO. Runs on your machine, costs nothing.'],
];
/** A check is on unless turned off; the demo agent has no browser or review pass. */
const checkOn = (key) => S.form[key] !== false && !(S.form.agent === 'demo' && key !== 'audit');

const segmentValues = () => {
  const f = S.form;
  const cand = selectedCandidate();
  const stackName = cand?.name ?? S.detect.stacks.find((s) => s.id === f.stackId)?.name ?? 'Custom';
  const agent = selectedAgent();
  const pinned = f.directions.slice(0, f.count).filter((d) => d.trim()).length;
  return {
    from: {
      figure: stackName,
      sub: `${f.appRel || 'repo root'} · ${f.originalUrl ? `running at ${f.originalUrl.replace(/^https?:\/\//, '')}` : 'variantly starts it'}`,
      warn: !f.command && !f.originalUrl,
    },
    via: {
      figure: agentShort[f.agent] ?? f.agent,
      sub: f.agent === 'demo' ? 'no AI, fixed restyles' : !agent?.installed ? 'not installed' : !agent.impeccable ? 'Impeccable missing' : agent.version || 'installed',
      warn: f.agent !== 'demo' && (!agent?.installed || !agent?.impeccable),
    },
    to: { figure: f.approach === 'refine' ? 'Refine' : 'Redesign', sub: pinned ? `${pinned} pinned by you · the rest by Impeccable` : 'Impeccable picks every world' },
    seats: { figure: pad(f.count), sub: `${f.concurrency} at a time · ${f.maxLive} servers live` },
    checks: (() => {
      const on = CHECKS.filter(([k]) => checkOn(k));
      return {
        figure: `${on.length} of ${CHECKS.length}`,
        sub: on.length ? on.map(([, , short]) => short).join(' · ') : 'Impeccable only',
        warn: !S.detect.chrome && (checkOn('browser') || checkOn('audit')),
      };
    })(),
  };
};

const updateCheckin = (drawerChanged = false) => {
  if (!S.detect || !S.form) return;
  const values = segmentValues();
  for (const seg of $$('.segment')) {
    const id = seg.dataset.seg;
    const v = values[id];
    $('.figure', seg).textContent = v.figure;
    const sub = $('.sub', seg);
    sub.textContent = v.sub;
    sub.classList.toggle('warn', Boolean(v.warn));
    seg.setAttribute('aria-expanded', String(S.openSegment === id));
  }
  if (drawerChanged) renderDrawer();
  renderStub();
  renderPreviewRows();
};

/** A checkbox chip. */
const pick = (label, on, set, title) =>
  h('label', { class: 'pick', title: title ?? '' }, [
    h('input', { type: 'checkbox', checked: on, onChange: (e) => {
      set(e.target.checked);
      refreshWizard();
    } }),
    h('span', {}, label),
  ]);

const renderDrawer = () => {
  const drawer = $('#drawer');
  if (!drawer) return;
  drawer.replaceChildren();
  drawer.hidden = !S.openSegment;
  const f = S.form;
  const d = S.detect;
  const change = (fn) => (e) => {
    fn(e);
    updateCheckin();
  };

  if (S.openSegment === 'from') {
    put(drawer, 
      h('div', { class: 'field' }, [
        h('span', { class: 'label' }, 'Your app'),
        h('div', { class: 'options', role: 'radiogroup', 'aria-label': 'Detected apps' }, [
          ...d.candidates.map((c) =>
            optionCard({
              name: 'app',
              checked: c.rel === f.appRel && c.stackId === f.stackId,
              title: c.name,
              detail: [c.rel || 'repo root', c.running ? ` · running at :${new URL(c.defaultUrl).port}` : ''].join(''),
              onChange: () => {
                Object.assign(f, {
                  appRel: c.rel,
                  stackId: c.stackId,
                  command: c.command,
                  originalUrl: c.running ? c.defaultUrl : '',
                  deps: c.needsInstall ? 'install' : 'link',
                });
                updateCheckin(true);
              },
            }),
          ),
          optionCard({
            name: 'app',
            checked: !selectedCandidate(),
            title: 'Custom',
            detail: 'Any dev server, your command',
            onChange: () => {
              f.stackId = 'custom';
              updateCheckin(true);
            },
          }),
        ]),
      ]),
      h('div', { class: 'field-row' }, [
        h('label', { class: 'field' }, [
          h('span', { class: 'label' }, 'Dev command'),
          h('input', { class: 'input', value: f.command, spellcheck: false, onInput: change((e) => (f.command = e.target.value)) }),
          h('p', { class: 'hint' }, ['Runs in every variant. ', h('code', {}, '{port}'), ' is the port, ', h('code', {}, '{port2}'), ' a spare one, ', h('code', {}, '{run}'), ' your package runner.']),
        ]),
        h('div', { class: 'field' }, [
          h('span', { class: 'label' }, 'The original'),
          segToggle(
            [
              ['start', 'variantly starts it'],
              ['running', 'Already running'],
            ],
            f.originalUrl ? 'running' : 'start',
            (v) => {
              f.originalUrl = v === 'running' ? f.originalUrl || selectedCandidate()?.defaultUrl || 'http://localhost:3000' : '';
              updateCheckin(true);
            },
          ),
          f.originalUrl
            ? h('input', { class: 'input', value: f.originalUrl, 'aria-label': 'URL of your running app', onInput: change((e) => (f.originalUrl = e.target.value)) })
            : h('p', { class: 'hint' }, 'Your checkout gets its own server on a free port, next to the variants.'),
        ]),
      ]),
      selectedCandidate()?.note ? h('p', { class: 'note' }, selectedCandidate().note) : null,
      h('div', { class: 'field' }, [
        h('span', { class: 'label' }, 'Dependencies in each variant'),
        segToggle(
          [
            ['link', 'Link yours'],
            ['install', 'Install fresh'],
          ],
          f.deps,
          (v) => {
            f.deps = v;
            updateCheckin(true);
          },
        ),
        h('p', { class: 'hint' }, f.deps === 'install' ? 'Each variant runs your install command once. Needed for Next.js (Turbopack rejects linked node_modules).' : 'Each variant links your installed dependencies. Instant, and nothing is downloaded.'),
      ]),
    );
  }

  if (S.openSegment === 'via') {
    const agents = [...d.agents, { id: 'demo', name: 'Demo agent', installed: true, impeccable: true, version: 'built in, no AI', install: '' }];
    put(drawer, 
      h('div', { class: 'field' }, [
        h('span', { class: 'label' }, 'Agent'),
        h(
          'div',
          { class: 'options', role: 'radiogroup', 'aria-label': 'Agent' },
          agents.map((a) =>
            optionCard({
              name: 'agent',
              checked: f.agent === a.id,
              title: a.name,
              detail: a.installed ? a.version || 'installed' : a.install,
              tags: a.id === 'demo' ? [] : [a.installed ? h('span', { class: 'tag ok' }, 'Installed') : h('span', { class: 'tag bad' }, 'Not installed'), a.installed ? (a.impeccable ? h('span', { class: 'tag ok' }, 'Impeccable') : h('span', { class: 'tag bad' }, 'No Impeccable')) : null],
              onChange: () => {
                f.agent = a.id;
                updateCheckin(true);
              },
            }),
          ),
        ),
      ]),
      (() => {
        const a = selectedAgent();
        if (!a || !a.installed || a.impeccable) return null;
        return h('div', { class: 'note alert' }, [
          `${a.name} doesn't have the Impeccable skill yet. `,
          h('button', { class: 'btn small', type: 'button', onClick: () => installImpeccable(a.id) }, 'Install Impeccable'),
          h('p', { class: 'hint' }, ['Runs ', h('code', {}, `npx impeccable install --providers=${a.id} --scope=global --yes --no-hooks`), ' (nothing is written into your project).']),
        ]);
      })(),
      f.agent === 'demo'
        ? h('p', { class: 'note' }, 'The demo agent appends a fixed restyle to your main stylesheet. It shows how variantly works without spending anything; the results are deliberately crude.')
        : h('div', { class: 'field-row' }, [
            h('label', { class: 'field' }, [
              h('span', { class: 'label' }, 'Model (optional)'),
              h('input', { class: 'input', value: f.model, placeholder: "the agent's default", onInput: change((e) => (f.model = e.target.value)) }),
            ]),
            h('div', { class: 'field' }, [
              h('span', { class: 'label' }, 'Permissions'),
              segToggle(
                [
                  ['safe', 'Edits only'],
                  ['full', 'Full auto'],
                ],
                f.permissions,
                (v) => {
                  f.permissions = v;
                  updateCheckin(true);
                },
              ),
              h('p', { class: 'hint' }, f.permissions === 'full' ? 'No permission checks inside each worktree. Use only in projects you trust.' : 'File edits and the Impeccable launcher only. Each agent works in its own worktree.'),
            ]),
          ]),
    );
  }

  if (S.openSegment === 'to') {
    put(drawer,
      h('div', { class: 'field' }, [
        h('span', { class: 'label' }, 'Approach'),
        segToggle(
          [
            ['redesign', 'Redesign'],
            ['refine', 'Refine'],
          ],
          f.approach,
          (v) => {
            f.approach = v;
            updateCheckin(true);
          },
        ),
        h('p', { class: 'hint' }, f.approach === 'refine' ? 'Keep your look. Impeccable finds what to improve in each variant.' : 'Replace your look. Impeccable picks a different visual world for every variant.'),
      ]),
      h('div', { class: 'field' }, [
        h('span', { class: 'label' }, 'Your own directions (optional)'),
        h(
          'div',
          { class: 'directions' },
          Array.from({ length: f.count }, (_, i) =>
            h('label', { class: 'direction' }, [
              h('span', { class: 'num figure' }, vname(i + 1)),
              h('input', {
                'aria-label': `Direction for ${vname(i + 1)}`,
                value: f.directions[i] ?? '',
                placeholder: 'Impeccable picks',
                onInput: (ev) => {
                  f.directions[i] = ev.target.value;
                  updateCheckin();
                },
              }),
            ]),
          ),
        ),
        h('p', { class: 'hint' }, 'Leave a slot blank and Impeccable chooses that world itself. Type to pin one, in your words: "a 70s record sleeve", "like a Swiss train timetable".'),
      ]),
    );
  }

  if (S.openSegment === 'checks') {
    put(drawer,
      h('fieldset', { class: 'field checks' }, [
        h('legend', { class: 'label' }, 'Around Impeccable'),
        ...CHECKS.map(([key, title, , detail]) =>
          h('label', { class: 'check' }, [
            h('input', {
              type: 'checkbox',
              checked: checkOn(key),
              disabled: f.agent === 'demo' && key !== 'audit',
              onChange: (e) => {
                f[key] = e.target.checked;
                updateCheckin(true);
              },
            }),
            h('span', {}, [h('span', { class: 'name' }, title), h('span', { class: 'hint' }, detail)]),
          ]),
        ),
      ]),
      f.agent === 'demo' ? h('p', { class: 'hint' }, 'The demo agent has no browser and no review pass; scores still run.') : null,
      !d.chrome && (checkOn('browser') || checkOn('audit'))
        ? h('p', { class: 'note alert' }, ['No Chrome or Chromium found. Install Chrome, or set ', h('code', {}, 'CHROME_PATH'), '; until then the browser and scores will fail.'])
        : null,
      h('p', { class: 'hint' }, 'All three run through npx at pinned versions the first time they are needed, so they work with any stack.'),
    );
  }

  if (S.openSegment === 'seats') {
    put(drawer, 
      h('div', { class: 'field-row' }, [
        h('div', { class: 'field' }, [h('span', { class: 'label' }, 'Variants'), stepper(f.count, 1, 10, (n) => {
          f.count = n;
          while (f.directions.length < n) f.directions.push('');
          updateCheckin(true);
        })]),
        h('div', { class: 'field' }, [h('span', { class: 'label' }, 'At a time'), stepper(f.concurrency, 1, 6, (n) => {
          f.concurrency = n;
          updateCheckin(true);
        }), h('p', { class: 'hint' }, 'Agents running in parallel.')]),
        h('div', { class: 'field' }, [h('span', { class: 'label' }, 'Servers live'), stepper(f.maxLive, 2, 8, (n) => {
          f.maxLive = n;
          updateCheckin(true);
        }), h('p', { class: 'hint' }, 'The original plus the variants you looked at last. The rest sleep.')]),
      ]),
    );
  }
};

const optionCard = ({ name, checked, title, detail, tags = [], onChange }) =>
  h('label', { class: 'option' }, [
    h('input', { type: 'radio', name, checked, onChange }),
    h('span', { class: 'name' }, title),
    detail ? h('span', { class: 'detail' }, detail) : null,
    tags.length ? h('span', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' } }, tags) : null,
  ]);

const segToggle = (pairs, value, onPick) =>
  h(
    'div',
    { class: 'seg-toggle', role: 'group' },
    pairs.map(([v, label]) => h('button', { type: 'button', 'aria-pressed': String(v === value), onClick: () => onPick(v) }, label)),
  );

const stepper = (value, min, max, onSet) =>
  h('div', { class: 'stepper' }, [
    h('button', { type: 'button', 'aria-label': 'Fewer', disabled: value <= min, onClick: () => onSet(Math.max(min, value - 1)) }, icon('minus')),
    h('span', { class: 'figure', 'aria-live': 'polite' }, pad(value)),
    h('button', { type: 'button', 'aria-label': 'More', disabled: value >= max, onClick: () => onSet(Math.min(max, value + 1)) }, icon('plus')),
  ]);

// Each problem says what is wrong and, where variantly can, fixes it.
const fixButton = (label, onClick) =>
  h('button', { class: 'btn small', type: 'button', onClick: (ev) => ((ev.currentTarget.disabled = true), onClick()) }, label);

const blockers = () => {
  const d = S.detect;
  const f = S.form;
  const list = [];
  if (!d.hasCommits)
    list.push(['bad', 'This repository has no commits yet, so variants have nothing to start from.', fixButton('Commit everything now', () => runFix('commit', {}, 'First commit made.'))]);
  const a = selectedAgent();
  if (f.agent !== 'demo' && !a?.installed)
    list.push(['bad', `${a?.name ?? f.agent} isn't installed. Sign in to it once after installing.`, a?.install ? fixButton(`Install ${a.name}`, () => runFix('install-agent', { agent: a.id }, `Installing ${a.name}…`)) : null]);
  if (f.agent !== 'demo' && a?.installed && a.signedIn === false)
    list.push(['bad', `${a.name} is installed but not signed in. A window opens; follow it, then come back here.`, fixButton(`Sign in to ${a.name}`, () => runFix('login', { agent: a.id }, 'Sign-in window opened. Come back when it says you are signed in.').then(() => setTimeout(loadDetect, 15000)))]);
  if (f.agent !== 'demo' && a?.installed && !a.impeccable)
    list.push(['bad', `${a.name} doesn't have the Impeccable design skill yet. variantly needs it; installing takes a minute.`, fixButton('Install Impeccable', () => installImpeccable(a.id))]);
  if (!f.command && !f.originalUrl) list.push(['bad', 'Set a dev command under Your app.']);
  return list;
};

const advisories = () => {
  const d = S.detect;
  const f = S.form;
  const list = [];
  const a = selectedAgent();
  if (d.dirty) list.push(['', 'Your uncommitted edits to tracked files are included in every variant.']);
  if (d.untracked) list.push(['', `${plural(d.untracked, 'untracked file')} won't be in the variants. Commit what the site needs.`]);
  if (!d.chrome && (checkOn('browser') || checkOn('audit'))) list.push(['alert', 'No Chrome found for the browser and scores. Set CHROME_PATH or turn them off under Quality.']);
  return list;
};

const runFix = async (route, body, message) => {
  try {
    await api('POST', route, body);
    toast(message);
    if (route === 'commit') loadDetect();
  } catch (err) {
    toast(err.message, true);
    renderStub();
  }
};

const renderStub = () => {
  const body = $('#stub-body');
  if (!body) return;
  const f = S.form;
  const blocks = blockers();
  const notes = [...blocks, ...advisories()];
  const agentName = f.agent === 'demo' ? 'the demo agent' : selectedAgent()?.name ?? f.agent;
  body.replaceChildren(
    ...[
      notes.length
        ? h('ul', { class: 'notes' }, notes.map(([kind, text, action]) => h('li', { class: `note ${kind}` }, [h('span', {}, text), action ?? null])))
        : null,
      h('div', { class: 'dock-row' }, [
        h('p', { class: 'dock-summary' }, [
          h('strong', {}, `${plural(f.count, 'variant')} · ${f.approach}`),
          ` with ${agentName}, ${f.concurrency} at a time. `,
          f.agent === 'demo' ? 'No AI, nothing spent.' : `${plural(f.count * (checkOn('review') ? 2 : 1), 'session')} on your account${checkOn('review') ? ', review passes included' : ''}.`,
        ]),
        h('button', { class: 'btn primary big', type: 'button', disabled: blocks.length > 0, onClick: generate }, `Generate ${plural(f.count, 'variant')}`, icon('arrow')),
      ]),
    ].filter(Boolean),
  );
};

const renderPreviewRows = () => {
  const tbody = $('#preview-rows');
  if (!tbody) return;
  const f = S.form;
  $('#preview-count').textContent = `${plural(f.count, 'variant')} · ${f.concurrency} at a time`;
  tbody.replaceChildren(
    ...Array.from({ length: f.count }, (_, i) =>
      h('tr', {}, [
        h('td', { class: 'var figure' }, vname(i + 1)),
        h('td', { class: 'dir' }, directionLabel(f.directions[i])),
        h('td', {}, h('span', { class: 'status', 'data-s': 'scheduled' }, h('span', { class: 'flap-text' }, 'Scheduled'))),
      ]),
    ),
  );
};

const generate = async (e) => {
  const btn = e.currentTarget;
  btn.disabled = true;
  try {
    S.forceBoard = false;
    S.unseen.clear();
    S.lastStatus.clear();
    S.sel = null;
    await api('POST', 'generate', S.form);
  } catch (err) {
    toast(err.message, true);
    btn.disabled = false;
  }
};

const installImpeccable = async (agent) => {
  try {
    const { command } = await api('POST', 'install-impeccable', { agent });
    toast(`Running ${command}…`);
  } catch (err) {
    toast(err.message, true);
  }
};

// Theme and accessibility ---------------------------------------------------

/*
 * The same two header controls as variantly.tools: a theme switch and a
 * menu of reading aids. Saved in this browser, applied as data attributes
 * on <html> (the inline script in index.html applies them before paint).
 */
const PREFS_KEY = 'variantly:prefs';
const readPrefs = () => {
  const m = (q) => matchMedia(q).matches;
  const base = { theme: m('(prefers-color-scheme: dark)') ? 'dark' : 'light', motion: m('(prefers-reduced-motion: reduce)') ? 'calm' : 'full', readable: false, large: false, contrast: false, calm: false };
  try {
    return { ...base, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') };
  } catch {
    return base;
  }
};
const applyPrefs = (p) => {
  const d = document.documentElement.dataset;
  for (const k of ['theme', 'motion', 'readable', 'large', 'contrast', 'calm']) d[k] = String(p[k]);
};
const setPref = (patch) => {
  const p = { ...readPrefs(), ...patch };
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {}
  applyPrefs(p);
  mountPrefs();
};

const AIDS = [
  ['readable', 'Readable font', 'Clearer letters, more spacing'],
  ['large', 'Larger text', 'Everything a little bigger'],
  ['contrast', 'High contrast', 'Stronger colours'],
  ['calm', 'Calm colours', 'Fewer shadows, less saturation'],
];

const mountPrefs = () => {
  const root = $('#prefs');
  if (!root) return;
  const p = readPrefs();
  const menu = $('#prefs-menu');
  const wasOpen = menu ? !menu.hidden : false;
  const dark = p.theme === 'dark';
  root.replaceChildren(
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': dark ? 'Switch to light theme' : 'Switch to dark theme', title: dark ? 'Light theme' : 'Dark theme', onClick: () => {
      setPref({ theme: dark ? 'light' : 'dark' });
      toast(dark ? 'Light theme on' : 'Dark theme on', false, { icon: dark ? 'sun' : 'moon' });
    } }, icon(dark ? 'sun' : 'moon')),
    h('button', { class: 'icon-btn', type: 'button', id: 'prefs-toggle', 'aria-label': 'Accessibility settings', title: 'Accessibility', 'aria-expanded': String(wasOpen), 'aria-controls': 'prefs-menu', onClick: (e) => {
      const menu = $('#prefs-menu');
      menu.hidden = !menu.hidden;
      e.currentTarget.setAttribute('aria-expanded', String(!menu.hidden));
    } }, icon('access')),
    h('div', { class: 'prefs-menu', id: 'prefs-menu', role: 'dialog', 'aria-label': 'Accessibility settings', hidden: !wasOpen }, [
      h('fieldset', {}, [
        h('legend', {}, 'Motion'),
        h('div', { class: 'prefs-motion' }, [['full', 'Full animations'], ['calm', 'Calmer (less)']].map(([v, label]) =>
          h('button', { type: 'button', 'aria-pressed': String(p.motion === v), onClick: () => setPref({ motion: v }) }, label),
        )),
      ]),
      h('fieldset', {}, [
        h('legend', {}, 'Reading aids'),
        ...AIDS.map(([k, label, hint]) =>
          h('label', { class: 'prefs-aid' }, [
            h('input', { type: 'checkbox', checked: p[k], onChange: (e) => setPref({ [k]: e.target.checked }) }),
            h('span', {}, [h('strong', {}, label), h('span', {}, hint)]),
          ]),
        ),
      ]),
    ]),
  );
};

addEventListener('pointerdown', (e) => {
  const menu = $('#prefs-menu');
  if (menu && !menu.hidden && !$('#prefs').contains(e.target)) {
    menu.hidden = true;
    $('#prefs-toggle')?.setAttribute('aria-expanded', 'false');
  }
});
addEventListener('keydown', (e) => {
  const menu = $('#prefs-menu');
  if (e.key === 'Escape' && menu && !menu.hidden) {
    menu.hidden = true;
    $('#prefs-toggle')?.focus();
  }
});
mountPrefs();

// Handoff -------------------------------------------------------------------

/*
 * A prompt that moves this run into the person's own agent session, with
 * everything that agent needs to pick it up without the web UI. The run is
 * not touched: copying only reads the snapshot.
 */
const handoffPrompt = () => {
  const snap = S.snap;
  const c = snap.config ?? {};
  const place = (n) => snap.places?.find((p) => p.n === n) ?? {};
  const rows = snap.variants.map((v) => {
    const p = place(v.n);
    const step = typeof v.step === 'number' ? STEPS[v.step] ?? '' : '';
    return `| ${v.n} | ${v.picked || v.direction || 'Impeccable picks'} | ${v.status}${step && v.status === 'running' ? ` (${step})` : ''} | \`${p.worktree ?? '?'}\` | \`${p.branch ?? '?'}\` |`;
  });
  const problems = snap.variants.filter((v) => v.error).map((v) => `- V${pad(v.n)}: ${v.error}`);
  const done = snap.variants.filter((v) => v.status === 'done').map((v) => v.n);
  return [
    '# Handoff: a variantly run, to continue here',
    '',
    `I started a variantly run on \`${snap.repo}\` and want to follow it from this session instead of the variantly web page. **The run is still going in the background. Do not stop, restart or re-run it** unless I ask.`,
    '',
    '## The run',
    '',
    `- Project: \`${snap.repo}\`${c.appRel ? ` (app in \`${c.appRel}/\`)` : ''}`,
    `- Agent: ${c.agent ?? '?'} · ${snap.variants.length} variants · phase: **${snap.phase}**`,
    `- Base commit: \`${snap.base}\` (every variant branches from it)`,
    `- variantly's state folder: \`${snap.stateDir}\` (\`state.json\` there is the source of truth)`,
    c.brief ? `- What I asked for: ${c.brief}` : null,
    c.routes?.length ? `- Pages in scope: ${c.routes.join(', ')}` : null,
    '',
    '## Variants',
    '',
    '| # | Direction | Status | Worktree | Branch |',
    '| - | --------- | ------ | -------- | ------ |',
    ...rows,
    '',
    `Each variant's brief, the exact instructions its agent got, is at \`${snap.stateDir}/briefs/v<n>.md\`.`,
    problems.length ? ['', '## Problems so far', '', ...problems].join('\n') : null,
    '',
    '## What to do',
    '',
    '1. Read the briefs so you know what each variant was asked to do.',
    `2. From \`${snap.repo}\`, follow progress with \`npx variantly status\` (it only reads a file, so it is cheap). Check every minute or two until the phase is \`ready\`; tell me as each variant finishes.`,
    `3. For each finished variant${done.length ? ` (so far: ${done.map((n) => `V${pad(n)}`).join(', ')})` : ''}, summarise it for me: the look in one line, then \`git diff --stat ${snap.base}..<branch>\` and the two or three files that changed most. Keep it short so I can compare.`,
    '4. If a variant failed, explain why from its error and offer to finish it by hand in its worktree, following its brief. Ask me first.',
    '5. When I name the one to keep, run `npx variantly keep <n>`. That applies it to my working tree and cleans up the rest. Nothing reaches my files before that.',
    '',
    '## Rules',
    '',
    "- Don't commit, push, rebase or delete branches: variantly owns the `variantly/…` branches and worktrees.",
    "- Don't edit my main working tree until I have chosen a variant.",
    "- Don't start, stop or restart variantly's dev servers or its background process.",
    '- Ask before installing anything.',
    '',
    'Start by confirming what you see in `npx variantly status`, in a few lines.',
  ]
    .filter((x) => x !== null)
    .join('\n');
};

const copyHandoff = async () => {
  try {
    await navigator.clipboard.writeText(handoffPrompt());
    toast('Paste it into your agent. This run keeps going here.', false, { title: 'Handoff prompt copied', icon: 'copy' });
  } catch (err) {
    toast(`Couldn't copy the handoff prompt: ${err.message}`, true);
  }
};

// Board ---------------------------------------------------------------------

const mountBoardView = (main) => {
  main.append(
    h('div', { class: 'boardview' }, [
      h('section', { class: 'board', 'aria-labelledby': 'board-title' }, [
        h('header', { class: 'board-head' }, [
          h('div', { style: { display: 'grid', gap: '6px' } }, [h('h1', { id: 'board-title', class: 'figure' }), h('div', { class: 'label readout', id: 'board-meta' })]),
          h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, [
            h('button', { class: 'btn outline', type: 'button', id: 'handoff', onClick: copyHandoff, title: 'Copy a prompt that hands this run to the AI assistant in your terminal. The run keeps going.' }, icon('handoff'), 'Hand off'),
            h('button', { class: 'btn outline', type: 'button', id: 'discard', onClick: discard }, 'Discard run'),
            h('button', { class: 'btn primary', type: 'button', id: 'to-compare', onClick: () => goCompare() }, 'Compare', icon('arrow')),
          ]),
        ]),
        h('table', {}, [
          h('thead', {}, h('tr', {}, [
            h('th', { class: 'label' }, 'Var'),
            h('th', { class: 'label' }, 'Direction'),
            h('th', { class: 'label' }, 'Status'),
            h('th', { class: 'label' }, 'Time'),
            h('th', { class: 'label hide-compact' }, 'Files'),
            h('th', { class: 'label' }, 'Usage'),
            h('th', { class: 'label' }, 'Step'),
          ])),
          h('tbody', { id: 'board-rows', 'aria-live': 'polite' }),
        ]),
      ]),
    ]),
  );
};

/** Compact token count: 12k, 1.4M. */
const compactTokens = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n));

/** One variant's spend, as its agent reported it: dollars, credits, or tokens. */
const usageText = (v) => {
  const parts = [];
  if (v.usage) parts.push(`${compactTokens(v.usage.inputTokens + v.usage.outputTokens)} tok`);
  if (typeof v.credits === 'number') parts.push(`${v.credits} premium req`);
  if (typeof v.costUsd === 'number') parts.push(`${v.costUsd.toFixed(2)}`);
  return parts.join(' · ') || '—';
};

const usageTitle = (v) =>
  v.usage
    ? `${v.usage.inputTokens.toLocaleString()} in (${(v.usage.cachedInputTokens ?? 0).toLocaleString()} cached) · ${v.usage.outputTokens.toLocaleString()} out`
    : 'No usage reported yet';

/** The board head's live readout: agent, elapsed run time, ready count, cost so far. */
const renderReadout = (el) => {
  if (!el) return;
  const vs = variants();
  const agent = S.snap?.config?.agent;
  const starts = vs.map((v) => v.startedAt).filter(Boolean);
  const start = starts.length ? Math.min(...starts) : 0;
  const settled = vs.every((v) => ['done', 'failed', 'cancelled'].includes(v.status));
  const end = settled ? Math.max(0, ...vs.map((v) => v.finishedAt ?? 0)) : Date.now();
  const s = start ? Math.max(0, Math.floor((end - start) / 1000)) : 0;
  const cost = vs.reduce((sum, v) => sum + (typeof v.costUsd === 'number' ? v.costUsd : 0), 0);
  // Codex and Copilot report tokens, not dollars; show what was reported.
  const tokens = vs.reduce((sum, v) => sum + (v.usage ? v.usage.inputTokens + v.usage.outputTokens : 0), 0);
  const credits = vs.reduce((sum, v) => sum + (typeof v.credits === 'number' ? v.credits : 0), 0);
  const parts = [
    agentShort[agent] ?? agent ?? '',
    `Elapsed ${Math.floor(s / 60)}:${pad(s % 60)}`,
    `${done().length} of ${vs.length} ready`,
    tokens > 0 ? `${compactTokens(tokens)} tokens` : null,
    credits > 0 ? `${credits} premium requests` : null,
    cost > 0 ? `${cost.toFixed(2)}` : null,
  ].filter(Boolean);
  el.replaceChildren(...parts.map((p) => h('span', {}, p)));
};

const order = { done: 0, committing: 1, reviewing: 2, running: 3, preparing: 4, queued: 5, failed: 6, cancelled: 7 };

const updateBoardView = () => {
  const vs = variants();
  const ready = done().length;
  $('#board-title').textContent = `${pad(vs.length)} variants`;
  const agent = S.snap?.config?.agent;
  renderReadout($('#board-meta'));
  $('#to-compare').disabled = !variants().some((v) => !['failed', 'cancelled'].includes(v.status));
  renderBoardRows($('#board-rows'), [...vs].sort((a, b) => order[a.status] - order[b.status] || (a.finishedAt ?? 0) - (b.finishedAt ?? 0) || a.n - b.n));
  renderBaselineRow($('#board-rows'));
};

/** The original's scores as the board's first row, so every variant reads against it. */
const renderBaselineRow = (tbody) => {
  if (!S.snap?.config?.audit && !S.snap?.baseline) return;
  const a = S.snap.baseline;
  const err = S.snap.baselineError;
  tbody.prepend(
    h('tr', { class: 'baseline' }, [
      h('td', { class: 'var figure' }, 'Orig'),
      h('td', { class: 'dir' }, 'Your site as it is', h('span', { class: 'summary scores' }, a ? scoreText(a) : err ? `Not scored: ${err}` : 'Scoring with axe-core and Lighthouse…')),
      h('td', {}, h('span', { class: 'status', 'data-s': 'scheduled' }, h('span', { class: 'flap-text' }, 'Baseline'))),
      h('td', { colspan: 4 }),
    ]),
  );
};

const renderBoardRows = (tbody, list) => {
  // FLIP: remember where each row was, re-render, then animate from there.
  const before = new Map($$('tr[data-n]', tbody).map((tr) => [tr.dataset.n, tr.getBoundingClientRect().top]));
  const prevStatus = new Map($$('tr[data-n]', tbody).map((tr) => [tr.dataset.n, $('.status', tr)?.dataset.s]));
  tbody.replaceChildren();
  for (const v of list) {
    const key = String(v.n);
    const s = statusKey(v.status);
    const unseen = S.unseen.has(v.n);
    const open = S.openRow === v.n;
    const statusEl = h('span', { class: `status${unseen ? ' unseen' : ''}`, 'data-s': s }, h('span', { class: 'flap-text' }, STATUS[v.status]), ['running', 'reviewing'].includes(v.status) ? h('span', { class: 'working-bars', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')) : null);
    if (prevStatus.has(key) && prevStatus.get(key) !== s) statusEl.classList.add('flip');
    const logLines = S.logs.get(`v${v.n}`) ?? [];
    const tr = h(
      'tr',
      {
        'data-n': key,
        class: 'clickable',
        tabindex: 0,
        'aria-expanded': String(open),
        onClick: () => toggleRow(v.n),
        onKeydown: (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleRow(v.n);
          }
        },
        onMouseenter: () => seen(v.n),
        onFocus: () => seen(v.n),
      },
      [
        h('td', { class: 'var figure' }, vname(v.n)),
        h('td', { class: 'dir' }, directionLabel(v.direction, v.picked), v.summary ? h('span', { class: 'summary' }, v.summary) : v.error ? h('span', { class: 'summary' }, v.error.split('\n')[0]) : null, v.review ? h('span', { class: 'summary' }, `Review: ${v.review}`) : null, scoreLine(v)),
        h('td', {}, statusEl),
        h('td', { class: 'num data', 'data-elapsed': key }, elapsed(v)),
        h('td', { class: 'num data hide-compact' }, v.files?.length ? String(v.files.length) : '—'),
        h('td', { class: 'num data', title: usageTitle(v) }, usageText(v)),
        h('td', { class: 'step-cell' }, stepCell(v, logLines.at(-1) ?? '')),
      ],
    );
    tbody.append(tr);
    if (open) tbody.append(h('tr', { class: 'rowlog' }, h('td', { colspan: 7 }, logPanel(v))));
  }
  for (const tr of $$('tr[data-n]', tbody)) {
    const was = before.get(tr.dataset.n);
    if (was === undefined) continue;
    const dy = was - tr.getBoundingClientRect().top;
    if (Math.abs(dy) > 1) tr.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
  }
};

// Scores --------------------------------------------------------------------

/** One target's axe-core and Lighthouse result: a variant, or null for the original. */
const auditOf = (v) => (v ? v.audit : S.snap?.baseline);

/** "92 (+7)" against the original, when both were scored. */
const vsBase = (n, base) => (typeof n !== 'number' ? '–' : typeof base === 'number' && base !== n ? `${n} (${n > base ? '+' : ''}${n - base})` : String(n));

const scoreText = (a, base) =>
  `A11y ${vsBase(a.lighthouse.accessibility, base?.lighthouse.accessibility)} · Perf ${vsBase(a.lighthouse.performance, base?.lighthouse.performance)} · axe ${a.axe.total}${base ? ` (was ${base.axe.total})` : ''}`;

/** The board's one-line readout under a variant's summary. */
const scoreLine = (v) => {
  if (v.auditState === 'running') return h('span', { class: 'summary' }, 'Scoring with axe-core and Lighthouse…');
  if (v.auditState === 'failed') return h('span', { class: 'summary' }, `Not scored: ${v.auditError ?? 'the audit failed'}`);
  return v.audit ? h('span', { class: 'summary scores' }, scoreText(v.audit, S.snap?.baseline)) : null;
};

/** The details panel's scores, with the worst axe violations and a re-run button. */
const scorePanel = (v) => {
  if (!S.snap?.config?.audit && !auditOf(v)) return null;
  const a = auditOf(v);
  const base = v ? S.snap?.baseline : null;
  const failed = v ? v.auditState === 'failed' && v.auditError : S.snap?.baselineError;
  const running = v ? v.auditState === 'running' : !a && !failed;
  const id = v ? `v${v.n}` : 'original';
  return h('div', { class: 'scores-panel' }, [
    h('div', { class: 'label' }, 'Scores · axe-core and Lighthouse'),
    a
      ? h('dl', { class: 'scores-grid' }, [
          ['Accessibility', a.lighthouse.accessibility, base?.lighthouse.accessibility],
          ['Performance', a.lighthouse.performance, base?.lighthouse.performance],
          ['Best practices', a.lighthouse.bestPractices, base?.lighthouse.bestPractices],
          ['SEO', a.lighthouse.seo, base?.lighthouse.seo],
          ['axe violations', a.axe.total, base?.axe.total],
        ].flatMap(([k, n, b]) => [h('dt', {}, k), h('dd', { class: 'data' }, vsBase(n, b))]))
      : h('p', { class: 'hint' }, running ? 'Scoring…' : failed ? `Not scored: ${failed}` : 'Not scored yet.'),
    a?.axe.violations.length
      ? h('ul', {}, a.axe.violations.slice(0, 5).map((x) => h('li', {}, [h('strong', {}, x.impact), ` ${x.help} (${x.nodes}×)`])))
      : null,
    running ? null : h('button', { class: 'btn outline small', type: 'button', onClick: () => act('audit', id) }, a ? 'Score again' : 'Score now'),
  ]);
};

const logPanel = (v) => {
  const lines = S.logs.get(`v${v.n}`) ?? [];
  const pre = h('pre', { 'data-log': `v${v.n}` }, lines.join('\n') || 'No output yet.');
  queueMicrotask(() => (pre.scrollTop = pre.scrollHeight));
  return h('div', { class: 'logpanel on-slate' }, [
    stepList(v),
    pre,
    h('div', { class: 'actions' }, [
      v.status === 'done' ? h('button', { class: 'btn primary small', type: 'button', onClick: (e) => (e.stopPropagation(), goCompare(v.n)) }, `Compare ${vname(v.n)}`) : null,
      ['failed', 'cancelled'].includes(v.status) ? h('button', { class: 'btn outline small', type: 'button', onClick: (e) => (e.stopPropagation(), act('retry', v.n)) }, 'Retry') : null,
      ['queued', 'preparing', 'running', 'reviewing'].includes(v.status) ? h('button', { class: 'btn outline small', type: 'button', onClick: (e) => (e.stopPropagation(), act('cancel', v.n)) }, 'Stop') : null,
    ]),
  ]);
};

const toggleRow = async (n) => {
  S.openRow = S.openRow === n ? null : n;
  if (S.openRow !== null && !S.logs.has(`v${n}`)) {
    try {
      const { lines } = await api('GET', `log/${n}`);
      S.logs.set(`v${n}`, lines);
    } catch {}
  }
  render();
};

const seen = (n) => {
  if (!S.unseen.delete(n)) return;
  for (const el of $$(`tr[data-n="${n}"] .status`)) el.classList.remove('unseen');
  updatePips();
};

const elapsed = (v) => {
  if (!v.startedAt) return '—';
  const ms = (v.finishedAt ?? Date.now()) - v.startedAt;
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
};

setInterval(() => {
  if (S.view === 'board') renderReadout($('#board-meta'));
  for (const v of variants()) {
    if (v.finishedAt || !v.startedAt) continue;
    for (const el of $$(`[data-elapsed="${v.n}"]`)) el.textContent = elapsed(v);
  }
}, 1000);

const act = async (verb, n) => {
  try {
    await api('POST', `${verb}/${n}`, {});
  } catch (err) {
    toast(err.message, true);
  }
};

const discard = async () => {
  if (!confirm('Throw away every variant in this run? Worktrees and branches are deleted.')) return;
  try {
    await api('POST', 'discard', {});
    S.forceBoard = false;
  } catch (err) {
    toast(err.message, true);
  }
};

const goCompare = (n) => {
  S.forceBoard = false;
  S.wantCompare = true;
  if (n) S.sel = n;
  else if (typeof S.sel !== 'number') S.sel = done()[0]?.n ?? variants().find((v) => !['failed', 'cancelled'].includes(v.status))?.n ?? 'original';
  render();
};

// Compare -------------------------------------------------------------------

const panes = {};

const mountCompare = (main) => {
  const pane = (side) => {
    const iframe = h('iframe', { title: side === 'before' ? 'Original' : 'Variant', allow: 'clipboard-read; clipboard-write' });
    const wait = h('div', { class: 'pane-wait', hidden: true });
    const el = h('div', { class: `pane ${side}` }, [iframe, wait]);
    panes[side] = { el, iframe, wait, target: '', path: '' };
    return el;
  };
  const shield = h('div', { class: 'drag-shield', hidden: true });
  const grip = h(
    'button',
    {
      class: 'grip',
      type: 'button',
      role: 'slider',
      'aria-label': 'Before and after divider',
      'aria-valuemin': 0,
      'aria-valuemax': 100,
      onKeydown: (e) => {
        const step = e.shiftKey ? 10 : 2;
        if (e.key === 'ArrowLeft') setSplit(S.split - step);
        else if (e.key === 'ArrowRight') setSplit(S.split + step);
        else if (e.key === 'Home') setSplit(0);
        else if (e.key === 'End') setSplit(100);
        else return;
        e.preventDefault();
        e.stopPropagation();
      },
      onPointerdown: (e) => {
        e.preventDefault();
        shield.hidden = false;
        grip.setPointerCapture(e.pointerId);
      },
      onPointermove: (e) => {
        if (shield.hidden) return;
        const r = $('.compare').getBoundingClientRect();
        setSplit(((e.clientX - r.left) / r.width) * 100);
      },
      onPointerup: () => (shield.hidden = true),
      onPointercancel: () => (shield.hidden = true),
    },
    [h('span', {}, 'BEFORE'), h('i'), h('span', {}, 'AFTER')],
  );

  main.append(
    h('div', { class: 'compare' }, [
      h('div', { class: 'stage', id: 'stage' }, [pane('before'), pane('after')]),
      shield,
      h('div', { class: 'divider' }, grip),
      h('div', { class: 'tags', 'aria-hidden': 'true' }, [h('span', { class: 'tag', id: 'tag-before' }, 'Original'), h('span', { class: 'tag', id: 'tag-after' })]),
      h('div', { class: 'flag gone', id: 'flag', role: 'status' }),
      h('aside', { class: 'info', id: 'info', hidden: true, 'aria-label': 'Variant details' }),
      h('nav', { class: 'dock', id: 'dock', 'aria-label': 'Variants' }),
    ]),
  );
  if (S.sel === null) S.sel = done()[0]?.n ?? variants().find((v) => !['failed', 'cancelled'].includes(v.status))?.n ?? 'original';
  setSplit(S.split);
  wake();
  renderDock();
  showFlag();
};

// The chrome recedes after a moment of looking and comes back on any
// intent to use it: a key, focus, or the pointer near the bottom edge.
let tuckTimer = 0;
const wake = () => {
  const compare = $('.compare');
  if (!compare) return;
  compare.classList.remove('tucked');
  clearTimeout(tuckTimer);
  tuckTimer = setTimeout(() => {
    if (!S.confirming && !S.infoOpen && !compare.contains(document.activeElement)) compare.classList.add('tucked');
  }, 2200);
};
addEventListener('pointermove', (e) => {
  if (S.view === 'compare' && e.clientY > innerHeight - 120) wake();
});
addEventListener('keydown', () => S.view === 'compare' && wake());

const setSplit = (pct) => {
  S.split = Math.max(0, Math.min(100, pct));
  const stage = $('#stage');
  if (!stage) return;
  $('.compare').style.setProperty('--split', `${S.split}%`);
  $('.grip')?.setAttribute('aria-valuenow', String(Math.round(S.split)));
  $('.grip')?.setAttribute('aria-valuetext', `${Math.round(S.split)}% original`);
};

const targetUrl = (target, path) => {
  const srv = server(target);
  return srv ? `http://${location.hostname}:${srv.proxyPort}${path}` : '';
};

const showIn = (side, target) => {
  const p = panes[side];
  // Keeping shuts every server down: leave the frames as they are, and
  // never ask for a server back while the change is being applied.
  if (!p || S.applying) return;
  const srv = server(target);
  const ready = srv?.state === 'ready';
  if (target && srv && srv.state !== 'ready' && srv.state !== 'starting') api('POST', `ensure/${target}`, {}).catch(() => {});
  const want = ready ? targetUrl(target, S.path) : '';
  if (ready && (p.target !== target || p.loaded !== true)) {
    p.target = target;
    p.loaded = true;
    p.path = S.path;
    p.iframe.src = want;
  }
  if (!ready) {
    p.loaded = false;
    p.target = target;
  }
  p.el.dataset.target = target;
  p.wait.hidden = ready;
  if (!ready) renderWait(p.wait, target, srv);
};

/** A design still being built: where it is, instead of a preview. */
const showProgress = (v) => {
  const p = panes.after;
  if (!p) return;
  p.loaded = false;
  p.target = null;
  p.el.dataset.target = `v${v.n}`;
  p.wait.hidden = false;
  const last = (S.logs.get(`v${v.n}`) ?? []).at(-1) ?? '';
  p.wait.replaceChildren(
    h('div', { class: 'wait-card' }, [
      h('header', {}, [
        h('span', { class: 'figure' }, vname(v.n)),
        h('span', { class: 'status', 'data-s': statusKey(v.status) }, h('span', { class: 'flap-text' }, 'In progress')),
      ]),
      h('div', { class: 'wait-body' }, [
        h('p', { class: 'wait-dir' }, directionLabel(v.direction, v.picked)),
        stepList(v),
        h('p', { class: 'wait-note' }, `${elapsed(v)} so far. It shows here when it's ready; look at another design meanwhile.`),
      ]),
      last ? h('pre', { class: 'wait-last' }, last) : null,
    ]),
  );
};

const renderWait = (el, target, srv) => {
  const failed = srv?.state === 'failed';
  const name = target === 'original' ? 'Original' : vname(Number(target.slice(1)));
  el.replaceChildren(
    h('div', { class: 'wait-card' }, [
      h('header', {}, [
        h('span', { class: 'figure' }, name),
        h('span', { class: 'status', 'data-s': failed ? 'failed' : 'scheduled' }, h('span', { class: 'flap-text' }, failed ? 'Failed' : 'Starting')),
      ]),
      h('pre', {}, failed ? `${srv.error}\n\n${(srv.log ?? []).slice(-14).join('\n')}` : (srv?.log ?? []).slice(-14).join('\n') || 'Starting the dev server…'),
      failed ? h('div', { class: 'actions on-slate' }, [h('button', { class: 'btn outline small', type: 'button', onClick: () => api('POST', `ensure/${target}`, {}) }, 'Try again')]) : null,
    ]),
  );
};

const updateCompare = () => {
  const stage = $('#stage');
  if (!stage) return;
  const pickable = variants().filter((v) => !['failed', 'cancelled'].includes(v.status));
  if (S.sel !== 'original' && !pickable.some((v) => v.n === S.sel)) S.sel = done()[0]?.n ?? pickable[0]?.n ?? 'original';
  const building = variants().find((x) => x.n === S.sel && x.status !== 'done');
  let mode = S.mode;
  if (S.sel === 'original' && mode !== 'single') mode = 'single';
  stage.dataset.mode = mode;
  stage.dataset.device = S.device ?? 'desktop';
  stage.dataset.show = S.sel === 'original' ? 'original' : 'variant';
  const variantTarget = S.sel === 'original' ? (S.lastVariant ? `v${S.lastVariant}` : '') : `v${S.sel}`;
  if (S.sel !== 'original') S.lastVariant = S.sel;
  if (mode !== 'single' || S.sel === 'original') showIn('before', 'original');
  if (building) {
    if (mode === 'slider') stage.dataset.mode = 'side';
    showIn('before', 'original');
    showProgress(building);
  } else if (variantTarget && (mode !== 'single' || S.sel !== 'original')) showIn('after', variantTarget);
  const v = variants().find((x) => x.n === S.sel);
  $('#tag-after').textContent = v ? `${vname(v.n)} · ${directionLabel(v.direction, v.picked)}` : '';
  renderDock();
  if (S.infoOpen) renderInfo();
};

const select = (sel) => {
  if (sel === S.sel) return;
  S.sel = sel;
  S.confirming = false;
  if (typeof sel === 'number') seen(sel);
  updateCompare();
  showFlag();
};

let flagTimer = 0;
const showFlag = () => {
  const flag = $('#flag');
  if (!flag) return;
  const v = variants().find((x) => x.n === S.sel);
  if (!v) {
    flag.classList.add('gone');
    return;
  }
  flag.replaceChildren(
    h('span', {}, h('strong', {}, directionLabel(v.direction, v.picked)), v.summary ? ` — ${v.summary}` : '', v.audit ? h('span', { class: 'flag-scores' }, scoreText(v.audit, S.snap?.baseline)) : null),
  );
  flag.classList.remove('gone');
  clearTimeout(flagTimer);
  flagTimer = setTimeout(() => flag.classList.add('gone'), 4500);
};

const updatePips = () => {
  for (const cell of $$('.cell[data-n]')) {
    const n = Number(cell.dataset.n);
    const pip = $('.pip', cell);
    pip?.classList.toggle('hidden', !S.unseen.has(n));
  }
};

const renderDock = () => {
  const dock = $('#dock');
  if (!dock) return;
  const vs = variants();
  if (S.confirming) {
    const v = vs.find((x) => x.n === S.sel);
    dock.replaceChildren(
      h('div', { class: 'confirm', role: 'alertdialog', 'aria-label': 'Keep this variant?' }, [
        h('span', {}, ['Apply ', h('strong', {}, vname(v.n)), ` (${directionLabel(v.direction, v.picked)}) to your working tree? `, h('span', { class: 'muted' }, `${plural(v.files.length, 'file')}. The others stay as branches.`)]),
        h('button', { class: 'btn outline small', type: 'button', disabled: Boolean(S.applying), onClick: () => ((S.confirming = false), renderDock()) }, 'Cancel'),
        h('button', { class: 'btn primary', type: 'button', id: 'apply', disabled: Boolean(S.applying), onClick: () => keep(v.n) }, S.applying ? 'Applying…' : `Apply ${vname(v.n)}`),
      ]),
    );
    $('#apply')?.focus();
    return;
  }
  const deviceBtn = (d, label) =>
    h('button', { type: 'button', 'aria-pressed': String((S.device ?? 'desktop') === d), 'aria-label': label, title: label, onClick: () => ((S.device = d), updateCompare()) }, icon(d));
  const modeBtn = (m, label) =>
    h('button', { type: 'button', 'aria-pressed': String(S.mode === m), 'aria-label': label, title: label, onClick: () => ((S.mode = m), updateCompare()) }, icon(m));
  dock.replaceChildren(
    ...[
    h('span', { class: 'mark', title: 'variantly' }, mark()),
    h('div', { class: 'cells', role: 'group', 'aria-label': 'Show' }, [
      h('button', { class: 'cell orig', type: 'button', 'aria-current': String(S.sel === 'original'), title: 'Original', onClick: () => select('original') }, 'ORIG'),
      ...vs.map((v) => {
        const ready = v.status === 'done';
        const pipClass = S.unseen.has(v.n) ? 'pip' : v.status === 'failed' ? 'pip fail' : ['running', 'reviewing', 'preparing', 'committing', 'queued'].includes(v.status) ? 'pip work' : '';
        return h(
          'button',
          {
            class: 'cell',
            type: 'button',
            'data-n': v.n,
            disabled: ['failed', 'cancelled'].includes(v.status),
            'aria-current': String(S.sel === v.n),
            'aria-label': `${vname(v.n)} ${directionLabel(v.direction, v.picked)}, ${STATUS[v.status]}`,
            title: `${vname(v.n)} · ${directionLabel(v.direction, v.picked)} · ${STATUS[v.status]}`,
            onClick: () => select(v.n),
          },
          pad(v.n),
          pipClass ? h('span', { class: pipClass, 'aria-hidden': 'true' }) : null,
        );
      }),
    ]),
    h('span', { class: 'sep', 'aria-hidden': 'true' }),
    h('div', { class: 'modes', role: 'group', 'aria-label': 'View' }, [modeBtn('slider', 'Slider'), modeBtn('single', 'Single'), modeBtn('side', 'Side by side')]),
    h('div', { class: 'modes', role: 'group', 'aria-label': 'Screen size' }, [deviceBtn('desktop', 'Desktop'), deviceBtn('mobile', 'Phone')]),
    h('input', {
      class: 'path',
      value: S.path,
      'aria-label': 'Page path',
      spellcheck: false,
      onKeydown: (e) => {
        if (e.key !== 'Enter') return;
        let p = e.target.value.trim() || '/';
        if (!p.startsWith('/')) p = `/${p}`;
        navigateBoth(p);
        e.target.blur();
      },
    }),
    h('span', { class: 'sep', 'aria-hidden': 'true' }),
    h('button', { class: 'icon-btn', type: 'button', title: 'Hand off to your agent', 'aria-label': 'Copy a handoff prompt for your agent', onClick: copyHandoff }, icon('handoff')),
    h('button', { class: 'icon-btn', type: 'button', title: 'Board', 'aria-label': 'Show the board', onClick: () => ((S.forceBoard = true), render()) }, icon('board')),
    h('button', { class: 'icon-btn', type: 'button', title: 'Details', 'aria-label': 'Variant details', 'aria-pressed': String(S.infoOpen), onClick: toggleInfo }, icon('info')),
    typeof S.sel === 'number' && done().some((x) => x.n === S.sel)
      ? h('button', { class: 'btn primary', type: 'button', onClick: () => ((S.confirming = true), renderDock()) }, `Keep ${vname(S.sel)}`)
      : null,
    ].filter(Boolean),
  );
};

const navigateBoth = (path) => {
  S.path = path;
  for (const side of ['before', 'after']) {
    const p = panes[side];
    if (!p?.target || !p.loaded) continue;
    if (p.path === path) continue;
    p.path = path;
    p.iframe.src = targetUrl(p.target, path);
  }
  const input = $('.path');
  if (input && document.activeElement !== input) input.value = path;
};

const toggleInfo = () => {
  S.infoOpen = !S.infoOpen;
  renderInfo();
  renderDock();
};

const renderInfo = async () => {
  const el = $('#info');
  if (!el) return;
  el.hidden = !S.infoOpen;
  if (!S.infoOpen) return;
  const v = variants().find((x) => x.n === S.sel);
  if (!v) {
    el.replaceChildren(h('header', {}, [h('span', { class: 'figure' }, 'Original'), closeInfoBtn()]), h('div', { class: 'body' }, ['Your current checkout, as it is.', scorePanel(null)]));
    return;
  }
  if (!S.logs.has(`v${v.n}`)) {
    try {
      S.logs.set(`v${v.n}`, (await api('GET', `log/${v.n}`)).lines);
    } catch {}
  }
  el.replaceChildren(
    h('header', {}, [h('div', {}, [h('div', { class: 'figure' }, vname(v.n)), h('div', { class: 'label' }, directionLabel(v.direction, v.picked))]), closeInfoBtn()]),
    h('div', { class: 'body' }, [
      v.summary ? h('p', { style: { margin: 0 } }, v.summary) : null,
      v.review ? h('p', { style: { margin: 0 } }, [h('span', { class: 'label' }, 'Review '), v.review]) : null,
      scorePanel(v),
      h('div', {}, [h('div', { class: 'label' }, `${plural(v.files.length, 'file')} changed`), h('ul', {}, v.files.map((f) => h('li', {}, f)))]),
      h('div', { class: 'label' }, `Branch ${S.snap.runId ? `variantly/${S.snap.runId}/v${v.n}` : ''}`),
    ]),
    h('pre', {}, (S.logs.get(`v${v.n}`) ?? []).join('\n')),
  );
};

const closeInfoBtn = () => h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Close details', onClick: toggleInfo }, icon('close'));

const keep = async (n) => {
  S.applying = n;
  renderDock();
  try {
    await api('POST', `finalize/${n}`, {});
  } catch (err) {
    toast(err.message, true);
    S.confirming = false;
    renderDock();
  } finally {
    S.applying = null;
  }
};

// Frames talk to us
addEventListener('message', (e) => {
  const msg = e.data;
  if (!msg?.variantly || S.view !== 'compare') return;
  const side = Object.keys(panes).find((k) => panes[k].iframe.contentWindow === e.source);
  if (!side) return;
  const other = panes[side === 'before' ? 'after' : 'before'];
  if (msg.type === 'nav' || msg.type === 'ready') {
    if (msg.path && msg.path !== S.path) {
      panes[side].path = msg.path;
      navigateBoth(msg.path);
    }
  }
  if (msg.type === 'scroll' || msg.type === 'focus') $('.compare')?.classList.add('tucked');
  if (msg.type === 'scroll' && other?.iframe.contentWindow) {
    other.iframe.contentWindow.postMessage({ variantly: true, type: 'scrollTo', ratio: msg.ratio }, '*');
  }
  if (msg.type === 'key') {
    wake();
    if (msg.key === 'Escape') closePanels();
  }
});

// Kept ----------------------------------------------------------------------

const mountKept = (main) => {
  const n = S.snap.chosen;
  const v = variants().find((x) => x.n === n);
  const r = S.snap.result ?? { files: [], conflicts: [], depsChanged: false };
  main.append(
    h('div', { class: 'kept' }, [
      h('section', { class: 'pass', 'aria-labelledby': 'kept-title' }, [
        h('div', { class: 'pass-main' }, [
          h('h1', { id: 'kept-title', class: 'figure big', style: { margin: 0 } }, vname(n)),
          h('div', {}, [h('h2', {}, directionLabel(v?.direction ?? '', v?.picked)), v?.summary ? h('p', { class: 'hint', style: { fontSize: '15px' } }, v.summary) : null, v?.review ? h('p', { class: 'hint' }, `Review: ${v.review}`) : null, v?.audit ? h('p', { class: 'hint data' }, scoreText(v.audit, S.snap?.baseline)) : null]),
          r.conflicts.length ? h('p', { class: 'note bad' }, `Merged with your own edits, with conflicts in ${r.conflicts.join(', ')}. Resolve the conflict markers in those files.`) : null,
          r.depsChanged ? h('p', { class: 'note alert' }, 'This variant changed dependency files. Run your install command.') : null,
          h('div', {}, [h('div', { class: 'label', style: { marginBottom: '8px' } }, `Applied to your working tree, unstaged: ${plural(r.files.length, 'file')}`), h('ul', {}, r.files.map((f) => h('li', {}, f)))]),
          h('div', {}, [
            h('h2', {}, 'Next'),
            h('ol', {}, [
              h('li', {}, ['Review the change: ', h('code', {}, 'git diff'), '. Nothing is committed.']),
              h('li', {}, ['Tune single elements with ', h('code', {}, '/impeccable live'), ' in your agent.']),
              h('li', {}, ['The other variants are kept as ', h('code', {}, `variantly/${S.snap.runId}/*`), ' branches. ', h('code', {}, 'npx variantly clean'), ' removes them.']),
            ]),
          ]),
        ]),
        h('aside', { class: 'stub' }, [
          h('dl', {}, [
            h('div', {}, [h('dt', { class: 'label' }, 'Variant'), h('dd', {}, `${vname(n)} of ${pad(variants().length)}`)]),
            h('div', {}, [h('dt', { class: 'label' }, 'Files'), h('dd', {}, String(r.files.length))]),
            h('div', {}, [h('dt', { class: 'label' }, 'Branch'), h('dd', { style: { wordBreak: 'break-all' } }, `variantly/${S.snap.runId}/v${n}`)]),
          ]),
          h('div', { style: { display: 'grid', gap: '8px' } }, [
            h('button', { class: 'btn primary', type: 'button', onClick: newRun }, 'Start a new run'),
            h('button', { class: 'btn outline', type: 'button', onClick: shutdown }, 'Stop variantly'),
          ]),
          h('div', { class: 'scan', 'aria-hidden': 'true' }),
        ]),
      ]),
    ]),
  );
};

const newRun = async () => {
  try {
    await api('POST', 'discard', {});
    S.detect = null;
    S.view = '';
    render();
  } catch (err) {
    toast(err.message, true);
  }
};

const shutdown = async () => {
  await api('POST', 'shutdown', {}).catch(() => {});
  document.body.replaceChildren(h('div', { class: 'loading' }, 'variantly has stopped. You can close this tab.'));
};

// Keyboard ------------------------------------------------------------------

// Keyboard: Tab moves between controls; Esc closes whatever is open.
const closePanels = () => {
  if (S.confirming) {
    S.confirming = false;
    renderDock();
  }
  if (S.infoOpen) toggleInfo();
};

addEventListener('keydown', (e) => e.key === 'Escape' && closePanels());

// Live connection -----------------------------------------------------------

const connect = () => {
  const es = new EventSource('/api/events');
  es.addEventListener('state', (e) => {
    const prevPhase = S.snap?.phase;
    S.snap = JSON.parse(e.data);
    noteStatusChanges();
    if (prevPhase && prevPhase !== S.snap.phase && S.snap.phase === 'setup') {
      S.view = '';
      S.detect = null;
    }
    render();
  });
  es.addEventListener('server', (e) => {
    const s = JSON.parse(e.data);
    if (!S.snap) return;
    const list = S.snap.servers ?? (S.snap.servers = []);
    const i = list.findIndex((x) => x?.id === s.id);
    if (i >= 0) list[i] = s;
    else list.push(s);
    if (S.view === 'compare') updateCompare();
  });
  es.addEventListener('log', (e) => {
    const { target, lines } = JSON.parse(e.data);
    const list = S.logs.get(target) ?? [];
    list.push(...lines);
    if (list.length > 400) list.splice(0, list.length - 400);
    S.logs.set(target, list);
    for (const pre of $$(`[data-log="${target}"]`)) {
      const atEnd = pre.scrollTop + pre.clientHeight >= pre.scrollHeight - 8;
      pre.textContent = list.join('\n');
      if (atEnd) pre.scrollTop = pre.scrollHeight;
    }
    const row = $(`tr[data-n="${target.slice(1)}"] .lastline`);
    if (row) row.textContent = lines.at(-1) ?? '';
  });
  es.addEventListener('installed', (e) => {
    const { agent, code, what = '', tail = [] } = JSON.parse(e.data);
    const thing = /impeccable/.test(what) ? `Impeccable for ${agent}` : agent;
    toast(code === 0 ? `Installed ${thing}.` : `Installing ${thing} failed (exit ${code}): ${tail.filter(Boolean).slice(-2).join(' ')}`, code !== 0);
    loadDetect();
  });
  es.addEventListener('problem', (e) => toast(JSON.parse(e.data).message, true));
  es.onerror = () => {
    if (S.snap) $('#phase').textContent = 'Reconnecting…';
  };
};

render();
connect();
