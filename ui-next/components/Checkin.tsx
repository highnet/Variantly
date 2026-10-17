'use client';

/*
 * The check-in wizard: Setup → Variants → Your site → Review.
 * The form in the store is the one source of truth; steps only read and
 * write it, so Back never loses anything. The step lives in the URL
 * (?step=designs) and the draft in localStorage, so refresh and the
 * browser's back button work. Steps slide in the direction you travel, the
 * stepper fills with a spring, and each finished step is "banked" as a chip.
 */
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import clsx from 'clsx';
import { Icon } from './Icon';
import { ViewSkeleton } from './Skeleton';
import { api } from '@/lib/api';
import { loadDetect, resetRun } from '@/lib/live';
import { pad, plural } from '@/lib/format';
import { getState, setState, toast, updateForm, useStore } from '@/lib/store';
import type { Agent, Detect, Form } from '@/lib/types';

const WIZ = [
  { id: 'setup', name: 'Setup', title: 'Your setup', next: 'Continue to variants' },
  { id: 'designs', name: 'Variants', title: 'What should we make?', next: 'Continue to your site' },
  { id: 'site', name: 'Your site', title: 'About your site', next: 'Continue to review' },
  { id: 'review', name: 'Review', title: 'Ready when you are', next: '' },
] as const;
type StepId = (typeof WIZ)[number]['id'];

const CHECKS: [keyof Form, string, string, string][] = [
  ['browser', 'Let the agent see its variant', 'browser', 'Each agent gets a headless browser (Playwright MCP) on its own live variant: it screenshots its work at desktop and phone widths and fixes what it sees.'],
  ['review', 'Review pass', 'review', 'When the variant is built, the agent runs again: Impeccable’s critique and audit, fed with the scores, then fixes the worst problems without changing the direction. A second session per variant.'],
  ['audit', 'Scores', 'scores', 'axe-core and Lighthouse on the original and every variant: accessibility, performance, best practices, SEO. Runs on your machine, costs nothing.'],
];

const checkOn = (f: Form, key: keyof Form) => f[key] !== false && !(f.agent === 'demo' && key !== 'audit');
const agentOf = (d: Detect, f: Form) => d.agents.find((a) => a.id === f.agent);
const candidateOf = (d: Detect, f: Form) => d.candidates.find((c) => c.rel === f.appRel && c.stackId === f.stackId);
const stackName = (d: Detect, f: Form) => candidateOf(d, f)?.name ?? d.stacks.find((s) => s.id === f.stackId)?.name ?? 'Custom';
const draftKey = (d: Detect) => `variantly:draft:${d.repo}`;
/** ":3000" from a URL (its host if it has no port); the raw text if it does not parse. */
const where = (raw: string) => {
  try {
    const u = new URL(raw);
    return u.port ? `:${u.port}` : u.host;
  } catch {
    return raw;
  }
};

type Note = [kind: '' | 'bad' | 'alert', text: string, action?: ReactNode];

const runFix = async (route: string, body: object, message: string) => {
  try {
    await api('POST', route, body);
    toast(message);
    if (route === 'commit') loadDetect();
  } catch (err) {
    toast((err as Error).message, true);
  }
};

const installImpeccable = async (agent: string) => {
  try {
    const { command } = await api<{ command: string }>('POST', 'install-impeccable', { agent });
    toast(`Running ${command}…`);
  } catch (err) {
    toast((err as Error).message, true);
  }
};

type FixButtonProps = {
  label: string;
  onClick: () => unknown;
};

/** Each problem says what is wrong and, where variantly can, fixes it. */
const FixButton = ({ label, onClick }: FixButtonProps) => {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn small"
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await onClick();
        } finally {
          setBusy(false);
        }
      }}
    >
      {label}
    </button>
  );
};

