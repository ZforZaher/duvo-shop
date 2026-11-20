'use server';
// Every admin action re-checks the session and role on the server (requireUser) before doing anything,
// cleans its input, and is protected by Next's built-in same-origin check for server actions.
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { endSession, requireUser, startSession } from '@/lib/server/admin-auth';
import { clientIp } from '@/lib/server/request';
import { clearLimit, limited } from '@/lib/server/rate-limit';
import { cleanLine, cleanText, digits, isUsername, toNumber } from '@/lib/server/sanitize';
import { isGroupId } from '@/lib/server/whatsapp';
import { deleteOrder, setStatus, STATUSES, type Status } from '@/lib/server/orders';
import { getProducts, isBuiltIn, updateSettings } from '@/lib/server/settings';
import type { Category, Design, Product } from '@/lib/catalog';
import { checkPassword, createUser, deleteUser, getUser, passwordProblem, setPassword, signOutEverywhere, verifyLogin, type Role } from '@/lib/server/users';
import { sendTestAlert } from '@/lib/server/whatsapp';

export type FormState = { ok?: string; error?: string } | null;
const str = (fd: FormData, k: string) => (typeof fd.get(k) === 'string' ? (fd.get(k) as string) : '');

// ---------- sign in / out ----------
export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const ip = await clientIp(), username = cleanLine(str(fd, 'username'), 64).toLowerCase(), password = str(fd, 'password').slice(0, 200);
  if (limited(`login:ip:${ip}`, 10, 15 * 60_000) || limited(`login:user:${username}`, 8, 15 * 60_000)) {
    return { error: 'Too many sign-in attempts. Wait 15 minutes and try again.' };
  }
  const user = await verifyLogin(username, password);
  if (!user) return { error: 'That username or password is not right.' }; // same message either way
  clearLimit(`login:user:${username}`);
  await startSession(user.id, user.sessionVersion);
  redirect('/admin');
}

export async function logout() {
  await endSession();
  redirect('/admin/login');
}

export async function logoutEverywhere() {
  const me = await requireUser();
  await signOutEverywhere(me.id);
  await endSession();
  redirect('/admin/login');
}

// ---------- orders (staff and owner) ----------
export async function changeStatus(fd: FormData) {
  const me = await requireUser();
  const id = cleanLine(str(fd, 'id'), 20), status = str(fd, 'status') as Status;
  if (!STATUSES.includes(status)) return;
  await setStatus(id, status, me.username);
  revalidatePath('/admin', 'layout');
}

export async function removeOrder(_: FormState, fd: FormData): Promise<FormState> {
  await requireUser('owner');
  if (str(fd, 'confirm') !== 'DELETE') return { error: 'Type DELETE to confirm.' };
  const ok = await deleteOrder(cleanLine(str(fd, 'id'), 20));
  if (!ok) return { error: 'That order no longer exists.' };
  revalidatePath('/admin', 'layout');
  redirect('/admin/orders');
}

// ---------- products (owner) ----------
export async function saveProducts(_: FormState, fd: FormData): Promise<FormState> {
  await requireUser('owner');
  const products = await getProducts(true), errors: string[] = [], next: Record<string, { unitPrice: number; perCarton: number; active: boolean }> = {};
  for (const p of products) {
    const price = toNumber(str(fd, `price:${p.slug}`), { min: 0.01, max: 10_000, step: 0.01 });
    const carton = toNumber(str(fd, `carton:${p.slug}`), { min: 1, max: 100_000, step: 1 });
    if (price === null) errors.push(`${p.name}: price must be between 0.01 and 10,000.`);
    if (carton === null) errors.push(`${p.name}: carton size must be a whole number from 1 to 100,000.`);
    next[p.slug] = { unitPrice: price ?? p.unitPrice, perCarton: carton ?? p.perCarton, active: fd.get(`active:${p.slug}`) === 'on' };
  }
  if (errors.length) return { error: errors.join(' ') };
  await updateSettings(s => {
    for (const [slug, o] of Object.entries(next)) s.products[slug] = { ...s.products[slug], ...o }; // keep edited wording
    s.examplePrices = fd.get('examplePrices') === 'on';
  });
  revalidatePath('/', 'layout'); // rebuild shop pages with the new prices
  return { ok: 'Prices saved. The shop shows them now.' };
}

