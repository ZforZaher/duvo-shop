import { TIERS, VAT_RATE, MAX_CARTONS_PER_LINE, CURRENCY, type Product } from './catalog';

export type CartItem = { slug: string; cartons: number };

export type PricedLine = {
  slug: string;
  name: string;
  cartons: number;
  perCarton: number;
  pieces: number;
  unitPrice: number;
  discount: number;
  total: number;
};

export type Quote = { lines: PricedLine[]; subtotal: number; vat: number; total: number; currency: string };

const round2 = (n: number) => Math.round(n * 100) / 100;

export function discountFor(cartons: number): number {
  let d = 0;
  for (const t of TIERS) if (cartons >= t.min) d = t.discount;
  return d;
}

export function cartonPrice(p: Product): number {
  return round2(p.unitPrice * p.perCarton);
}

export function clampCartons(n: unknown): number {
  const v = Math.floor(Number(n));
  return Number.isFinite(v) ? Math.min(MAX_CARTONS_PER_LINE, Math.max(1, v)) : 1;
}

/** Prices a cart against a product list. The server always re-runs this with its own prices; never trust client totals. */
export function quote(items: CartItem[], products: Product[]): Quote {
  const lines: PricedLine[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    const p = products.find(x => x.slug === it.slug && x.active);
    if (!p || seen.has(p.slug)) continue;
    seen.add(p.slug);
    const cartons = clampCartons(it.cartons), discount = discountFor(cartons);
    lines.push({
      slug: p.slug, name: p.name, cartons, perCarton: p.perCarton, pieces: cartons * p.perCarton,
      unitPrice: p.unitPrice, discount, total: round2(cartonPrice(p) * cartons * (1 - discount)),
    });
  }
  const subtotal = round2(lines.reduce((s, l) => s + l.total, 0));
  const vat = round2(subtotal * VAT_RATE);
  return { lines, subtotal, vat, total: round2(subtotal + vat), currency: CURRENCY };
}

// Formatted by hand: the browser's number formatter (Intl) takes ~100 ms to start on slow phones,
// and all we need is "1,234.56".
const groups = (whole: string) => whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
export function money(n: number): string {
  // round half up on cents (the tiny nudge makes 2.675 -> 2.68, as people expect)
  const [whole, cents] = (Math.round((Math.abs(n) + 1e-9) * 100) / 100).toFixed(2).split('.');
  return `${CURRENCY} ${n < 0 ? '-' : ''}${groups(whole)}.${cents}`;
}
/** 12,000 style whole numbers (pieces, cartons). */
export const count = (n: number): string => (n < 0 ? '-' : '') + groups(String(Math.round(Math.abs(n))));