const blockers = (d: Detect, f: Form): Note[] => {
  const list: Note[] = [];
  if (!d.hasCommits) list.push(['bad', 'This repository has no commits yet, so variants have nothing to start from.', <FixButton key="c" label="Commit everything now" onClick={() => runFix('commit', {}, 'First commit made.')} />]);
  const a = agentOf(d, f);
  if (f.agent !== 'demo' && !a?.installed)
    list.push(['bad', `${a?.name ?? f.agent} isn't installed. Install it, then sign in once.`, a?.install ? <FixButton key="i" label={`Install ${a.name}`} onClick={() => runFix('install-agent', { agent: a.id }, `Installing ${a.name}…`)} /> : undefined]);
  if (f.agent !== 'demo' && a?.installed && a.signedIn === false)
    list.push([
      'bad',
      `${a.name} is installed but not signed in. A window opens; follow it, then come back here.`,
      <FixButton key="l" label={`Sign in to ${a.name}`} onClick={() => runFix('login', { agent: a.id }, 'Sign-in window opened. Come back when it says you are signed in.').then(() => setTimeout(loadDetect, 15000))} />,
    ]);
  if (f.agent !== 'demo' && a?.installed && !a.impeccable)
    list.push(['bad', `${a.name} doesn't have the Impeccable design skill yet. variantly needs it; installing takes a minute.`, <FixButton key="m" label="Install Impeccable" onClick={() => installImpeccable(a.id)} />]);
  if (!f.command && !f.originalUrl) list.push(['bad', 'Set a dev command under “Use a different app or agent”.']);
  return list;
};

const advisories = (d: Detect, f: Form): Note[] => {
  const list: Note[] = [];
  if (d.dirty) list.push(['', 'Your uncommitted edits to tracked files are included in every variant.']);
  if (d.untracked) list.push(['', `${plural(d.untracked, 'untracked file')} won't be in the variants. Commit what the site needs.`]);
  if (!d.chrome && (checkOn(f, 'browser') || checkOn(f, 'audit'))) list.push(['alert', 'No Chrome found for the browser and scores. Set CHROME_PATH, or turn them off in the next step under More settings.']);
  return list;
};

type NotesProps = {
  notes: Note[];
};

const Notes = ({ notes }: NotesProps) =>
  notes.length ? (
    <ul className="notes">
      {notes.map(([kind, text, action]) => (
        <motion.li key={text} className={clsx('note', kind)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <span>{text}</span>
          {action}
        </motion.li>
      ))}
    </ul>
  ) : null;

type PickProps = {
  label: string;
  on: boolean;
  onToggle: (on: boolean) => void;
  title?: string;
  type?: 'checkbox' | 'radio';
  name?: string;
};

/** A selectable chip: springs when picked, with a check that pops in. */
const Pick = ({ label, on, onToggle, title, type = 'checkbox', name }: PickProps) => (
  <motion.label className="pick" title={title} animate={{ scale: on ? 1.04 : 1 }} whileTap={{ scale: 0.96 }} transition={{ type: 'spring', stiffness: 500, damping: 22 }}>
    <input type={type} name={name} checked={on} onChange={(e) => onToggle(e.target.checked)} />
    <span>{label}</span>
  </motion.label>
);

type SegToggleProps = {
  pairs: [string, string][];
  value: string;
  onPick: (v: string) => void;
  labelledBy?: string;
};

const SegToggle = ({ pairs, value, onPick, labelledBy }: SegToggleProps) => (
  <div className="seg-toggle" role="group" aria-labelledby={labelledBy}>
    {pairs.map(([v, label]) => (
      <button key={v} type="button" aria-pressed={v === value} onClick={() => onPick(v)}>
        {label}
      </button>
    ))}
  </div>
);

type StepperProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  onSet: (n: number) => void;
};

const Stepper = ({ label, value, min, max, onSet }: StepperProps) => (
  <div className="stepper" role="group" aria-label={label}>
    <button type="button" aria-label={`Fewer: ${label}`} disabled={value <= min} onClick={() => onSet(Math.max(min, value - 1))}>
      <Icon name="minus" />
    </button>
    <span className="figure" aria-live="polite">
      {pad(value)}
    </span>
    <button type="button" aria-label={`More: ${label}`} disabled={value >= max} onClick={() => onSet(Math.min(max, value + 1))}>
      <Icon name="plus" />
    </button>
  </div>
);

type OptionCardProps = {
  name: string;
  checked: boolean;
  title: string;
  detail?: string;
  tags?: ReactNode;
  onChange: () => void;
};

