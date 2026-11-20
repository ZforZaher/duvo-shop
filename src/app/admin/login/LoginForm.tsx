'use client';
import { useActionState } from 'react';
import { login, type FormState } from '../actions';

export default function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(login, null);
  return (
    <form className="f" action={action} style={{ maxWidth: 380 }}>
      <label htmlFor="username">Username
        <input id="username" name="username" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={64} required />
      </label>
      <label htmlFor="password">Password
        <input id="password" name="password" type="password" autoComplete="current-password" maxLength={200} required />
      </label>
      {state?.error && <div className="alert" role="alert">{state.error}</div>}
      <button className="btn solid" type="submit" disabled={pending}>{pending ? 'Checking…' : 'Sign in'}</button>
    </form>
  );
}
