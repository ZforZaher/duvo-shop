import 'server-only';
// Tiny JSON-file "database" in .data/ (outside public/, never served, never committed).
// Writes are serialised per file and atomic (write temp file, then rename), so a crash can't leave
// half a file. Swap these two functions for a real database (e.g. Supabase) when going online.
import { promises as fs } from 'node:fs';
import path from 'node:path';

const DIR = path.join(process.cwd(), '.data');
const chains = new Map<string, Promise<unknown>>();

export async function readJson<T>(name: string, fallback: T): Promise<T> {
  try { return JSON.parse(await fs.readFile(path.join(DIR, name), 'utf8')) as T; }
  catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return fallback; throw e; }
}

/** Read-modify-write one file, one change at a time. */
export function updateJson<T, R = void>(name: string, fallback: T, fn: (data: T) => R | Promise<R>): Promise<R> {
  const run = (chains.get(name) ?? Promise.resolve()).then(async () => {
    const data = await readJson<T>(name, fallback);
    const result = await fn(data);
    await fs.mkdir(DIR, { recursive: true, mode: 0o700 });
    const file = path.join(DIR, name), tmp = `${file}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
    await fs.rename(tmp, file);
    return result;
  });
  chains.set(name, run.catch(() => undefined));
  return run;
}
