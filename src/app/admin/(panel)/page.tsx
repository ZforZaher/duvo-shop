import Link from 'next/link';
import { dashboard, PERIODS, type Period } from '@/lib/server/analytics';
import { money, count } from '@/lib/pricing';
import { BarList, ColumnChart } from './charts';

export const metadata = { title: 'Dashboard' };

const fmtShort = (n: number) => (n >= 1000 ? `${(n / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}k` : n.toLocaleString('en-US', { maximumFractionDigits: 0 }));
const dayLabel = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ period?: string; denied?: string }> }) {
  const sp = await searchParams;
  const period: Period = sp.period && sp.period in PERIODS ? (sp.period as Period) : '30';
  const d = await dashboard(period);
  const t = d.totals;
  const periodName = period === 'all' ? 'all time' : `last ${period} days`;
  return (
    <>
      <div className="a-head">
        <div><div className="label">Overview · {periodName}</div><h1>Dashboard</h1></div>
        <div className="chips" aria-label="Period">
          {(Object.keys(PERIODS) as Period[]).map(p => (
            <Link key={p} className="chip" href={`/admin?period=${p}`} aria-current={p === period ? 'page' : undefined}>{p === 'all' ? 'All time' : `${p} days`}</Link>
          ))}
        </div>
      </div>
      {sp.denied && <div className="alert" role="alert" style={{ marginBottom: 18 }}>That page is for owners only.</div>}

      <div className="kpis">
        <div className="kpi"><span className="label">Revenue incl. VAT</span><b className="num">{money(t.revenue)}</b></div>
        <div className="kpi"><span className="label">Orders</span><b>{t.orders}</b><span className="muted small">{count(t.cartons)} cartons · {t.cafes} cafés</span></div>
        <div className="kpi"><span className="label">Average order</span><b className="num">{money(t.average)}</b></div>
        <div className="kpi attention"><span className="label">Needs action</span><b>{t.waiting}</b><span className="muted small">{t.waiting === 1 ? 'new order' : 'new orders'} · {t.unpaid} invoiced, not paid</span></div>
      </div>

      <section className="panel">
        <h2>Revenue per day</h2>
        <p className="muted small">Incl. VAT, cancelled orders left out. Hover a bar for the day’s orders.</p>
        <ColumnChart title={`Revenue per day, ${periodName}`} format={fmtShort}
          data={d.perDay.map(x => ({ label: dayLabel(x.day), value: Math.round(x.revenue), tip: `${dayLabel(x.day)}: ${money(x.revenue)} · ${x.orders} order${x.orders === 1 ? '' : 's'}` }))} />
      </section>

      <div className="a-grid3">
        <section className="panel">
          <h2>By status</h2>
          <BarList empty="No orders in this period." format={n => String(n)}
            rows={d.byStatus.map(s => ({ key: s.status, value: s.count, label: <Link href={`/admin/orders?status=${s.status}`}><span className={`status ${s.status}`}>{s.status}</span></Link> }))} />
        </section>
        <section className="panel">
          <h2>Top products</h2>
          <BarList empty="No sales in this period." format={n => `${n} ctn`}
            rows={d.topProducts.map(p => ({ key: p.name, value: p.cartons, label: p.name }))} />
        </section>
        <section className="panel">
          <h2>Top cities</h2>
          <BarList empty="No sales in this period." format={fmtShort}
            rows={d.topCities.map(c => ({ key: c.city, value: Math.round(c.total), label: c.city }))} />
        </section>
      </div>

      <section className="panel">
        <div className="a-head" style={{ marginBottom: 8 }}><h2>Latest orders</h2><Link className="btn small" href="/admin/orders">All orders</Link></div>
        {d.recent.length === 0 ? <p className="muted">No orders yet. New orders from the shop appear here straight away.</p> : (
          <div className="tablewrap"><table className="t">
            <thead><tr><th>Order</th><th>Café</th><th>Placed</th><th className="r">Total</th><th>Status</th></tr></thead>
            <tbody>{d.recent.map(o => (
              <tr key={o.id}><td><Link className="num" href={`/admin/orders/${o.id}`}><b>{o.id}</b></Link></td><td>{o.cafe.cafeName}<div className="muted small">{o.cafe.city}</div></td>
                <td className="num small">{when(o.createdAt)}</td><td className="r num">{money(o.total)}</td><td><span className={`status ${o.status}`}>{o.status}</span></td></tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
    </>
  );
}
