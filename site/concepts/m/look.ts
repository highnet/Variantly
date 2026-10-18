import * as THREE from 'three';

import { patch, type LetterLook } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

import { plaster } from './plaster';

/*
 * m · Uncanny Mirror. Every letter is a rough plaster cast with hairline
 * cracks, and every letter carries its reflection: the glyph flipped under
 * its baseline, recoloured as another variant (the letter's own CSS colour),
 * fading into the floor. The object obeys; the reflection lies.
 */
const PLASTERS: [string, string, number][] = [
  // colour, shade, crack strength
  ['#f4f1ea', '#a9a5b0', 0.55],
  ['#ece6dc', '#9b958f', 0.75],
  ['#eef0f4', '#9ea4b4', 0.4],
];
// Light theme: the same casts in slate and violet stone, so the word holds
// against the pale sky (each face >= 4.5:1 on #e7ecf1).
const STONES: [string, string, number][] = [
  ['#545a6c', '#2a2e3a', 0.5],
  ['#5e5280', '#2c2640', 0.6],
  ['#4a5568', '#252b36', 0.4],
];

export const look: ConceptLook = {
  pool: (ink, dark, phone) => {
    const lift = (c: string) => (dark ? new THREE.Color(c).multiplyScalar(0.86).getStyle() : c);
    const ghost = (c: string) =>
      plaster({
        col: c,
        shade: dark ? '#1c1830' : '#5b4a91',
        mirror: true,
        reflection: true,
        fade: 2.6,
        alpha: dark ? 0.55 : 0.5,
        crack: 0,
      });
    const casts = dark ? PLASTERS : STONES;
    const looks: LetterLook[] = casts.map(([col, shade, crack], i) => ({
      body: [
        plaster({ col: lift(col), shade, crack, scale: 1.4 + i * 0.3 }),
        plaster({ col: lift(col), shade: ink.side, crack: crack * 0.6, scale: 1.4 }),
      ],
      extra: ghost(i === 1 ? (dark ? '#8fb4e6' : '#4a6a96') : ink.face),
      offset: [0, -0.02, 0],
    }));
    if (phone) return looks;
    // Desktop: studio-lit matte casts (MeshStandard, rough 0.95) with tooth.
    const grain = patch('plaster', false);
    const cast = (c: string) =>
      grain(new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, metalness: 0 }));
    (dark ? ['#f6f3ec', '#e9e4da', '#f0f2f6'] : ['#5a6072', '#62578a', '#4d586c']).forEach((c, i) =>
      looks.push({
        body: [cast(lift(c)), cast(lift(casts[i][1]))],
        extra: ghost(i === 0 ? '#ffb59a' : ink.face),
        offset: [0, -0.02, 0],
        env: true,
      }),
    );
    return looks;
  },
  shadow: (dark) => ({
    color: dark ? '#000000' : '#3a3550',
    opacity: dark ? 0.55 : 0.3,
    radius: 1,
    dir: [-0.45, 0.7, 0.9],
  }),
};
