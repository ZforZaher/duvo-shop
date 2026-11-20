import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DEFAULT_PRODUCTS, TIERS } from '@/lib/catalog';
import { getProducts } from '@/lib/server/settings';
import { cartonPrice, money, count } from '@/lib/pricing';
import { BuyBox, ProductStage } from './ProductView';

const find = async (slug: string) => (await getProducts()).find(p => p.slug === slug);

// The built-in products are pre-built; products added in the admin panel are built on first visit.
export function generateStaticParams() {
  return DEFAULT_PRODUCTS.map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await find((await params).slug);
  return p ? { title: p.name, description: p.description } : {};
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await find((await params).slug);
  if (!p) notFound(); // unknown or hidden in the admin panel
  return (
    <div className="inner pgrid">
      <ProductStage p={p} />
      <div>
        <div className="crumbs label"><Link href="/shop">Shop</Link> · {p.category}</div>
        <h1 className="ptitle">{p.name}</h1>
        <p className="pdesc">{p.description}</p>
        <div className="bigprice"><b>{money(cartonPrice(p))}</b><span className="muted">per carton of {count(p.perCarton)}</span></div>
        <div className="muted small num">{money(p.unitPrice)} each · excl. VAT</div>
        <BuyBox p={p} />
        <table className="t tiers" aria-label="Carton discounts">
          <thead><tr><th>Cartons</th><th>Discount</th><th className="r">Per carton</th></tr></thead>
          <tbody>
            {TIERS.map((t, i) => {
              const next = TIERS[i + 1];
              return (
                <tr key={t.min}>
                  <td className="num">{next ? `${t.min}–${next.min - 1}` : `${t.min}+`}</td>
                  <td className="num">{t.discount ? `−${Math.round(t.discount * 100)}%` : '—'}</td>
                  <td className="num r">{money(cartonPrice(p) * (1 - t.discount))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <ul className="facts-list">
          {p.facts.map(f => <li key={f}>{f}</li>)}
        </ul>
      </div>
    </div>
  );
}