const OptionCard = ({ name, checked, title, detail, tags, onChange }: OptionCardProps) => (
  <motion.label className="option" animate={{ scale: checked ? 1.02 : 1 }} transition={{ type: 'spring', stiffness: 500, damping: 26 }}>
    <input type="radio" name={name} checked={checked} onChange={onChange} />
    <span className="name">{title}</span>
    {detail && <span className="detail">{detail}</span>}
    {tags && <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>{tags}</span>}
  </motion.label>
);

type PartProps = {
  d: Detect;
  f: Form;
};

const AppPicker = ({ d, f }: PartProps) => {
  const cand = candidateOf(d, f);
  return (
    <>
      <div className="field">
        <span className="label">Your app</span>
        <div className="options" role="radiogroup" aria-label="Detected apps">
          {d.candidates.map((c) => (
            <OptionCard
              key={`${c.rel}:${c.stackId}`}
              name="app"
              checked={c.rel === f.appRel && c.stackId === f.stackId}
              title={c.name}
              detail={`${c.rel || 'repo root'}${c.running ? ` · running at ${where(c.defaultUrl)}` : ''}`}
              onChange={() => updateForm({ appRel: c.rel, stackId: c.stackId, command: c.command, originalUrl: c.running ? c.defaultUrl : '', deps: c.needsInstall ? 'install' : 'link' })}
            />
          ))}
          <OptionCard name="app" checked={!cand} title="Custom" detail="Any dev server, your command" onChange={() => updateForm({ stackId: 'custom' })} />
        </div>
      </div>
      <div className="field-row">
        <label className="field">
          <span className="label">Dev command</span>
          <input className="input" value={f.command} spellCheck={false} onChange={(e) => updateForm({ command: e.target.value })} />
          <p className="hint">
            Runs in every variant. <code>{'{port}'}</code> is the port, <code>{'{port2}'}</code> a spare one, <code>{'{run}'}</code> your package runner.
          </p>
        </label>
        <div className="field">
          <span className="label" id="seg-original">
            The original
          </span>
          <SegToggle
            labelledBy="seg-original"
            pairs={[
              ['start', 'variantly starts it'],
              ['running', 'Already running'],
            ]}
            value={f.originalUrl ? 'running' : 'start'}
            onPick={(v) => updateForm({ originalUrl: v === 'running' ? f.originalUrl || cand?.defaultUrl || 'http://localhost:3000' : '' })}
          />
          {f.originalUrl ? (
            <input className="input" value={f.originalUrl} aria-label="URL of your running app" onChange={(e) => updateForm({ originalUrl: e.target.value })} />
          ) : (
            <p className="hint">Your checkout gets its own server on a free port, next to the variants.</p>
          )}
        </div>
      </div>
      {cand?.note && <p className="note">{cand.note}</p>}
      <div className="field">
        <span className="label" id="seg-deps">
          Dependencies in each variant
        </span>
        <SegToggle
          labelledBy="seg-deps"
          pairs={[
            ['link', 'Link yours'],
            ['install', 'Install fresh'],
          ]}
          value={f.deps}
          onPick={(v) => updateForm({ deps: v as Form['deps'] })}
        />
        <p className="hint">{f.deps === 'install' ? 'Each variant runs your install command once. Needed for Next.js (Turbopack rejects linked node_modules).' : 'Each variant links your installed dependencies. Instant, and nothing is downloaded.'}</p>
      </div>
    </>
  );
};

