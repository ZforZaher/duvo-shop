// "Thank you" view for a placed order. Used by the order page (/order/[id], when the link is opened again)
// and by the checkout, which shows it the instant the order is saved instead of loading a new page.
import Link from 'next/link';
import { money } from '@/lib/pricing';
import { VAT_RATE } from '@/lib/catalog';

/** What the café sees about its own order (no internal fields such as status history). */
export type OrderView = {
  id: string;
  cafe: { cafeName: string; phone: string; email: string };
  lines: { slug: string; name: string; cartons: number; total: number }[];
  subtotal: number; vat: number; total: number;
};
export type BusinessView = { name: string; phone: string; paymentInstructions: string; replyTime: string };

export default function OrderConfirmation({ o, biz }: { o: OrderView; biz: BusinessView }) {
  return (
    <div className="inner cols">
      <div>
        <div className="label" style={{ color: 'var(--orange-text)', marginBottom: 14 }}>Order placed</div>
        <h1 style={{ fontSize: 'clamp(48px, 7vw, 88px)' }}>Thank you,<br /><span style={{ color: 'var(--green)' }}>{o.cafe.cafeName}</span></h1>
        <div className="okbox" style={{ marginTop: 24 }} role="status">
          <p style={{ marginTop: 0 }}>Your order number is <b className="num">{o.id}</b>.</p>
          <p>We&apos;ll check stock and delivery and contact you {biz.replyTime} on <span className="num">{o.cafe.phone}</span>{o.cafe.email ? ` or ${o.cafe.email}` : ''}. Nothing has been charged.</p>
          {biz.paymentInstructions && <p style={{ whiteSpace: 'pre-wrap' }}><b>How to pay:</b> {biz.paymentInstructions}</p>}
          {biz.phone && <p>Questions? Call {biz.name} on <span className="num">{biz.phone}</span>.</p>}
          <p className="muted small" style={{ marginBottom: 0 }}>Keep this page&apos;s link to see your order again.</p>
        </div>
        <div className="btns" style={{ marginTop: 24 }}><Link className="btn" href="/shop">Back to the shop</Link></div>
      </div>
      <aside className="summary" aria-label="Order summary">
        <h2>Your order</h2>
        {o.lines.map(l => (
          <div className="sumrow" key={l.slug}><span>{l.name} <span className="muted num">× {l.cartons}</span></span><span className="num">{money(l.total)}</span></div>
        ))}
        <div className="sumrow"><span>Subtotal</span><span className="num">{money(o.subtotal)}</span></div>
        <div className="sumrow"><span>VAT {Math.round(VAT_RATE * 100)}%</span><span className="num">{money(o.vat)}</span></div>
        <div className="sumrow total"><span>Total</span><span className="num">{money(o.total)}</span></div>
      </aside>
    </div>
  );
}

/** Only the fields the café's own confirmation shows. */
export const toView = (o: OrderView): OrderView => ({
  id: o.id,
  cafe: { cafeName: o.cafe.cafeName, phone: o.cafe.phone, email: o.cafe.email },
  lines: o.lines.map(l => ({ slug: l.slug, name: l.name, cartons: l.cartons, total: l.total })),
  subtotal: o.subtotal, vat: o.vat, total: o.total,
});
