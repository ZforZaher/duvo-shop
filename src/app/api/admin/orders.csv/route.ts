import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/server/admin-auth';
import { listOrders, STATUSES, type Status } from '@/lib/server/orders';
import { ordersCsv } from '@/lib/server/analytics';

export async function GET(req: Request) {
  if (!(await currentUser())) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const u = new URL(req.url), status = u.searchParams.get('status') as Status | null, q = (u.searchParams.get('q') ?? '').trim().slice(0, 60).toLowerCase();
  const orders = (await listOrders()).filter(o => (!status || !STATUSES.includes(status) || o.status === status)
    && (!q || [o.id, o.cafe.cafeName, o.cafe.contactName, o.cafe.phone, o.cafe.city].some(v => v.toLowerCase().includes(q))));
  return new NextResponse(ordersCsv(orders), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="duvo-orders-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
