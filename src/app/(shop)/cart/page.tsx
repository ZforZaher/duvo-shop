'use client';
import Link from 'next/link';
import { useCart } from '@/components/cart/CartProvider';
import { VAT_RATE } from '@/lib/catalog';
import { clampCartons, money, count } from '@/lib/pricing';

export default function CartPage() {
  const { quote, ready, setCartons, remove } = useCart();
  const empty = ready && quote.lines.length === 0;
  // The heading is the same in every state, so it is in the first HTML the browser gets (the saved cart is
  // only read in the browser, a moment later).
  return (
    <div className="inner cols cartpage">
      <div>
        <div className="sec-head" style={{ marginBottom: 12 }}><div><div className="label">Cart</div><h1>Your order</h1></div></div>
        {!ready ? <p className="muted">Loading your cart…</p> : empty ? (
          <div className="empty-msg">
            {/* kept short and small: it appears after the saved cart is read, and must not outsize the heading */}
            <p>Your cart is empty.</p>
            <Link className="btn solid" href="/shop">Go to the shop</Link>
          </div>
        ) : (
        <div className="tablewrap">
          <table className="t">
            <thead><tr><th>Product</th><th>Cartons</th><th className="r">Line total</th><th><span className="sr-only">Remove</span></th></tr></thead>
            <tbody>
              {quote.lines.map(l => (
                <tr key={l.slug}>
                  <td>
                    <Link href={`/shop/${l.slug}`}><b>{l.name}</b></Link>
                    <div className="muted small num">{count(l.pieces)} pieces · {money(l.unitPrice)} each{l.discount ? ` · −${Math.round(l.discount * 100)}%` : ''}</div>
                  </td>
                  <td>
                    <div className="qty" style={{ transform: 'scale(.86)', transformOrigin: 'left center' }}>
                      <button type="button" aria-label={`One carton fewer of ${l.name}`} onClick={() => setCartons(l.slug, l.cartons - 1)}>−</button>
                      <input aria-label={`Cartons of ${l.name}`} inputMode="numeric" value={l.cartons} onChange={e => setCartons(l.slug, clampCartons(e.target.value))} />
                      <button type="button" aria-label={`One carton more of ${l.name}`} onClick={() => setCartons(l.slug, l.cartons + 1)}>+</button>
                    </div>
                  </td>
                  <td className="r num">{money(l.total)}</td>
                  <td><button className="linkbtn" onClick={() => remove(l.slug)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>
      {ready && !empty && (
      <aside className="summary" aria-label="Order summary">
        <h2>Summary</h2>
        <div className="sumrow"><span>Subtotal</span><span className="num">{money(quote.subtotal)}</span></div>
        <div className="sumrow"><span>VAT {Math.round(VAT_RATE * 100)}%</span><span className="num">{money(quote.vat)}</span></div>
        <div className="sumrow"><span>Delivery</span><span className="muted">On the invoice</span></div>
        <div className="sumrow total"><span>Total</span><span className="num">{money(quote.total)}</span></div>
        <Link className="btn solid" href="/checkout" style={{ width: '100%', marginTop: 16 }}>Continue to checkout</Link>
        <p className="muted small" style={{ marginBottom: 0 }}>No payment now. We confirm your order and send an invoice.</p>
      </aside>
      )}
    </div>
  );
}
