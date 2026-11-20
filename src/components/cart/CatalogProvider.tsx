'use client';
// Live catalogue (active products + current prices) handed down from the server layout.
import { createContext, useContext, useMemo } from 'react';
import type { Product } from '@/lib/catalog';

type Catalog = { products: Product[]; examplePrices: boolean; bySlug: (slug: string) => Product | undefined };
const Ctx = createContext<Catalog>({ products: [], examplePrices: true, bySlug: () => undefined });

export function CatalogProvider({ value, children }: { value: { products: Product[]; examplePrices: boolean }; children: React.ReactNode }) {
  // Stable for as long as the prices don't change, so effects that depend on it don't re-run every render.
  const ctx = useMemo<Catalog>(() => ({
    products: value.products, examplePrices: value.examplePrices,
    bySlug: (slug: string) => value.products.find(p => p.slug === slug),
  }), [value.products, value.examplePrices]);
  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}
export const useCatalog = () => useContext(Ctx);
