import type { ComponentType } from 'react';
import type * as THREE from 'three';

import type { LetterInk, LetterLook, LetterShadow } from '@/lib/lookKit';

/*
 * The contract every concept folder fulfils (see concepts/README.md).
 * meta.ts is tiny and server-safe; the rest load lazily, only for the active
 * concept (or one the switcher is about to show).
 */

export type Theme = 'light' | 'dark';

// A switcher family; tiles group by this. Families not listed in FAMILIES
// (concepts/families.ts) still show, after the listed ones.
export type ConceptMeta = {
  // One lowercase letter: html[data-variant], ?v=, the [data-variant='x'] CSS.
  id: string;
  name: string;
  family: string;
  // Three colours for the switcher tile/swatch, per theme.
  swatch: Record<Theme, [string, string, string]>;
  // CSS font-family for the tile name (a --font-* var loaded by the layout).
  font: string;
  // Opacity of the shared film-grain overlay over the backdrop.
  grain: number;
};

// Backdrop.tsx default export: the concept's 2D background composition.
export type ConceptBackdrop = ComponentType;

// scene.ts: the three.js backdrop scene.
export type Built = { camera: THREE.Camera; update: (t: number, px: number) => void };
export type ConceptScene = {
  colors: Record<Theme, string[]>;
  build: (scene: THREE.Scene, colors: string[]) => Built;
};

// look.ts: the 3D title's surfaces and cast shadow.
export type ConceptLook = {
  // Up to six looks per letter; phones use the first three (keep them cheap).
  pool: (ink: LetterInk, dark: boolean, phone: boolean) => LetterLook[];
  shadow: (dark: boolean) => LetterShadow;
};

export type ConceptLoaders = {
  backdrop: () => Promise<{ default: ConceptBackdrop }>;
  scene: () => Promise<{ scene: ConceptScene }>;
  look: () => Promise<{ look: ConceptLook }>;
};
