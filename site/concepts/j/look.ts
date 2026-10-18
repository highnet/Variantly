import * as THREE from 'three';

import type { ConceptLook } from '@/concepts/types';
import { plain, type LetterInk } from '@/lib/lookKit';

/*
 * j · Instrument OS: machined letters. Each face is a rubber or plastic
 * keycap in the letter's own colour; the extruded body is aluminium, painted
 * on phones and brushed (lit by the studio environment) on desktop.
 */

// Brushed: fine streaks along x in the roughness, and the page's film grain.
const brushed = (m: THREE.MeshStandardMaterial) => {
  m.onBeforeCompile = (s) => {
    s.fragmentShader = s.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      `#include <roughnessmap_fragment>
      roughnessFactor *= 0.7 + 0.6 * fract(sin(floor(vViewPosition.y * 260.0) * 91.7) * 4375.5);`,
    );
  };
  m.customProgramCacheKey = () => 'j-brushed';
  return m;
};

// Caps glow a little from within, so the letter keeps its CSS colour under the studio light.
const cap = (c: string, roughness: number) =>
  new THREE.MeshStandardMaterial({
    color: c,
    roughness,
    metalness: 0,
    emissive: c,
    emissiveIntensity: 0.32,
  });

const pool = (ink: LetterInk, dark: boolean) => {
  const alu = new THREE.Color(ink.side);
  const painted = () =>
    new THREE.MeshStandardMaterial({ color: alu, roughness: 0.42, metalness: 0.3 });
  const metal = (rough: number) =>
    brushed(
      new THREE.MeshStandardMaterial({
        color: alu.clone().lerp(new THREE.Color(dark ? '#8a8a88' : '#ffffff'), 0.35),
        roughness: rough,
        metalness: 0.92,
      }),
    );
  return [
    // Phones: painted aluminium, no environment pass.
    plain(cap(ink.face, 0.82), painted()),
    plain(cap(ink.face, 0.38), painted()),
    plain(cap(ink.face, 0.6), painted()),
    plain(cap(ink.face, 0.85), metal(0.38), true),
    plain(cap(ink.face, 0.32), metal(0.3), true),
    plain(cap(ink.face, 0.6), metal(0.46), true),
  ];
};

export const look: ConceptLook = {
  pool,
  shadow: (dark) => ({
    color: dark ? '#000000' : '#2b2925',
    opacity: dark ? 0.55 : 0.28,
    radius: 9,
    dir: [-0.2, 0.62, 1],
  }),
};
