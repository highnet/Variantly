'use client';

import { ChevronLeft, ChevronRight, ChevronUp, Shuffle, X } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';

import { Button } from '@/components/ui/Button';
import {
  CONCEPT_BY_ID,
  conceptAt,
  draftsShown,
  groupByFamily,
  prefetchConcept,
  shownConcepts,
  type ConceptId,
} from '@/concepts';
import type { ConceptMeta } from '@/concepts/types';
import { useSeekTime } from '@/lib/seek';
import { setVariant, shuffleVariant, stepVariant, useConcept } from '@/lib/variant';
import { cn } from '@/lib/utils';

const PHONE = '(max-width: 639px)';

// Client-only (ssr: false): the first render already knows the viewport.
const usePhone = () => {
  const [phone, setPhone] = useState(() => matchMedia(PHONE).matches);
  useEffect(() => {
    const mq = matchMedia(PHONE);
    const read = () => setPhone(mq.matches);
    read();
    mq.addEventListener('change', read);
    return () => mq.removeEventListener('change', read);
  }, []);
  return phone;
};

/*
 * On phones and touch screens the dock steps aside while the before/after
 * demo (#demo-stage and the controls under it) fills the strip of screen the
 * dock floats over, so it never covers the demo's own dock. It also honours
 * html[data-demo-focus], which the demo sets itself where it can.
 */
const BAND = 96;
const useYield = () => {
  const [inBand, setInBand] = useState(false);
  const [focus, setFocus] = useState(false);
  useEffect(() => {
    const html = document.documentElement;
    const mq = matchMedia(`${PHONE}, (pointer: coarse)`);
    let io: IntersectionObserver | null = null;
    const watch = () => {
      io?.disconnect();
      io = null;
      setFocus(mq.matches && html.hasAttribute('data-demo-focus'));
      const demo = document.getElementById('demo-stage')?.parentElement;
      if (!mq.matches || !demo) return setInBand(false);
      // Only the bottom band, where the dock sits, counts.
      io = new IntersectionObserver(([en]) => setInBand(en.isIntersecting), {
        rootMargin: `-${Math.max(0, innerHeight - BAND)}px 0px 0px 0px`,
      });
      io.observe(demo);
    };
    watch();
    const mo = new MutationObserver(() =>
      setFocus(mq.matches && html.hasAttribute('data-demo-focus')),
    );
    mo.observe(html, { attributes: true, attributeFilter: ['data-demo-focus'] });
    mq.addEventListener('change', watch);
    addEventListener('resize', watch, { passive: true });
    return () => {
      io?.disconnect();
      mo.disconnect();
      mq.removeEventListener('change', watch);
      removeEventListener('resize', watch);
    };
  }, []);
  return inBand || focus;
};

// Both themes' swatches ride as custom properties; html[data-theme] picks one
// in CSS (.vy-chip i), so the chip is right on its first frame.
const chipColors = (meta: ConceptMeta, i: number) =>
  ({ '--c-l': meta.swatch.light[i], '--c-d': meta.swatch.dark[i] }) as CSSProperties;

// Typing in a field never steps the concept.
const typing = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

const prefetch = (id: ConceptId) => void prefetchConcept(id, true);

type ChipProps = {
  meta: ConceptMeta;
  size?: 'sm' | 'lg';
};

// The concept's three colours, side by side.
const Chip = ({ meta, size = 'sm' }: ChipProps) => (
  <span
    aria-hidden="true"
    className={cn(
      'vy-chip flex shrink-0 overflow-hidden rounded-full',
      size === 'sm' ? 'h-3.5 w-7' : 'h-5 w-14',
    )}
  >
    {[0, 1, 2].map((i) => (
      <i key={i} className="h-full flex-1" style={chipColors(meta, i)} />
    ))}
  </span>
);

type TileProps = {
  meta: ConceptMeta;
  selected: boolean;
  active: boolean;
  large?: boolean;
  onPick: (id: ConceptId) => void;
  onFocusTile: (id: ConceptId) => void;
};

