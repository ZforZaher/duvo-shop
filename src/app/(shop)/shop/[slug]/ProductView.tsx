'use client';
import { useState } from 'react';
import Link from 'next/link';
import CupViewer from '@/components/CupViewer';
import { PAIRS } from '@/lib/three/near';
import ProductPic from '@/components/ProductPic';
import { useCart } from '@/components/cart/CartProvider';
import { MAX_CARTONS_PER_LINE, type Product } from '@/lib/catalog';
import { clampCartons, count, discountFor } from '@/lib/pricing';


export function ProductStage({ p }: { p: Product }) {
  const [pair, setPair] = useState(PAIRS[0]);
  const [lidOff, setLidOff] = useState(false);
  if (p.category === 'sleeve') {
    return <div className="stagebox" style={{ display: 'grid', placeItems: 'center' }}><ProductPic p={p} /></div>;
  }
  return (
    <div>
      <div className="stagebox">
        <CupViewer design={p.design} bg="#F7F2EA" pair={pair} lidLift={lidOff ? 55 : 0} spin={0.15} tilt={0.22} label={`3D model of the ${p.name}. Drag to turn it.`} />
      </div>
      <div className="chips">
        <button className="chip" aria-pressed={!lidOff} onClick={() => setLidOff(v => !v)}>{lidOff ? 'Lid off' : 'Lid on'}</button>
        {PAIRS.map(x => (
          <button key={x.name} className="chip" aria-pressed={x.name === pair.name} onClick={() => setPair(x)}>
            <i style={{ background: x.a }} /><i style={{ background: x.b }} />{x.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function BuyBox({ p }: { p: Product }) {
  const { add } = useCart();
  const [cartons, setCartons] = useState(1);
  const [added, setAdded] = useState('');
  const d = discountFor(cartons);
  const submit = () => {
    add(p.slug, cartons);
    setAdded(`Added ${cartons} carton${cartons > 1 ? 's' : ''}.`);
  };
  return (
    <div className="buybox" style={{ marginTop: 22 }}>
      <label className="label" htmlFor="qty">Cartons</label>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="qty">
          <button type="button" aria-label="One carton fewer" onClick={() => setCartons(c => clampCartons(c - 1))}>−</button>
          <input id="qty" inputMode="numeric" value={cartons} onChange={e => setCartons(clampCartons(e.target.value))} aria-describedby="qty-note" />
          <button type="button" aria-label="One carton more" onClick={() => setCartons(c => clampCartons(c + 1))}>+</button>
        </div>
        <span id="qty-note" className="muted small num">{count(cartons * p.perCarton)} pieces{d ? ` · −${Math.round(d * 100)}% carton discount` : ''}</span>
      </div>
      <div className="btns">
        <button className="btn solid" type="button" onClick={submit}>Add to cart</button>
        {added && <Link className="btn" href="/cart">View cart</Link>}
      </div>
      <p className="added small" role="status" aria-live="polite" style={{ margin: 0 }}>{added}</p>
      <p className="muted small" style={{ margin: 0 }}>Up to {MAX_CARTONS_PER_LINE} cartons per line. Need more? Add a note at checkout.</p>
    </div>
  );
}
