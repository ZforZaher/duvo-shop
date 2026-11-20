import { requireUser } from '@/lib/server/admin-auth';
import { MIN_PASSWORD } from '@/lib/server/users';
import { changeOwnPassword, logoutEverywhere } from '../../actions';
import { ActionForm } from '../../ui';

export const metadata = { title: 'My account' };

export default async function Account() {
  const me = await requireUser();
  return (
    <>
      <div className="a-head"><div><div className="label">{me.role} · {me.username}</div><h1>My account</h1></div></div>
      <section className="panel" style={{ maxWidth: 560 }}>
        <h2>Change password</h2>
        <p className="muted small">At least {MIN_PASSWORD} characters. Changing it signs you out on every other device.</p>
        <ActionForm action={changeOwnPassword} submit="Change password">
          <input type="text" name="username" autoComplete="username" value={me.username} readOnly hidden />
          <label htmlFor="cur">Current password<input id="cur" name="current" type="password" autoComplete="current-password" maxLength={200} required /></label>
          <label htmlFor="nw">New password<input id="nw" name="next" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} maxLength={200} required /></label>
          <label htmlFor="ag">New password again<input id="ag" name="again" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} maxLength={200} required /></label>
        </ActionForm>
      </section>
      <section className="panel" style={{ maxWidth: 560 }}>
        <h2>Sign out everywhere</h2>
        <p className="muted small">Ends every session for your account, including this one. Use it if you signed in on a shared or lost device.</p>
        <form action={logoutEverywhere}><button className="btn small danger" type="submit">Sign out everywhere</button></form>
      </section>
    </>
  );
}
