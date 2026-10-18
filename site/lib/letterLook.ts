import type { VariantKey } from '@/components/backdrop/variants';
import { CONCEPT_LOADERS, isConceptId } from '@/concepts';
import type { ConceptLook } from '@/concepts/types';
import { both, shader, type LetterInk, type LetterLook, type LetterShadow } from '@/lib/lookKit';

export type { LetterInk, LetterLook, LetterShadow } from '@/lib/lookKit';

/*
 * The 3D title's per-concept surfaces and shadow, served from the concept
 * registry (concepts/<id>/look.ts). Only the active concept's look module is
 * loaded; this API stays synchronous for Letters3D: until a look has arrived
 * the letters wear a plain fallback, and when it lands the title is re-dressed
 * (its observer watches html[data-variant], which is re-applied).
 */

const loaded: Partial<Record<string, ConceptLook>> = {};
const pending: Partial<Record<string, Promise<ConceptLook>>> = {};
// Concepts whose fallback the title is wearing right now.
const stale = new Set<string>();

export const loadLook = (id: string): Promise<ConceptLook> => {
  const have = loaded[id];
  if (have) return Promise.resolve(have);
  if (!isConceptId(id)) return Promise.reject(new Error(`unknown concept ${id}`));
  pending[id] ??= CONCEPT_LOADERS[id].look().then(({ look }) => {
    loaded[id] = look;
    // Re-dress the title if this concept is showing (an attribute write
    // notifies observers even when the value is unchanged).
    const html = document.documentElement;
    if (stale.delete(id) && html.dataset.variant === id) html.dataset.variant = id;
    return look;
  });
  return pending[id];
};

// Start on the active concept's look as soon as this module loads.
if (typeof document !== 'undefined') {
  const v = document.documentElement.dataset.variant;
  if (v) void loadLook(v).catch(() => {});
}

export const poolSize = (phone: boolean) => (phone ? 3 : 6);

const FALLBACK_SHADOW: LetterShadow = {
  color: '#000000',
  opacity: 0,
  radius: 1,
  dir: [-0.3, 0.5, 1],
};

export const lookPool = (variant: VariantKey, ink: LetterInk, dark: boolean, phone: boolean) => {
  const look = loaded[variant];
  if (look) return look.pool(ink, dark, phone).slice(0, poolSize(phone));
  stale.add(variant);
  void loadLook(variant).catch(() => {});
  // Plain flat letters for the moment until the concept's look arrives.
  return Array.from({ length: poolSize(phone) }, () =>
    both(ink, (a) => shader('flat', { a, grain: 0 })),
  );
};

export const disposePool = (pool: LetterLook[]) =>
  pool.forEach((l) => {
    l.body.forEach((m) => m.dispose());
  });

export const letterShadow = (variant: VariantKey, dark: boolean): LetterShadow =>
  loaded[variant]?.shadow(dark) ?? FALLBACK_SHADOW;
