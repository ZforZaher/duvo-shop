'use client';
// Interactive 3D cup (a thin React wrapper around the shared Stage engine).
// The 3D engine only starts when the view is near the screen and the visitor starts using the page (see near.ts).
// Until then a still picture of the same cup is shown (rendered from the 3D models by scripts/posters.mjs),
// with the Duvo loading logo underneath while that picture loads.
import { useEffect, useId, useRef, useState } from 'react';
import { startStage, type Pair } from '@/lib/three/near';
import type { Stage } from '@/lib/three/stage';
import type { Design } from '@/lib/catalog';
import LogoLoader from './LogoLoader';

export type { Pair };

/** The still picture for a cup on a background, e.g. /posters/split-efe6da-s.webp. */
export const posterFor = (design: Design, bg: string, straws = false) => `/posters/${design}-${bg.replace('#', '').toLowerCase()}${straws ? '-s' : ''}.webp`;

export default function CupViewer({ design, bg, pair, lidLift = 0, straws = false, spin = 0.2, tilt = 0.18, drag = true, label, hint = true, priority = false }: {
  design: Design; bg: string; pair?: Pair; lidLift?: number; straws?: boolean; spin?: number; tilt?: number; drag?: boolean; label: string; hint?: boolean;
  /** Above the fold: load the still picture first, not lazily. */ priority?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);
  const latest = useRef({ design, pair, lidLift });
  latest.current = { design, pair, lidLift };
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  // The animated loading logo only shows if the still picture can't be loaded (an animation hidden under the
  // picture would still cost the phone work on every frame).
  const [noPoster, setNoPoster] = useState(false);
  const src = posterFor(design, bg, straws);
  useEffect(() => setNoPoster(false), [src]);

  useEffect(() => {
    const stop = startStage(host.current!,
      () => { const l = latest.current; return { bg, design: l.design, straws, spin, tilt, drag, pair: l.pair }; },
      s => {
        const l = latest.current; // props may have changed while the 3D engine was loading
        s.t.lift = l.lidLift; if (l.pair) s.setPair(l.pair);
        stage.current = s;
      });
    return () => { stop(); stage.current = null; };
  }, [bg, straws, spin, tilt, drag]);

  useEffect(() => { stage.current?.setDesign(design); }, [design]);
  useEffect(() => { if (pair) stage.current?.setPair(pair); }, [pair]);
  useEffect(() => { if (stage.current) stage.current.t.lift = lidLift; }, [lidLift]);

  return (
    <div ref={host} className="stage" role="img" aria-label={label} style={{ cursor: drag ? 'grab' : 'default' }}>
      {noPoster
        ? <div className="stage-loading"><LogoLoader size={64} label="Loading the 3D cup" uid={`ll${uid}`} /></div>
        : (/* eslint-disable-next-line @next/next/no-img-element -- a plain still that the 3D view replaces */
          <img className="stage-poster" src={src} alt="" width={800} height={800} decoding="async" onError={() => setNoPoster(true)}
            loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} draggable={false} />)}
      {drag && hint && <div className="stage-hint label">Drag to turn</div>}
    </div>
  );
}
