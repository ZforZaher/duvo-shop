'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/components/cart/CartProvider';
import { VAT_RATE } from '@/lib/catalog';
import { money } from '@/lib/pricing';
import OrderConfirmation, { type BusinessView, type OrderView } from '@/components/OrderConfirmation';

type Field = 'cafeName' | 'contactName' | 'phone' | 'email' | 'city' | 'address' | 'taxId' | 'deliveryDate' | 'notes';
type FieldProps = { name: Field; label: string; type?: string; required?: boolean; opt?: boolean; area?: boolean; autoComplete?: string; error?: string };

// Defined outside the page so the inputs (and what the café typed) survive re-renders, e.g. after an error.
function FormField({ name, label, type = 'text', required = false, opt = false, area = false, autoComplete, error }: FieldProps) {
  return (
    <label htmlFor={name}>
      <span>{label} {opt && <span className="opt">(optional)</span>}</span>
      {area
        ? <textarea id={name} name={name} required={required} aria-invalid={!!error} />
        : <input id={name} name={name} type={type} required={required} aria-invalid={!!error} autoComplete={autoComplete} min={type === 'date' ? new Date().toISOString().slice(0, 10) : undefined} />}
      {error && <span className="err">{error}</span>}
    </label>
  );
}

export default function Checkout() {
  const { quote, items, ready, clear } = useCart();
  const [placed, setPlaced] = useState<{ o: OrderView; biz: BusinessView } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Partial<Record<Field, string>>>({});

  const empty = ready && quote.lines.length === 0;
  if (placed) return <OrderConfirmation o={placed.o} biz={placed.biz} />;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(''); setFields({});
    const fd = new FormData(e.currentTarget), cafe: Record<string, string> = {};
    for (const [k, v] of fd.entries()) cafe[k] = String(v);
    try {
      const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items, cafe, website: cafe.website }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || 'The order could not be placed. Please try again.'); setFields(data.fields || {}); setBusy(false); return; }
      // Show the confirmation now, and give the address bar the order's own link (reload/bookmark still work).
      setPlaced({ o: data.order, biz: data.biz });
      clear();
      window.history.replaceState(null, '', `/order/${encodeURIComponent(data.id)}?t=${encodeURIComponent(data.token)}`);
      document.title = 'Order placed · Duvo';
      window.scrollTo(0, 0);
    } catch {
      setError('No connection to the shop. Check your internet and try again; your cart is kept.');
      setBusy(false);
    }
  }


  return (
    <div className="inner cols cartpage">
      <div>
        {/* Same heading in every state, so it is in the first HTML (the saved cart is read in the browser). */}
        <div className="sec-head" style={{ marginBottom: 20 }}><div><div className="label">Checkout</div><h1>Your café</h1></div></div>
        {!ready ? <p className="muted">Loading your cart…</p> : empty ? (
          <div className="empty-msg">
            <p>Nothing to check out yet.</p>
            <Link className="btn solid" href="/shop">Go to the shop</Link>
          </div>
        ) : (
        <form className="f" onSubmit={onSubmit} noValidate={false}>
          <div className="row2"><FormField error={fields.cafeName} name="cafeName" label="Café name" required autoComplete="organization" /><FormField error={fields.contactName} name="contactName" label="Contact person" required autoComplete="name" /></div>
          <div className="row2"><FormField error={fields.phone} name="phone" label="Phone" type="tel" required autoComplete="tel" /><FormField error={fields.email} name="email" label="Email" type="email" opt autoComplete="email" /></div>
          <div className="row2"><FormField error={fields.city} name="city" label="City / governorate" required autoComplete="address-level1" /><FormField error={fields.deliveryDate} name="deliveryDate" label="Preferred delivery date" type="date" opt /></div>
          <FormField error={fields.address} name="address" label="Delivery address" required area />
          <div className="row2"><FormField error={fields.taxId} name="taxId" label="Tax registration no." opt /><span /></div>
          <FormField error={fields.notes} name="notes" label="Notes for us" opt area />
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }} />
          {error && <div className="alert" role="alert">{error}</div>}
          <div className="btns">
            <button className="btn solid" type="submit" disabled={busy}>{busy ? 'Placing order…' : 'Place order'}</button>
            <Link className="btn" href="/cart">Back to cart</Link>
          </div>
          <p className="muted small" style={{ margin: 0 }}>Placing the order doesn&apos;t charge you. We confirm stock and delivery, then send an invoice with payment details.</p>
        </form>
        )}
      </div>
      {ready && !empty && (
      <aside className="summary" aria-label="Order summary">
        <h2>Summary</h2>
        {quote.lines.map(l => (
          <div className="sumrow" key={l.slug}><span>{l.name} <span className="muted num">× {l.cartons}</span></span><span className="num">{money(l.total)}</span></div>
        ))}
        <div className="sumrow"><span>Subtotal</span><span className="num">{money(quote.subtotal)}</span></div>
        <div className="sumrow"><span>VAT {Math.round(VAT_RATE * 100)}%</span><span className="num">{money(quote.vat)}</span></div>
        <div className="sumrow total"><span>Total</span><span className="num">{money(quote.total)}</span></div>
        <p className="muted small" style={{ marginBottom: 0 }}>Delivery is added on the invoice.</p>
      </aside>
      )}
    </div>
  );
}
