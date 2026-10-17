// Builds the 3D title's typefaces from the same Google Fonts the 2D title
// uses (lib/introFonts.ts, same order), subset to the letters of "variantly"
// and written as three.js typeface JSON (the facetype.js format) to
// public/fonts/3d/<index>.json. All of these faces are SIL OFL 1.1 (see
// public/fonts/3d/LICENSES.txt) except Special Elite (Apache 2.0).
// Usage (in site/): node scripts/build-3d-fonts.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import opentype from 'opentype.js';

const CHARS = [...new Set('variantly')];
// Order must match INTRO_FONTS in lib/introFonts.ts.
const FACES = [
  ['UnifrakturMaguntia', '400'],
  ['Abril Fatface', '400'],
  ['Cinzel', '900'],
  ['Great Vibes', '400'],
  ['Pacifico', '400'],
  ['Special Elite', '400'], // Apache 2.0
  ['Orbitron', '900'],
  ['Monoton', '400'],
  ['Bungee', '400'],
  ['Rubik Mono One', '400'],
  ['Press Start 2P', '400'],
  ['Righteous', '400'],
];

const out = join(process.cwd(), 'public/fonts/3d');
mkdirSync(out, { recursive: true });
const r = (n) => Math.round(n);

// An old user agent makes Google Fonts serve plain TrueType files.
const ttf = async (family, weight) => {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${family.replaceAll(' ', '+')}:wght@${weight}`,
    { headers: { 'User-Agent': 'Mozilla/4.0' } },
  ).then((res) => res.text());
  const url = css.match(/url\((https:[^)]+)\)/)?.[1];
  if (!url) throw new Error(`no font file for ${family}`);
  return fetch(url).then((res) => res.arrayBuffer());
};

// facetype.js outline: "m x y", "l x y", "q x y cx cy", "b x y c1x c1y c2x c2y"
// (end point first, then control points), font units, y up.
const outline = (path) =>
  path.commands
    .map((c) => {
      switch (c.type) {
        case 'M':
          return `m ${r(c.x)} ${r(c.y)}`;
        case 'L':
          return `l ${r(c.x)} ${r(c.y)}`;
        case 'Q':
          return `q ${r(c.x)} ${r(c.y)} ${r(c.x1)} ${r(c.y1)}`;
        case 'C':
          return `b ${r(c.x)} ${r(c.y)} ${r(c.x1)} ${r(c.y1)} ${r(c.x2)} ${r(c.y2)}`;
        default:
          return '';
      }
    })
    .filter(Boolean)
    .join(' ');

for (const [i, [family, weight]] of FACES.entries()) {
  const font = opentype.parse(await ttf(family, weight));
  const glyphs = {};
  for (const ch of CHARS) {
    const g = font.charToGlyph(ch);
    // Unflipped font-unit path (opentype's getPath flips y for canvas).
    const p = g.path;
    const b = p.getBoundingBox();
    glyphs[ch] = { ha: r(g.advanceWidth), x_min: r(b.x1), x_max: r(b.x2), o: outline(p) };
  }
  const head = font.tables.head;
  const json = {
    glyphs,
    familyName: family,
    ascender: font.ascender,
    descender: font.descender,
    underlinePosition: font.tables.post.underlinePosition,
    underlineThickness: font.tables.post.underlineThickness,
    boundingBox: { xMin: head.xMin, yMin: head.yMin, xMax: head.xMax, yMax: head.yMax },
    resolution: font.unitsPerEm,
    original_font_information: { family, weight, source: 'Google Fonts' },
    cssFontWeight: 'normal',
    cssFontStyle: 'normal',
  };
  const file = join(out, `${i}.json`);
  writeFileSync(file, JSON.stringify(json));
  console.log(
    `${file}  ${family} ${weight}  ${(JSON.stringify(json).length / 1024).toFixed(1)} KB`,
  );
}