const AgentPicker = ({ d, f }: PartProps) => {
  const agents: Agent[] = [...d.agents, { id: 'demo', name: 'Demo agent', installed: true, impeccable: true, version: 'built in, no AI', install: '' }];
  return (
    <>
      <div className="field">
        <span className="label">Agent</span>
        <div className="options" role="radiogroup" aria-label="Agent">
          {agents.map((a) => (
            <OptionCard
              key={a.id}
              name="agent"
              checked={f.agent === a.id}
              title={a.name}
              detail={a.installed ? a.version || 'installed' : a.install}
              tags={
                a.id === 'demo' ? null : (
                  <>
                    <span className={clsx('tag', a.installed ? 'ok' : 'bad')}>{a.installed ? 'Installed' : 'Not installed'}</span>
                    {a.installed && <span className={clsx('tag', a.impeccable ? 'ok' : 'bad')}>{a.impeccable ? 'Impeccable' : 'No Impeccable'}</span>}
                  </>
                )
              }
              onChange={() => updateForm({ agent: a.id })}
            />
          ))}
        </div>
      </div>
      {f.agent === 'demo' ? (
        <p className="note">The demo agent appends a fixed restyle to your main stylesheet. It shows how variantly works without spending anything; the results are deliberately crude.</p>
      ) : (
        <div className="field-row">
          <label className="field">
            <span className="label">Model (optional)</span>
            <input className="input" value={f.model} placeholder="the agent's default" onChange={(e) => updateForm({ model: e.target.value })} />
          </label>
          <div className="field">
            <span className="label" id="seg-permissions">
              Permissions
            </span>
            <SegToggle
              labelledBy="seg-permissions"
              pairs={[
                ['safe', 'Edits only'],
                ['full', 'Full auto'],
              ]}
              value={f.permissions}
              onPick={(v) => updateForm({ permissions: v as Form['permissions'] })}
            />
            <p className="hint">{f.permissions === 'full' ? 'No permission checks inside each worktree. Use only in projects you trust.' : 'File edits and the Impeccable launcher only. Each agent works in its own worktree.'}</p>
          </div>
        </div>
      )}
    </>
  );
};

const MoreSettings = ({ d, f }: PartProps) => (
  <>
    <div className="field">
      <span className="label" id="seg-approach">
        Approach
      </span>
      <SegToggle
        labelledBy="seg-approach"
        pairs={[
          ['redesign', 'Redesign'],
          ['refine', 'Refine'],
        ]}
        value={f.approach}
        onPick={(v) => updateForm({ approach: v as Form['approach'] })}
      />
      <p className="hint">
        {f.agent === 'demo'
          ? f.approach === 'refine'
            ? 'Keep your look. The demo agent applies a fixed restyle to each variant.'
            : 'Replace your look. The demo agent applies a different fixed restyle to every variant.'
          : f.approach === 'refine'
            ? 'Keep your look. Impeccable finds what to improve in each variant.'
            : 'Replace your look. Impeccable picks a different visual world for every variant.'}
      </p>
    </div>
    <div className="field">
      <span className="label">Your own directions (optional)</span>
      <div className="directions">
        {Array.from({ length: f.count }, (_, i) => (
          <label key={i} className="direction">
            <span className="num figure">V{pad(i + 1)}</span>
            <input
              aria-label={`Direction for V${pad(i + 1)}`}
              value={f.directions[i] ?? ''}
              placeholder={f.agent === 'demo' ? 'Picked for you' : 'Impeccable picks'}
              onChange={(e) => {
                const directions = [...f.directions];
                directions[i] = e.target.value;
                updateForm({ directions });
              }}
            />
          </label>
        ))}
      </div>
      <p className="hint">Leave a slot blank and Impeccable chooses that world itself. Type to pin one, in your words: “a 70s record sleeve”, “like a Swiss train timetable”.</p>
    </div>
    <div className="field-row">
      <div className="field">
        <span className="label">Variants</span>
        <Stepper label="Variants" value={f.count} min={1} max={10} onSet={(n) => updateForm({ count: n })} />
      </div>
      <div className="field">
        <span className="label">At a time</span>
        <Stepper label="At a time" value={f.concurrency} min={1} max={6} onSet={(n) => updateForm({ concurrency: n })} />
        <p className="hint">Agents running in parallel.</p>
      </div>
      <div className="field">
        <span className="label">Servers live</span>
        <Stepper label="Servers live" value={f.maxLive} min={2} max={8} onSet={(n) => updateForm({ maxLive: n })} />
        <p className="hint">The original plus the variants you looked at last. The rest sleep.</p>
      </div>
    </div>
    <fieldset className="field checks">
      <legend className="label">Around Impeccable</legend>
      {CHECKS.map(([key, title, , detail]) => (
        <label key={key} className="check">
          <input type="checkbox" checked={checkOn(f, key)} disabled={f.agent === 'demo' && key !== 'audit'} onChange={(e) => updateForm({ [key]: e.target.checked } as Partial<Form>)} />
          <span>
            <span className="name">{title}</span>
            <span className="hint">{f.agent === 'demo' && key !== 'audit' ? `Not used by the demo agent. ${detail}` : detail}</span>
          </span>
        </label>
      ))}
    </fieldset>
    {!d.chrome && (checkOn(f, 'browser') || checkOn(f, 'audit')) && (
      <p className="note alert">
        No Chrome or Chromium found. Install Chrome, or set <code>CHROME_PATH</code>; until then the browser and scores will fail.
      </p>
    )}
  </>
);

