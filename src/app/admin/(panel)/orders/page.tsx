import Link from 'next/link';
import { listOrders, STATUSES, type Status } from '@/lib/server/orders';
import { money } from '@/lib/pricing';

export const metadata = { title: 'Orders' };
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });

export default async function Orders({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as Status) ? (sp.status as Status) : undefined;
  const q = (sp.q ?? '').trim().slice(0, 60).toLowerCase();
  const all = await listOrders();
  const shown = all.filter(o => (!status || o.status === status) && (!q || [o.id, o.cafe.cafeName, o.cafe.contactName, o.cafe.phone, o.cafe.city].some(v => v.toLowerCase().includes(q))));
  const qs = new URLSearchParams({ ...(status ? { status } : {}), ...(q ? { q } : {}) }).toString();
  return (
    <>
      <div className="a-head">
        <div><div className="label">{shown.length} of {all.length}</div><h1>Orders</h1></div>
        <a className="btn small" href={`/api/admin/orders.csv${qs ? `?${qs}` : ''}`} download>Export CSV</a>
      </div>
      <form className="searchrow" role="search" action="/admin/orders">
        {status && <input type="hidden" name="status" value={status} />}
        <label className="sr-only" htmlFor="q">Search orders</label>
        <input id="q" name="q" defaultValue={q} placeholder="Search order no., café, contact, phone or city" maxLength={60} />
        <button className="btn small" type="submit">Search</button>
        {q && <Link className="linkbtn" href={`/admin/orders${status ? `?status=${status}` : ''}`}>Clear</Link>}
      </form>
      <div className="chips" aria-label="Filter by status">
        <Link className="chip" href={`/admin/orders${q ? `?q=${encodeURIComponent(q)}` : ''}`} aria-current={!status ? 'page' : undefined}>All · {all.length}</Link>
        {STATUSES.map(s => (
          <Link key={s} className="chip" href={`/admin/orders?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ''}`} aria-current={status === s ? 'page' : undefined}>{s} · {all.filter(o => o.status === s).length}</Link>
        ))}
      </div>
      <section className="panel">
        {shown.length === 0 ? <p className="muted" style={{ margin: 0 }}>{all.length ? 'No orders match.' : 'No orders yet. New orders from the shop appear here straight away.'}</p> : (
          <div className="tablewrap"><table className="t">
            <thead><tr><th>Order</th><th>Café</th><th>City</th><th>Placed</th><th className="r">Cartons</th><th className="r">Total</th><th>Status</th></tr></thead>
            <tbody>{shown.map(o => (
              <tr key={o.id}>
                <td><Link className="num" href={`/admin/orders/${o.id}`}><b>{o.id}</b></Link></td>
                <td>{o.cafe.cafeName}<div className="muted small">{o.cafe.contactName} · <span className="num">{o.cafe.phone}</span></div></td>
                <td>{o.cafe.city}</td><td className="num small">{when(o.createdAt)}</td>
                <td className="r num">{o.lines.reduce((a, l) => a + l.cartons, 0)}</td><td className="r num">{money(o.total)}</td>
                <td><span className={`status ${o.status}`}>{o.status}</span></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
    </>
  );
}
