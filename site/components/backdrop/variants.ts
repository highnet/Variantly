export type VariantKey = 'a' | 'b' | 'c' | 'd' | 'e' | 'f';
export type SceneKind = 'clay' | 'halftone' | 'terrain' | 'wire' | 'bauhaus' | 'paper';

type Ramp = [string, string, string];

type Variant = {
  name: string;
  scene: SceneKind;
  // Scene colours for [light, dark] themes.
  colors: { light: string[]; dark: string[] };
  // Grainy-gradient morph shapes: one [core, mid, edge] ramp per shape.
  blobs: { light: Ramp[]; dark: Ramp[] } | null;
  sharp?: boolean;
  blur: number;
  grain: number;
};

/*
 * Six concepts, not six palettes: each has its own 3D scene, its own morph
 * treatment, and (in globals.css under [data-variant]) its own hero layout,
 * display face and title-card styling.
 */
export const VARIANTS: Record<VariantKey, Variant> = {
  a: {
    name: 'Soft Clay',
    scene: 'clay',
    colors: { light: ['#ff9a76', '#ffd166', '#a78bfa'], dark: ['#ff7a59', '#ffb84d', '#8b6cff'] },
    blobs: {
      light: [
        ['#ffb38a', '#ff7a59', '#a78bfa'],
        ['#ffe08a', '#ffb84d', '#ff7a59'],
        ['#c4b5fd', '#a78bfa', '#7dd3fc'],
      ],
      dark: [
        ['#ffb38a', '#ff6a45', '#7c5cff'],
        ['#ffe08a', '#ff9a3c', '#ff4f6a'],
        ['#d8ccff', '#8b6cff', '#3b82f6'],
      ],
    },
    blur: 0,
    grain: 0.1,
  },
  b: {
    name: 'Riso Poster',
    scene: 'halftone',
    colors: { light: ['#2f5bff'], dark: ['#ff4f9a'] },
    blobs: {
      light: [
        ['#ffe14d', '#ff4f9a', '#2f5bff'],
        ['#ffd0e4', '#ff4f9a', '#2f5bff'],
      ],
      dark: [
        ['#ffe14d', '#ff4f9a', '#2f5bff'],
        ['#9fb4ff', '#2f5bff', '#ff4f9a'],
      ],
    },
    blur: 0,
    grain: 0.28,
  },
  c: {
    name: 'TVA Terminal',
    scene: 'terrain',
    colors: { light: ['#1f6f6a'], dark: ['#ffb000'] },
    blobs: {
      light: [['#f6d58a', '#3fb6a8', '#1f6f6a']],
      dark: [
        ['#ffd27a', '#ffb000', '#7a3a00'],
        ['#ffb000', '#b35e00', '#3a1d00'],
      ],
    },
    blur: 0,
    grain: 0.18,
  },
  d: {
    name: 'Brutal Zine',
    scene: 'wire',
    colors: { light: ['#0a0a0a', '#ff3d00'], dark: ['#c6ff00', '#ff3d00'] },
    blobs: {
      light: [['#f3ff9e', '#c6ff00', '#00e5ff']],
      dark: [['#ffb199', '#ff3d00', '#c6ff00']],
    },
    blur: 0,
    grain: 0.22,
  },
  e: {
    name: 'Bauhaus',
    scene: 'bauhaus',
    colors: { light: ['#e63946', '#1d4ed8', '#ffc300'], dark: ['#e63946', '#3b6cff', '#ffc300'] },
    blobs: {
      light: [
        ['#ff8a95', '#e63946', '#a01020'],
        ['#7aa2ff', '#1d4ed8', '#0b2a8a'],
        ['#ffe27a', '#ffc300', '#e09a00'],
      ],
      dark: [
        ['#ff8a95', '#e63946', '#a01020'],
        ['#8fb0ff', '#3b6cff', '#1a3fae'],
        ['#ffe27a', '#ffc300', '#e09a00'],
      ],
    },
    sharp: true,
    blur: 0,
    grain: 0.06,
  },
  f: {
    name: 'Cut & Paste',
    scene: 'paper',
    colors: {
      light: ['#fbf7ee', '#e5322d', '#2346c8', '#f2c94c'],
      dark: ['#f3ead6', '#ff5a4f', '#4a6cf0', '#f2c94c'],
    },
    blobs: {
      light: [
        ['#f2c94c', '#e5322d', '#2346c8'],
        ['#fbf7ee', '#f2c94c', '#e5322d'],
      ],
      dark: [
        ['#f2c94c', '#ff5a4f', '#4a6cf0'],
        ['#f3ead6', '#f2c94c', '#ff5a4f'],
      ],
    },
    blur: 0,
    grain: 0.2,
  },
};
