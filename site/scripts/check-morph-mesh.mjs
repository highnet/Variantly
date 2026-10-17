// Checks the 3D title's morphing letter meshes offscreen, for every letter of
// "variantly", every face pair that morph.json lets morph (both directions)
// and sampled progress through the morph, spring overshoot included, at full
// and phone (stride 2) detail. Each sampled mesh must have:
//   - no NaN or Infinity vertices;
//   - outers wound counter-clockwise and holes clockwise (y up);
//   - front caps whose triangles cover the capped outline's area (within 2%);
//   - no cap triangle outside the letter's bounding box (plus a margin);
//   - no side quad spanning across the glyph (a wall edge longer than 0.35 em)
//     or folded flat (a zero-length wall).
// Builds the real lib/glyphMorph.ts and lib/morphMesh.ts (Node's TypeScript
// type stripping), so the check runs exactly the code the site runs.
// Usage (in site/): node scripts/check-morph-mesh.mjs [--verbose]
import { readFileSync } from 'node:fs';
import { register } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
// Resolve the site's '@/…' alias and extensionless TypeScript imports.
register(
  `data:text/javascript,${encodeURIComponent(`
const ROOT = ${JSON.stringify(pathToFileURL(root + '/').href)};
export const resolve = async (spec, ctx, next) => {
  if (spec.startsWith('@/')) spec = ROOT + spec.slice(2);
  if ((spec.startsWith('file:') || spec.startsWith('.')) && !/\\.[cm]?[jt]s$/.test(spec)) {
    try { return await next(spec + '.ts', ctx); } catch {}
  }
  return next(spec, ctx);
};`)}`,
);

const verbose = process.argv.includes('--verbose');
const { decodeMorph, morphTrack, planMorph, blendMorph, OVERSHOOT_MAX } = await import(
  pathToFileURL(join(root, 'lib/glyphMorph.ts')).href
);
const { morphMesh } = await import(pathToFileURL(join(root, 'lib/morphMesh.ts')).href);

const raw = JSON.parse(readFileSync(join(root, 'public/fonts/3d/morph.json'), 'utf8'));
const data = decodeMorph(raw);
const EM = 2;
const opts = (stride) => ({ em: EM, depth: 0.3, bevel: 0.05, inset: 0.035, stride });
// Progress samples: through the morph, and past the target by up to the
// spring's largest overshoot (and a touch below 0, where a spring can dip).
const SAMPLES = [0, 0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9, 1, 1 + OVERSHOOT_MAX / 2, 1 + OVERSHOOT_MAX];

const area2 = (xs, ys, n) => {
  let a = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    a += xs[i] * ys[j] - xs[j] * ys[i];
  }
  return a / 2;
};

const failures = new Map();
let meshes = 0;
const fail = (key, what) => {
  const list = failures.get(what) ?? [];
  list.push(key);
  failures.set(what, list);
};

for (const ch of [...new Set('variantly')]) {
  const pairs = [];
  data.next[ch].forEach((froms, to) => froms.forEach((from) => pairs.push([from, to])));
  for (const stride of [1, 2]) {
    const track = morphTrack(data, ch);
    const mesh = morphMesh(track, opts(stride));
    const m = Math.floor(track.n / stride);
    const pos = mesh.geo.attributes.position.array;
    const index = mesh.geo.index.array;
    const sideCount = mesh.geo.groups[0].count;
    for (const [from, to] of pairs) {
      planMorph(data, track, from, to);
      for (const e of SAMPLES) {
        blendMorph(track, e);
        mesh.update();
        meshes++;
        const key = `${ch} ${from}->${to} e=${e.toFixed(2)} stride=${stride}`;
        // Finite vertices.
        let finite = true;
        for (let i = 0; i < pos.length; i++) if (!Number.isFinite(pos[i])) finite = false;
        if (!finite) fail(key, 'NaN/Infinity vertex');
        // Winding of the blended outline, and the letter's bounds.
        let x0 = Infinity;
        let x1 = -Infinity;
        let y0 = Infinity;
        let y1 = -Infinity;
        const xs = new Float64Array(m);
        const ys = new Float64Array(m);
        let capArea = 0;
        for (let s = 0; s < track.slots; s++) {
          if (!track.live[s]) continue;
          const at = s * track.n * 2;
          for (let i = 0; i < m; i++) {
            xs[i] = track.out[at + i * stride * 2];
            ys[i] = track.out[at + i * stride * 2 + 1];
            x0 = Math.min(x0, xs[i]);
            x1 = Math.max(x1, xs[i]);
            y0 = Math.min(y0, ys[i]);
            y1 = Math.max(y1, ys[i]);
          }
          const a = area2(xs, ys, m);
          const outer = s < track.outerSlots;
          if (outer ? a <= 0 : a >= 0) fail(key, 'winding (outer CW or hole CCW)');
          // The cap is drawn from the inset outline (row 0 of the mesh).
          const base = s * 8 * m;
          for (let i = 0; i < m; i++) {
            xs[i] = pos[(base + i) * 3] / EM;
            ys[i] = pos[(base + i) * 3 + 1] / EM;
          }
          capArea += area2(xs, ys, m);
          // Side walls: rows 3 and 4 hold the exact outline.
          for (let i = 0; i < m; i++) {
            const v = (base + 3 * m + i) * 3;
            const w = (base + 3 * m + ((i + 1) % m)) * 3;
            const len = Math.hypot(pos[w] - pos[v], pos[w + 1] - pos[v + 1]) / EM;
            if (len > 0.35) fail(key, 'side quad spans the glyph');
            if (len < 1e-7) fail(key, 'zero-length side quad');
          }
        }
        // Front caps: summed triangle area against the capped outline area.
        const margin = 0.05;
        let triArea = 0;
        let outside = false;
        for (let k = sideCount; k < sideCount + mesh.geo.groups[1].count; k += 6) {
          const [a, b, c] = [index[k], index[k + 1], index[k + 2]];
          const ax = pos[a * 3] / EM;
          const ay = pos[a * 3 + 1] / EM;
          const bx = pos[b * 3] / EM;
          const by = pos[b * 3 + 1] / EM;
          const cx = pos[c * 3] / EM;
          const cy = pos[c * 3 + 1] / EM;
          triArea += ((bx - ax) * (cy - ay) - (by - ay) * (cx - ax)) / 2;
          for (const [x, y] of [
            [ax, ay],
            [bx, by],
            [cx, cy],
          ])
            if (x < x0 - margin || x > x1 + margin || y < y0 - margin || y > y1 + margin)
              outside = true;
        }
        if (outside) fail(key, 'cap triangle outside the letter');
        if (Math.abs(triArea - capArea) > 0.02 * Math.abs(capArea) + 1e-4)
          fail(key, `cap area off (${triArea.toFixed(4)} vs ${capArea.toFixed(4)})`.replace(/\(.*\)/, ''));
      }
    }
  }
}

console.log(`${meshes} meshes checked`);
if (!failures.size) {
  console.log('clean');
  process.exit(0);
}
for (const [what, keys] of failures) {
  console.log(`${what}: ${keys.length}`);
  for (const k of keys.slice(0, verbose ? Infinity : 6)) console.log(`  ${k}`);
}
process.exit(1);
