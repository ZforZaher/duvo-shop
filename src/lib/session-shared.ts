// Shared by the server and the edge middleware (no Node-only imports here).
export const SESSION_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-duvo_session' : 'duvo_session';
export const SESSION_HOURS = 12;

/** Cookie value: userId.expiresAtMs.sessionVersion.signature (HMAC-SHA256, hex). */
export function splitSession(v: string | undefined): { uid: string; exp: number; ver: number; sig: string; payload: string } | null {
  if (!v) return null;
  const parts = v.split('.');
  if (parts.length !== 4) return null;
  const [uid, exp, ver, sig] = parts;
  if (!/^[a-f0-9]{16}$/.test(uid) || !/^\d{13}$/.test(exp) || !/^\d{1,6}$/.test(ver) || !/^[a-f0-9]{64}$/.test(sig)) return null;
  return { uid, exp: Number(exp), ver: Number(ver), sig, payload: `${uid}.${exp}.${ver}` };
}
