// Shared 3D engine for every cup view on the site (client only).
// Draws the protected display models from /models/cups.json. One animation loop drives all stages,
// and a stage only draws while it is on screen.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Design } from '@/lib/catalog';
import { decode, unb64, type Mesh, type Meta, type Ready, type Table } from './decode';
import { PAIRS, type Pair } from './near';
export type { Pair };

// The models are downloaded and decoded once, in a Web Worker, so the page never freezes while they load.
const MODELS = '/models/cups.json';
let dataPromise: Promise<Ready> | null = null;
const loadData = () => (dataPromise ??= new Promise<Ready>((resolve, reject) => {
  const fallback = () => fetch(MODELS).then(async r => {
    if (!r.ok) throw new Error('Could not load cup models');
    return decode(await r.json());
  }).then(resolve, reject);
  let w: Worker;
  try { w = new Worker(new URL('./models.worker.ts', import.meta.url)); } catch { fallback(); return; }
  w.onmessage = (e: MessageEvent<{ ok: boolean; data?: Ready; error?: string }>) => {
    w.terminate();
    if (e.data.ok && e.data.data) resolve(e.data.data); else reject(new Error(e.data.error || 'Could not load cup models'));
  };
  w.onerror = () => { w.terminate(); fallback(); };
  w.postMessage(new URL(MODELS, location.href).href);
}));

const GEO = new Map<string, THREE.BufferGeometry>();
function meshGeo(id: string, m: Mesh) {
  const hit = GEO.get(id); if (hit) return hit;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(m.pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(m.nrm, 3));
  g.computeBoundingSphere();
  GEO.set(id, g); return g;
}

// A drink that fills smoothly: K+1 rings from the bottom to level T, each blended from the two nearest
// sampled inside outlines, so it always follows the cup wall. Only positions change between frames.
const K = 28;
class Liquid {
  geo = new THREE.BufferGeometry();
  private rows: number[][][] = [];
  private P: number; private J: number; private y0: number; private top: number;
  private pos: Float32Array; private attr: THREE.BufferAttribute; private T = -1;
  constructor(t: Table, m: Meta) {
    const q = unb64(t.t, Int16Array);
    this.P = t.P; this.J = m.J; this.y0 = m.y0; this.top = m.fill;
    for (let j = 0; j <= m.J; j++) {
      const y = m.y0 + (m.fill - m.y0) * j / m.J, row: number[][] = [];
      for (let i = 0; i < t.P; i++) { const n = (j * t.P + i) * 2; row.push([t.o[0] + q[n] * t.s[0], y, t.o[1] + q[n + 1] * t.s[1]]); }
      this.rows.push(row);
    }
    const P = this.P, bot = (K + 1) * P, topc = bot + P + 1, idx: number[] = [];
    this.pos = new Float32Array(((K + 1) * P + 2 * (P + 1)) * 3);
    for (let k = 0; k < K; k++) for (let i = 0; i < P; i++) {
      const a = k * P + i, b = k * P + (i + 1) % P, c = (k + 1) * P + (i + 1) % P, e = (k + 1) * P + i;
      idx.push(a, b, c, a, c, e);
    }
    for (let i = 0; i < P; i++) { idx.push(bot + P, bot + (i + 1) % P, bot + i); idx.push(topc + P, topc + i, topc + (i + 1) % P); }
    this.attr = new THREE.BufferAttribute(this.pos, 3); this.attr.setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute('position', this.attr);
    this.set(this.top);
    let v = 0; const p = this.pos; // make the surfaces face outward
    for (let n = 0; n < idx.length; n += 3) {
      const a = idx[n] * 3, b = idx[n + 1] * 3, c = idx[n + 2] * 3;
      v += p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) - p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) + p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c]);
    }
    if (v < 0) for (let n = 0; n < idx.length; n += 3) { const s = idx[n + 1]; idx[n + 1] = idx[n + 2]; idx[n + 2] = s; }
    this.geo.setIndex(idx); this.T = -1; this.set(this.top);
  }
  /** Fill level 0..1. */
  setFill(f: number) { this.set(this.y0 + (this.top - this.y0) * Math.min(1, Math.max(0, f))); }
  private set(T: number) {
    if (Math.abs(T - this.T) < 0.01) return;
    this.T = T;
    const P = this.P, pos = this.pos, bot = (K + 1) * P, topc = bot + P + 1;
    for (let k = 0; k <= K; k++) {
      const y = this.y0 + (T - this.y0) * k / K, f = Math.min(this.J, Math.max(0, (y - this.y0) / (this.top - this.y0) * this.J));
      const j = Math.min(this.J - 1, Math.floor(f)), u = f - j, A = this.rows[j], B = this.rows[j + 1];
      for (let i = 0; i < P; i++) { const v = (k * P + i) * 3; pos[v] = A[i][0] + (B[i][0] - A[i][0]) * u; pos[v + 1] = y; pos[v + 2] = A[i][2] + (B[i][2] - A[i][2]) * u; }
    }
    for (const [from, to] of [[0, bot], [K * P, topc]]) {
      let cx = 0, cy = 0, cz = 0;
      for (let i = 0; i < P; i++) { const s = (from + i) * 3, d = (to + i) * 3; pos[d] = pos[s]; pos[d + 1] = pos[s + 1]; pos[d + 2] = pos[s + 2]; cx += pos[s]; cy += pos[s + 1]; cz += pos[s + 2]; }
      const c = (to + P) * 3; pos[c] = cx / P; pos[c + 1] = cy / P; pos[c + 2] = cz / P;
    }
    this.attr.needsUpdate = true;
    if (this.geo.index) this.geo.computeVertexNormals();
    this.geo.computeBoundingSphere();
  }
  dispose() { this.geo.dispose(); }
}

