import { after, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { quote, type CartItem } from '@/lib/pricing';
import { createOrder, phoneKey, type Cafe } from '@/lib/server/orders';
import { getProducts, getSettings } from '@/lib/server/settings';
import { cleanLine, cleanText, isEmail, isPhone } from '@/lib/server/sanitize';
import { limited } from '@/lib/server/rate-limit';
import { ipFrom, sameOrigin } from '@/lib/server/request';
import { alertNewOrder } from '@/lib/server/whatsapp';
import { toView } from '@/components/OrderConfirmation';

const LIMITS: Record<keyof Cafe, number> = { cafeName: 120, contactName: 120, phone: 30, email: 160, city: 80, address: 400, taxId: 40, deliveryDate: 10, notes: 1000 };
const MULTILINE: (keyof Cafe)[] = ['address', 'notes'];
const REQUIRED: (keyof Cafe)[] = ['cafeName', 'contactName', 'phone', 'city', 'address'];
const MAX_BODY = 16 * 1024;
const fail = (error: string, status = 400, fields?: object) => NextResponse.json({ error, ...(fields ? { fields } : {}) }, { status });

export async function POST(req: Request) {
  // Only this site's own pages may place orders (no cross-site posting, no CORS).
  if (!sameOrigin(req)) return fail('Orders can only be placed from the Duvo shop.', 403);
  if (!(req.headers.get('content-type') ?? '').startsWith('application/json')) return fail('Send the order as JSON.', 415);
  if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY) return fail('That order is too large.', 413);

  const ip = ipFrom(req.headers);
  if (limited(`order:ip:${ip}`, 10, 3_600_000)) return fail('Too many orders from this connection. Please try again in an hour.', 429);
  if (limited('order:all', 300, 3_600_000)) return fail('The shop is very busy right now. Please try again shortly.', 429);

  let body: { items?: unknown; cafe?: Record<string, unknown>; website?: unknown };
  try {
    const text = await req.text();
    if (text.length > MAX_BODY) return fail('That order is too large.', 413);
    body = JSON.parse(text);
  } catch { return fail('The order could not be read. Please try again.'); }
  if (!body || typeof body !== 'object') return fail('The order could not be read. Please try again.');
  if (body.website) return fail('The order could not be placed.'); // hidden field only bots fill in

  const settings = await getSettings(); // one read for both the live prices and the confirmation details
  const products = await getProducts(false, settings);
  const raw = Array.isArray(body.items) ? body.items.slice(0, 20) : [];
  const items: CartItem[] = raw
    .filter((i): i is { slug: string; cartons: number } => !!i && typeof i === 'object' && typeof (i as CartItem).slug === 'string')
    .map(i => ({ slug: i.slug, cartons: Number(i.cartons) }));
  const q = quote(items, products); // live server prices; anything the browser sent about prices is ignored
  if (q.lines.length === 0) return fail('Your cart is empty, or its products are no longer available.');

  const errors: Partial<Record<keyof Cafe, string>> = {};
  const cafe = {} as Cafe;
  const src = (body.cafe && typeof body.cafe === 'object') ? body.cafe : {};
  for (const k of Object.keys(LIMITS) as (keyof Cafe)[]) {
    const rawLen = typeof src[k] === 'string' ? (src[k] as string).trim().length : 0;
    if (rawLen > LIMITS[k]) errors[k] = `Keep this under ${LIMITS[k]} characters.`;
    cafe[k] = MULTILINE.includes(k) ? cleanText(src[k], LIMITS[k]) : cleanLine(src[k], LIMITS[k]);
  }
  for (const k of REQUIRED) if (!cafe[k]) errors[k] = 'Required.';
  if (cafe.phone && !isPhone(cafe.phone)) errors.phone = 'Enter a phone number, e.g. +20 100 000 0000.';
  if (cafe.email && !isEmail(cafe.email)) errors.email = 'Enter a valid email or leave it empty.';
  if (cafe.deliveryDate) {
    const d = new Date(cafe.deliveryDate + 'T00:00:00'), today = new Date(); today.setHours(0, 0, 0, 0);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cafe.deliveryDate) || isNaN(+d)) errors.deliveryDate = 'Pick a date.';
    else if (d < today) errors.deliveryDate = 'Pick today or a later date.';
  }
  if (Object.keys(errors).length) return fail('Please check the highlighted fields.', 400, errors);
  // Also limit per café phone number, which can't be dodged by faking the IP address.
  if (limited(`order:phone:${phoneKey(cafe.phone)}`, 5, 3_600_000)) return fail('Too many orders for this phone number. Please call us or try again in an hour.', 429);

  const order = await createOrder(q, cafe);
  revalidatePath('/admin', 'layout');
  after(() => alertNewOrder(order)); // WhatsApp alert after the response; never blocks or fails the order
  // The confirmation goes back with the answer, so the checkout can show it straight away (no second page load).
  return NextResponse.json({ id: order.id, token: order.token, order: toView(order), biz: settings.business }, { headers: { 'Cache-Control': 'no-store' } });
}

// No other methods, and no CORS: browsers on other sites can't call this endpoint.
export function GET() { return fail('Not found.', 404); }
