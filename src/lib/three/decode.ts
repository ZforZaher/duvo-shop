// Turns the packed display models (/models/cups.json) into ready-to-draw vertex arrays.
// Runs inside a Web Worker (models.worker.ts) so the page stays responsive; stage.ts falls back to
// running it directly if workers aren't available.
import { BufferAttribute, BufferGeometry } from 'three';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Design } from '@/lib/catalog';

export type Packed = { p: string; i: string; big: boolean; s: number[]; o: number[] };
export type Table = { t: string; P: number; s: number[]; o: number[] };
export type Meta = { J: number; y0: number; fill: number; seat: number; straw: number; strawX: number; strawLen: number };
export type RawData = Record<Design, { cup: Packed; lid: Packed; A: Table; B: Table; m: Meta }>;
/** A finished mesh: flat (non-indexed) positions and creased normals. */
export type Mesh = { pos: Float32Array; nrm: Float32Array };
export type Ready = Record<Design, { cup: Mesh; lid: Mesh; A: Table; B: Table; m: Meta }>;

export function unb64<T>(s: string, T: new (b: ArrayBuffer) => T): T {
  const bin = atob(s), u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return new T(u.buffer);
}

function mesh(m: Packed): Mesh {
  const q = unb64(m.p, Int16Array), pos = new Float32Array(q.length);
  for (let i = 0; i < q.length; i++) pos[i] = m.o[i % 3] + q[i] * m.s[i % 3];
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setIndex(new BufferAttribute(m.big ? unb64(m.i, Uint32Array) : unb64(m.i, Uint16Array), 1));
  const out = toCreasedNormals(g, Math.PI / 6);
  return { pos: out.getAttribute('position').array as Float32Array, nrm: out.getAttribute('normal').array as Float32Array };
}

export function decode(raw: RawData): Ready {
  const out = {} as Ready;
  for (const d of Object.keys(raw) as Design[]) {
    const r = raw[d];
    out[d] = { cup: mesh(r.cup), lid: mesh(r.lid), A: r.A, B: r.B, m: r.m };
  }
  return out;
}

/** The big arrays, so the worker can hand them over without copying. */
export function buffers(r: Ready): ArrayBuffer[] {
  return Object.values(r).flatMap(d => [d.cup.pos.buffer, d.cup.nrm.buffer, d.lid.pos.buffer, d.lid.nrm.buffer] as ArrayBuffer[]);
}
