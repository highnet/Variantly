// An extruded letter whose outline morphs: one fixed-topology mesh per letter
// for the whole reveal, rewritten in place from a MorphTrack's blended outline
// (lib/glyphMorph). Every contour slot has the same point count in every
// face, so the vertex layout and the side walls' triangles never change; only
// the caps are re-triangulated (earcut) when the outline moves. (A
// triangulation fixed per face pair was tried: its sliver triangles flip
// mid-morph in all but ~1% of pairs, so earcut's own small per-call
// allocations stay; every buffer here is allocated once.) Shaped like
// the TextGeometry it hands over to at the lock: front face at z = 0, a
// chamfer from the outline inset by `inset` at the front out to the exact
// outline, the sides, and the same chamfer at the back.
import * as THREE from 'three';
import { Earcut } from 'three/src/extras/Earcut.js';

import type { MorphTrack } from '@/lib/glyphMorph';

// Rows of vertices per contour point: front cap, the three bands (front
// chamfer, sides, back chamfer) as separate rows for crisp normals, back cap.
const ROWS = 8;

export type MorphMeshOptions = {
  // Scene units per em, extrusion depth, bevel depth and inset.
  em: number;
  depth: number;
  bevel: number;
  inset: number;
  // Use every `stride`-th outline point (2 halves the mesh on phones).
  stride: number;
};

