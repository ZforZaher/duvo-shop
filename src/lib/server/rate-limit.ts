import 'server-only';
// Sliding-window rate limits kept in server memory. Fine for one server; on a multi-instance host
// (e.g. Vercel) move this to a shared store such as Upstash Redis so limits apply across instances.

const buckets = new Map<string, number[]>();
let lastSweep = 0;

/** Records a hit and returns true when `key` went over `limit` hits within `windowMs`. */
export function limited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (now - lastSweep > 60_000) { // drop old keys so memory can't grow without bound
    lastSweep = now;
    for (const [k, v] of buckets) if (!v.length || now - v[v.length - 1] > 3_600_000) buckets.delete(k);
  }
  const hits = (buckets.get(key) ?? []).filter(t => now - t < windowMs);
  hits.push(now); buckets.set(key, hits);
  return hits.length > limit;
}

/** Forget a key, e.g. failed sign-ins after a successful one. */
export function clearLimit(key: string) { buckets.delete(key); }
