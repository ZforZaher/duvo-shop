import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/server/admin-auth';
import { getOrder, STATUSES } from '@/lib/server/orders';
import { getSettings } from '@/lib/server/settings';
import { money, count } from '@/lib/pricing';
import { VAT_RATE } from '@/lib/catalog';
import { changeStatus, removeOrder } from '../../../actions';
import { ActionForm, AutoSubmitSelect } from '../../../ui';

export const metadata = { title: 'Order' };
const fmt = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const o = await getOrder((await params).id);
  if (!o) notFound();
  const c = o.cafe, biz = (await getSettings()).business;
  const rows: [string, string][] = [
    ['Contact', c.contactName], ['Phone', c.phone], ['Email', c.email || '—'], ['City', c.city], ['Address', c.address],
    ['Tax registration', c.taxId || '—'], ['Preferred delivery', c.deliveryDate || '—'], ['Notes', c.notes || '—'],
  ];
  // Pre-filled WhatsApp message to the café (opens WhatsApp; nothing is sent until you press send there).
  const waText = `Hello ${c.contactName}, this is ${biz.name} about your order ${o.id} (${money(o.total)} incl. VAT). `;
  const waNumber = c.phone.replace(/\D/g, '').replace(/^0/, '20');
  return (
    <>
      <div className="crumbs label"><Link href="/admin/orders">Orders</Link> · {o.id}</div>
      <div className="a-head">
        <div><h1>{c.cafeName}</h1><div className="muted num" style={{ marginTop: 8 }}>{o.id} · placed {fmt(o.createdAt)}</div></div>
        <span className={`status ${o.status}`} style={{ fontSize: 12 }}>{o.status}</span>
      </div>
      <div className="a-cols">
        <div>
          <section className="panel">
            <table className="t">
              <thead><tr><th>Product</th><th className="r">Cartons</th><th className="r">Pieces</th><th className="r">Line total</th></tr></thead>
              <tbody>
                {o.lines.map(l => (
                  <tr key={l.slug}>
                    <td><b>{l.name}</b><div className="muted small num">{money(l.unitPrice)} each{l.discount ? ` · −${Math.round(l.discount * 100)}%` : ''}</div></td>
                    <td className="r num">{l.cartons}</td><td className="r num">{count(l.pieces)}</td><td className="r num">{money(l.total)}</td>
                  </tr>
                ))}
                <tr><td colSpan={3}>Subtotal</td><td className="r num">{money(o.subtotal)}</td></tr>
                <tr><td colSpan={3}>VAT {Math.round(VAT_RATE * 100)}%</td><td className="r num">{money(o.vat)}</td></tr>
                <tr><td colSpan={3}><b>Total</b></td><td className="r num"><b>{money(o.total)}</b></td></tr>
              </tbody>
            </table>
          </section>
          <section className="panel">
            <h2>Café details</h2>
            <table className="t"><tbody>{rows.map(([k, v]) => <tr key={k}><th style={{ width: '32%' }}>{k}</th><td style={{ whiteSpace: 'pre-wrap' }}>{v}</td></tr>)}</tbody></table>
            <div className="btns" style={{ marginTop: 16 }}>
              <a className="btn small solid" href={`https://wa.me/${waNumber}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener noreferrer">Message café on WhatsApp</a>
              <a className="btn small" href={`tel:${c.phone.replace(/[^\d+]/g, '')}`}>Call</a>
            </div>
          </section>
        </div>
        <aside>
          <section className="panel">
            <h2>Status</h2>
            <form action={changeStatus} className="f" key={o.status}>
              <input type="hidden" name="id" value={o.id} />
              <label htmlFor="status">Set status <AutoSubmitSelect name="status" value={o.status} options={STATUSES} label="Order status" /></label>
              <noscript><button className="btn small solid" type="submit">Save status</button></noscript>
            </form>
            <h3 className="h3s">History</h3>
            {o.history.slice().reverse().map((h, i) => (
              <div className="sumrow small" key={i}><span><span className={`status ${h.status}`}>{h.status}</span>{h.by ? <span className="muted"> · {h.by}</span> : null}</span><span className="num muted">{fmt(h.at)}</span></div>
            ))}
          </section>
          {me.role === 'owner' && (
            <section className="panel">
              <h2>Delete order</h2>
              <p className="muted small">Removes it for good. Usually set it to cancelled instead.</p>
              <ActionForm action={removeOrder} submit="Delete order" danger>
                <input type="hidden" name="id" value={o.id} />
                <label htmlFor="confirm">Type DELETE to confirm<input id="confirm" name="confirm" autoComplete="off" maxLength={10} /></label>
              </ActionForm>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
