import Link from 'next/link';
import { CatalogProvider } from '@/components/cart/CatalogProvider';
import { CartProvider } from '@/components/cart/CartProvider';
import Header from '@/components/Header';
import { Monogram, Wordmark } from '@/components/Brand';
import { getPublicCatalog } from '@/lib/server/settings';

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const catalog = await getPublicCatalog();
  return (
    <CatalogProvider value={catalog}>
      <CartProvider>
        {catalog.examplePrices && (
          <div className="notice label" role="note">Example prices · not final · orders are confirmed by invoice</div>
        )}
        <Header />
        <main id="top">{children}</main>
        <footer>
          <div className="inner">
            <div>
              <Wordmark className="big" />
              <div className="label" style={{ marginTop: 14, color: '#B7B2A8' }}>Two drinks · One cup</div>
            </div>
            <div className="meta">
              <Monogram width={52} />
              <Link className="label" href="/shop">Order for your café</Link>
              <span className="label">Twin cups · Est. 2026</span>
            </div>
          </div>
        </footer>
      </CartProvider>
    </CatalogProvider>
  );
}