export type StageOptions = { bg: string; design?: Design; straws?: boolean; spin?: number; drag?: boolean; tilt?: number; pair?: Pair; /** Space kept above the lid, in mm (default: room for straws if shown). */ room?: number };
type State = { lift: number; fill: number; rotY: number; tilt: number; spin: number; straw: number };

const REDUCE = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const STAGES = new Set<Stage>();
let last = 0, loopOn = false;
function loop(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  STAGES.forEach(s => s.tick(dt));
  if (STAGES.size) requestAnimationFrame(loop); else loopOn = false;
}

export class Stage {
  /** Targets the stage eases toward each frame. */
  t: State;
  private s: State;
  private el: HTMLElement; private renderer: THREE.WebGLRenderer; private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(26, 1, 1, 4000); private root = new THREE.Group(); private lidG = new THREE.Group();
  private straws = new THREE.Group(); private cup = new THREE.Mesh(); private lid = new THREE.Mesh();
  private drinkA = new THREE.Mesh(); private drinkB = new THREE.Mesh();
  private mat: Record<'cup' | 'lid' | 'A' | 'B', THREE.Material & { color: THREE.Color }>;
  private liq?: { A: Liquid; B: Liquid }; private seat = 0; private strawY = 0; private design?: Design;
  private visible = true; private dragging = false; private vel = 0; private lx = 0; private disposed = false;
  private ro: ResizeObserver; private io: IntersectionObserver;
  private drag: boolean; private room: number; private w = 1; private h = 1;
  /** Height of the closed lid's top for the current design (mm); the heart lid is taller than the others. */
  private capTop = 146;

