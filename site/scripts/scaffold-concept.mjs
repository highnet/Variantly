#!/usr/bin/env node
/*
 * Scaffolds placeholder concept folders (concepts/<id>/) from the impeccable
 * roll in .impeccable/decision/concepts-13.json: meta (name, family, swatch),
 * light/dark tokens, a simple backdrop, a simple scene and a default 3D look.
 *
 *   node scripts/scaffold-concept.mjs            # every concept in the JSON
 *   node scripts/scaffold-concept.mjs k p        # just these
 *   node scripts/scaffold-concept.mjs k --force  # overwrite existing files
 *   node scripts/scaffold-concept.mjs --meta     # rewrite only meta.ts + concept.css
 *
 * A concept's real design replaces these files by hand (see concepts/README.md).
 * A new id must also be listed once in concepts/metas.ts, concepts/index.ts
 * and concepts/styles.ts (h–t already are).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = join(dirname(fileURLToPath(import.meta.url)), '..');
const spec = JSON.parse(
  readFileSync(join(site, '..', '.impeccable/decision/concepts-13.json'), 'utf8'),
);
const args = process.argv.slice(2);
const force = args.includes('--force');
const metaOnly = args.includes('--meta');
const ids = args.filter((a) => !a.startsWith('--'));
const options = spec.options.filter((o) => !ids.length || ids.includes(o.id));

const familyOf = (id, o) =>
  o.family ??
  Object.entries(spec.families ?? {}).find(([, list]) => list.includes(id))?.[0] ??
  'More';

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (x, y) => {
  const [hi, lo] = [lum(x), lum(y)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
};
const onColour = (hex) => (lum(hex) > 0.4 ? '#111111' : '#ffffff');

// Background, ink, then up to three accents distinct from both.
const roles = (p) => {
  const [bg, ink] = p;
  const acc = p.slice(2).filter((c) => c !== bg && c !== ink);
  while (acc.length < 3) acc.push(acc[acc.length - 1] ?? ink);
  return { bg, ink, a: acc };
};

const tokens = (p) => {
  const { bg, ink, a } = roles(p);
  const mix = (c, pct, d) => `color-mix(in srgb, ${c} ${pct}%, ${d})`;
  return `  --panel: ${mix(bg, 94, ink)}; --surface: ${bg}; --rule: ${mix(ink, 18, bg)}; --steel: ${mix(ink, 66, bg)}; --ink: ${ink};
  --alert: ${a[0]}; --alert-hover: ${mix(a[0], 85, bg)}; --on-alert: ${onColour(a[0])};
  --hero-bg: ${bg}; --hero-ink: ${ink}; --hero-mute: ${mix(ink, 66, bg)}; --hero-line: ${mix(ink, 22, bg)}; --hero-box: ${mix(bg, 96, ink)};
  --title: ${contrast(a[0], bg) >= 3 ? a[0] : ink};
  --flap-bg: ${a[0]}; --flap-ink: ${onColour(a[0])};
  --art-1: ${a[0]}; --art-2: ${a[1]}; --art-3: ${a[2]}; --art-ink: ${ink}; --art-shadow: ${ink};`;
};

const write = (id, file, body) => {
  const path = join(site, 'concepts', id, file);
  if (existsSync(path) && !force && !(metaOnly && /meta\.ts|concept\.css/.test(file))) return;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body);
  console.log('wrote', `concepts/${id}/${file}`);
};

// Tile colours: two accents (or accent + ground) and the ink.
const sw = (r) => [r.a[0], r.a[1] !== r.a[0] ? r.a[1] : r.bg, r.ink];
const q = (list) => `[${list.map((c) => `'${c}'`).join(', ')}]`;

for (const o of options) {
  const { id } = o;
  const L = roles(o.palette);
  const D = roles(o.paletteDark ?? o.palette);
  const board = roles(o.paletteDark ?? o.palette);
  const face = (o.displayFonts ?? [])[0];

  write(
    id,
    'meta.ts',
    `import type { ConceptMeta } from '@/concepts/types';

// Placeholder from .impeccable/decision/concepts-13.json (scripts/scaffold-concept.mjs).
export const meta: ConceptMeta = {
  id: '${id}',
  name: '${o.label.replace(/'/g, "\\'")}',
  family: '${familyOf(id, o)}',
  swatch: { light: ${q(sw(L))}, dark: ${q(sw(D))} },
  font: "${face ? `'${face}', ` : ''}var(--font-martian)",
  grain: 0.2,
  // Hidden from the switcher until it is built; preview with ?drafts=1.
  status: 'draft',
};
`,
  );

  write(
    id,
    'concept.css',
    `/* ${id} · ${o.label}: placeholder tokens from the roll's palette. */
