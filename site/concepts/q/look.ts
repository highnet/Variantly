import { bsdf } from '@/lib/bsdf';
import { both } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

/*
 * q · Sticker Bomb: printed vinyl. Glossy faces under a clear coat, a holo
 * foil (a thin film over a metallic print) that throws a rainbow at grazing
 * angles, and the white kiss-cut border as the extruded sides (the 2D
 * letter's white drop shadow). Phones get the coat and the foil too.
 */
type Vinyl = Parameters<typeof bsdf>[0];

const LOOKS: Omit<Vinyl, 'key'>[] = [
  { roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.03 },
  {
    roughness: 0.22,
    metalness: 0.7,
    iridescence: 1,
    iridescenceIOR: 1.7,
    iridescenceThicknessRange: [240, 900],
  },
  { roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.08 },
  { roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.04 },
  {
    roughness: 0.18,
    metalness: 0.6,
    iridescence: 0.8,
    iridescenceIOR: 1.5,
    iridescenceThicknessRange: [300, 800],
  },
  { roughness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.1 },
];

export const look: ConceptLook = {
  pool: (ink) =>
    LOOKS.map((o) => both(ink, (a) => bsdf({ key: 'q-vinyl', ...o, color: a, grain: 0.03 }), true)),
  shadow: (dark) => ({
    color: '#111111',
    opacity: dark ? 0.4 : 0.3,
    radius: 1,
    dir: [-0.2, 0.5, 1],
  }),
};
