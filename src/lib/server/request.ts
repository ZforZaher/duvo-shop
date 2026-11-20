import 'server-only';
import { headers } from 'next/headers';

/**
 * The visitor's IP, for rate limiting.
 * Clients can send their own X-Forwarded-For header, so its FIRST entry can be faked. By default we use the
 * LAST entry, which is added by the server/proxy in front of the app (Next's own server adds the real socket
 * address). On a host that replaces the header with the verified client IP (e.g. Vercel), set
 * TRUST_PROXY=platform in the environment to use x-real-ip instead.
 */
export function ipFrom(h: Headers): string {
  if (process.env.TRUST_PROXY === 'platform') return h.get('x-real-ip') || h.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const chain = (h.get('x-forwarded-for') ?? '').split(',').map(s => s.trim()).filter(Boolean);
  return chain[chain.length - 1] || h.get('x-real-ip') || 'unknown';
}
export async function clientIp(): Promise<string> { return ipFrom(await headers()); }

/** True when a browser request comes from this site (blocks other sites posting to our API). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return req.headers.get('sec-fetch-site') === 'same-origin';
  try { return new URL(origin).host === (req.headers.get('x-forwarded-host') ?? req.headers.get('host')); }
  catch { return false; }
}
