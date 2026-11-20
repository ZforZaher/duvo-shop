'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/admin', label: 'Dashboard', owner: false },
  { href: '/admin/orders', label: 'Orders', owner: false },
  { href: '/admin/customers', label: 'Customers', owner: false },
  { href: '/admin/products', label: 'Products', owner: true },
  { href: '/admin/settings', label: 'Settings', owner: true },
  { href: '/admin/team', label: 'Team', owner: true },
  { href: '/admin/account', label: 'My account', owner: false },
];

export default function AdminNav({ owner }: { owner: boolean }) {
  const path = usePathname();
  const active = (href: string) => (href === '/admin' ? path === '/admin' : path.startsWith(href));
  return (
    <nav className="side-nav" aria-label="Admin">
      {ITEMS.filter(i => owner || !i.owner).map(i => (
        <Link key={i.href} href={i.href} aria-current={active(i.href) ? 'page' : undefined}>{i.label}</Link>
      ))}
      <Link href="/" className="side-site">View shop ↗</Link>
    </nav>
  );
}
