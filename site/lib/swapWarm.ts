import type { ConceptId } from '@/concepts';

/*
 * Work a concept swap does before it starts. setVariant waits (briefly, with
 * the concept's chunks) for every warmer registered here, so the heavy part
 * of a swap (building the next backdrop scene, the next title look's
 * materials, compiling their shaders) happens before the view transition,
 * not inside its update callback, where the page is frozen until it returns.
 * A warmer resolves once its work is ready to show (or gives up quietly).
 */
type Warmer = (v: ConceptId) => Promise<unknown> | void;

const warmers = new Set<Warmer>();

export const onSwapWarm = (w: Warmer) => {
  warmers.add(w);
  return () => {
    warmers.delete(w);
  };
};

// Starts each warmer in its own task (a frame can land between their
// synchronous parts), then waits for them all.
export const warmSwap = async (v: ConceptId) => {
  const pending: Promise<unknown>[] = [];
  for (const w of [...warmers]) {
    pending.push(
      Promise.resolve()
        .then(() => w(v))
        .catch(() => {}),
    );
    await new Promise((r) => setTimeout(r, 0));
  }
  await Promise.all(pending);
};
