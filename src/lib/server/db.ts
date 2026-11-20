import 'server-only';
// Connection to the online database (Supabase / PostgreSQL), used when DATABASE_URL is set in .env.local.
// Without it the shop keeps using the local .data/ files (handy for working offline).
import postgres from 'postgres';

type Sql = ReturnType<typeof postgres>;
const g = globalThis as unknown as { __duvoSql?: Sql | null };

/** The database client, or null when no online database is configured. */
export function db(): Sql | null {
  if (g.__duvoSql !== undefined) return g.__duvoSql;
  const url = process.env.DATABASE_URL?.trim();
  g.__duvoSql = url
    ? postgres(url, {
        ssl: 'require',      // always encrypted
        prepare: false,      // works with Supabase's connection pooler
        max: 5,
        idle_timeout: 0,     // keep connections open: opening one to Frankfurt takes ~1 s (they are still
                             // renewed now and then, and re-opened automatically if the network drops one)
        connect_timeout: 10,
        onnotice: () => {},
      })
    : null;
  return g.__duvoSql;
}
