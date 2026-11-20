// Node.js-only part of instrumentation.ts: warm up the database connection (about a second to Frankfurt).
import { db } from './lib/server/db';

const sql = db();
if (sql) await sql`select 1`.catch(() => { /* the shop still starts; the first order will connect instead */ });
