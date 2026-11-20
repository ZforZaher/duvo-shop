// Runs before every page and API request.
// 1. Admin area: no valid signed session → sign-in page (pages) or 401 (APIs). Pages and actions re-check
//    the full session on the server too (account still exists, not revoked, right role).
// 2. Content Security Policy: strict, nonce-based on admin pages (where café-entered text is shown);
//    a tight self-only policy on public pages.
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, splitSession } from '@/lib/session-shared';

const DEV = process.env.NODE_ENV !== 'production';

async function validSession(raw: string | undefined): Promise<boolean> {
  const s = splitSession(raw);
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!s || !secret || s.exp < Date.now()) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(s.payload)));
  const hex = Array.from(mac, b => b.toString(16).padStart(2, '0')).join('');
  let diff = hex.length ^ s.sig.length; // constant-time compare
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ s.sig.charCodeAt(i % s.sig.length);
  return diff === 0;
}

function csp(nonce: string | null): string {
  const script = nonce
    ? `'self' 'nonce-${nonce}' 'strict-dynamic'${DEV ? " 'unsafe-eval'" : ''}`
    : `'self' 'unsafe-inline'${DEV ? " 'unsafe-eval'" : ''}`; // public pages are static: Next's inline bootstrap needs this
  return [
    "default-src 'self'",
    `script-src ${script}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${DEV ? ' ws: wss:' : ''}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; '); // HTTPS is enforced by the Strict-Transport-Security header in production (next.config.ts)
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const adminPage = pathname.startsWith('/admin') && pathname !== '/admin/login';
  const adminApi = pathname.startsWith('/api/admin');

  if ((adminPage || adminApi) && !(await validSession(req.cookies.get(SESSION_COOKIE)?.value))) {
    if (adminApi) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
    const url = req.nextUrl.clone(); url.pathname = '/admin/login'; url.search = '';
    return NextResponse.redirect(url);
  }

  const isAdmin = pathname.startsWith('/admin');
  const nonce = isAdmin ? btoa(crypto.randomUUID()) : null;
  const policy = csp(nonce);
  const reqHeaders = new Headers(req.headers);
  if (nonce) { reqHeaders.set('x-nonce', nonce); reqHeaders.set('Content-Security-Policy', policy); }
  const res = NextResponse.next({ request: { headers: reqHeaders } });
  res.headers.set('Content-Security-Policy', policy);
  if (isAdmin) { res.headers.set('Cache-Control', 'no-store'); res.headers.set('X-Robots-Tag', 'noindex, nofollow'); }
  return res;
}

export const config = {
  matcher: [{ source: '/((?!_next/static|_next/image|favicon.ico|models/).*)' }],
};
