import 'server-only';
// Admin accounts. Passwords are stored only as scrypt hashes (OWASP settings: N=2^17, r=8, p=1, 16-byte salt).
// The first owner account is created from ADMIN_USERNAME / ADMIN_PASSWORD in .env.local the first time
// someone signs in; after that the password lives only as a hash here and can be removed from .env.local.
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { readJson, updateJson } from './store';
import { env } from './env';

export type Role = 'owner' | 'staff';
export type User = { id: string; username: string; role: Role; hash: string; sessionVersion: number; createdAt: string; lastLoginAt?: string };
type Db = { users: User[] };

const FILE = 'admins.json';
const scrypt = promisify(crypto.scrypt) as (pw: string, salt: Buffer, len: number, opts: crypto.ScryptOptions) => Promise<Buffer>;
const PARAMS = { N: 2 ** 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
export const MIN_PASSWORD = 12;

export async function hashPassword(pw: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(pw, salt, 64, PARAMS);
  return `scrypt$17$8$1$${salt.toString('base64')}$${key.toString('base64')}`;
}
async function checkHash(pw: string, stored: string): Promise<boolean> {
  const [alg, logN, r, p, s, k] = stored.split('$');
  if (alg !== 'scrypt' || !s || !k) return false;
  const expected = Buffer.from(k, 'base64');
  const key = await scrypt(pw, Buffer.from(s, 'base64'), expected.length, { N: 2 ** Number(logN), r: Number(r), p: Number(p), maxmem: PARAMS.maxmem });
  return key.length === expected.length && crypto.timingSafeEqual(key, expected);
}
let dummyHash: Promise<string> | null = null; // so a wrong username takes as long as a wrong password

export function passwordProblem(pw: string, username = ''): string | null {
  if (pw.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (pw.length > 200) return 'Use at most 200 characters.';
  if (username && pw.toLowerCase().includes(username.toLowerCase())) return 'Don’t include the username in the password.';
  if (/^(.)\1+$/.test(pw)) return 'Don’t use one repeated character.';
  return null;
}

const strip = (u: User) => ({ id: u.id, username: u.username, role: u.role, createdAt: u.createdAt, lastLoginAt: u.lastLoginAt });
export type PublicUser = ReturnType<typeof strip>;

async function ensureBootstrap(): Promise<void> {
  const db = await readJson<Db>(FILE, { users: [] });
  if (db.users.length) return;
  const { bootstrapUser, bootstrapPassword } = env();
  if (!bootstrapUser || !bootstrapPassword) return;
  const hash = await hashPassword(bootstrapPassword);
  await updateJson<Db>(FILE, { users: [] }, d => {
    if (d.users.length) return;
    d.users.push({ id: crypto.randomBytes(8).toString('hex'), username: bootstrapUser, role: 'owner', hash, sessionVersion: 1, createdAt: new Date().toISOString() });
  });
}

export async function listUsers(): Promise<PublicUser[]> {
  await ensureBootstrap();
  return (await readJson<Db>(FILE, { users: [] })).users.map(strip);
}
export async function getUser(id: string): Promise<(PublicUser & { sessionVersion: number }) | null> {
  const u = (await readJson<Db>(FILE, { users: [] })).users.find(x => x.id === id);
  return u ? { ...strip(u), sessionVersion: u.sessionVersion } : null;
}

/** Returns the account when username and password both match, otherwise null (same timing either way). */
export async function verifyLogin(username: string, password: string): Promise<(PublicUser & { sessionVersion: number }) | null> {
  await ensureBootstrap();
  const name = username.trim().toLowerCase();
  const u = (await readJson<Db>(FILE, { users: [] })).users.find(x => x.username === name);
  if (!u) { await checkHash(password, await (dummyHash ??= hashPassword(crypto.randomBytes(12).toString('hex')))); return null; }
  if (!(await checkHash(password, u.hash))) return null;
  await updateJson<Db>(FILE, { users: [] }, d => { const x = d.users.find(y => y.id === u.id); if (x) x.lastLoginAt = new Date().toISOString(); });
  return { ...strip(u), sessionVersion: u.sessionVersion };
}

export async function createUser(username: string, password: string, role: Role): Promise<string | null> {
  const name = username.trim().toLowerCase();
  const hash = await hashPassword(password);
  return updateJson<Db, string | null>(FILE, { users: [] }, d => {
    if (d.users.some(x => x.username === name)) return 'That username is taken.';
    d.users.push({ id: crypto.randomBytes(8).toString('hex'), username: name, role, hash, sessionVersion: 1, createdAt: new Date().toISOString() });
    return null;
  });
}

/** Sets a new password and signs that account out everywhere (bumps its session version). */
export async function setPassword(id: string, password: string): Promise<void> {
  const hash = await hashPassword(password);
  await updateJson<Db>(FILE, { users: [] }, d => { const u = d.users.find(x => x.id === id); if (u) { u.hash = hash; u.sessionVersion++; } });
}
export async function checkPassword(id: string, password: string): Promise<boolean> {
  const u = (await readJson<Db>(FILE, { users: [] })).users.find(x => x.id === id);
  return !!u && checkHash(password, u.hash);
}
export async function signOutEverywhere(id: string): Promise<void> {
  await updateJson<Db>(FILE, { users: [] }, d => { const u = d.users.find(x => x.id === id); if (u) u.sessionVersion++; });
}

/** Deletes an account. Refuses to remove the last owner. */
export async function deleteUser(id: string): Promise<string | null> {
  return updateJson<Db, string | null>(FILE, { users: [] }, d => {
    const u = d.users.find(x => x.id === id);
    if (!u) return null;
    if (u.role === 'owner' && d.users.filter(x => x.role === 'owner').length === 1) return 'You can’t remove the last owner.';
    d.users = d.users.filter(x => x.id !== id);
    return null;
  });
}
