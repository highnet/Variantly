// Builds the 3D title's typefaces from the same Google Fonts the 2D title
// uses (lib/introFonts.ts, same order), subset to the letters of "variantly"
// and written as three.js typeface JSON (the facetype.js format) to
// public/fonts/3d/<index>.json. All of these faces are SIL OFL 1.1 (see
// public/fonts/3d/LICENSES.txt) except Special Elite (Apache 2.0).
// Faces marked with a slug are not served by next/font (the wild display faces,
// and the five Google faces of the title's first paint, so its preload is tiny):
// their 2D woff2 is subset here from the very same file to the letters of
// "variantly" (app/fonts/wild/<slug>.woff2, a few KB each), so the 2D and 3D
// letters share one outline. Subsetting needs fontTools (pip install fonttools
// brotli). Their copyright notices are written to public/fonts/3d/WILD-LICENSES.txt.
// Usage (in site/): NODE_USE_ENV_PROXY=1 node scripts/build-3d-fonts.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import opentype from 'opentype.js';

const CHARS = [...new Set('variantly')];
// Order must match INTRO_FONTS in lib/introFonts.ts.
const FACES = [
  ['UnifrakturMaguntia', '400', 'fraktur'],
  ['Abril Fatface', '400'],
  ['Cinzel', '900', 'cinzel'],
  ['Great Vibes', '400', 'great-vibes'],
  ['Pacifico', '400', 'pacifico'],
  ['Special Elite', '400'], // Apache 2.0
  ['Orbitron', '900'],
  ['Monoton', '400'],
  ['Bungee', '400', 'bungee'],
  ['Rubik Mono One', '400'],
  ['Press Start 2P', '400'],
  ['Righteous', '400'],
  // Wild display faces, all SIL OFL 1.1.
  ['Bagel Fat One', '400', 'bagel'],
  ['Shrikhand', '400', 'shrikhand'],
  ['Tilt Warp', '400', 'tilt-warp'],
  ['Climate Crisis', '400', 'climate-crisis'],
  ['Silkscreen', '700', 'silkscreen'],
  ['Rye', '400', 'rye'],
  ['Fascinate', '400', 'fascinate'],
  ['Rubik Wet Paint', '400', 'wet-paint'],
];
const wildOut = join(process.cwd(), 'app/fonts/wild');
mkdirSync(wildOut, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), 'vy-fonts-'));
const notices = [];

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

for (const [i, [family, weight, slug]] of FACES.entries()) {
  const file = await ttf(family, weight);
  const font = opentype.parse(file);
  if (slug) {
    const src = join(tmp, `${slug}.ttf`);
    writeFileSync(src, Buffer.from(file));
    const dest = join(wildOut, `${slug}.woff2`);
    execFileSync('pyftsubset', [
      src,
      '--text=variantly',
      '--flavor=woff2',
      `--output-file=${dest}`,
    ]);
    notices.push(
      `${family} (${weight})\n${font.names.copyright?.en ?? ''}\nLicensed under the SIL Open Font License 1.1 (see LICENSES.txt or https://openfontlicense.org).\n`,
    );
  }
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
  const target = join(out, `${i}.json`);
  writeFileSync(target, JSON.stringify(json));
  console.log(
    `${target}  ${family} ${weight}  ${(JSON.stringify(json).length / 1024).toFixed(1)} KB`,
  );
}
writeFileSync(join(out, 'WILD-LICENSES.txt'), notices.join('\n'));