:root[data-variant='${id}'] {
${tokens(o.palette)}
  --hero-face: var(--font-martian); --hero-alpha: 55%; --blob-o: 0.6;
  --board-bg: ${board.bg}; --board-raised: color-mix(in srgb, ${board.bg} 88%, ${board.ink}); --board-line: color-mix(in srgb, ${board.bg} 70%, ${board.ink});
  --board-mute: color-mix(in srgb, ${board.ink} 72%, ${board.bg}); --board-text: ${board.ink}; --board-deep: color-mix(in srgb, ${board.bg} 80%, #000); --board-ok: ${board.a[0]};
}
:root[data-variant='${id}'][data-theme='dark'] {
${tokens(o.paletteDark ?? o.palette)}
}
`,
  );

  if (metaOnly) continue;

  write(
    id,
    'Backdrop.tsx',
    `import { Piece } from '@/components/backdrop/artKit';

/* ${id} · ${o.label}: placeholder composition (three drifting shapes). */
const Placeholder = () => (
  <>
    <Piece className="top-[10%] left-[-8%] size-[40vmax]" float={0}>
      <circle cx="50" cy="50" r="42" className="fill-(--art-1)" fillOpacity="0.55" />
    </Piece>
    <Piece className="top-[-4%] right-[-8%] size-[30vmax]" float={1}>
      <rect x="12" y="12" width="76" height="76" className="fill-(--art-2)" fillOpacity="0.5" />
    </Piece>
    <Piece className="top-[56%] left-[46%] size-[24vmax] max-sm:hidden" float={2}>
      <path d="M50,8 L94,90 L6,90Z" className="fill-(--art-3)" fillOpacity="0.5" />
    </Piece>
  </>
);

export default Placeholder;
`,
  );

  write(
    id,
    'scene.ts',
    `import * as THREE from 'three';

import { persp } from '@/components/backdrop/sceneKit';
import type { Built, ConceptScene } from '@/concepts/types';

/* ${id} · ${o.label}: placeholder scene (two nested wireframe solids). */
const build = (scene: THREE.Scene, colors: string[]): Built => {
  const camera = persp(9);
  const outer = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(2.4, 1)),
    new THREE.LineBasicMaterial({ color: colors[0] }),
  );
  const inner = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.OctahedronGeometry(1.2)),
    new THREE.LineBasicMaterial({ color: colors[1] }),
  );
  const group = new THREE.Group();
  group.add(outer, inner);
  group.position.set(3.6, 0.4, 0);
  scene.add(group);
  return {
    camera,
    update: (t, px) => {
      // 24s loop: one full turn of the outer solid.
      const a = (t / 24) * Math.PI * 2;
      outer.rotation.set(a, a + px, 0);
      inner.rotation.set(-a * 2, -a, 0);
    },
  };
};

export const scene: ConceptScene = {
  colors: { light: ${q(L.a.slice(0, 2))}, dark: ${q(D.a.slice(0, 2))} },
  build,
};
`,
  );

  write(
    id,
    'look.ts',
    `import { both, shader } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

/* ${id} · ${o.label}: placeholder look (soft clay sheen in the letter's colour). */
export const look: ConceptLook = {
  pool: (ink, dark) => {
    const b = dark ? '${D.a[1]}' : '${L.a[1]}';
    return [0, 0.6, 0.2, 0.8, 0.35, 0.9].map((sheen) =>
      both(ink, (a) => shader('clay', { a, b, sheen, grain: 0.04 })),
    );
  },
  shadow: (dark) => ({
    color: dark ? '#000000' : '${L.ink}',
    opacity: dark ? 0.45 : 0.22,
    radius: 1,
    dir: [-0.3, 0.55, 1],
  }),
};
`,
  );
}
