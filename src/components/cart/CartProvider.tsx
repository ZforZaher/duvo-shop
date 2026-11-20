'use client';
// The cart lives in this browser (localStorage) until the café places the order.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { clampCartons, quote, type CartItem, type Quote } from '@/lib/pricing';
import { useCatalog } from './CatalogProvider';

type Cart = {
  items: CartItem[];
  ready: boolean;
  count: number;
  quote: Quote;
  add(slug: string, cartons: number): void;
  setCartons(slug: string, cartons: number): void;
  remove(slug: string): void;
  clear(): void;
};

const KEY = 'duvo-cart-v1';
const Ctx = createContext<Cart | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { products, bySlug } = useCatalog();
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
      if (Array.isArray(raw)) setItems(raw.filter(i => bySlug(i?.slug)).map(i => ({ slug: i.slug, cartons: clampCartons(i.cartons) })));
    } catch { /* storage blocked or empty: start with an empty cart */ }
    setReady(true);
    // Load once on mount; later price changes re-price the cart through quote() below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* not saved; cart still works for this visit */ }
  }, [items, ready]);

  const add = useCallback((slug: string, cartons: number) => setItems(prev => {
    const n = clampCartons(cartons), hit = prev.find(i => i.slug === slug);
    return hit ? prev.map(i => (i.slug === slug ? { ...i, cartons: clampCartons(i.cartons + n) } : i)) : [...prev, { slug, cartons: n }];
  }), []);
  const setCartons = useCallback((slug: string, cartons: number) => setItems(prev => prev.map(i => (i.slug === slug ? { ...i, cartons: clampCartons(cartons) } : i))), []);
  const remove = useCallback((slug: string) => setItems(prev => prev.filter(i => i.slug !== slug)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<Cart>(() => ({
    items, ready, count: items.reduce((s, i) => s + i.cartons, 0), quote: quote(items, products), add, setCartons, remove, clear,
  }), [items, ready, add, setCartons, remove, clear, products]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): Cart {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCart must be used inside CartProvider');
  return c;
}
