import * as THREE from 'three';

import { bsdf } from '@/lib/bsdf';
import { plain } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

/*
 * i · Liquid Glass: real glass. Transmission through the letter (IOR 1.45,
 * thickness, the letter's own colour as the absorption tint), a clear coat,
 * and across the word a little thin-film iridescence. The title renders the
 * transmission pass at reduced resolution on phones (Letters3D).
 */
// [iridescence, thickness, absorption distance]; phones take the first three.
const LOOKS: [number, number, number][] = [
  [0.25, 0.6, 0.7],
  [0, 0.9, 0.5],
  [0.45, 0.5, 0.9],
  [0.15, 0.7, 0.6],
  [0.35, 0.8, 0.8],
  [0, 0.55, 0.55],
];

const glass = (ink: string, iridescence: number, thickness: number, dist: number) => {
  // Clear glass carrying the letter's colour as a tint, not a dye.
  const tint = new THREE.Color(ink).lerp(new THREE.Color('#ffffff'), 0.25);
  return bsdf({
    key: 'i-glass',
    color: tint,
    transmission: 1,
    thickness,
    ior: 1.45,
    roughness: 0.04,
    metalness: 0,
    iridescence,
    iridescenceIOR: 1.3,
    specularIntensity: 1,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    attenuationColor: new THREE.Color(ink).lerp(new THREE.Color('#ffffff'), 0.25),
    attenuationDistance: dist * 2.5,
    envMapIntensity: 1.6,
    grain: 0.02,
  });
};

export const look: ConceptLook = {
  pool: (ink) =>
    LOOKS.map(([irid, thick, dist]) =>
      plain(glass(ink.face, irid, thick, dist), glass(ink.side, irid, thick, dist), true),
    ),
  shadow: (dark) => ({
    color: dark ? '#000000' : '#23364d',
    opacity: dark ? 0.5 : 0.16,
    radius: 1,
    dir: [-0.3, 0.6, 1],
  }),
};
