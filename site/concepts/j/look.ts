import * as THREE from 'three';

import { bsdf } from '@/lib/bsdf';
import { plain, type LetterInk } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

/*
 * j · Instrument OS: machined letters. Each face is a keycap in the letter's
 * own colour (soft-touch rubber or glossy ABS under a clear coat); the body is
 * anodised aluminium, brushed: an anisotropic highlight stretched around the
 * rim (the mesh's UVs run along the outline there), with fine streaks in the
 * roughness.
 */
const BRUSH = /* glsl */ `
  roughnessFactor *= 0.75 + 0.5 * vyHash(vec2(floor(vObj.z * 900.0), floor(vObj.x * 6.0)));
`;

const cap = (c: string, roughness: number, clearcoat: number) =>
  bsdf({ key: 'j-cap', color: c, roughness, clearcoat, clearcoatRoughness: 0.05, grain: 0.03 });

const pool = (ink: LetterInk, dark: boolean) => {
  const alu = new THREE.Color(ink.side).lerp(new THREE.Color(dark ? '#8a8a88' : '#ffffff'), 0.35);
  const metal = (roughness: number, anisotropy: number) =>
    bsdf({
      key: 'j-alu',
      color: alu,
      roughness,
      metalness: 0.95,
      anisotropy,
      anisotropyRotation: 0,
      grain: 0.03,
      hooks: { rough: BRUSH },
    });
  return [
    plain(cap(ink.face, 0.78, 0), metal(0.32, 0.85), true),
    plain(cap(ink.face, 0.3, 1), metal(0.26, 0.7), true),
    plain(cap(ink.face, 0.55, 0.4), metal(0.4, 0.9), true),
    plain(cap(ink.face, 0.85, 0), metal(0.36, 0.8), true),
    plain(cap(ink.face, 0.24, 1), metal(0.22, 0.75), true),
    plain(cap(ink.face, 0.6, 0.3), metal(0.44, 0.9), true),
  ];
};

export const look: ConceptLook = {
  pool,
  shadow: (dark) => ({
    color: dark ? '#000000' : '#2b2925',
    opacity: dark ? 0.55 : 0.28,
    radius: 1,
    dir: [-0.2, 0.62, 1],
  }),
};
