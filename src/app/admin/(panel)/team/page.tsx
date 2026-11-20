import { requireUser } from '@/lib/server/admin-auth';
import { listUsers, MIN_PASSWORD } from '@/lib/server/users';
import { addUser, removeUser, resetUserPassword } from '../../actions';
import { ActionForm } from '../../ui';

export const metadata = { title: 'Team' };
const day = (iso?: string) => (iso ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'never');

export default async function Team() {
  const me = await requireUser('owner');
  const users = await listUsers();
  return (
    <>
      <div className="a-head"><div><div className="label">Owner only</div><h1>Team</h1></div></div>
      <p className="muted small" style={{ marginTop: -8 }}><b>Owners</b> can do everything. <b>Staff</b> see the dashboard, orders and customers, and can change order status; they can’t edit prices, settings or the team.</p>
      <section className="panel">
        <div className="tablewrap"><table className="t">
          <thead><tr><th>Username</th><th>Role</th><th>Last sign-in</th><th>New password</th><th /></tr></thead>
          <tbody>{users.map(u => (
            <tr key={u.id}>
              <td><b>{u.username}</b>{u.id === me.id && <span className="muted small"> (you)</span>}</td>
              <td>{u.role}</td><td className="small num">{day(u.lastLoginAt)}</td>
              <td>{u.id !== me.id && (
                <ActionForm action={resetUserPassword} submit="Set" className="f inline">
                  <input type="hidden" name="id" value={u.id} />
                  <input name="password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} maxLength={200} aria-label={`New password for ${u.username}`} placeholder={`${MIN_PASSWORD}+ characters`} required />
                </ActionForm>
              )}</td>
              <td>{u.id !== me.id && (
                <ActionForm action={removeUser} submit="Remove" className="f inline" danger><input type="hidden" name="id" value={u.id} /></ActionForm>
              )}</td>
            </tr>
          ))}</tbody>
        </table></div>
      </section>
      <section className="panel">
        <h2>Add a team member</h2>
        <ActionForm action={addUser} submit="Add account">
          <div className="row2">
            <label htmlFor="nu">Username<input id="nu" name="username" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={32} pattern="[a-z0-9._\-]{3,32}" placeholder="e.g. sara" required /></label>
            <label htmlFor="nr">Role<select id="nr" name="role" defaultValue="staff"><option value="staff">Staff</option><option value="owner">Owner</option></select></label>
          </div>
          <label htmlFor="np">Starting password ({MIN_PASSWORD}+ characters)<input id="np" name="password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} maxLength={200} required /></label>
        </ActionForm>
      </section>
    </>
  );
}
