import Link from 'next/link';
import { requireUser } from '@/lib/server/admin-auth';
import { getProducts, getSettings, isBuiltIn } from '@/lib/server/settings';
import { cartonPrice, money } from '@/lib/pricing';
import { saveProducts } from '../../actions';
import { ActionForm } from '../../ui';

export const metadata = { title: 'Products' };

export default async function Products({ searchParams }: { searchParams: Promise<{ added?: string }> }) {
  await requireUser('owner');
  const [products, s, { added }] = await Promise.all([getProducts(true), getSettings(), searchParams]);
  const addedName = products.find(p => p.slug === added)?.name;
  return (
    <>
      <div className="a-head">
        <div><div className="label">Owner only</div><h1>Products</h1></div>
        <Link className="btn small solid" href="/admin/products/new">+ Add a product</Link>
      </div>
      {addedName && <p className="okmsg" role="status">“{addedName}” was added to the shop.</p>}
      <p className="muted small" style={{ marginTop: -8 }}>Prices per piece in EGP, excluding VAT. Changes show in the shop as soon as you save. Orders already placed keep the price they were placed at.</p>
      <section className="panel">
        <ActionForm action={saveProducts} submit="Save prices">
          <div className="tablewrap"><table className="t">
            <thead><tr><th>Product</th><th>Price per piece</th><th>Pieces per carton</th><th className="r">Carton now</th><th>In shop</th></tr></thead>
            <tbody>{products.map(p => (
              <tr key={p.slug}>
                <td><Link href={`/admin/products/${p.slug}`}><b>{p.name}</b></Link>
                  <div className="muted small">{p.category}{isBuiltIn(p.slug) ? '' : ' · added by you'} · <Link href={`/admin/products/${p.slug}`}>Edit</Link></div></td>
                <td><input className="cellin" name={`price:${p.slug}`} defaultValue={p.unitPrice.toFixed(2)} inputMode="decimal" aria-label={`${p.name} price per piece`} required /></td>
                <td><input className="cellin" name={`carton:${p.slug}`} defaultValue={p.perCarton} inputMode="numeric" aria-label={`${p.name} pieces per carton`} required /></td>
                <td className="r num">{money(cartonPrice(p))}</td>
                <td><label className="check"><input type="checkbox" name={`active:${p.slug}`} defaultChecked={p.active} /><span>Show</span></label></td>
              </tr>
            ))}</tbody>
          </table></div>
          <label className="check"><input type="checkbox" name="examplePrices" defaultChecked={s.examplePrices} />
            <span>Show the “Example prices · not final” notice across the shop. Untick when your prices are final.</span></label>
        </ActionForm>
      </section>
    </>
  );
}
