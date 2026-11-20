import 'server-only';
// Admin sessions: a signed, http-only, SameSite=Strict cookie (Secure and __Host- prefixed in production)
// holding the user id, expiry and session version. Every admin page and action calls requireUser(),
// which re-checks the signature, expiry, that the account still exists and that the session wasn't revoked.
import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, SESSION_HOURS, splitSession } from '@/lib/session-shared';
import { env } from './env';
import { getUser, type PublicUser, type Role } from './users';

const sign = (payload: string) => crypto.createHmac('sha256', env().sessionSecret).update(payload).digest('hex');

export async function startSession(uid: string, version: number) {
  const exp = Date.now() + SESSION_HOURS * 3_600_000, payload = `${uid}.${exp}.${version}`;
  (await cookies()).set(SESSION_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: SESSION_HOURS * 3600,
  });
}
export async function endSession() { (await cookies()).delete(SESSION_COOKIE); }

export async function currentUser(): Promise<PublicUser | null> {
  const s = splitSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!s || s.exp < Date.now()) return null;
  const good = sign(s.payload);
  if (!crypto.timingSafeEqual(Buffer.from(good), Buffer.from(s.sig))) return null;
  const u = await getUser(s.uid);
  if (!u || u.sessionVersion !== s.ver) return null;
  const { sessionVersion: _v, ...pub } = u; void _v;
  return pub;
}

/** For admin pages and actions: the signed-in user, or a redirect to sign-in. Staff can't open owner-only areas. */
export async function requireUser(role: Role = 'staff'): Promise<PublicUser> {
  const u = await currentUser();
  if (!u) redirect('/admin/login');
  if (role === 'owner' && u.role !== 'owner') redirect('/admin?denied=1');
  return u;
}