const Tile = ({ meta, selected, active, large, onPick, onFocusTile }: TileProps) => (
  <Button
    variant="concept-tile"
    size={large ? 'tile-lg' : 'tile'}
    role="option"
    id={`vy-tile-${meta.id}`}
    data-concept={meta.id}
    aria-selected={selected}
    tabIndex={active ? 0 : -1}
    onClick={() => onPick(meta.id as ConceptId)}
    onFocus={() => {
      onFocusTile(meta.id as ConceptId);
      prefetch(meta.id as ConceptId);
    }}
    onPointerEnter={() => prefetch(meta.id as ConceptId)}
    className={cn(large && 'border-rule bg-surface border')}
  >
    <Chip meta={meta} size={large ? 'lg' : 'sm'} />
    {/* Held to the tile's width: wide display faces (Cut & Paste) wrap onto
        a second line on the large tiles instead of spilling out. */}
    <span className="flex max-w-full min-w-0 items-baseline gap-1.5">
      <span className="font-mono text-[10px] opacity-60">{meta.id.toUpperCase()}</span>
      <span
        className={cn(
          'min-w-0',
          large ? 'line-clamp-2 leading-tight [overflow-wrap:anywhere]' : 'truncate',
        )}
        style={{ fontFamily: meta.font }}
      >
        {meta.name}
      </span>
      {meta.status === 'draft' && <span className="vy-draft">Draft</span>}
    </span>
  </Button>
);

/*
 * The homepage concept picker. A compact dock (current swatch, letter, name,
 * prev/next) opens a popover of all concepts grouped by family (desktop) or a
 * bottom sheet with family tabs and a snap-scrolling strip (phones). `[` and
 * `]` step through every concept without opening it. Families and order come
 * from concept meta (concepts/metas.ts, concepts/families.ts). Only finished
 * concepts show; ?drafts=1 adds the drafts (concepts/README.md).
 *
 * It renders from html[data-variant] (set before first paint), so the dock
 * names the right concept on its first frame.
 */
