import 'server-only';
// Order storage. Online: one row per order in the database's `orders` table (when DATABASE_URL is set).
// Offline fallback: .data/orders.json. Everything else in the shop talks to these functions only.
import crypto from 'node:crypto';
import type { Quote } from '@/lib/pricing';
import { readJson, updateJson } from './store';
import { db } from './db';

export const STATUSES = ['new', 'confirmed', 'invoiced', 'paid', 'shipped', 'cancelled'] as const;
export type Status = (typeof STATUSES)[number];

export type Cafe = {
  cafeName: string; contactName: string; phone: string; email: string; city: string;
  address: string; taxId: string; deliveryDate: string; notes: string;
};
export type Order = Quote & {
  id: string;
  token: string;
  createdAt: string;
  status: Status;
  cafe: Cafe;
  history: { at: string; status: Status; by?: string }[];
};

const FILE = 'orders.json';

function newId() {
  const d = new Date(), pad = (n: number) => String(n).padStart(2, '0');
  return `DV-${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

const ID = /^DV-\d{6}-[A-F0-9]{6}$/;

export async function createOrder(quote: Quote, cafe: Cafe): Promise<Order> {
  const make = (): Order => {
    const now = new Date().toISOString();
    return { ...quote, id: newId(), token: crypto.randomBytes(16).toString('hex'), createdAt: now, status: 'new', cafe, history: [{ at: now, status: 'new' }] };
  };
  const sql = db();
  if (sql) {
    for (let attempt = 0; ; attempt++) { // order numbers are random; on the rare clash, draw a new one
      const order = make();
      const rows = await sql`insert into orders (id, created_at, status, data)
        values (${order.id}, ${order.createdAt}, ${order.status}, ${sql.json(order as never)})
        on conflict (id) do nothing returning id`;
      if (rows.length) return order;
      if (attempt >= 4) throw new Error('Could not create a unique order number.');
    }
  }
  return updateJson<Order[], Order>(FILE, [], orders => { const order = make(); orders.push(order); return order; });
}

export async function listOrders(): Promise<Order[]> {
  const sql = db();
  if (sql) return (await sql<{ data: Order }[]>`select data from orders order by created_at desc`).map(r => r.data);
  return (await readJson<Order[]>(FILE, [])).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getOrder(id: string): Promise<Order | undefined> {
  if (!ID.test(id)) return undefined;
  const sql = db();
  if (sql) return (await sql<{ data: Order }[]>`select data from orders where id = ${id}`)[0]?.data;
  return (await readJson<Order[]>(FILE, [])).find(o => o.id === id);
}

export async function setStatus(id: string, status: Status, by: string): Promise<void> {
  if (!STATUSES.includes(status)) throw new Error('Unknown status');
  const change = (o: Order) => { o.status = status; o.history.push({ at: new Date().toISOString(), status, by }); };
  const sql = db();
  if (sql) {
    await sql.begin(async tx => {
      const [row] = await tx<{ data: Order }[]>`select data from orders where id = ${id} for update`;
      if (!row || row.data.status === status) return;
      change(row.data);
      await tx`update orders set status = ${status}, data = ${tx.json(row.data as never)} where id = ${id}`;
    });
    return;
  }
  return updateJson<Order[]>(FILE, [], orders => {
    const o = orders.find(x => x.id === id);
    if (o && o.status !== status) change(o);
  });
}

export async function deleteOrder(id: string): Promise<boolean> {
  const sql = db();
  if (sql) return (await sql`delete from orders where id = ${id} returning id`).length > 0;
  return updateJson<Order[], boolean>(FILE, [], orders => {
    const i = orders.findIndex(o => o.id === id);
    if (i < 0) return false;
    orders.splice(i, 1);
    return true;
  });
}

/** Same phone with different spacing counts as one café. */
export const phoneKey = (p: string) => p.replace(/\D/g, '').replace(/^0+/, '').replace(/^20/, '');
