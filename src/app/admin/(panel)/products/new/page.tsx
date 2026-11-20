import Link from 'next/link';
import { requireUser } from '@/lib/server/admin-auth';
import { addProduct } from '../../../actions';
import { ActionForm } from '../../../ui';
import ProductFields from '../ProductFields';

export const metadata = { title: 'Add a product' };

export default async function NewProduct() {
  await requireUser('owner');
  return (
    <>
      <div className="a-head"><div><div className="label"><Link href="/admin/products">Products</Link> · Owner only</div><h1>Add a product</h1></div></div>
      <p className="muted small" style={{ marginTop: -8 }}>New cups show the 3D model of the shape you pick; new sleeves show its sleeve picture.</p>
      <section className="panel">
        <ActionForm action={addProduct} submit="Add product">
          <ProductFields isNew />
        </ActionForm>
      </section>
    </>
  );
}
