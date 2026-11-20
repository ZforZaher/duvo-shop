// Turns the private cup design (design/geometry.mjs) into DISPLAY models for the shop:
//   - only the outside of each lid (no U-channel, seal ring, snap undercut or markings)
//   - proportions nudged a few percent (DISTORT) so measurements taken from the site are wrong
//   - fewer points, packed as 16-bit numbers, with no dimensions or design code
// Output: public/models/cups.json      Run: npm run bake
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as THREE from 'three';

const DISTORT = { x: 1.035, y: 0.95, z: 0.97 }; // display only, never undone on the site
const LID_DISPLAY_PARTS = [0, 1, 5, 6, 7, 8, 9]; // skirt outside, top flange, deck, two pods, two pod tops
const J = 72; // drink outline samples, bottom to fill line

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let src = fs.readFileSync(path.join(root, 'design', 'geometry.mjs'), 'utf8');
for (const [from, to] of [ // lower detail: display models don't need factory precision
  ['function dRing(side, y, x0, R, N = 120, M = 18)', 'function dRing(side, y, x0, R, N = 64, M = 10)'],
  ['const rings = [], K = 56;', 'const rings = [], K = 24;'],
  ['fillY = H - 20, N = 220;', 'fillY = H - 20, N = 112;'],
  ['const rings = [], K = 48;', 'const rings = [], K = 22;'],
  ['const circ = (y, r, n = 160)', 'const circ = (y, r, n = 96)'],
  ['const dr = [], KD = 120;', 'const dr = [], KD = 60;'],
  ['const MD = 60;', 'const MD = 24;'],
]) {
  if (!src.includes(from)) throw new Error('Could not lower detail, text not found: ' + from);
  src = src.replace(from, to);
}
const tmp = path.join(root, 'scripts', `.geom-${process.pid}.mjs`);
fs.writeFileSync(tmp, src);
const { buildDualCup } = await import(pathToFileURL(tmp).href);
fs.rmSync(tmp);
const M = buildDualCup(THREE);

const d3 = (x, y, z) => [x * DISTORT.x, y * DISTORT.y, z * DISTORT.z];
const b64 = t => Buffer.from(t.buffer, t.byteOffset, t.byteLength).toString('base64');
function pack(shells) {
  const tri = []; for (const s of shells) for (let i = 0; i < s.length; i += 3) tri.push(d3(s[i], s[i + 1], s[i + 2]));
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (const p of tri) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]); }
  const s = lo.map((l, k) => Math.max(1e-6, (hi[k] - l) / 65534)), o = lo.map((l, k) => l + 32767 * s[k]);
  const map = new Map(), q = [], idx = [];
  for (const p of tri) {
    const v = p.map((x, k) => Math.round((x - o[k]) / s[k])), key = v.join(',');
    let n = map.get(key); if (n === undefined) { n = map.size; map.set(key, n); q.push(...v); }
    idx.push(n);
  }
  const big = map.size > 65535;
  return { p: b64(Int16Array.from(q)), i: b64(big ? Uint32Array.from(idx) : Uint16Array.from(idx)), big, s, o };
}
function drinkTable(d, side) {
  const Y0 = 1.05, rows = [];
  for (let j = 0; j <= J; j++) rows.push(d.drinkRing(side, Y0 + (d.fillY - Y0) * j / J).map(p => d3(p[0], 0, p[2])));
  const P = rows[0].length, flat = rows.flat(), lo = [1e9, 1e9], hi = [-1e9, -1e9];
  for (const p of flat) { lo[0] = Math.min(lo[0], p[0]); hi[0] = Math.max(hi[0], p[0]); lo[1] = Math.min(lo[1], p[2]); hi[1] = Math.max(hi[1], p[2]); }
  const s = lo.map((l, k) => (hi[k] - l) / 65534), o = lo.map((l, k) => l + 32767 * s[k]);
  const q = Int16Array.from(flat.flatMap(p => [Math.round((p[0] - o[0]) / s[0]), Math.round((p[2] - o[1]) / s[1])]));
  return { t: b64(q), P, s, o };
}

const data = {};
for (const [key, d] of Object.entries(M.designs)) {
  data[key] = {
    cup: pack(d.cup),
    lid: pack(LID_DISPLAY_PARTS.map(i => d.buildLid(10, {})[i])),
    A: drinkTable(d, -1), B: drinkTable(d, 1),
    m: { J, y0: +(1.05 * DISTORT.y).toFixed(3), fill: +(d.fillY * DISTORT.y).toFixed(3), seat: +(d.lidSeatY * DISTORT.y).toFixed(3),
         straw: +(130 * DISTORT.y).toFixed(3), strawX: +(22 * DISTORT.x).toFixed(3), strawLen: +(170 * DISTORT.y).toFixed(3) },
  };
}
const out = path.join(root, 'public', 'models', 'cups.json');
fs.writeFileSync(out, JSON.stringify(data));
console.log('Wrote public/models/cups.json (' + Math.round(fs.statSync(out).size / 1024) + ' KB)');
