import Link from 'next/link';
import CupViewer from '@/components/CupViewer';
import ProductCard from '@/components/ProductCard';
import RangeSection from '@/components/home/RangeSection';
import HowStory from '@/components/home/HowStory';
import BrandBand from '@/components/home/BrandBand';
import { TIERS } from '@/lib/catalog';
import { getProducts } from '@/lib/server/settings';

export default async function Home() {
  const cups = (await getProducts()).filter(p => p.category === 'cup');
  const tiers = TIERS.filter(t => t.discount).map(t => `−${Math.round(t.discount * 100)}% from ${t.min} cartons`).join(' · ');
  return (
    <>
      <section className="hero">
        <div className="inner">
          <div>
            <div className="label eyebrow">Twin cups · Est. 2026</div>
            <h1><span className="a">Two drinks.</span><span className="b">One cup.</span></h1>
            <p className="lead">Duvo is a clear cup split down the middle. Each side holds 250 ml, and the lid seals both sides on their own, so matcha stays matcha and Thai tea stays Thai tea.</p>
            <div className="btns">
              <Link className="btn solid" href="#order">Order for your café</Link>
              <Link className="btn" href="#how">How it works</Link>
            </div>
          </div>
          <div className="stagebox">
            <CupViewer design="split" bg="#EFE6DA" straws priority spin={0.25} tilt={0.16} label="3D model of the Duvo split cup with two drinks. Drag to turn it." />
          </div>
        </div>
        <div className="facts">
          <div className="inner">
            <div><div><b>250 + 250 ml</b><span>Two drinks at the fill line</span></div></div>
            <div><div><b>PP 5</b><span>Clear, food-grade polypropylene</span></div></div>
            <div><div><b>−20 to 120 °C</b><span>Iced or hot</span></div></div>
            <div><div><b>Sealed each side</b><span>The lid grips the divider</span></div></div>
          </div>
        </div>
      </section>

      <RangeSection />
      <HowStory />

      <section className="band paper" id="order">
        <div className="inner">
          <div className="sec-head">
            <div><div className="label">For cafés</div><h2>Order by<br />the carton</h2></div>
            <p>Cartons of 500 cups. Prices exclude 14% VAT, {tiers}. We confirm every order and send an invoice before delivery.</p>
          </div>
          <div className="grid3">{cups.map(p => <ProductCard key={p.slug} p={p} />)}</div>
          <div className="btns" style={{ marginTop: 28 }}>
            <Link className="btn solid" href="/shop">Go to the shop</Link>
            <Link className="btn" href="/shop#sleeves">Printed sleeves</Link>
          </div>
        </div>
      </section>

      <BrandBand />
    </>
  );
}