type CheckRowProps = {
  ok: boolean;
  text: string;
  detail?: string;
};

const CheckRow = ({ ok, text, detail }: CheckRowProps) => (
  <motion.li className={clsx('check', ok ? 'ok' : 'bad')} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
    <motion.span className="mark" aria-hidden="true" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 0.1 }}>
      {ok ? <Icon name="check" /> : '!'}
    </motion.span>
    <span>
      <strong>{text}</strong>
      {detail && <span className="detail"> · {detail}</span>}
    </span>
  </motion.li>
);

type StepBodyProps = PartProps & {
  goStep: (i: number) => void;
};

const SetupStep = ({ d, f }: StepBodyProps) => {
  const a = agentOf(d, f);
  const agentOk = f.agent === 'demo' || Boolean(a?.installed && a.signedIn !== false && a.impeccable);
  const cand = candidateOf(d, f);
  const appDetail = `${f.appRel || 'repo root'} · ${f.originalUrl ? `running at ${f.originalUrl.replace(/^https?:\/\//, '')}` : 'variantly starts it'}`;
  const agentDetail = f.agent === 'demo' ? 'no AI, fixed restyles' : !a?.installed ? 'not installed' : !a.impeccable ? 'Impeccable missing' : a.version || 'installed';
  return (
    <>
      <ul className="checks">
        {d.hasCommits ? <CheckRow ok text={`${stackName(d, f)} app found`} detail={appDetail} /> : <CheckRow ok={false} text="No commits yet" />}
        <CheckRow ok={agentOk} text={agentOk ? `${a?.name ?? 'Demo agent'} ready` : `${a?.name ?? f.agent} needs a hand`} detail={agentDetail} />
      </ul>
      <Notes notes={[...blockers(d, f), ...advisories(d, f)]} />
      <details className="more" open={!cand && !f.command}>
        <summary>Use a different app or agent</summary>
        <div className="drawer">
          <AppPicker d={d} f={f} />
          <AgentPicker d={d} f={f} />
        </div>
      </details>
    </>
  );
};

const DesignsStep = ({ d, f }: StepBodyProps) => {
  const [adding, setAdding] = useState('');
  const routes = [...new Set([...(d.routes ?? ['/']), ...f.routes])];
  const a = agentOf(d, f);
  return (
    <>
      <fieldset
        className="field picks"
        onKeyDown={(e) => {
          // Browsers don't submit a form on Enter in a radio; this step does.
          if (e.key !== 'Enter' || (e.target as HTMLInputElement).type !== 'radio') return;
          e.preventDefault();
          e.currentTarget.form?.requestSubmit();
        }}
      >
        <legend className="label">How many variants?</legend>
        <div className="pick-row">
          {[2, 4, 6].map((n) => (
            <Pick key={n} type="radio" name="count" label={String(n)} on={f.count === n} onToggle={() => updateForm({ count: n })} />
          ))}
          {![2, 4, 6].includes(f.count) && <Pick type="radio" name="count" label={String(f.count)} on onToggle={() => {}} />}
        </div>
        <p className="hint">{f.agent === 'demo' ? 'The demo agent costs nothing.' : `Each variant is one ${a?.name ?? 'agent'} session on your account, about 10–20 minutes, ${f.concurrency} at a time.`}</p>
      </fieldset>
      <fieldset className="field picks">
        <legend className="label">Which pages?</legend>
        <div className="pick-row">
          {routes.map((r) => (
            <Pick
              key={r}
              label={r === '/' ? 'Home' : r}
              on={f.routes.includes(r)}
              onToggle={(on) => {
                const next = on ? [...f.routes, r] : f.routes.filter((x) => x !== r);
                updateForm({ routes: next.length ? next : ['/'] });
              }}
            />
          ))}
        </div>
        {routes.length > 1 && (
          <button
            className="btn outline small"
            type="button"
            onClick={() => updateForm({ routes: routes.every((r) => f.routes.includes(r)) ? ['/'] : routes })}
          >
            {routes.every((r) => f.routes.includes(r)) ? 'Just the home page' : `All ${routes.length} pages`}
          </button>
        )}
        <input
          className="input"
          aria-label="Add a page"
          placeholder="Add a page, e.g. /pricing, then Enter"
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            const r = adding.trim();
            if (!r) return;
            updateForm({ routes: [...new Set([...f.routes, r.startsWith('/') ? r : `/${r}`])] });
            setAdding('');
          }}
        />
        <p className="hint">Just the home page is fastest; each extra page adds time to every variant. Whichever you pick, keeping a variant restyles the rest of the site to match.</p>
      </fieldset>
      <fieldset className="field picks">
        <legend className="label">Extras (optional)</legend>
        <div className="pick-row">
          {(d.extras ?? []).map((x) => (
            <Pick key={x.id} label={x.label} title={x.hint} on={f.extras.includes(x.id)} onToggle={(on) => updateForm({ extras: on ? [...f.extras, x.id] : f.extras.filter((id) => id !== x.id) })} />
          ))}
        </div>
      </fieldset>
      <details className="more">
        <summary>More settings</summary>
        <div className="drawer">
          <MoreSettings d={d} f={f} />
        </div>
      </details>
    </>
  );
};

