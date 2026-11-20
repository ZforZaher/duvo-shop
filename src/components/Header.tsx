// Site header. Rendered on the server; only the cart counter runs in the browser (CartCount).
import Link from 'next/link';
import { Monogram, Wordmark } from './Brand';
import CartCount from './cart/CartCount';

export default function Header() {
  return (
    <header className="top">
      <div className="inner">
        <Link className="brand" href="/" aria-label="Duvo home">
          <Wordmark />
          <span className="hide-sm"><Monogram /></span>
        </Link>
        <nav className="links" aria-label="Main">
          <Link href="/shop">Shop</Link>
          <Link href="/#how">How it works</Link>
          <Link href="/cart" className="cartlink">Cart<CartCount /></Link>
        </nav>
      </div>
    </header>
  );
}
