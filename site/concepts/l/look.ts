import * as THREE from 'three';

import { patch, plain } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

import { chrome } from './chrome';

/*
 * l · Inflated Chrome. Mirror-silver only. The cheap looks (all phones get)
 * reflect the backdrop's world in one pass with domed caps; desktop adds
 * true PBR chrome (metalness 1, roughness 0.05) lit by the studio.
 */
export const look: ConceptLook = {
  pool: (_ink, dark, phone) => {
    const looks = [
      plain(chrome({ dark, puff: 0.9 }), chrome({ dark, grid: 1.2 })),
      plain(chrome({ dark, puff: 1.3, grid: 1.4 }), chrome({ dark })),
      plain(
        chrome({ dark, puff: 0.7, tint: '#b9bcc2', floor: '#000000' }),
        chrome({ dark, tint: '#9aa0a8' }),
      ),
    ];
    if (phone) return looks;
    const grain = patch('chrome', false, false);
    const metal = (roughness: number, color: string) =>
      grain(new THREE.MeshStandardMaterial({ color, metalness: 1, roughness }));
    looks.push(
      // True PBR mirror chrome, lit by the studio.
      plain(metal(0.05, '#ffffff'), chrome({ dark, grid: 1.4 }), true),
      plain(chrome({ dark, puff: 1.8, grid: 1.6 }), chrome({ dark })),
      plain(chrome({ dark, puff: 1.1, tint: '#dfe3e8' }), metal(0.12, '#d8d8d8'), true),
    );
    return looks;
  },
  shadow: (dark) => ({
    color: dark ? '#c6ff00' : '#0a0a0a',
    opacity: dark ? 0.16 : 0.28,
    radius: dark ? 9 : 3,
    dir: [-0.25, 0.55, 1],
  }),
};
