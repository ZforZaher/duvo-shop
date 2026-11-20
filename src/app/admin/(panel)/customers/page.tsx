import Link from 'next/link';
import { customers } from '@/lib/server/analytics';
import { money } from '@/lib/pricing';

export const metadata = { title: 'Customers' };
const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export default async function Customers() {
  const rows = await customers();
  return (
    <>
      <div className="a-head"><div><div className="label">{rows.length} cafés</div><h1>Customers</h1></div></div>
      <p className="muted small" style={{ marginTop: -8 }}>Cafés are grouped by phone number. Totals include VAT and leave out cancelled orders.</p>
      <section className="panel">
        {rows.length === 0 ? <p className="muted" style={{ margin: 0 }}>No customers yet. Cafés appear here after their first order.</p> : (
          <div className="tablewrap"><table className="t">
            <thead><tr><th>Café</th><th>Contact</th><th>City</th><th className="r">Orders</th><th className="r">Total spent</th><th>Last order</th></tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.key}>
                <td><b>{r.cafeName}</b></td>
                <td>{r.contactName}<div className="muted small num">{r.phone}{r.email ? ` · ${r.email}` : ''}</div></td>
                <td>{r.city}</td><td className="r num">{r.orders}</td><td className="r num">{money(r.total)}</td>
                <td><Link className="num small" href={`/admin/orders/${r.lastId}`}>{day(r.lastOrder)}</Link></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
    </>
  );
}
