export type VariantKey = 'a' | 'b' | 'c' | 'd' | 'e' | 'f';
export type SceneKind = 'clay' | 'halftone' | 'terrain' | 'wire' | 'bauhaus' | 'paper';

type Variant = {
  name: string;
  scene: SceneKind;
  // Scene colours for [light, dark] themes.
  colors: { light: string[]; dark: string[] };
  // SVG morph layer: colours, or none.
  blobs: { light: string[]; dark: string[] } | null;
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
    blobs: null,
    blur: 0,
    grain: 0.1,
  },
  b: {
    name: 'Riso Poster',
    scene: 'halftone',
    colors: { light: ['#2f5bff'], dark: ['#ff4f9a'] },
    blobs: { light: ['#ff4f9a', '#ffe14d'], dark: ['#2f5bff', '#ffe14d'] },
    blur: 0,
    grain: 0.28,
  },
  c: {
    name: 'TVA Terminal',
    scene: 'terrain',
    colors: { light: ['#1f6f6a'], dark: ['#ffb000'] },
    blobs: null,
    blur: 0,
    grain: 0.18,
  },
  d: {
    name: 'Brutal Zine',
    scene: 'wire',
    colors: { light: ['#0a0a0a', '#ff3d00'], dark: ['#c6ff00', '#ff3d00'] },
    blobs: { light: ['#c6ff00'], dark: ['#ff3d00'] },
    blur: 0,
    grain: 0.22,
  },
  e: {
    name: 'Bauhaus',
    scene: 'bauhaus',
    colors: { light: ['#e63946', '#1d4ed8', '#ffc300'], dark: ['#e63946', '#3b6cff', '#ffc300'] },
    blobs: { light: ['#e63946', '#1d4ed8', '#ffc300'], dark: ['#e63946', '#3b6cff', '#ffc300'] },
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
    blobs: null,
    blur: 0,
    grain: 0.2,
  },
};
