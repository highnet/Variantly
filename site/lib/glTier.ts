// Device tier and WebGL probe for the three.js layers. Deliberately free of
// three imports so the shell bundle can use it without pulling three in.

export type GlTier = {
  coarse: boolean;
  antialias: boolean;
  pixelRatio: number;
};

// Touch-first devices (phones, tablets) get the cheap path, whatever their width.
export const glTier = (renderScale = 1): GlTier => {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const dpr = devicePixelRatio || 1;
  return {
    coarse,
    antialias: !coarse && dpr <= 1.5,
    pixelRatio: Math.min(dpr, coarse ? 1.1 : 1.5) * renderScale,
  };
};

let probed: boolean | null = null;

// Can this browser make a WebGL context? The test context is released at once
// so it never counts against the per-page context limit.
export const canWebGL = () => {
  if (probed !== null) return probed;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    probed = !!gl;
  } catch {
    probed = false;
  }
  return probed;
};

// Marks the page as running on CSS fallbacks (no WebGL).
export const markFallback = () => (document.documentElement.dataset.fallback = 'css');
