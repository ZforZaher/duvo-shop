import Link from 'next/link';
import type { Product } from '@/lib/catalog';
import { cartonPrice, money, count } from '@/lib/pricing';
import CupViewer from './CupViewer';
import ProductPic from './ProductPic';

export default function ProductCard({ p }: { p: Product }) {
  // No automatic prefetch: a grid of products would download every product page while the shop is still loading.
  return (
    <Link prefetch={false} className="card" href={`/shop/${p.slug}`}>
      <div className="pic">
        {p.category === 'cup'
          ? <CupViewer design={p.design} bg="#EFE6DA" spin={0.35} tilt={0.2} drag={false} hint={false} label={`3D model of the ${p.name}`} />
          : <ProductPic p={p} />}
      </div>
      <div className="body">
        <h3>{p.name}</h3>
        <p className="short">{p.short}</p>
        <div className="price">
          <span className="muted small">Carton of {count(p.perCarton)}</span>
          <b>{money(cartonPrice(p))}</b>
        </div>
        <span className="muted small num">{money(p.unitPrice)} each · excl. VAT</span>
      </div>
    </Link>
  );
}
