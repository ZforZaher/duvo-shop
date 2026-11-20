import type { Metadata } from 'next';
import { requireUser } from '@/lib/server/admin-auth';
import { Monogram, Wordmark } from '@/components/Brand';
import AdminNav from './AdminNav';
import { logout } from '../actions';

export const metadata: Metadata = { title: { default: 'Admin', template: '%s · Duvo admin' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const me = await requireUser();
  return (
    <div className="admin">
      <aside className="side">
        <div className="side-top">
          <div className="brand"><Wordmark /><Monogram width={26} /></div>
          <div className="label side-role">{me.role === 'owner' ? 'Owner' : 'Staff'} · {me.username}</div>
        </div>
        <AdminNav owner={me.role === 'owner'} />
        <form action={logout} className="side-out"><button className="btn small" type="submit">Sign out</button></form>
      </aside>
      <div className="admin-main">{children}</div>
    </div>
  );
}
