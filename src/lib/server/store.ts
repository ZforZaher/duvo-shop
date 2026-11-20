import 'server-only';
// Small documents (shop settings, admin accounts). Stored online in the database's `kv` table when
// DATABASE_URL is set; otherwise in local JSON files in .data/ (outside public/, never served or committed).
// Both make changes one at a time, so two admins saving at once can't overwrite each other.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { db } from './db';

const DIR = path.join(process.cwd(), '.data');
const chains = new Map<string, Promise<unknown>>();

export async function readJson<T>(name: string, fallback: T): Promise<T> {
  const sql = db();
  if (sql) {
    const [row] = await sql<{ value: T }[]>`select value from kv where key = ${name}`;
    return row ? row.value : fallback;
  }
  try { return JSON.parse(await fs.readFile(path.join(DIR, name), 'utf8')) as T; }
  catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return fallback; throw e; }
}

/** Read-modify-write one document, one change at a time. */
export function updateJson<T, R = void>(name: string, fallback: T, fn: (data: T) => R | Promise<R>): Promise<R> {
  const sql = db();
  if (sql) {
    // A transaction with a row lock: any other server waits until this change is saved.
    return sql.begin(async tx => {
      await tx`insert into kv (key, value) values (${name}, ${tx.json(fallback as never)}) on conflict (key) do nothing`;
      const [row] = await tx<{ value: T }[]>`select value from kv where key = ${name} for update`;
      const data = row.value;
      const result = await fn(data);
      await tx`update kv set value = ${tx.json(data as never)}, updated_at = now() where key = ${name}`;
      return result;
    }) as Promise<R>;
  }
  const run = (chains.get(name) ?? Promise.resolve()).then(async () => {
    const data = await readJson<T>(name, fallback);
    const result = await fn(data);
    await fs.mkdir(DIR, { recursive: true, mode: 0o700 });
    const file = path.join(DIR, name), tmp = `${file}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
    await fs.rename(tmp, file); // atomic: a crash can't leave half a file
    return result;
  });
  chains.set(name, run.catch(() => undefined));
  return run;
}