type ProductFieldProps = {
  f: Form;
  k: keyof Form['product'];
  label: string;
  placeholder: string;
};

const ProductField = ({ f, k, label, placeholder }: ProductFieldProps) => (
  <label className="field">
    <span className="label">
      {label} {f.product[k].trim() && <motion.span className="valid" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}>
          <Icon name="check" />
        </motion.span>}
    </span>
    <textarea className="input" rows={2} placeholder={placeholder} value={f.product[k]} onChange={(e) => updateForm({ product: { ...f.product, [k]: e.target.value } })} />
  </label>
);

const SiteStep = ({ d, f }: StepBodyProps) => (
  <>
    <p className="hint">{d.hasProduct ? 'Your PRODUCT.md already tells the designers about your site. Add anything else below, or just continue.' : 'Optional. A few words help the designers aim at your audience instead of guessing. Skip it if you like.'}</p>
    {!d.hasProduct && (
      <>
        <ProductField f={f} k="users" label="Who is it for?" placeholder="e.g. Small teams who need to book meeting rooms" />
        <ProductField f={f} k="purpose" label="What does it offer?" placeholder="e.g. Online booking, opening hours and a menu" />
        <ProductField f={f} k="keep" label="What must stay?" placeholder="e.g. The name, the logo, the product photos" />
      </>
    )}
    <label className="field">
      <span className="label">Anything else?</span>
      <textarea className="input" rows={2} placeholder="e.g. Less corporate. It should feel like mission control." value={f.brief} onChange={(e) => updateForm({ brief: e.target.value })} />
    </label>
  </>
);

/** One-line summaries of finished steps: what the user "banked". */
const banked = (d: Detect, f: Form): Record<StepId, string> => {
  const a = agentOf(d, f);
  const answered = (['users', 'purpose', 'keep'] as const).filter((k) => f.product[k].trim()).length + (f.brief.trim() ? 1 : 0);
  const extras = (d.extras ?? []).filter((x) => f.extras.includes(x.id)).map((x) => x.label);
  return {
    setup: `${stackName(d, f)} · ${f.agent === 'demo' ? 'Demo' : (a?.name ?? f.agent)}`,
    designs: `${plural(f.count, 'variant')} · ${f.routes.map((r) => (r === '/' ? 'Home' : r)).join(', ')}${extras.length ? ` · ${extras.join(', ')}` : ''}`,
    site: d.hasProduct ? 'PRODUCT.md' : answered ? plural(answered, 'answer') : 'Skipped',
    review: '',
  };
};

