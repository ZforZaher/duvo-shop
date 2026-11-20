import type { Metadata } from 'next';
import ProductCard from '@/components/ProductCard';
import { CATEGORY_LABEL, type Category } from '@/lib/catalog';
import { getProducts } from '@/lib/server/settings';

export const metadata: Metadata = { title: 'Shop', description: 'Order Duvo twin cups and printed sleeves by the carton.' };

export default async function Shop() {
  const products = await getProducts();
  const cats: Category[] = ['cup', 'sleeve'];
  return (
    <section className="band paper" style={{ borderTop: 0 }}>
      <div className="inner">
        <div className="sec-head">
          <div><div className="label">Shop · for cafés</div><h1>Order by<br />the carton</h1></div>
          <p>Prices per carton, excluding 14% VAT. Discounts from 5 cartons per product. We confirm every order and send an invoice before delivery.</p>
        </div>
        {cats.map(c => (
          <div key={c}>
            <h2 className="cat-title" id={c === "sleeve" ? "sleeves" : "cups"}>{CATEGORY_LABEL[c]}</h2>
            <div className="grid3">{products.filter(p => p.category === c).map(p => <ProductCard key={p.slug} p={p} />)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
