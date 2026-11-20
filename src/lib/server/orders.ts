import 'server-only';
// Order storage (.data/orders.json via the JSON store). Everything else talks to these functions only,
// so moving to a real database later means rewriting this file.
import crypto from 'node:crypto';
import type { Quote } from '@/lib/pricing';
import { readJson, updateJson } from './store';

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

export function createOrder(quote: Quote, cafe: Cafe): Promise<Order> {
  return updateJson<Order[], Order>(FILE, [], orders => {
    const now = new Date().toISOString();
    const order: Order = { ...quote, id: newId(), token: crypto.randomBytes(16).toString('hex'), createdAt: now, status: 'new', cafe, history: [{ at: now, status: 'new' }] };
    orders.push(order);
    return order;
  });
}

export async function listOrders(): Promise<Order[]> {
  return (await readJson<Order[]>(FILE, [])).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getOrder(id: string): Promise<Order | undefined> {
  if (!/^DV-\d{6}-[A-F0-9]{6}$/.test(id)) return undefined;
  return (await readJson<Order[]>(FILE, [])).find(o => o.id === id);
}

export function setStatus(id: string, status: Status, by: string): Promise<void> {
  if (!STATUSES.includes(status)) throw new Error('Unknown status');
  return updateJson<Order[]>(FILE, [], orders => {
    const o = orders.find(x => x.id === id);
    if (!o || o.status === status) return;
    o.status = status; o.history.push({ at: new Date().toISOString(), status, by });
  });
}

export function deleteOrder(id: string): Promise<boolean> {
  return updateJson<Order[], boolean>(FILE, [], orders => {
    const i = orders.findIndex(o => o.id === id);
    if (i < 0) return false;
    orders.splice(i, 1);
    return true;
  });
}

/** Same phone with different spacing counts as one café. */
export const phoneKey = (p: string) => p.replace(/\D/g, '').replace(/^0+/, '').replace(/^20/, '');
