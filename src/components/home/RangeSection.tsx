'use client';
import { useState } from 'react';
import Link from 'next/link';
import CupViewer from '@/components/CupViewer';
import { PAIRS } from '@/lib/three/near';
import type { Design } from '@/lib/catalog';
import { useCatalog } from '@/components/cart/CatalogProvider';
import { cartonPrice, money } from '@/lib/pricing';

const CUPS: { design: Design; slug: string; tab: string; name: string; desc: string }[] = [
  { design: 'split', slug: 'split-cup', tab: 'Split', name: 'Split cup', desc: 'Two legs that meet just under the rim. The gap down the middle shows both drinks side by side.' },
  { design: 'heart', slug: 'heart-cup', tab: 'Heart', name: 'Heart cup', desc: 'Each leg is half a heart. Made for sharing, with its own heart-shaped twin-pod lid.' },
  { design: 'round', slug: 'round-cup', tab: 'Round', name: 'Round cup', desc: 'A classic round cup with a twisted wall inside, so the two drinks wrap around each other.' },
];

const COUNT = ['No shapes', 'One shape', 'Two shapes', 'Three shapes'];

export default function RangeSection() {
  const { bySlug } = useCatalog();
  // Only the cups switched on in Admin › Products ("Show in shop") appear here.
  const cups = CUPS.filter(c => bySlug(c.slug));
  const [i, setI] = useState(0);
  const [pair, setPair] = useState(PAIRS[0]);
  const [lidOn, setLidOn] = useState(true);
  if (!cups.length) return null;
  const cur = cups[Math.min(i, cups.length - 1)], p = bySlug(cur.slug);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const n = (i + (e.key === 'ArrowRight' ? 1 : cups.length - 1)) % cups.length;
    setI(n); document.getElementById(`tab-${cups[n].design}`)?.focus();
  };
  return (
    <section className="band paper" id="cups">
      <div className="inner">
        <div className="sec-head">
          <div><div className="label">The range</div><h2>{cups.length > 1 ? <>{COUNT[cups.length] ?? `${cups.length} shapes`}.<br />Same split.</> : <>One cup.<br />Two drinks.</>}</h2></div>
          {cups.length > 1 && <div className="tabs" role="tablist" aria-label="Cup shape" onKeyDown={onKey}>
            {cups.map((c, n) => (
              <button key={c.design} id={`tab-${c.design}`} role="tab" aria-selected={n === i} aria-controls="cup-panel" tabIndex={n === i ? 0 : -1} onClick={() => setI(n)}>{c.tab}</button>
            ))}
          </div>}
        </div>
        <div className="range-grid">
          <div className="range-stage">
            <CupViewer design={cur.design} bg="#F7F2EA" pair={pair} lidLift={lidOn ? 0 : 70} spin={0.12} tilt={0.2} label={`3D model of the ${cur.name}. Drag to turn it.`} />
          </div>
          <div className="range-card" {...(cups.length > 1 ? { role: 'tabpanel', 'aria-labelledby': `tab-${cur.design}` } : {})} id="cup-panel">
            <h3>{cur.name}</h3>
            <p className="desc">{cur.desc}</p>
            <div className="chips">
              <button className="chip lidchip" aria-pressed={lidOn} onClick={() => setLidOn(v => !v)}>{lidOn ? 'Lid on' : 'Lid off'}</button>
            </div>
            <div className="chips" role="group" aria-label="Drinks">
              {PAIRS.map(x => (
                <button key={x.name} className="chip" aria-pressed={x.name === pair.name} onClick={() => setPair(x)}>
                  <i style={{ background: x.a }} /><i style={{ background: x.b }} />{x.name}
                </button>
              ))}
            </div>
            <ul className="perks">
              <li>Two drinks, 250 ml each</li>
              <li>Clear, food-grade PP 5</li>
              <li>Lid seals each side on its own</li>
            </ul>
            {p && (
              <div className="btns" style={{ marginTop: 22 }}>
                <Link className="btn solid" href={`/shop/${p.slug}`}>Order the {cur.name.toLowerCase()}</Link>
                <span className="muted small num" style={{ alignSelf: 'center' }}>{money(cartonPrice(p))} / carton of {p.perCarton}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
