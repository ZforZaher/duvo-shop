// Small helpers for the 3D views that do NOT pull in three.js, so pages load and become usable first.
// The 3D engine (stage.ts + three.js) is downloaded only when a cup view is about to be seen, and each view
// is started in a quiet moment, one at a time, so starting them never freezes scrolling or taps.
import type { Stage, StageOptions } from './stage';

export type Pair = { a: string; b: string };

export const PAIRS: (Pair & { name: string })[] = [
  { name: 'Thai tea + Matcha', a: '#E0782F', b: '#8DB255' },
  { name: 'Iced coffee + Matcha', a: '#6B4127', b: '#8DB255' },
  { name: 'Orange + Mint', a: '#F29A1F', b: '#A9D29A' },
  { name: 'Strawberry + Milk', a: '#E26468', b: '#F3EBDD' },
];

type StageModule = typeof import('./stage');
let engine: Promise<StageModule> | null = null;
const loadEngine = () => (engine ??= import('./stage'));

const idle = (fn: () => void) =>
  typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(fn, { timeout: 1200 }) : setTimeout(fn, 60); // Safari has no requestIdleCallback

// One stage is created per quiet moment, so several cup views on one page don't all start in the same instant.
const queue: (() => void)[] = [];
let busy = false;
function pump() {
  if (busy) return;
  const job = queue.shift(); if (!job) return;
  busy = true;
  idle(() => { try { job(); } finally { busy = false; pump(); } });
}

// The 3D engine wakes on the visitor's first touch, scroll, mouse move or key press, or once the page has
// been loaded and quiet for a few seconds. Until then each view shows a still picture of the cup, so the page
// is usable straight away and setting up WebGL (the slow part on phones) never delays the first taps.
const WAKE_EVENTS = ['pointerdown', 'pointermove', 'touchstart', 'keydown', 'wheel', 'scroll'] as const;
const QUIET_MS = 5000;
let awake: Promise<void> | null = null;
function wake(): Promise<void> {
  return (awake ??= new Promise<void>(resolve => {
    let done = false;
    const go = () => {
      if (done) return; done = true;
      WAKE_EVENTS.forEach(t => window.removeEventListener(t, go));
      resolve();
    };
    WAKE_EVENTS.forEach(t => window.addEventListener(t, go, { passive: true, once: true }));
    const later = () => setTimeout(() => idle(go), QUIET_MS);
    if (document.readyState === 'complete') later(); else window.addEventListener('load', later, { once: true });
  }));
}

/**
 * Creates a Stage in `el` once it comes within 300px of the screen and the 3D engine is awake (see above).
 * Returns a cleanup function that cancels the wait or disposes the stage.
 */
export function startStage(el: HTMLElement, opts: () => StageOptions, ready: (s: Stage) => void): () => void {
  let stage: Stage | null = null, cancelled = false;
  const go = () => wake().then(loadEngine).then(m => new Promise<void>(res => {
    queue.push(() => { if (!cancelled) { stage = new m.Stage(el, opts()); ready(stage); } res(); });
    pump();
  })).catch(() => { el.dataset.ready = 'error'; });
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect(); go();
  }, { rootMargin: '300px' });
  io.observe(el);
  return () => { cancelled = true; io.disconnect(); stage?.dispose(); };
}