const ReviewStep = ({ d, f, goStep }: StepBodyProps) => {
  const a = agentOf(d, f);
  const b = banked(d, f);
  const extras = (d.extras ?? []).filter((x) => f.extras.includes(x.id)).map((x) => x.label);
  const rows: [string, string, number][] = [
    ['App', `${stackName(d, f)} · ${f.appRel || 'repo root'}`, 0],
    ['Agent', f.agent === 'demo' ? 'Demo agent (no AI)' : (a?.name ?? f.agent), 0],
    ['Designs', `${f.count}, ${f.approach === 'refine' ? 'refining your current look' : f.agent === 'demo' ? 'each a new look' : 'each a new look Impeccable picks'}`, 1],
    ['Pages', f.routes.map((r) => (r === '/' ? 'Home' : r)).join(', '), 1],
    ['Extras', extras.length ? extras.join(', ') : 'None', 1],
    ['Your site', b.site === 'PRODUCT.md' ? 'From your PRODUCT.md' : b.site, 2],
  ];
  const sessions = f.count * (checkOn(f, 'review') ? 2 : 1);
  return (
    <>
      <dl className="review">
        {rows.map(([label, value, step], i) => (
          <motion.div key={label} className="review-row" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i }}>
            <dt className="label">{label}</dt>
            <dd>{value}</dd>
            <dd>
              <button type="button" className="link" onClick={() => goStep(step)}>
                Edit
              </button>
            </dd>
          </motion.div>
        ))}
      </dl>
      <Notes notes={blockers(d, f)} />
      <p className="hint">{f.agent === 'demo' ? 'Nothing is spent.' : `Uses ${plural(sessions, 'session')} on your ${a?.name ?? 'agent'} account. Your files aren't touched until you keep one.`}</p>
    </>
  );
};

const BODIES: Record<StepId, (p: StepBodyProps) => ReactNode> = { setup: SetupStep, designs: DesignsStep, site: SiteStep, review: ReviewStep };

const slide = {
  enter: (dir: number) => ({ x: dir * 32, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -32, opacity: 0 }),
};

const stepFromUrl = () => {
  const id = new URLSearchParams(window.location.search).get('step');
  return Math.max(0, WIZ.findIndex((w) => w.id === id));
};

