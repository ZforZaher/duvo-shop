import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/server/admin-auth';
import { Monogram, Wordmark } from '@/components/Brand';
import LoginForm from './LoginForm';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function Login() {
  if (await currentUser()) redirect('/admin');
  return (
    <main className="login">
      <div className="login-card">
        <div className="brand" style={{ marginBottom: 28 }}><Wordmark /><Monogram /></div>
        <div className="label" style={{ color: 'var(--orange-text)', marginBottom: 10 }}>Duvo team</div>
        <h1 style={{ fontSize: 56, marginBottom: 24 }}>Sign in</h1>
        <LoginForm />
      </div>
    </main>
  );
}
