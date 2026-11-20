import type { Metadata } from 'next';
import crypto from 'node:crypto';
import { notFound } from 'next/navigation';
import { getOrder } from '@/lib/server/orders';
import { getSettings } from '@/lib/server/settings';
import OrderConfirmation, { toView } from '@/components/OrderConfirmation';

export const metadata: Metadata = { title: 'Order placed', robots: { index: false } };
export const dynamic = 'force-dynamic';

// The confirmation link carries a secret token, so only the café that placed the order can open it.
export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  const [{ id }, { t = '' }] = await Promise.all([params, searchParams]);
  const o = await getOrder(id);
  const ok = !!o && t.length === o.token.length && crypto.timingSafeEqual(Buffer.from(t), Buffer.from(o.token));
  if (!o || !ok) notFound();
  const biz = (await getSettings()).business;
  return <OrderConfirmation o={toView(o)} biz={biz} />;
}
