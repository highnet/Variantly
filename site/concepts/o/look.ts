import { bsdf } from '@/lib/bsdf';
import { plain, type LetterInk } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

/*
 * o · Swiss Punk: enamel signs. Vitreous enamel over steel: flat-shaded so
 * every chamfer reads crisp, a hard glass clear coat that throws a sharp
 * glint off the planes facing the light, and no environment tint: oxblood
 * stays oxblood, black stays black.
 */
// [enamel roughness, clear-coat roughness]; phones take the first three.
const LOOKS: [number, number][] = [
  [0.42, 0.03],
  [0.55, 0.08],
  [0.36, 0.02],
  [0.6, 0.12],
  [0.4, 0.05],
  [0.5, 0.03],
];

const enamel = (a: string, roughness: number, coat: number) =>
  bsdf({
    key: 'o-enamel',
    color: a,
    roughness,
    flatShading: true,
    clearcoat: 1,
    clearcoatRoughness: coat,
    grain: 0.02,
  });

const pool = (ink: LetterInk) =>
  LOOKS.map(([rough, coat]) =>
    plain(enamel(ink.face, rough, coat), enamel(ink.side, rough + 0.1, coat * 2), true),
  );

export const look: ConceptLook = {
  pool,
  shadow: (dark) => ({
    color: dark ? '#000000' : '#151412',
    opacity: dark ? 0.6 : 0.3,
    radius: 1,
    dir: [-0.42, 0.42, 1],
  }),
};
