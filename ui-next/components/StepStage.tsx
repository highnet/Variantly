'use client';

// A small picture of what the agent is doing right now, one per step:
// reading the site scans a wireframe and samples its colours, choosing a
// direction spins palettes and type specimens until they lock, building
// types code. CSS keyframes only (transform and opacity), so many cards can
// run at once; reduced motion shows the settled frame.
import { useEffect, useRef, type CSSProperties } from 'react';
import { STEPS } from '@/lib/format';
import type { Variant } from '@/lib/types';

type Look = { name: string; colors: string[]; font: string };

/** Tasteful candidates the reel shuffles through. */
const LOOKS: Look[] = [
  { name: 'Editorial', colors: ['#f4efe6', '#1f1d1a', '#b8432f', '#d9c7a7'], font: 'Georgia, serif' },
  { name: 'Swiss', colors: ['#ffffff', '#111111', '#e3262b', '#c9ccd1'], font: 'Helvetica, Arial, sans-serif' },
  { name: 'Calm', colors: ['#eef2ee', '#24312b', '#6f9c86', '#c8d8cf'], font: 'system-ui, sans-serif' },
  { name: 'Brutal', colors: ['#fffb00', '#000000', '#ff3d00', '#ffffff'], font: 'ui-monospace, monospace' },
  { name: 'Nocturne', colors: ['#14161f', '#e8e6f0', '#8b7cf6', '#3a3f58'], font: '"Palatino Linotype", Palatino, serif' },
  { name: 'Citrus', colors: ['#fff8ec', '#2b2118', '#ff8a1f', '#ffd27a'], font: 'Verdana, sans-serif' },
  { name: 'Ocean', colors: ['#f1f7fb', '#0f2a3d', '#1f7fbf', '#9cc9e6'], font: 'Trebuchet MS, sans-serif' },
];

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** The look this variant lands on: named after its direction, coloured deterministically. */
const chosenLook = (v: Variant): Look => {
  const name = (v.direction?.trim() || v.picked || '').trim();
  const base = LOOKS[hash(name || String(v.n)) % LOOKS.length];
  return { ...base, name: name || base.name };
};

const css = (o: Record<string, string | number>) => o as CSSProperties;

/** Reading the site: a wireframe, a scan line, parts lighting up, colours sampled. */
const Scan = ({ v }: { v: Variant }) => {
  const sampled = LOOKS[hash(String(v.n)) % LOOKS.length].colors;
  return (
    <div className="stg stg-scan">
      <div className="stg-page">
        <i className="wf nav" style={css({ '--d': 0 })} />
        <i className="wf h1" style={css({ '--d': 1 })} />
        <i className="wf txt" style={css({ '--d': 2 })} />
        <i className="wf txt short" style={css({ '--d': 2.4 })} />
        <i className="wf btn" style={css({ '--d': 3 })} />
        <i className="wf img" style={css({ '--d': 3.4 })} />
        <i className="stg-sweep" />
      </div>
      <div className="stg-side">
        <span className="stg-kicker">Detected</span>
        <ul className="stg-found">
          <li style={css({ '--d': 1 })}>Headings</li>
          <li style={css({ '--d': 3 })}>Buttons</li>
          <li style={css({ '--d': 4 })}>Colours</li>
        </ul>
        <div className="stg-swatches">
          {sampled.map((c, i) => (
            <i key={c} style={css({ background: c, '--d': 4 + i * 0.35 })} />
          ))}
        </div>
      </div>
    </div>
  );
};

/** Choosing a direction: a reel of palettes and type that slows and locks. */
const Reel = ({ v }: { v: Variant }) => {
  const chosen = chosenLook(v);
  const start = hash(chosen.name);
  const strip = [...Array.from({ length: 7 }, (_, i) => LOOKS[(start + i + 1) % LOOKS.length]), chosen];
  return (
    <div className="stg stg-reel">
      <div className="reel-window">
        <div className="reel-strip" style={css({ '--n': strip.length - 1 })}>
          {strip.map((l, i) => (
            <div className="reel-item" key={i}>
              <span className="reel-aa" style={{ fontFamily: l.font, color: l.colors[1], background: l.colors[0] }}>Aa</span>
              <span className="reel-pal">
                {l.colors.map((c, j) => (
                  <i key={j} style={{ background: c }} />
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="stg-side">
        <span className="stg-kicker">Locking onto</span>
        <span className="reel-name">{chosen.name}</span>
      </div>
    </div>
  );
};

/** Writing code or docs: lines type out behind a caret. */
const Typing = ({ doc }: { doc?: boolean }) => (
  <div className="stg stg-type">
    {(doc ? [62, 88, 40, 74] : [48, 76, 64, 30]).map((w, i) => (
      <span className="type-line" key={i} style={css({ '--w': `${w}%`, '--i': i, '--ind': doc ? 0 : [0, 1, 1, 0][i] })}>
        <i className="type-cover" />
      </span>
    ))}
  </div>
);

/** Checking: three checks pop in turn. */
const Checks = () => (
  <div className="stg stg-checks">
    {['Contrast', 'Layout', 'Links'].map((s, i) => (
      <span key={s} style={css({ '--i': i })}>
        <i className="chk" />
        {s}
      </span>
    ))}
  </div>
);

/** Setting up and saving: a quiet shimmer. */
const Shimmer = () => (
  <div className="stg stg-shim">
    <i />
    <i />
    <i />
  </div>
);

type StepStageProps = { v: Variant; at: number };

const StepStage = ({ v, at }: StepStageProps) => {
  const step = STEPS[at];
  const ref = useRef<HTMLDivElement>(null);
  // Pause the keyframes when the card is off-screen or the tab is hidden.
  // Toggles an attribute on the node directly: no React re-renders.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let seen = true;
    const sync = () => el.toggleAttribute('data-paused', !seen || document.hidden);
    const io = new IntersectionObserver(([e]) => { seen = e.isIntersecting; sync(); });
    io.observe(el);
    document.addEventListener('visibilitychange', sync);
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', sync); };
  }, [at]);
  const body =
    step === 'Reading the site' ? <Scan v={v} /> :
    step === 'Choosing a direction' ? <Reel v={v} /> :
    step === 'Building' ? <Typing /> :
    step === 'Writing DESIGN.md' ? <Typing doc /> :
    step === 'Checking' ? <Checks /> :
    <Shimmer />;
  // Keyed by step so each animation starts fresh when the step changes.
  return (
    <div className="step-stage" key={at} ref={ref} aria-hidden="true">
      {body}
    </div>
  );
};

export { StepStage };