// ---------- add / edit / delete a product (owner) ----------
const CATEGORIES: Category[] = ['cup', 'sleeve'];
const DESIGNS: Design[] = ['split', 'heart', 'round'];
/** "Mango + Milk cup!" -> "mango-milk-cup" (used in the product's web address). */
const slugify = (s: string) => s.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '');

/** Reads and checks the product form. Returns the fields or an error message. */
function productFields(fd: FormData): { error: string } | { p: Omit<Product, 'slug'> } {
  const name = cleanLine(str(fd, 'name'), 60), short = cleanLine(str(fd, 'short'), 120), description = cleanText(str(fd, 'description'), 700);
  const category = str(fd, 'category') as Category, design = str(fd, 'design') as Design;
  const facts = cleanText(str(fd, 'facts'), 600).split(/\r?\n/).map(l => cleanLine(l, 80)).filter(Boolean);
  const unitPrice = toNumber(str(fd, 'unitPrice'), { min: 0.01, max: 10_000, step: 0.01 });
  const perCarton = toNumber(str(fd, 'perCarton'), { min: 1, max: 100_000, step: 1 });
  if (name.length < 2) return { error: 'Give the product a name (at least 2 characters).' };
  if (!CATEGORIES.includes(category)) return { error: 'Choose cup or sleeve.' };
  if (!DESIGNS.includes(design)) return { error: 'Choose which cup shape it shows (split, heart or round).' };
  if (!short) return { error: 'Add a short line for the shop card.' };
  if (!description) return { error: 'Add a description for the product page.' };
  if (facts.length > 6) return { error: 'Use at most 6 key facts (one per line).' };
  if (unitPrice === null) return { error: 'Price per piece must be between 0.01 and 10,000.' };
  if (perCarton === null) return { error: 'Pieces per carton must be a whole number from 1 to 100,000.' };
  return { p: { name, short, description, category, design, facts, unitPrice, perCarton, active: fd.get('active') === 'on' } };
}

export async function addProduct(_: FormState, fd: FormData): Promise<FormState> {
  await requireUser('owner');
  const r = productFields(fd);
  if ('error' in r) return r;
  const slug = slugify(str(fd, 'slug') || r.p.name);
  if (slug.length < 2) return { error: 'The web address needs at least 2 letters or numbers.' };
  if (slug === 'new') return { error: '“new” is reserved. Pick another web address.' };
  if ((await getProducts(true)).some(p => p.slug === slug)) return { error: `A product with the web address “${slug}” already exists. Change the name or the web address.` };
  let tooMany = false;
  await updateSettings(s => {
    if (s.custom.length >= 100) { tooMany = true; return; }
    s.custom.push({ slug, ...r.p });
  });
  if (tooMany) return { error: 'You can add up to 100 products.' };
  revalidatePath('/', 'layout');
  redirect(`/admin/products?added=${slug}`);
}

export async function updateProduct(_: FormState, fd: FormData): Promise<FormState> {
  await requireUser('owner');
  const slug = cleanLine(str(fd, 'slug'), 40);
  if (!(await getProducts(true)).some(p => p.slug === slug)) return { error: 'That product no longer exists.' };
  const r = productFields(fd);
  if ('error' in r) return r;
  await updateSettings(s => {
    const own = s.custom.find(p => p.slug === slug);
    if (own) { Object.assign(own, r.p); delete s.products[slug]; } // added products are stored whole
    else {
      // built-in products: the category can't change, everything else is stored as an override
      const { category: _c, ...rest } = r.p; void _c;
      s.products[slug] = { ...s.products[slug], ...rest };
    }
  });
  revalidatePath('/', 'layout');
  return { ok: 'Saved. The shop shows the changes now.' };
}

export async function deleteProduct(_: FormState, fd: FormData): Promise<FormState> {
  await requireUser('owner');
  const slug = cleanLine(str(fd, 'slug'), 40);
  if (isBuiltIn(slug)) return { error: 'Built-in products can be hidden from the shop, but not deleted.' };
  if (str(fd, 'confirm') !== 'DELETE') return { error: 'Type DELETE to confirm.' };
  let found = false;
  await updateSettings(s => {
    found = s.custom.some(p => p.slug === slug);
    s.custom = s.custom.filter(p => p.slug !== slug);
    delete s.products[slug];
  });
  if (!found) return { error: 'That product no longer exists.' };
  revalidatePath('/', 'layout');
  redirect('/admin/products');
}

