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

let toastTimer = 0;
const toast = (message, bad = false) => {
  const el = $('#toast');
  el.textContent = message;
  el.classList.toggle('bad', bad);
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), bad ? 7000 : 3500);
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
  committing: 'Committing',
  done: 'Ready',
  failed: 'Failed',
  cancelled: 'Cancelled',
};
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
  if (S.forceBoard || !done().length) return 'board';
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

const mountCheckin = (main) => {
  if (!S.detect) {
    main.append(h('div', { class: 'loading' }, 'Looking at your project…'));
    loadDetect();
    return;
  }
  const d = S.detect;
  const productField = (key, label, placeholder) =>
    h('label', { class: 'field' }, [
      h('span', { class: 'label' }, label),
      h('textarea', {
        class: 'input',
        rows: 2,
        placeholder,
        value: S.form.product?.[key] ?? '',
        onInput: (e) => {
          S.form.product = { ...(S.form.product ?? {}), [key]: e.target.value };
        },
      }),
    ]);
  main.append(
    h('div', { class: 'setup' }, [
      h('div', { class: 'setup-main' }, [
        h('header', { class: 'setup-head' }, [
          h('h1', { class: 'figure display' }, `Redesign ${d.name}`),
          h('p', { class: 'setup-meta' }, [d.branch ? `${d.branch}` : null, d.head ? ` · ${d.head}` : null, ` · ${d.repo}`].filter(Boolean).join('')),
        ]),
        h('section', { class: 'panel', 'aria-label': 'Run settings' }, [
          h('div', { class: 'segments', role: 'group' }, [
            segmentButton('from', 'Your app'),
            segmentButton('via', 'Your agent'),
            segmentButton('to', 'Approach'),
            segmentButton('seats', 'Variants'),
          ]),
          h('div', { class: 'drawer', id: 'drawer', hidden: true }),
        ]),
        h('section', { class: 'panel about', 'aria-labelledby': 'about-title' }, [
          h('h2', { id: 'about-title', class: 'figure title' }, 'About your site'),
          d.hasProduct
            ? h('p', { class: 'hint' }, 'PRODUCT.md found. Every agent reads it through Impeccable, so nothing to answer here.')
            : [
                h('p', { class: 'hint' }, "Impeccable's three questions. Your answers become PRODUCT.md in every variant, so the agents design for your audience instead of guessing. All optional."),
                productField('users', 'Who is it for, and what do they come to do?', 'e.g. People furnishing a first home; they browse the collection and ask for a custom piece.'),
                productField('purpose', 'What does it offer, and what makes it different?', 'e.g. Handmade oak and steel furniture, built and delivered by the maker.'),
                productField('keep', 'What must stay? Brand, content, constraints', 'e.g. The logo and the name; prices in euros; no stock photos.'),
              ],
          h('label', { class: 'field' }, [
            h('span', { class: 'label' }, 'Anything else for the agents'),
            h('textarea', {
              id: 'brief',
              class: 'input',
              rows: 2,
              placeholder: 'e.g. Less corporate. It should feel like a workshop, not a SaaS.',
              value: S.form.brief,
              onInput: (e) => (S.form.brief = e.target.value),
            }),
          ]),
        ]),
        h('section', { class: 'action-dock', 'aria-label': 'Summary' }, [h('div', { id: 'stub-body', class: 'stub-body' })]),
      ]),
      h('section', { class: 'board compact', 'aria-labelledby': 'preview-title' }, [
        h('header', { class: 'board-head' }, [h('h2', { id: 'preview-title', class: 'figure' }, 'Variants'), h('span', { class: 'label', id: 'preview-count' })]),
        h('table', {}, [
          h('thead', {}, h('tr', {}, [h('th', { class: 'label' }, 'Var'), h('th', { class: 'label' }, 'Direction'), h('th', { class: 'label' }, 'Status')])),
          h('tbody', { id: 'preview-rows' }),
        ]),
      ]),
    ]),
  );
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
      h('label', { class: 'field' }, [
        h('span', { class: 'label' }, 'Pages that matter (optional)'),
        h('input', { class: 'input', value: f.routes.join(', '), placeholder: '/, /pricing, /blog', onInput: change((e) => (f.routes = e.target.value.split(',').map((s) => s.trim()).filter(Boolean))) }),
      ]),
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
          f.agent === 'demo' ? 'No AI, nothing spent.' : `${plural(f.count, 'session')} on your account.`,
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

// Board ---------------------------------------------------------------------

const mountBoardView = (main) => {
  main.append(
    h('div', { class: 'boardview' }, [
      h('section', { class: 'board', 'aria-labelledby': 'board-title' }, [
        h('header', { class: 'board-head' }, [
          h('div', { style: { display: 'grid', gap: '6px' } }, [h('h1', { id: 'board-title', class: 'figure' }), h('div', { class: 'label readout', id: 'board-meta' })]),
          h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, [
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
            h('th', { class: 'label' }, 'Latest'),
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
  if (typeof v.credits === 'number') parts.push(`${v.credits} cr`);
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
    credits > 0 ? `${credits} AI credits` : null,
    cost > 0 ? `${cost.toFixed(2)}` : null,
  ].filter(Boolean);
  el.replaceChildren(...parts.map((p) => h('span', {}, p)));
};

const order = { done: 0, committing: 1, running: 2, preparing: 3, queued: 4, failed: 5, cancelled: 6 };

const updateBoardView = () => {
  const vs = variants();
  const ready = done().length;
  $('#board-title').textContent = `${pad(vs.length)} variants`;
  const agent = S.snap?.config?.agent;
  renderReadout($('#board-meta'));
  $('#to-compare').disabled = ready === 0;
  renderBoardRows($('#board-rows'), [...vs].sort((a, b) => order[a.status] - order[b.status] || (a.finishedAt ?? 0) - (b.finishedAt ?? 0) || a.n - b.n));
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
    const statusEl = h('span', { class: `status${unseen ? ' unseen' : ''}`, 'data-s': s }, h('span', { class: 'flap-text' }, STATUS[v.status]), v.status === 'running' ? h('span', { class: 'working-bars', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')) : null);
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
        h('td', { class: 'dir' }, directionLabel(v.direction, v.picked), v.summary ? h('span', { class: 'summary' }, v.summary) : v.error ? h('span', { class: 'summary' }, v.error.split('\n')[0]) : null),
        h('td', {}, statusEl),
        h('td', { class: 'num data', 'data-elapsed': key }, elapsed(v)),
        h('td', { class: 'num data hide-compact' }, v.files?.length ? String(v.files.length) : '—'),
        h('td', { class: 'num data', title: usageTitle(v) }, usageText(v)),
        h('td', { class: 'lastline' }, logLines.at(-1) ?? ''),
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

const logPanel = (v) => {
  const lines = S.logs.get(`v${v.n}`) ?? [];
  const pre = h('pre', { 'data-log': `v${v.n}` }, lines.join('\n') || 'No output yet.');
  queueMicrotask(() => (pre.scrollTop = pre.scrollHeight));
  return h('div', { class: 'logpanel on-slate' }, [
    pre,
    h('div', { class: 'actions' }, [
      v.status === 'done' ? h('button', { class: 'btn primary small', type: 'button', onClick: (e) => (e.stopPropagation(), goCompare(v.n)) }, `Compare ${vname(v.n)}`) : null,
      ['failed', 'cancelled'].includes(v.status) ? h('button', { class: 'btn outline small', type: 'button', onClick: (e) => (e.stopPropagation(), act('retry', v.n)) }, 'Retry') : null,
      ['queued', 'preparing', 'running'].includes(v.status) ? h('button', { class: 'btn outline small', type: 'button', onClick: (e) => (e.stopPropagation(), act('cancel', v.n)) }, 'Stop') : null,
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
  if (n) S.sel = n;
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
  if (S.sel === null || (S.sel !== 'original' && !done().some((v) => v.n === S.sel))) S.sel = done()[0]?.n ?? 'original';
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
  if (!p) return;
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
  if (S.sel !== 'original' && !done().some((v) => v.n === S.sel)) S.sel = done()[0]?.n ?? 'original';
  let mode = S.mode;
  if (S.sel === 'original' && mode !== 'single') mode = 'single';
  stage.dataset.mode = mode;
  stage.dataset.show = S.sel === 'original' ? 'original' : 'variant';
  const variantTarget = S.sel === 'original' ? (S.lastVariant ? `v${S.lastVariant}` : '') : `v${S.sel}`;
  if (S.sel !== 'original') S.lastVariant = S.sel;
  if (mode !== 'single' || S.sel === 'original') showIn('before', 'original');
  if (variantTarget && (mode !== 'single' || S.sel !== 'original')) showIn('after', variantTarget);
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
  flag.replaceChildren(h('span', {}, h('strong', {}, directionLabel(v.direction, v.picked)), v.summary ? ` — ${v.summary}` : ''));
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
        h('button', { class: 'btn outline small', type: 'button', onClick: () => ((S.confirming = false), renderDock()) }, 'Cancel'),
        h('button', { class: 'btn primary', type: 'button', id: 'apply', onClick: () => keep(v.n) }, `Apply ${vname(v.n)}`),
      ]),
    );
    $('#apply')?.focus();
    return;
  }
  const modeBtn = (m, label) =>
    h('button', { type: 'button', 'aria-pressed': String(S.mode === m), 'aria-label': label, title: `${label} (s)`, onClick: () => ((S.mode = m), updateCompare()) }, icon(m));
  dock.replaceChildren(
    ...[
    h('span', { class: 'mark', title: 'variantly' }, mark()),
    h('div', { class: 'cells', role: 'group', 'aria-label': 'Show' }, [
      h('button', { class: 'cell orig', type: 'button', 'aria-current': String(S.sel === 'original'), title: 'Original (o)', onClick: () => select('original') }, 'ORIG'),
      ...vs.map((v) => {
        const ready = v.status === 'done';
        const pipClass = S.unseen.has(v.n) ? 'pip' : v.status === 'failed' ? 'pip fail' : ['running', 'preparing', 'committing', 'queued'].includes(v.status) ? 'pip work' : '';
        return h(
          'button',
          {
            class: 'cell',
            type: 'button',
            'data-n': v.n,
            disabled: !ready,
            'aria-current': String(S.sel === v.n),
            'aria-label': `${vname(v.n)} ${directionLabel(v.direction, v.picked)}, ${STATUS[v.status]}`,
            title: `${vname(v.n)} · ${directionLabel(v.direction, v.picked)} · ${STATUS[v.status]}${v.n <= 10 ? ` (${v.n % 10})` : ''}`,
            onClick: () => select(v.n),
          },
          pad(v.n),
          pipClass ? h('span', { class: pipClass, 'aria-hidden': 'true' }) : null,
        );
      }),
    ]),
    h('span', { class: 'sep', 'aria-hidden': 'true' }),
    h('div', { class: 'modes', role: 'group', 'aria-label': 'View' }, [modeBtn('slider', 'Slider'), modeBtn('single', 'Single'), modeBtn('side', 'Side by side')]),
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
    h('button', { class: 'icon-btn', type: 'button', title: 'Board', 'aria-label': 'Show the board', onClick: () => ((S.forceBoard = true), render()) }, icon('board')),
    h('button', { class: 'icon-btn', type: 'button', title: 'Details (i)', 'aria-label': 'Variant details', 'aria-pressed': String(S.infoOpen), onClick: toggleInfo }, icon('info')),
    typeof S.sel === 'number'
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
    el.replaceChildren(h('header', {}, [h('span', { class: 'figure' }, 'Original'), closeInfoBtn()]), h('div', { class: 'body' }, 'Your current checkout, as it is.'));
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
      h('div', {}, [h('div', { class: 'label' }, `${plural(v.files.length, 'file')} changed`), h('ul', {}, v.files.map((f) => h('li', {}, f)))]),
      h('div', { class: 'label' }, `Branch ${S.snap.runId ? `variantly/${S.snap.runId}/v${v.n}` : ''}`),
    ]),
    h('pre', {}, (S.logs.get(`v${v.n}`) ?? []).join('\n')),
  );
};

const closeInfoBtn = () => h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Close details', onClick: toggleInfo }, icon('close'));

const keep = async (n) => {
  const btn = $('#apply');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Applying…';
  }
  try {
    await api('POST', `finalize/${n}`, {});
  } catch (err) {
    toast(err.message, true);
    S.confirming = false;
    renderDock();
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
    handleKey(msg.key);
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
          h('div', {}, [h('h2', {}, directionLabel(v?.direction ?? '', v?.picked)), v?.summary ? h('p', { class: 'hint', style: { fontSize: '15px' } }, v.summary) : null]),
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

const handleKey = (key) => {
  if (key === 'Escape') {
    if (S.confirming) {
      S.confirming = false;
      renderDock();
    }
    if (S.infoOpen) toggleInfo();
    $('#help').hidden = true;
    return;
  }
  if (S.view !== 'compare') return;
  const ready = done().map((v) => v.n);
  if (/^[0-9]$/.test(key)) {
    const n = key === '0' ? 10 : Number(key);
    if (ready.includes(n)) select(n);
    return;
  }
  if (key === 'o') return select('original');
  if (key === 's') {
    const modes = ['slider', 'single', 'side'];
    S.mode = modes[(modes.indexOf(S.mode) + 1) % modes.length];
    return updateCompare();
  }
  if (key === 'i') return toggleInfo();
  if (key === '[') return setSplit(S.split - 5);
  if (key === ']') return setSplit(S.split + 5);
  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    if (!ready.length) return;
    const list = ['original', ...ready];
    const i = list.indexOf(S.sel);
    select(list[(i + (key === 'ArrowRight' ? 1 : list.length - 1)) % list.length]);
  }
};

addEventListener('keydown', (e) => {
  const t = e.target;
  if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
  if (t instanceof HTMLElement && t.getAttribute('role') === 'slider' && e.key.startsWith('Arrow')) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  handleKey(e.key);
});

$('#help-toggle').addEventListener('click', (e) => {
  const help = $('#help');
  help.hidden = !help.hidden;
  e.currentTarget.setAttribute('aria-expanded', String(!help.hidden));
});

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
