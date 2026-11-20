import 'server-only';
// Shop settings edited from the admin panel: products you added, live prices, carton sizes, visibility and
// wording of every product, business details shown to cafés, and WhatsApp alerts. Stored in .data/settings.json.
import { DEFAULT_PRODUCTS, type Product } from '@/lib/catalog';
import { readJson, updateJson } from './store';

/** Changes made in the admin panel on top of a product (built-in or added). */
export type ProductOverride = Partial<Pick<Product, 'unitPrice' | 'perCarton' | 'active' | 'name' | 'short' | 'description' | 'facts' | 'design'>>;
export type Settings = {
  examplePrices: boolean;
  products: Record<string, ProductOverride>;
  /** Products added in the admin panel (the built-in ones are in src/lib/catalog.ts). */
  custom: Product[];
  business: { name: string; phone: string; paymentInstructions: string; replyTime: string };
  whatsapp: { enabled: boolean; to: string };
  lastAlert?: { at: string; ok: boolean; detail: string };
};

const FILE = 'settings.json';
export const DEFAULT_SETTINGS: Settings = {
  examplePrices: true,
  products: {},
  custom: [],
  business: {
    name: 'Duvo',
    phone: '',
    paymentInstructions: 'We send your invoice after confirming stock and delivery. Pay by bank transfer, InstaPay or cash on delivery.',
    replyTime: 'within one working day',
  },
  whatsapp: { enabled: false, to: '' },
};

export async function getSettings(): Promise<Settings> {
  const s = await readJson<Partial<Settings>>(FILE, {});
  return {
    ...DEFAULT_SETTINGS, ...s,
    business: { ...DEFAULT_SETTINGS.business, ...s.business },
    whatsapp: { ...DEFAULT_SETTINGS.whatsapp, ...s.whatsapp },
    products: { ...s.products },
    custom: Array.isArray(s.custom) ? s.custom : [],
  };
}

export function updateSettings(fn: (s: Settings) => void): Promise<void> {
  return updateJson<Settings>(FILE, DEFAULT_SETTINGS, raw => {
    // fill defaults before changing so partial files stay complete
    raw.business = { ...DEFAULT_SETTINGS.business, ...raw.business };
    raw.whatsapp = { ...DEFAULT_SETTINGS.whatsapp, ...raw.whatsapp };
    raw.products = { ...raw.products };
    if (!Array.isArray(raw.custom)) raw.custom = [];
    if (typeof raw.examplePrices !== 'boolean') raw.examplePrices = DEFAULT_SETTINGS.examplePrices;
    fn(raw);
  });
}

/** Products with live prices applied. `all` includes hidden ones (admin); otherwise only active (shop). */
export async function getProducts(all = false): Promise<Product[]> {
  const s = await getSettings();
  const list = [...DEFAULT_PRODUCTS, ...s.custom].map(p => ({ ...p, ...s.products[p.slug] }));
  return all ? list : list.filter(p => p.active);
}

/** True for products added in the admin panel (these can be deleted; built-in ones can only be hidden). */
export const isBuiltIn = (slug: string) => DEFAULT_PRODUCTS.some(p => p.slug === slug);

export type PublicCatalog = { products: Product[]; examplePrices: boolean };
export async function getPublicCatalog(): Promise<PublicCatalog> {
  const [products, s] = await Promise.all([getProducts(), getSettings()]);
  return { products, examplePrices: s.examplePrices };
}