// ---------- settings (owner) ----------
export async function saveSettings(_: FormState, fd: FormData): Promise<FormState> {
  await requireUser('owner');
  const rawTo = str(fd, 'waTo').trim();
  const to = isGroupId(rawTo) ? rawTo : digits(rawTo); // a phone number, or a WhatsApp group id (…@g.us)
  if (!isGroupId(to) && to && (to.length < 8 || to.length > 15)) return { error: 'Enter the WhatsApp number with country code (e.g. 201001234567), or a group id ending in @g.us.' };
  const enabled = fd.get('waEnabled') === 'on';
  if (enabled && !to) return { error: 'Add the WhatsApp number that should receive order alerts.' };
  await updateSettings(s => {
    s.business = {
      name: cleanLine(str(fd, 'name'), 80) || 'Duvo',
      phone: cleanLine(str(fd, 'phone'), 30),
      paymentInstructions: cleanText(str(fd, 'payment'), 600),
      replyTime: cleanLine(str(fd, 'replyTime'), 60),
    };
    s.whatsapp = { enabled, to };
  });
  revalidatePath('/', 'layout');
  return { ok: 'Settings saved.' };
}

export async function testWhatsApp(): Promise<FormState> {
  const me = await requireUser('owner');
  if (limited(`wa-test:${me.id}`, 5, 3_600_000)) return { error: 'You can send 5 test messages an hour.' };
  const r = await sendTestAlert(me.username);
  revalidatePath('/admin/settings');
  return r.ok ? { ok: r.detail } : { error: r.detail };
}

// ---------- team (owner) ----------
export async function addUser(_: FormState, fd: FormData): Promise<FormState> {
  await requireUser('owner');
  const username = cleanLine(str(fd, 'username'), 32).toLowerCase(), password = str(fd, 'password'), role = (str(fd, 'role') === 'owner' ? 'owner' : 'staff') as Role;
  if (!isUsername(username)) return { error: 'Usernames are 3–32 characters: lowercase letters, numbers, dots, dashes or underscores.' };
  const problem = passwordProblem(password, username);
  if (problem) return { error: problem };
  const taken = await createUser(username, password, role);
  if (taken) return { error: taken };
  revalidatePath('/admin/team');
  return { ok: `Added ${username} as ${role}. Share the password with them privately; they can change it under Account.` };
}

export async function removeUser(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireUser('owner');
  const id = cleanLine(str(fd, 'id'), 16);
  if (id === me.id) return { error: 'You can’t remove your own account.' };
  const err = await deleteUser(id);
  if (err) return { error: err };
  revalidatePath('/admin/team');
  return { ok: 'Account removed. They are signed out.' };
}

export async function resetUserPassword(_: FormState, fd: FormData): Promise<FormState> {
  await requireUser('owner');
  const id = cleanLine(str(fd, 'id'), 16), password = str(fd, 'password');
  const u = await getUser(id);
  if (!u) return { error: 'That account no longer exists.' };
  const problem = passwordProblem(password, u.username);
  if (problem) return { error: problem };
  await setPassword(id, password);
  return { ok: `New password set for ${u.username}. They are signed out everywhere.` };
}

// ---------- own account (everyone) ----------
export async function changeOwnPassword(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireUser();
  if (limited(`pw:${me.id}`, 5, 15 * 60_000)) return { error: 'Too many attempts. Wait 15 minutes.' };
  const current = str(fd, 'current'), next = str(fd, 'next'), again = str(fd, 'again');
  if (!(await checkPassword(me.id, current))) return { error: 'Your current password is not right.' };
  if (next !== again) return { error: 'The two new passwords don’t match.' };
  const problem = passwordProblem(next, me.username);
  if (problem) return { error: problem };
  await setPassword(me.id, next); // signs out every other session
  const u = await getUser(me.id);
  if (u) await startSession(u.id, u.sessionVersion); // keep this browser signed in
  return { ok: 'Password changed. Other devices have been signed out.' };
}
