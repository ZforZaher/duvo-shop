'use client';
// "Pour. Press. Sip." — scrolling through the steps drives the cup: the drinks fill, the lid comes down,
// then the straws drop in and the view tilts to look from above.
import { useEffect, useRef, useState } from 'react';
import { startStage } from '@/lib/three/near';
import type { Stage } from '@/lib/three/stage';
import LogoLoader from '@/components/LogoLoader';

const STEPS = [
  { n: '01', t: 'Pour', d: "Fill each side up to the line. That's 250 ml a side, two drinks in one cup." },
  { n: '02', t: 'Press', d: 'Line the lid up with the divider and press down until it snaps on. It locks onto the divider, so each side is sealed on its own.' },
  { n: '03', t: 'Sip', d: 'Two straw holes, one over each drink, wide enough for boba straws. Sip one, then the other, or both at once.' },
];

export default function HowStory() {
  const pin = useRef<HTMLDivElement>(null), steps = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [noPoster, setNoPoster] = useState(false); // loading logo only if the still picture fails

  useEffect(() => {
    let stage: Stage | null = null;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const apply = () => {
      const el = steps.current; if (!el || !stage) return;
      const r = el.getBoundingClientRect(), vh = window.innerHeight;
      const p = reduce ? 1 : Math.min(1, Math.max(0, (vh * 0.5 - r.top) / Math.max(1, r.height - vh * 0.4)));
      // 0–0.33 pour · 0.33–0.66 press · 0.66–1 sip
      const fill = Math.min(1, p / 0.3), press = Math.min(1, Math.max(0, (p - 0.36) / 0.26)), sip = Math.min(1, Math.max(0, (p - 0.68) / 0.24));
      stage.t.fill = Math.max(0.02, fill);
      stage.t.lift = 80 * (1 - press);
      stage.showStraws(sip > 0.05);
      stage.t.straw = 90 * (1 - sip);
      stage.t.tilt = 0.12 + 0.5 * sip;
      stage.t.rotY = -0.6 + 1.2 * p;
      setActive(p < 0.34 ? 0 : p < 0.67 ? 1 : 2);
    };
    // Start the 3D cup only when the section comes near the screen.
    const stop = startStage(pin.current!,
      () => ({ bg: '#2C5B3B', design: 'split', straws: false, room: 75, drag: false, spin: 0, tilt: 0.12 }),
      s => { stage = s; apply(); });
    window.addEventListener('scroll', apply, { passive: true });
    window.addEventListener('resize', apply);
    return () => { stop(); window.removeEventListener('scroll', apply); window.removeEventListener('resize', apply); };
  }, []);

  return (
    <section className="band green how" id="how">
      <div className="inner">
        <div className="sec-head">
          <div><div className="label">How it works</div><h2>Pour. Press. Sip.</h2></div>
          <p>The divider runs up to the rim, and the lid locks onto it. Nothing crosses from one side to the other.</p>
        </div>
        <div className="story">
          <div className="pin"><div ref={pin} className="stage" role="img" aria-label="3D cup: the drinks fill, the lid comes down, and the straws go in as you scroll">{noPoster
            ? <div className="stage-loading"><LogoLoader size={72} dark label="Loading the 3D cup" uid="howll" /></div>
            : /* eslint-disable-next-line @next/next/no-img-element */ <img className="stage-poster" src="/posters/how.webp" alt="" width={800} height={800} loading="lazy" decoding="async" draggable={false} onError={() => setNoPoster(true)} />}</div></div>
          <div className="steps" ref={steps}>
            {STEPS.map((s, i) => (
              <article key={s.n} className={`step${i === active ? ' on' : ''}`}>
                <div className="n">{s.n}</div>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
