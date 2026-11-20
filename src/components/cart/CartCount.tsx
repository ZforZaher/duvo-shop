'use client';
// The number badge next to "Cart" in the header (the cart is saved in the browser).
import { useCart } from './CartProvider';

export default function CartCount() {
  const { count, ready } = useCart();
  return ready && count > 0 ? <span className="count">{count}</span> : null;
}
