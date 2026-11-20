import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/server/admin-auth';
import { getProducts, isBuiltIn } from '@/lib/server/settings';
import { deleteProduct, updateProduct } from '../../../actions';
import { ActionForm } from '../../../ui';
import ProductFields from '../ProductFields';

export const metadata = { title: 'Edit product' };

export default async function EditProduct({ params }: { params: Promise<{ slug: string }> }) {
  await requireUser('owner');
  const { slug } = await params;
  const p = (await getProducts(true)).find(x => x.slug === slug);
  if (!p) notFound();
  const builtIn = isBuiltIn(p.slug);
  return (
    <>
      <div className="a-head">
        <div><div className="label"><Link href="/admin/products">Products</Link> · {builtIn ? 'Built-in' : 'Added by you'}</div><h1>{p.name}</h1></div>
        {p.active && <Link className="btn small" href={`/shop/${p.slug}`} target="_blank">View in shop ↗</Link>}
      </div>
      <section className="panel">
        <ActionForm action={updateProduct} submit="Save changes">
          <ProductFields p={p} builtIn={builtIn} />
        </ActionForm>
      </section>
      {builtIn ? (
        <p className="muted small">Built-in products can&apos;t be deleted. Untick “Show in the shop” to hide it.</p>
      ) : (
        <section className="panel">
          <h2>Delete this product</h2>
          <p className="muted small">It disappears from the shop and from cafés&apos; carts. Orders already placed keep it.</p>
          <ActionForm action={deleteProduct} submit="Delete product" danger>
            <input type="hidden" name="slug" value={p.slug} />
            <label htmlFor="confirm">Type DELETE to confirm<input id="confirm" name="confirm" autoComplete="off" required pattern="DELETE" /></label>
          </ActionForm>
        </section>
      )}
    </>
  );
}
