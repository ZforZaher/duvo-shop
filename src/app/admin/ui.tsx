'use client';
// Small client helpers for admin forms: shows the action's result and a busy state.
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { FormState } from './actions';

export function ActionForm({ action, children, submit, className = 'f', danger = false }: {
  action: (s: FormState, fd: FormData) => Promise<FormState>;
  children?: React.ReactNode; submit: string; className?: string; danger?: boolean;
}) {
  const [state, act] = useActionState(action, null);
  return (
    <form action={act} className={className}>
      {children}
      <div className="btns" style={{ alignItems: 'center' }}>
        <Submit label={submit} danger={danger} />
        {state?.ok && <span className="okmsg" role="status">{state.ok}</span>}
      </div>
      {state?.error && <div className="alert" role="alert">{state.error}</div>}
    </form>
  );
}

function Submit({ label, danger }: { label: string; danger: boolean }) {
  const { pending } = useFormStatus();
  return <button className={`btn small ${danger ? 'danger' : 'solid'}`} type="submit" disabled={pending}>{pending ? 'Working…' : label}</button>;
}

/** Submits as soon as the select changes (status menus). */
export function AutoSubmitSelect({ name, value, options, label }: { name: string; value: string; options: readonly string[]; label: string }) {
  return (
    <select name={name} defaultValue={value} aria-label={label} onChange={e => e.currentTarget.form?.requestSubmit()}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
