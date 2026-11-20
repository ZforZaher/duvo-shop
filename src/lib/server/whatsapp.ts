import 'server-only';
// WhatsApp alert to the shop owner when an order is placed.
// Provider and secret keys come from .env.local (never from the browser); the receiving number and on/off
// switch are in Admin › Settings. A failed alert is recorded in Settings and never affects the order.
import { money, count } from '@/lib/pricing';
import { VAT_RATE } from '@/lib/catalog';
import { env } from './env';
import { getSettings, updateSettings } from './settings';
import type { Order } from './orders';
import { digits } from './sanitize';

export type AlertResult = { ok: boolean; detail: string };

export function orderMessage(o: Order, siteUrl: string): string {
  const c = o.cafe;
  return [
    `New Duvo order ${o.id}`,
    `Café: ${c.cafeName}`,
    `Contact: ${c.contactName} · ${c.phone}${c.email ? ` · ${c.email}` : ''}`,
    `City: ${c.city}`,
    `Address: ${c.address}`,
    `Delivery: ${c.deliveryDate || 'no date given'}`,
    '',
    ...o.lines.map(l => `• ${l.name} × ${l.cartons} carton${l.cartons > 1 ? 's' : ''} (${count(l.pieces)} pcs): ${money(l.total)}`),
    '',
    `Subtotal: ${money(o.subtotal)}`,
    `VAT ${Math.round(VAT_RATE * 100)}%: ${money(o.vat)}`,
    `Total: ${money(o.total)}`,
    ...(c.notes ? ['', `Notes: ${c.notes}`] : []),
    '',
    `Open: ${siteUrl}/admin/orders/${o.id}`,
  ].join('\n');
}

/** A WhatsApp group id like 120363012345678901@g.us (alerts to a group of you and your staff). */
export const isGroupId = (v: string) => /^[0-9-]{10,40}@g\.us$/.test(v);

async function send(text: string, key?: string): Promise<AlertResult> {
  const e = env(), s = await getSettings();
  const raw = (s.whatsapp.to || e.whatsapp.to || '').trim();
  const group = isGroupId(raw);
  const to = group ? raw : digits(raw);
  if (e.whatsapp.provider === 'none') return { ok: false, detail: 'No WhatsApp provider set in .env.local (WHATSAPP_PROVIDER).' };
  if (!to) return { ok: false, detail: 'No WhatsApp number set in Admin › Settings.' };
  if (group && e.whatsapp.provider !== 'wapilot') return { ok: false, detail: 'Sending to a group needs WHATSAPP_PROVIDER=wapilot.' };
  const shown = group ? 'the group' : `+${to}`;
  try {
    let res: Response;
    if (e.whatsapp.provider === 'wapilot') {
      // WaPilot API v2: POST /{instance}/send-message, "token" header. The instance is the WhatsApp number that
      // SENDS; "to" is who receives (a different number or a group). Idempotency-Key stops double alerts on retries.
      res = await fetch(`https://api.wapilot.net/api/v2/${encodeURIComponent(e.whatsapp.wapilotInstance!)}/send-message`, {
        method: 'POST',
        headers: { token: e.whatsapp.wapilotToken!, 'Content-Type': 'application/json', Accept: 'application/json', ...(key ? { 'Idempotency-Key': key } : {}) },
        body: JSON.stringify({ chat_id: group ? to : `${to}@c.us`, text: text.slice(0, 4000) }),
        signal: AbortSignal.timeout(8000), cache: 'no-store',
      });
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string; code?: string };
      if (res.ok && data.success !== false) return { ok: true, detail: `Queued by WaPilot for ${shown}.` };
      return { ok: false, detail: `WaPilot answered ${res.status}${data.code ? ` (${data.code})` : ''}: ${(data.message ?? '').slice(0, 160)}` };
    }
    if (e.whatsapp.provider === 'cloud') {
      const payload = e.whatsapp.template
        ? { messaging_product: 'whatsapp', to, type: 'template', template: { name: e.whatsapp.template, language: { code: e.whatsapp.templateLang },
            // template parameters can't contain line breaks, so the order goes on one line
            components: [{ type: 'body', parameters: [{ type: 'text', text: text.replace(/\n+/g, ' | ').slice(0, 1000) }] }] } }
        : { messaging_product: 'whatsapp', to, type: 'text', text: { preview_url: false, body: text.slice(0, 4000) } };
      res = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(e.whatsapp.phoneNumberId!)}/messages`, {
        method: 'POST', headers: { Authorization: `Bearer ${e.whatsapp.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), signal: AbortSignal.timeout(8000), cache: 'no-store',
      });
    } else {
      const url = `https://api.callmebot.com/whatsapp.php?phone=${to}&text=${encodeURIComponent(text.slice(0, 2000))}&apikey=${encodeURIComponent(e.whatsapp.callmebotKey!)}`;
      res = await fetch(url, { signal: AbortSignal.timeout(8000), cache: 'no-store' });
    }
    if (res.ok) return { ok: true, detail: `Sent to ${shown}.` };
    const body = (await res.text()).replace(/\s+/g, ' ').slice(0, 160); // provider message, no secrets
    return { ok: false, detail: `WhatsApp provider answered ${res.status}: ${body}` };
  } catch (err) {
    return { ok: false, detail: (err as Error).name === 'TimeoutError' ? 'WhatsApp provider did not answer in 8 seconds.' : 'Could not reach the WhatsApp provider.' };
  }
}

async function record(r: AlertResult) {
  await updateSettings(s => { s.lastAlert = { at: new Date().toISOString(), ...r }; });
  return r;
}

export async function alertNewOrder(o: Order): Promise<void> {
  const s = await getSettings();
  if (!s.whatsapp.enabled) return;
  await record(await send(orderMessage(o, env().siteUrl), `duvo-order-${o.id}`)); // one alert per order, even on retries
}

export async function sendTestAlert(by: string): Promise<AlertResult> {
  return record(await send(`Duvo test message from the admin panel (sent by ${by}). Order alerts are working.`, `duvo-test-${Date.now()}`));
}