export const VariantSwitcher = () => {
  const current = useConcept();
  const seek = useSeekTime();
  const phone = usePhone();
  const yieldToDemo = useYield();
  // The boot script settles html[data-drafts] before anything mounts.
  const {
    list,
    groups: GROUPS,
    drafts,
  } = useMemo(() => {
    const list = shownConcepts();
    return { list, groups: groupByFamily(list), drafts: draftsShown() };
  }, []);
  const [open, setOpen] = useState(false);
  // Yielding to the demo closes the picker too (state adjusted in render).
  if (open && yieldToDemo) setOpen(false);
  const [active, setActiveState] = useState<ConceptId>('a');
  const activeRef = useRef<ConceptId>('a');
  const setActive = useCallback((id: ConceptId) => {
    activeRef.current = id;
    setActiveState(id);
  }, []);
  const [tab, setTab] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  }, []);

  const openPicker = () => {
    if (!current) return;
    setActive(current);
    setTab(
      Math.max(
        0,
        GROUPS.findIndex((g) => g.concepts.some((c) => c.id === current)),
      ),
    );
    setOpen(true);
  };

  // `[` / `]` step through the shown concepts from anywhere on the page.
  useEffect(() => {
    if (!current) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
      if (e.key === '[' || e.key === ']') {
        e.preventDefault();
        stepVariant(current, e.key === ']' ? 1 : -1);
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [current]);

  // Opening moves focus to the active tile; clicks outside close.
  useEffect(() => {
    if (!open) return;
    const tile = document.getElementById(`vy-tile-${activeRef.current}`);
    tile?.focus({ preventScroll: phone });
    if (phone) tile?.scrollIntoView({ inline: 'center', block: 'nearest' });
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !trigger.current?.contains(t)) close(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
    // Focus moves only when it opens or the tab changes, not on every arrow
    // step (the active tile is read from a ref).
  }, [open, tab, phone, close]);

  if (!current || seek !== null) return null;

  const meta = CONCEPT_BY_ID[current];
  const at = list.findIndex((c) => c.id === current);
  const count = list.length;

  const pick = (id: ConceptId) => {
    setVariant(id);
    close();
  };
  const focusTile = (id: ConceptId) => {
    setActive(id);
    document.getElementById(`vy-tile-${id}`)?.focus();
  };

  // Desktop grid: up/down within a family column, left/right across columns
  // (same row), Home/End to the first/last concept, Enter picks, Esc closes.
  const onGridKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const col = GROUPS.findIndex((g) => g.concepts.some((c) => c.id === active));
    const row = GROUPS[col]?.concepts.findIndex((c) => c.id === active) ?? 0;
    const at = (c: number, r: number) => {
      const g = GROUPS[(c + GROUPS.length) % GROUPS.length].concepts;
      return g[Math.max(0, Math.min(g.length - 1, r))].id as ConceptId;
    };
    const go: Partial<Record<string, ConceptId>> = phone
      ? {
          ArrowRight: GROUPS[tab].concepts[Math.min(GROUPS[tab].concepts.length - 1, row + 1)]
            ?.id as ConceptId,
          ArrowLeft: GROUPS[tab].concepts[Math.max(0, row - 1)]?.id as ConceptId,
        }
      : {
          ArrowDown: at(col, (row + 1) % GROUPS[col].concepts.length),
          ArrowUp: at(col, (row - 1 + GROUPS[col].concepts.length) % GROUPS[col].concepts.length),
          ArrowRight: at(col + 1, row),
          ArrowLeft: at(col - 1, row),
          Home: list[0].id as ConceptId,
          End: list[count - 1].id as ConceptId,
        };
    const next = go[e.key];
    if (next) {
      e.preventDefault();
      focusTile(next);
    }
  };

  const onTabsKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const by = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!by) return;
    e.preventDefault();
    const next = (tab + by + GROUPS.length) % GROUPS.length;
    setTab(next);
    setActive(GROUPS[next].concepts[0].id as ConceptId);
    document.getElementById(`vy-tab-${next}`)?.focus();
  };

  const shuffle = (
    <Button
      variant="concept-tile"
      size={phone ? 'tile-lg' : 'tile'}
      onClick={() => {
        shuffleVariant(current);
        close();
      }}
      className={cn(phone && 'border-rule bg-surface border border-dashed')}
    >
      <Shuffle aria-hidden="true" />
      <span>Shuffle</span>
    </Button>
  );

  return (
    <>
      <nav
        aria-label="Homepage concept"
        data-slot="concept-dock"
        data-yield={yieldToDemo || undefined}
        inert={yieldToDemo || undefined}
        className="vy-switcher fixed bottom-4 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-1 rounded-full p-1.5"
      >
        <span className="sr-only" aria-live="polite">
          {meta.name}
        </span>
        <Button
          variant="concept"
          size="touch"
          aria-label="Previous concept"
          title="Previous concept ( [ )"
          onClick={() => stepVariant(current, -1)}
          onPointerEnter={() => prefetch(conceptAt(current, -1))}
        >
          <ChevronLeft />
        </Button>
        <Button
          ref={trigger}
          variant="concept"
          size="pill"
          aria-label={
            at < 0
              ? `Draft concept: ${meta.name}. Choose a concept`
              : `Concept ${at + 1} of ${count}: ${meta.name}. Choose a concept`
          }
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? 'vy-concept-picker' : undefined}
          onClick={() => (open ? close() : openPicker())}
          className="h-11 min-w-0 gap-2 px-3"
        >
          <Chip meta={meta} />
          <span className="font-mono text-[10px] opacity-60">{current.toUpperCase()}</span>
          <span className="text-ink truncate">{meta.name}</span>
          <span className="text-steel font-mono text-[10px] tabular-nums">
            {at < 0 ? 'draft' : `${at + 1}/${count}`}
          </span>
          <ChevronUp
            aria-hidden="true"
            className={cn('transition-transform duration-200', open && 'rotate-180')}
          />
        </Button>
        <Button
          variant="concept"
          size="touch"
          aria-label="Next concept"
          title="Next concept ( ] )"
          onClick={() => stepVariant(current, 1)}
          onPointerEnter={() => prefetch(conceptAt(current, 1))}
        >
          <ChevronRight />
        </Button>
      </nav>

      {open && (
        <div
          ref={panel}
          id="vy-concept-picker"
          role="dialog"
          aria-modal={phone}
          aria-labelledby={titleId}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              close();
            }
            // The phone sheet is modal: Tab wraps inside it.
            if (e.key === 'Tab' && phone && panel.current) {
              const f = [
                ...panel.current.querySelectorAll<HTMLElement>('button:not([tabindex="-1"])'),
              ];
              const edge = e.shiftKey ? f[0] : f[f.length - 1];
              if (document.activeElement === edge) {
                e.preventDefault();
                (e.shiftKey ? f[f.length - 1] : f[0])?.focus();
              }
            }
          }}
          className={cn(
            'vy-switcher-pop fixed z-50',
            phone
              ? 'inset-x-0 bottom-0 rounded-t-2xl px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]'
              : 'bottom-20 left-1/2 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-2xl p-4',
          )}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <span
              id={titleId}
              className="vy-switcher-label font-mono text-[10px] font-semibold tracking-[0.12em] whitespace-nowrap uppercase"
            >
              {count} concepts{drafts && ' · drafts shown'}
            </span>
            <span className="vy-switcher-label ml-auto hidden items-center gap-1 text-[11px] whitespace-nowrap sm:inline-flex">
              Step with <kbd className="vy-kbd">[</kbd>
              <kbd className="vy-kbd">]</kbd>
            </span>
            {!phone && shuffle}
            {phone && (
              <Button
                variant="concept"
                size="touch"
                aria-label="Close"
                onClick={() => close()}
                className="-my-2 -mr-2 ml-auto"
              >
                <X />
              </Button>
            )}
          </div>

          {phone ? (
            <>
              <div
                role="tablist"
                aria-label="Families"
                onKeyDown={onTabsKey}
                className="mb-3 flex gap-1 overflow-x-auto"
              >
                {GROUPS.map((g, i) => (
                  <Button
                    key={g.family}
                    id={`vy-tab-${i}`}
                    role="tab"
                    variant="concept"
                    size="pill"
                    aria-selected={i === tab}
                    aria-controls="vy-strip"
                    tabIndex={i === tab ? 0 : -1}
                    onClick={() => {
                      setTab(i);
                      setActive(g.concepts[0].id as ConceptId);
                    }}
                    className="aria-selected:bg-ink aria-selected:text-surface h-10 shrink-0"
                  >
                    {g.family}
                  </Button>
                ))}
              </div>
              <div
                id="vy-strip"
                role="listbox"
                aria-label={GROUPS[tab].family}
                aria-orientation="horizontal"
                onKeyDown={onGridKey}
                className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto scroll-smooth px-4 pb-2"
              >
                {GROUPS[tab].concepts.map((c) => (
                  <Tile
                    key={c.id}
                    meta={c}
                    large
                    selected={c.id === current}
                    active={c.id === active}
                    onPick={pick}
                    onFocusTile={setActive}
                  />
                ))}
                {shuffle}
              </div>
            </>
          ) : (
            <div
              role="listbox"
              aria-labelledby={titleId}
              onKeyDown={onGridKey}
              className="grid gap-4"
              // Columns hug their concepts, so a short list is a compact panel.
              style={{ gridTemplateColumns: `repeat(${GROUPS.length}, minmax(8rem, max-content))` }}
            >
              {GROUPS.map((g, i) => (
                <div key={g.family} role="group" aria-labelledby={`vy-fam-${i}`}>
                  <span
                    id={`vy-fam-${i}`}
                    className="vy-switcher-label mb-1.5 block px-2 font-mono text-[10px] font-semibold tracking-[0.12em] uppercase"
                  >
                    {g.family}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    {g.concepts.map((c) => (
                      <Tile
                        key={c.id}
                        meta={c}
                        selected={c.id === current}
                        active={c.id === active}
                        onPick={pick}
                        onFocusTile={setActive}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};
