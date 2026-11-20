// One-time setup of the online database (Supabase / PostgreSQL):  npm run db:setup
//  1. creates the tables the shop uses (safe to run again: nothing is dropped or overwritten)
//  2. locks them so only the shop's own server can read them (Supabase's public API keys can't)
//  3. copies orders, settings and admin accounts from .data/ into the database, skipping anything
//     that is already there
// Reads DATABASE_URL from .env.local. Prints counts only, never data or secrets.
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const postgres = require('postgres');

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const url = process.env.DATABASE_URL || (env.match(/^DATABASE_URL=(.*)$/m)?.[1] ?? '').trim().replace(/^["']|["']$/g, '');
if (!/^postgres(ql)?:\/\//.test(url)) {
  console.error('DATABASE_URL is missing in .env.local (it starts with postgresql://). See README › Online database.');
  process.exit(1);
}
const sql = postgres(url, { ssl: 'require', prepare: false, max: 1, onnotice: () => {} });

try {
  const [{ ready }] = await sql`select to_regclass('public.orders') is not null and to_regclass('public.kv') is not null as ready`;
  // A restricted shop login can't create tables; if they already exist there is nothing to do.
  if (ready) console.log('Tables already exist (orders, kv).');
  else await sql.unsafe(`
    create table if not exists orders (
      id         text primary key,
      created_at timestamptz not null,
      status     text not null,
      data       jsonb not null
    );
    create index if not exists orders_created_at_idx on orders (created_at desc);
    create table if not exists kv (
      key        text primary key,
      value      jsonb not null,
      updated_at timestamptz not null default now()
    );
    -- Row level security with no policies: Supabase's public (anon) and logged-in API roles see nothing.
    alter table orders enable row level security;
    alter table kv enable row level security;
    do $$ begin
      if exists (select 1 from pg_roles where rolname = 'anon') then
        revoke all on table orders, kv from anon, authenticated;
      end if;
    end $$;
  `);
  if (!ready) console.log('Tables created (orders, kv), locked to the shop server.');

  const read = f => (existsSync(`.data/${f}`) ? JSON.parse(readFileSync(`.data/${f}`, 'utf8')) : null);
  const orders = read('orders.json') ?? [];
  let added = 0;
  for (const o of orders) {
    const r = await sql`insert into orders (id, created_at, status, data) values (${o.id}, ${o.createdAt}, ${o.status}, ${sql.json(o)})
      on conflict (id) do nothing returning id`;
    added += r.length;
  }
  console.log(`Orders: ${added} copied, ${orders.length - added} already online.`);
  for (const key of ['settings.json', 'admins.json']) {
    const v = read(key);
    if (!v) { console.log(`${key}: nothing to copy.`); continue; }
    const r = await sql`insert into kv (key, value) values (${key}, ${sql.json(v)}) on conflict (key) do nothing returning key`;
    console.log(`${key}: ${r.length ? 'copied' : 'already online, left as it is'}.`);
  }
  const [{ n }] = await sql`select count(*)::int as n from orders`;
  console.log(`Done. The database now holds ${n} order(s).`);
} catch (e) {
  console.error('Setup failed:', e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
