import 'server-only';
import { listOrders, phoneKey, STATUSES, type Order, type Status } from './orders';

export const PERIODS = { '7': 7, '30': 30, '90': 90, all: 0 } as const;
export type Period = keyof typeof PERIODS;

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export async function dashboard(period: Period) {
  const all = await listOrders();
  const days = PERIODS[period];
  const since = days ? new Date(Date.now() - (days - 1) * 86_400_000) : null;
  if (since) since.setHours(0, 0, 0, 0);
  const inPeriod = all.filter(o => !since || new Date(o.createdAt) >= since);
  const live = inPeriod.filter(o => o.status !== 'cancelled'); // cancelled orders don't count as sales

  const revenue = live.reduce((s, o) => s + o.total, 0);
  const cartons = live.reduce((s, o) => s + o.lines.reduce((a, l) => a + l.cartons, 0), 0);

  // Revenue per day (incl. VAT). For "all", start at the first order (max 365 days shown).
  const start = since ?? (all.length ? new Date(all[all.length - 1].createdAt) : new Date());
  const span = Math.min(365, Math.max(1, Math.round((Date.now() - start.getTime()) / 86_400_000) + 1));
  const perDay = new Map<string, { revenue: number; orders: number }>();
  for (let i = span - 1; i >= 0; i--) perDay.set(dayKey(new Date(Date.now() - i * 86_400_000)), { revenue: 0, orders: 0 });
  for (const o of live) { const k = dayKey(new Date(o.createdAt)), d = perDay.get(k); if (d) { d.revenue += o.total; d.orders++; } }

  const byStatus = STATUSES.map(s => ({ status: s as Status, count: inPeriod.filter(o => o.status === s).length }));
  const products = new Map<string, { name: string; cartons: number; revenue: number }>();
  for (const o of live) for (const l of o.lines) {
    const p = products.get(l.slug) ?? { name: l.name, cartons: 0, revenue: 0 };
    p.cartons += l.cartons; p.revenue += l.total; products.set(l.slug, p);
  }
  const cities = new Map<string, number>();
  for (const o of live) { const c = o.cafe.city.trim() || '—'; cities.set(c, (cities.get(c) ?? 0) + o.total); }

  return {
    totals: {
      orders: live.length, revenue, cartons, average: live.length ? revenue / live.length : 0,
      waiting: all.filter(o => o.status === 'new').length,
      unpaid: all.filter(o => o.status === 'invoiced').length,
      cafes: new Set(live.map(o => phoneKey(o.cafe.phone))).size,
    },
    perDay: [...perDay].map(([day, v]) => ({ day, ...v })),
    byStatus,
    topProducts: [...products.values()].sort((a, b) => b.cartons - a.cartons).slice(0, 6),
    topCities: [...cities].map(([city, total]) => ({ city, total })).sort((a, b) => b.total - a.total).slice(0, 6),
    recent: all.slice(0, 6),
  };
}

export type CustomerRow = { key: string; cafeName: string; contactName: string; phone: string; email: string; city: string; orders: number; total: number; lastOrder: string; lastId: string };

/** Cafés grouped by phone number (cancelled orders excluded from totals). */
export async function customers(): Promise<CustomerRow[]> {
  const map = new Map<string, CustomerRow>();
  for (const o of (await listOrders()).slice().reverse()) { // oldest first, so the newest details win
    const k = phoneKey(o.cafe.phone);
    const row = map.get(k) ?? { key: k, cafeName: '', contactName: '', phone: '', email: '', city: '', orders: 0, total: 0, lastOrder: '', lastId: '' };
    Object.assign(row, { cafeName: o.cafe.cafeName, contactName: o.cafe.contactName, phone: o.cafe.phone, email: o.cafe.email || row.email, city: o.cafe.city, lastOrder: o.createdAt, lastId: o.id });
    if (o.status !== 'cancelled') { row.orders++; row.total += o.total; }
    map.set(k, row);
  }
  return [...map.values()].sort((a, b) => b.lastOrder.localeCompare(a.lastOrder));
}

export function ordersCsv(orders: Order[]): string {
  const esc = (v: unknown) => {
    let s = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // stop spreadsheet formula injection
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ['Order', 'Placed', 'Status', 'Café', 'Contact', 'Phone', 'Email', 'City', 'Address', 'Tax no.', 'Delivery date', 'Items', 'Cartons', 'Subtotal', 'VAT', 'Total', 'Notes'];
  const rows = orders.map(o => [
    o.id, o.createdAt, o.status, o.cafe.cafeName, o.cafe.contactName, o.cafe.phone, o.cafe.email, o.cafe.city, o.cafe.address, o.cafe.taxId, o.cafe.deliveryDate,
    o.lines.map(l => `${l.name} x${l.cartons}`).join('; '), o.lines.reduce((a, l) => a + l.cartons, 0), o.subtotal, o.vat, o.total, o.cafe.notes,
  ]);
  return '﻿' + [head, ...rows].map(r => r.map(esc).join(',')).join('\r\n');
}
