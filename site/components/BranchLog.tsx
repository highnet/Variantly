'use client';

import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

import { type VariantKey } from '@/components/backdrop/variants';
import { Button } from '@/components/ui/Button';
import { CONCEPT_BY_ID, isLive } from '@/concepts/metas';
import { calmMotion } from '@/lib/prefs';
import { REPO_URL } from '@/lib/site';
import { setVariant, useVariant, VARIANT_KEYS } from '@/lib/variant';
import { cn } from '@/lib/utils';

// Concepts that were drafted and dropped: their branches end here.
const RETIRED = ['synth-sunset'];
const CHAR_MS = 20;

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

type Row = { glyph: string; label: string; key?: VariantKey; dead?: boolean };

type BranchLogProps = {
  build: string;
  onClose: () => void;
};

/* An ASCII git graph of the homepage's concepts, typed out line by line. */
const BranchLog = ({ build, onClose }: BranchLogProps) => {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const active = useVariant() ?? 'a';
  const router = useRouter();
  const [noon] = useState(() => {
    const d = new Date();
    return d.getHours() % 12 === 0 && d.getMinutes() === 0;
  });

  const live = VARIANT_KEYS.filter((k) => isLive(k));
  const drafts = VARIANT_KEYS.filter((k) => !isLive(k));
  const rows: Row[] = [
    { glyph: '●  ', label: 'main' },
    { glyph: '│', label: '' },
    ...live.map((k) => ({
      glyph: '├──● ',
      label: `variantly/${slug(CONCEPT_BY_ID[k].name)}`,
      key: k,
    })),
    { glyph: '│', label: '' },
    ...[...drafts.map((k) => slug(CONCEPT_BY_ID[k].name)), ...RETIRED].map((s) => ({
      glyph: '├── ',
      label: `variantly/${s}`,
      dead: true,
    })),
    { glyph: '│', label: '' },
    { glyph: '●  ', label: 'kept 1 · cleaned 0 · timelines intact' },
  ];
  const total = rows.reduce((n, r) => n + r.glyph.length + r.label.length, 0);
  const [shown, setShown] = useState(() => (calmMotion() ? total : 0));

  useEffect(() => {
    if (shown >= total) return;
    const t = window.setTimeout(() => setShown((n) => n + 1), CHAR_MS);
    return () => window.clearTimeout(t);
  }, [shown, total]);

  useEffect(() => {
    panel.current?.querySelector<HTMLElement>('button, a')?.focus();
  }, []);

  // Esc closes; Tab stays inside the panel.
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') return onClose();
    if (e.key !== 'Tab') return;
    const all = [...(panel.current?.querySelectorAll<HTMLElement>('button, a') ?? [])];
    const first = all[0];
    const last = all[all.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  };

  const go = (k: VariantKey) => {
    if (location.pathname === '/') setVariant(k);
    else router.push(`/?v=${k}`);
  };

  const done = shown >= total;
  // How much of each row has been typed so far.
  const typed = rows.map((r, i) => {
    const before = rows.slice(0, i).reduce((n, x) => n + x.glyph.length + x.label.length, 0);
    const left = shown - before;
    return [
      r.glyph.slice(0, Math.max(0, left)),
      r.label.slice(0, Math.max(0, left - r.glyph.length)),
    ];
  });
  return (
    <div
      ref={panel}
      role="dialog"
      aria-modal="true"
      aria-labelledby={id}
      onKeyDown={onKey}
      className="animate-tip-in [&_:focus-visible]:outline-log-amber bg-log-ground text-log-amber border-log-line fixed inset-x-0 bottom-4 z-70 mx-auto grid w-[min(34rem,calc(100vw-2rem))] gap-3 rounded-[10px] border p-4 font-mono text-[12px] leading-relaxed tracking-normal normal-case"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id={id} className="m-0 text-[12px] font-bold tracking-[0.08em]">
          BRANCH LOG{noon && ' · 12:00 · all timelines accounted for'}
        </h2>
        <Button
          variant="icon-slate"
          size="icon-sm"
          aria-label="Close"
          onClick={onClose}
          className="text-log-dim hover:text-log-amber hover:bg-log-line"
        >
          <X aria-hidden="true" />
        </Button>
      </div>
      <ol className="m-0 list-none overflow-x-auto p-0 whitespace-pre">
        {rows.map((r, i) => {
          const [g, l] = typed[i];
          const here = r.key === active;
          return (
            <li
              key={i}
              className={cn(
                'min-h-[1.6em]',
                noon && done && r.key && 'vy-log-merge',
                r.dead && 'text-log-dim',
              )}
            >
              <span aria-hidden="true">{g}</span>
              {r.key && l === r.label ? (
                <Button variant="text" size="none" onClick={() => go(r.key!)}>
                  {l}
                </Button>
              ) : (
                l
              )}
              {here && l === r.label && <span> ● you are here</span>}
              {r.dead && l === r.label && (
                <span>
                  <span aria-hidden="true"> ──╳</span>
                  <span className="sr-only"> (dead end)</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <a
        href={`${REPO_URL}/commit/${build}`}
        className="text-log-dim hover:text-log-amber w-fit underline underline-offset-2"
      >
        commit {build}
      </a>
    </div>
  );
};

export default BranchLog;