const Checkin = () => {
  const d = useStore((s) => s.detect);
  const f = useStore((s) => s.form);
  const snapConfig = useStore((s) => s.snap?.config);
  const [at, setAt] = useState(0);
  const [reached, setReached] = useState(0);
  const [dir, setDir] = useState(1);
  const [going, setGoing] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  const restored = useRef(false);

  useEffect(() => {
    if (!d) loadDetect();
  }, [d]);

  // First load: restore the step from the URL and the draft from localStorage.
  useEffect(() => {
    if (!d || !f || restored.current) return;
    restored.current = true;
    const i = stepFromUrl();
    setAt(i);
    setReached(i);
    if (!snapConfig) {
      try {
        const draft = JSON.parse(localStorage.getItem(draftKey(d)) ?? 'null') as Partial<Form> | null;
        if (draft) updateForm(draft);
      } catch {}
    }
  }, [d, f, snapConfig]);

  useEffect(() => {
    if (!d || !f) return;
    try {
      localStorage.setItem(draftKey(d), JSON.stringify(f));
    } catch {}
  }, [d, f]);

  useEffect(() => {
    const onPop = () => {
      const i = stepFromUrl();
      setAt((cur) => {
        setDir(i >= cur ? 1 : -1);
        return i;
      });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (restored.current) title.current?.focus({ preventScroll: true });
  }, [at]);

  const goStep = useCallback(
    (i: number) => {
      setDir(i >= at ? 1 : -1);
      setAt(i);
      setReached((r) => Math.max(r, i));
      const url = new URL(window.location.href);
      url.searchParams.set('step', WIZ[i].id);
      window.history.pushState({ step: i }, '', url);
    },
    [at],
  );

  if (!d || !f) return <ViewSkeleton label="Looking at your project…" />;

  const step = WIZ[at];
  const blocks = blockers(d, f);
  const blocked = (step.id === 'setup' || step.id === 'review') && blocks.length > 0;
  const chips = banked(d, f);
  const Body = BODIES[step.id];

  const generate = async () => {
    setGoing(true);
    try {
      resetRun();
      setState({ forceBoard: false, wantCompare: false, sel: null, unseen: [] });
      await api('POST', 'generate', getState().form);
      try {
        localStorage.removeItem(draftKey(d));
      } catch {}
    } catch (err) {
      toast((err as Error).message, true);
      setGoing(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (blocked) return;
    if (step.id === 'review') generate();
    else goStep(at + 1);
  };

  return (
    <div className="setup wizard-wrap">
      <header className="setup-head">
        <h1 className="figure display">Redesign {d.name}</h1>
        <p className="setup-meta">{[d.branch, d.head, d.repo].filter(Boolean).join(' · ')}</p>
      </header>

      <motion.div layout className="wizard-card" transition={{ type: 'spring', stiffness: 400, damping: 36 }}>
        <ol className="wiz-stepper" aria-label="Steps">
          {WIZ.map((w, i) => {
            const isDone = i < at || (i <= reached && i !== at && i < WIZ.length - 1);
            const now = i === at;
            const content = (
              <>
                <span className="wiz-dot">
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <motion.circle cx="8" cy="8" r="7" initial={false} animate={{ scale: now ? [1, 1.25, 1] : 1 }} transition={{ duration: 0.35 }} />
                    <motion.path d="M4.5 8.3l2.2 2.2 4.8-5" initial={false} animate={{ pathLength: isDone ? 1 : 0, opacity: isDone ? 1 : 0 }} transition={{ duration: 0.25, delay: isDone ? 0.12 : 0 }} />
                  </svg>
                  {!isDone && <span className="wiz-num">{i + 1}</span>}
                </span>
                <span className="wiz-name">{w.name}</span>
                <AnimatePresence>
                  {isDone && chips[w.id] && (
                    <motion.span className="wiz-bank" initial={{ opacity: 0, y: -8, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 26 }}>
                      {chips[w.id]}
                    </motion.span>
                  )}
                </AnimatePresence>
              </>
            );
            return (
              <li key={w.id} className={clsx('wiz-item', isDone && 'done', now && 'now')}>
                {i <= reached && !now ? (
                  <button type="button" className="wiz-hit" onClick={() => goStep(i)}>
                    {content}
                  </button>
                ) : (
                  <span className="wiz-hit" aria-current={now ? 'step' : undefined}>
                    {content}
                  </span>
                )}
                {i < WIZ.length - 1 && (
                  <span className="wiz-line" aria-hidden="true">
                    <motion.i initial={false} animate={{ scaleX: i < at ? 1 : 0 }} transition={{ type: 'spring', stiffness: 180, damping: 18, delay: 0.15 }} />
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        <form className="wiz-step" aria-labelledby="wiz-title" onSubmit={onSubmit}>
          <div className="wiz-viewport">
            <AnimatePresence mode="popLayout" custom={dir} initial={false}>
              <motion.section key={step.id} custom={dir} variants={slide} initial="enter" animate="center" exit="exit" transition={{ type: 'spring', stiffness: 400, damping: 34 }} className="wiz-body">
                <h2 id="wiz-title" ref={title} className="figure title" tabIndex={-1}>
                  {step.title}
                </h2>
                <Body d={d} f={f} goStep={goStep} />
              </motion.section>
            </AnimatePresence>
          </div>
          <div className="wiz-nav">
            {at > 0 ? (
              <button className="btn outline" type="button" onClick={() => (typeof window.history.state?.step === 'number' ? window.history.back() : goStep(at - 1))}>
                Back
              </button>
            ) : (
              <span />
            )}
            <motion.button
              className={clsx('btn primary', step.id === 'review' && 'big')}
              type="submit"
              disabled={blocked || going}
              initial={false}
              animate={{ scale: blocked ? 0.97 : 1, opacity: blocked ? 0.55 : 1 }}
              whileHover={blocked ? undefined : { scale: 1.03 }}
              whileTap={blocked ? undefined : { scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 500, damping: 24 }}
            >
              {step.id === 'review' ? (going ? 'Starting…' : `Make ${plural(f.count, 'variant')}`) : step.next} <Icon name="arrow" />
            </motion.button>
          </div>
        </form>
      </motion.div>
      <p className="sr-only" aria-live="polite">
        Step {at + 1} of {WIZ.length}: {step.title}
      </p>
    </div>
  );
};

export { Checkin };
