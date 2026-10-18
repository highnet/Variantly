// Bakes the page's grain tiles: small tileable PNGs of film grain, one noise
// field at a few strengths, layered as a static background-image over flat
// surfaces (see .vy-grain in app/globals.css). The noise is clumped (a soft
// blur, then quantised to five levels) so it reads as grain at 1x and 3x, and
// stored as an indexed PNG whose palette carries the strength, which keeps
// each tile around a kilobyte.
// Usage: node scripts/build-grain.mjs   (writes app/_grain/grain-*.png)
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const SIZE = 96;
const OUT = new URL('../app/_grain/', import.meta.url);

// Alpha (0–255) of the outer and inner dark and light specks, per tile.
// Dark specks are a touch stronger: on light grounds they carry the grain,
// on dark grounds the light ones do.
const TILES = {
  soft: { dark: [20, 9], light: [18, 8] },
  mid: { dark: [32, 14], light: [28, 12] },
  strong: { dark: [46, 21], light: [40, 18] },
};

// A seeded PRNG, so the tiles rebuild byte for byte.
const rand = (() => {
  let a = 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();

// White noise, then a wrapped 3×3 blur so specks clump a little (coarser
// grain), renormalised to unit variance.
const white = Float32Array.from({ length: SIZE * SIZE }, () => rand() + rand() + rand() - 1.5);
const at = (x, y) => white[((y + SIZE) % SIZE) * SIZE + ((x + SIZE) % SIZE)];
const K = [
  [0.1, 0.3, 0.1],
  [0.3, 2, 0.3],
  [0.1, 0.3, 0.1],
];
const field = new Float32Array(SIZE * SIZE);
for (let y = 0; y < SIZE; y++)
  for (let x = 0; x < SIZE; x++) {
    let v = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) v += K[j + 1][i + 1] * at(x + i, y + j);
    field[y * SIZE + x] = v;
  }
const sd = Math.sqrt(field.reduce((s, v) => s + v * v, 0) / field.length);

// Five levels: 0 strong dark, 1 dark, 2 clear, 3 light, 4 strong light.
const level = (v) => (v < -1.25 ? 0 : v < -0.45 ? 1 : v <= 0.45 ? 2 : v <= 1.25 ? 3 : 4);
const idx = Uint8Array.from(field, (v) => level(v / sd));

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
};

const png = ({ dark, light }) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 4; // bit depth: 4 bits per index
  ihdr[9] = 3; // indexed colour
  // Palette: black, black, (clear), white, white; tRNS carries the strength.
  const plte = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255, 255, 255]);
  const trns = Buffer.from([dark[0], dark[1], 0, light[1], light[0]]);
  const row = 1 + SIZE / 2;
  const raw = Buffer.alloc(row * SIZE);
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x += 2)
      raw[y * row + 1 + x / 2] = (idx[y * SIZE + x] << 4) | idx[y * SIZE + x + 1];
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('PLTE', plte),
    chunk('tRNS', trns),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

mkdirSync(OUT, { recursive: true });
let total = 0;
for (const [name, alpha] of Object.entries(TILES)) {
  const buf = png(alpha);
  total += buf.length;
  writeFileSync(new URL(`grain-${name}.png`, OUT), buf);
  console.log(`grain-${name}.png  ${SIZE}×${SIZE}  ${buf.length} B`);
}
console.log(`total ${total} B`);