export const morphMesh = (t: MorphTrack, o: MorphMeshOptions) => {
  const m = Math.floor(t.n / o.stride);
  const slots = t.slots;
  const verts = slots * m * ROWS;
  const pos = new Float32Array(verts * 3);
  const nor = new Float32Array(verts * 3);
  const sideCount = slots * 3 * m * 6;
  const capRoom = 2 * 3 * (slots * m + 2 * slots);
  const index = new (verts > 65535 ? Uint32Array : Uint16Array)(sideCount + capRoom);
  const vi = (slot: number, row: number, i: number) => (slot * ROWS + row) * m + (i % m);
  // Side walls: fixed for good.
  let k = 0;
  for (let s = 0; s < slots; s++)
    for (const [f, b] of [
      [1, 2],
      [3, 4],
      [5, 6],
    ])
      for (let i = 0; i < m; i++) {
        const a = vi(s, f, i);
        const a2 = vi(s, f, i + 1);
        const d = vi(s, b, i);
        const c = vi(s, b, i + 1);
        index[k++] = a;
        index[k++] = d;
        index[k++] = a2;
        index[k++] = a2;
        index[k++] = d;
        index[k++] = c;
      }
  // Cap normals never change.
  for (let s = 0; s < slots; s++)
    for (let i = 0; i < m; i++) {
      nor[vi(s, 0, i) * 3 + 2] = 1;
      nor[vi(s, 7, i) * 3 + 2] = -1;
    }
  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage);
  const norAttr = new THREE.BufferAttribute(nor, 3).setUsage(THREE.DynamicDrawUsage);
  const idxAttr = new THREE.BufferAttribute(index, 1).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', posAttr);
  geo.setAttribute('normal', norAttr);
  geo.setIndex(idxAttr);
  // TextGeometry's material groups: 0 the caps (face), 1 the sides.
  geo.addGroup(0, sideCount, 1);
  geo.addGroup(sideCount, 0, 0);
  // A generous fixed bound (the letter never leaves its em box by much).
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, o.em * 0.35, 0), o.em * 1.5);

  // Scratch: one contour's points and edge normals, earcut input and its map
  // back to slots.
  const px = new Float32Array(m);
  const py = new Float32Array(m);
  const nx = new Float32Array(m);
  const ny = new Float32Array(m);
  const flat = new Float32Array(slots * m * 2);
  const owner = new Int32Array(slots * m);
  const holes: number[] = [];
  const shown = new Uint8Array(slots);
  const z1 = -o.bevel;
  const z2 = -(o.depth + o.bevel);
  const z3 = -(o.depth + 2 * o.bevel);
  // Chamfer normals: outward and toward the front (or back).
  const cl = Math.hypot(o.bevel, o.inset);
  const cOut = o.bevel / cl;
  const cZ = o.inset / cl;
  const put = (v: number, x: number, y: number, z: number, a: number, b: number, c: number) => {
    pos[v * 3] = x;
    pos[v * 3 + 1] = y;
    pos[v * 3 + 2] = z;
    nor[v * 3] = a;
    nor[v * 3 + 1] = b;
    nor[v * 3 + 2] = c;
  };

  // Whether two inset (row 0) edges cross, within or between live contours.
  const side = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) =>
    (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const tangled = () => {
    for (let u = 0; u < slots; u++) {
      if (!t.live[u]) continue;
      for (let v = u; v < slots; v++) {
        if (!t.live[v]) continue;
        for (let i = 0; i < m; i++) {
          const p = vi(u, 0, i) * 3;
          const p2 = vi(u, 0, i + 1) * 3;
          const [px1, py1, px2, py2] = [pos[p], pos[p + 1], pos[p2], pos[p2 + 1]];
          // Edge bounds, to skip most pairs cheaply.
          const x0 = Math.min(px1, px2);
          const x1 = Math.max(px1, px2);
          const y0 = Math.min(py1, py2);
          const y1 = Math.max(py1, py2);
          for (let j = u === v ? i + 2 : 0; j < m; j++) {
            if (u === v && i === 0 && j === m - 1) continue;
            const q = vi(v, 0, j) * 3;
            const q2 = vi(v, 0, j + 1) * 3;
            const [qx1, qy1, qx2, qy2] = [pos[q], pos[q + 1], pos[q2], pos[q2 + 1]];
            if (
              Math.max(qx1, qx2) < x0 ||
              Math.min(qx1, qx2) > x1 ||
              Math.max(qy1, qy2) < y0 ||
              Math.min(qy1, qy2) > y1
            )
              continue;
            if (
              side(px1, py1, px2, py2, qx1, qy1) * side(px1, py1, px2, py2, qx2, qy2) < 0 &&
              side(qx1, qy1, qx2, qy2, px1, py1) * side(qx1, qy1, qx2, qy2, px2, py2) < 0
            )
              return true;
          }
        }
      }
    }
    return false;
  };
  // The inset rows (cap, chamfer edges) back onto the exact outline.
  const flatten = () => {
    for (let s = 0; s < slots; s++) {
      if (!t.live[s]) continue;
      for (let i = 0; i < m; i++) {
        const x = pos[vi(s, 2, i) * 3];
        const y = pos[vi(s, 2, i) * 3 + 1];
        for (const row of [0, 1, 6, 7]) {
          pos[vi(s, row, i) * 3] = x;
          pos[vi(s, row, i) * 3 + 1] = y;
        }
      }
    }
  };

  const update = () => {
    const src = t.out;
    for (let s = 0; s < slots; s++) {
      // A slot no face uses this step: collapse it once, then skip it.
      if (!t.live[s]) {
        if (shown[s]) {
          pos.fill(0, vi(s, 0, 0) * 3, vi(s, ROWS - 1, m - 1) * 3 + 3);
          shown[s] = 0;
        }
        continue;
      }
      shown[s] = 1;
      const at = s * t.n * 2;
      for (let i = 0; i < m; i++) {
        px[i] = src[at + i * o.stride * 2] * o.em;
        py[i] = src[at + i * o.stride * 2 + 1] * o.em;
      }
      // Point normals: the mean of the two edges' outward normals (outers run
      // counter-clockwise, holes clockwise, so (dy, -dx) is always outward).
      for (let i = 0; i < m; i++) {
        const p = (i + m - 1) % m;
        const q = (i + 1) % m;
        let ax = py[i] - py[p];
        let ay = px[p] - px[i];
        let la = Math.hypot(ax, ay) || 1;
        ax /= la;
        ay /= la;
        let bx = py[q] - py[i];
        let by = px[i] - px[q];
        la = Math.hypot(bx, by) || 1;
        bx /= la;
        by /= la;
        const sx = ax + bx;
        const sy = ay + by;
        const l = Math.hypot(sx, sy) || 1;
        nx[i] = sx / l;
        ny[i] = sy / l;
      }
      for (let i = 0; i < m; i++) {
        const x = px[i];
        const y = py[i];
        const a = nx[i];
        const b = ny[i];
        // The bevel's inset, held within the stroke's room there (a thin
        // stroke's inset outline would otherwise cross itself).
        const inset = Math.min(o.inset, t.room[s * t.n + i * o.stride] * o.em);
        const ix = x - a * inset;
        const iy = y - b * inset;
        pos[vi(s, 0, i) * 3] = ix;
        pos[vi(s, 0, i) * 3 + 1] = iy;
        pos[vi(s, 0, i) * 3 + 2] = 0;
        put(vi(s, 1, i), ix, iy, 0, a * cOut, b * cOut, cZ);
        put(vi(s, 2, i), x, y, z1, a * cOut, b * cOut, cZ);
        put(vi(s, 3, i), x, y, z1, a, b, 0);
        put(vi(s, 4, i), x, y, z2, a, b, 0);
        put(vi(s, 5, i), x, y, z2, a * cOut, b * cOut, -cZ);
        put(vi(s, 6, i), ix, iy, z3, a * cOut, b * cOut, -cZ);
        pos[vi(s, 7, i) * 3] = ix;
        pos[vi(s, 7, i) * 3 + 1] = iy;
        pos[vi(s, 7, i) * 3 + 2] = z3;
      }
    }
    // The room keeps a face's inset outline clean, but an in-between shape
    // can still pinch: if the inset outlines cross anywhere, this frame goes
    // without the bevel's inset (caps on the exact outline, which
    // scripts/build-morph.mjs keeps clean), never a cap triangulated across
    // a crossed outline.
    if (tangled()) flatten();
    // Caps: each live outer with the live holes inside it, front and back.
    let c = sideCount;
    for (let s = 0; s < t.outerSlots; s++) {
      if (!t.live[s]) continue;
      let len = 0;
      holes.length = 0;
      const add = (slot: number) => {
        for (let i = 0; i < m; i++) {
          const v = vi(slot, 0, i);
          flat[len * 2] = pos[v * 3];
          flat[len * 2 + 1] = pos[v * 3 + 1];
          owner[len++] = v;
        }
      };
      add(s);
      for (let h = t.outerSlots; h < slots; h++)
        if (t.live[h] && t.parent[h] === s) {
          holes.push(len);
          add(h);
        }
      const tri = Earcut.triangulate(flat.subarray(0, len * 2) as unknown as number[], holes, 2);
      if (!tri.length) continue;
      // Earcut keeps one winding: face the front cap forward (+z).
      let flip = false;
      for (let j = 0; j < tri.length; j += 3) {
        const a = tri[j] * 2;
        const b = tri[j + 1] * 2;
        const d = tri[j + 2] * 2;
        const cross =
          (flat[b] - flat[a]) * (flat[d + 1] - flat[a + 1]) -
          (flat[b + 1] - flat[a + 1]) * (flat[d] - flat[a]);
        if (Math.abs(cross) > 1e-9) {
          flip = cross < 0;
          break;
        }
      }
      const back = 7 * m;
      for (let j = 0; j < tri.length && c + 6 <= index.length; j += 3) {
        const a = owner[tri[j]];
        const b = owner[tri[j + (flip ? 2 : 1)]];
        const d = owner[tri[j + (flip ? 1 : 2)]];
        index[c++] = a;
        index[c++] = b;
        index[c++] = d;
        // The back cap: same triangle on row 7 (row 0 + 7m within the slot), reversed.
        index[c++] = a + back;
        index[c++] = d + back;
        index[c++] = b + back;
      }
    }
    geo.groups[1].count = c - sideCount;
    posAttr.needsUpdate = true;
    norAttr.needsUpdate = true;
    idxAttr.needsUpdate = true;
  };

  return { geo, update };
};