  constructor(el: HTMLElement, o: StageOptions) {
    this.el = el; this.drag = o.drag ?? true; this.room = o.room ?? (o.straws ? 75 : 0);
    // Cap sharpness: phones get 1.5×, larger screens 1.75× (full 2–3× costs a lot of GPU time for little gain).
    // On sharp screens the extra pixels already smooth the edges, so the costly antialiasing pass is skipped.
    const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.5 : 1.75);
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: dpr < 1.5, powerPreference: 'high-performance' });
    // Checking shaders for errors makes the page wait for the graphics driver; only do it while developing.
    r.debug.checkShaderErrors = process.env.NODE_ENV !== 'production';
    r.setPixelRatio(dpr);
    r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping;
    el.prepend(r.domElement);
    this.scene.background = new THREE.Color(o.bg);
    const pm = new THREE.PMREMGenerator(r); this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose();
    const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(120, 260, 200); this.scene.add(key);
    // Clear PP as see-through layers drawn after the drinks and straws.
    const clear = (opacity: number) => new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.14, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.12, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.3 });
    const pair = o.pair ?? PAIRS[0];
    this.mat = { cup: clear(0.26), lid: clear(0.38), A: new THREE.MeshStandardMaterial({ color: pair.a, roughness: 0.22 }), B: new THREE.MeshStandardMaterial({ color: pair.b, roughness: 0.22 }) };
    this.cup.material = this.mat.cup; this.lid.material = this.mat.lid; this.drinkA.material = this.mat.A; this.drinkB.material = this.mat.B;
    this.cup.renderOrder = 2; this.lid.renderOrder = 3;
    this.lidG.add(this.lid, this.straws); this.root.add(this.cup, this.drinkA, this.drinkB, this.lidG); this.scene.add(this.root);
    this.straws.visible = !!o.straws; this.root.visible = false;
    // soft floor shadow
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d')!, gr = x.createRadialGradient(128, 128, 8, 128, 128, 128);
    gr.addColorStop(0, 'rgba(40,30,20,0.32)'); gr.addColorStop(1, 'rgba(40,30,20,0)'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.3; this.scene.add(shadow);

    const init: State = { lift: 0, fill: 1, rotY: -0.5, tilt: o.tilt ?? 0.18, spin: o.spin ?? 0.2, straw: 0 };
    this.s = { ...init }; this.t = { ...init };
    if (this.drag) this.bindDrag();
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(el); this.resize();
    this.io = new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; }, { rootMargin: '120px' }); this.io.observe(el);
    if (o.design) this.setDesign(o.design);
    STAGES.add(this);
    if (!loopOn) { loopOn = true; last = performance.now(); requestAnimationFrame(loop); }
  }

  setDesign(design: Design) {
    this.design = design;
    loadData().then(all => {
      if (this.disposed || this.design !== design) return;
      const d = all[design], m = d.m;
      this.cup.geometry = meshGeo(design + ':cup', d.cup); this.lid.geometry = meshGeo(design + ':lid', d.lid);
      this.liq?.A.dispose(); this.liq?.B.dispose();
      this.liq = { A: new Liquid(d.A, m), B: new Liquid(d.B, m) };
      this.drinkA.geometry = this.liq.A.geo; this.drinkB.geometry = this.liq.B.geo;
      this.seat = m.seat; this.strawY = m.straw - m.seat;
      const lb = this.lid.geometry.boundingBox ?? (this.lid.geometry.computeBoundingBox(), this.lid.geometry.boundingBox!);
      this.capTop = m.seat + lb.max.y;
      if (!this.straws.children.length) {
        const sg = new THREE.CylinderGeometry(5.6, 5.6, m.strawLen, 32, 1, true);
        for (const [xx, col] of [[-m.strawX, '#E5582A'], [m.strawX, '#2C5B3B']] as const) {
          const st = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ color: col, roughness: 0.45, side: THREE.DoubleSide }));
          st.position.x = xx; st.rotation.z = xx < 0 ? 0.05 : -0.05; this.straws.add(st);
        }
      }
      this.root.visible = true; this.el.dataset.ready = 'true';
    }).catch(() => { this.el.dataset.ready = 'error'; });
  }
  setPair(p: Pair) { this.mat.A.color.set(p.a); this.mat.B.color.set(p.b); }
  showStraws(on: boolean) { this.straws.visible = on; }

  private bindDrag() {
    const cv = this.renderer.domElement;
    cv.addEventListener('pointerdown', e => { this.dragging = true; this.lx = e.clientX; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => { if (!this.dragging) return; const dx = e.clientX - this.lx; this.lx = e.clientX; this.t.rotY += dx * 0.012; this.vel = dx * 0.012; });
    const up = () => { this.dragging = false; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  }
  // Frame everything: from the floor to the top of the (possibly lifted) lid, plus room for straws.
  // As the lid lifts the camera eases back, so the cup is never cut off.
  private fit() {
    // Uses the size saved by resize(): reading the element's size here, every frame, would force a page layout.
    const aspect = this.w / this.h, vf = this.camera.fov * Math.PI / 180;
    const top = this.capTop + Math.max(0, this.s.lift) + this.room, bottom = -6, cy = (top + bottom) / 2;
    const d = Math.max(((top - bottom) / 2) / Math.tan(vf / 2), (150 / 2) / (Math.tan(vf / 2) * aspect)) * 1.12;
    this.camera.position.set(0, cy + d * Math.sin(this.s.tilt), d * Math.cos(this.s.tilt)); this.camera.lookAt(0, cy, 0);
  }
  private resize() {
    const w = this.el.clientWidth, h = this.el.clientHeight; if (!w || !h) return;
    this.w = w; this.h = h;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.fit();
  }
  tick(dt: number) {
    if (!this.visible || !this.liq) return;
    const k = REDUCE ? 1 : 1 - Math.pow(0.001, dt);
    if (!this.dragging && !REDUCE) { this.t.rotY += this.t.spin * dt + this.vel; this.vel *= 0.92; }
    for (const p of ['lift', 'fill', 'rotY', 'tilt', 'straw'] as const) this.s[p] += (this.t[p] - this.s[p]) * k;
    this.root.rotation.y = this.s.rotY;
    this.lidG.position.y = this.seat + this.s.lift;
    this.straws.children.forEach(st => { st.position.y = this.strawY + this.s.straw; });
    const show = this.s.fill > 0.01;
    this.drinkA.visible = this.drinkB.visible = show;
    if (show) { this.liq.A.setFill(this.s.fill); this.liq.B.setFill(this.s.fill); }
    this.fit(); this.renderer.render(this.scene, this.camera);
  }
  dispose() {
    this.disposed = true; STAGES.delete(this); this.ro.disconnect(); this.io.disconnect();
    this.liq?.A.dispose(); this.liq?.B.dispose(); this.renderer.dispose(); this.renderer.domElement.remove();
  }
}

