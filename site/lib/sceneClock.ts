/*
 * The backdrop scene's clock, shared across routes. Every page mounts its
 * own scene, so without this each navigation restarted the drift from zero.
 * The elapsed scene time lives here between client navigations and in
 * sessionStorage across full loads; a new scene starts from it.
 */
const KEY = 'vy:scene-clock';

let carried: number | null = null;

/** Seconds of scene time the previous scene had reached. */
export const sceneElapsed = (): number => {
  if (carried !== null) return carried;
  try {
    carried = Number(sessionStorage.getItem(KEY)) || 0;
  } catch {
    carried = 0;
  }
  return carried;
};

/** Hand the current scene time to the next scene (and the next load). */
export const keepSceneElapsed = (s: number) => {
  carried = s;
  try {
    sessionStorage.setItem(KEY, s.toFixed(3));
  } catch {
    // Storage blocked: client navigations still carry it.
  }
};
