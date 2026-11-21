import { requireUser } from '@/lib/server/admin-auth';
import { getSettings } from '@/lib/server/settings';
import { env } from '@/lib/server/env';
import { saveSettings, testWhatsApp } from '../../actions';
import { ActionForm } from '../../ui';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  await requireUser('owner');
  const s = await getSettings(), provider = env().whatsapp.provider, telegram = !!env().telegram, ntfy = !!env().ntfy;
  const providerName = { none: 'not set up', wapilot: 'WaPilot', cloud: 'WhatsApp Cloud API (Meta)', callmebot: 'CallMeBot' }[provider];
  return (
    <>
      <div className="a-head"><div><div className="label">Owner only</div><h1>Settings</h1></div></div>
      <ActionForm action={saveSettings} submit="Save settings" className="f settings">
        <section className="panel">
          <h2>Order alerts on your phone</h2>
          <p className="muted small">
            ntfy app: <b>{ntfy ? 'connected' : 'not set up'}</b> · Telegram: <b>{telegram ? 'connected' : 'not set up'}</b> · WhatsApp: <b>{providerName}</b>
            {!ntfy && !telegram && provider === 'none' && ' (set one up in .env.local, see the README)'}.
          </p>
          <label className="check"><input type="checkbox" name="waEnabled" defaultChecked={s.whatsapp.enabled} /><span>Send me an alert for every new order</span></label>
          <label htmlFor="waTo">WhatsApp number with country code, or a group id <span className="opt">({provider === 'none' ? 'only for WhatsApp alerts' : 'optional with Telegram'})</span>
            <input id="waTo" name="waTo" defaultValue={s.whatsapp.to} placeholder="201001234567  or  120363…@g.us" maxLength={48} autoComplete="off" spellCheck={false} /></label>
          {provider === 'wapilot' && <p className="muted small" style={{ margin: 0 }}>Your WaPilot instance is the number that <b>sends</b>. Put a different number here (or a group you are in), otherwise the alert lands in “Message yourself” with no notification.</p>}
          {s.lastAlert && (
            <p className={`small ${s.lastAlert.ok ? 'okmsg' : 'errmsg'}`} style={{ margin: 0 }}>
              Last alert {new Date(s.lastAlert.at).toLocaleString('en-GB')}: {s.lastAlert.ok ? 'sent' : 'failed'}. {s.lastAlert.detail}
            </p>
          )}
        </section>
        <section className="panel">
          <h2>Shown to cafés after they order</h2>
          <label htmlFor="name">Business name<input id="name" name="name" defaultValue={s.business.name} maxLength={80} /></label>
          <label htmlFor="phone">Phone for questions <span className="opt">(optional)</span><input id="phone" name="phone" defaultValue={s.business.phone} maxLength={30} inputMode="tel" /></label>
          <label htmlFor="replyTime">We reply…<input id="replyTime" name="replyTime" defaultValue={s.business.replyTime} maxLength={60} placeholder="within one working day" /></label>
          <label htmlFor="payment">How to pay<textarea id="payment" name="payment" defaultValue={s.business.paymentInstructions} maxLength={600} /></label>
        </section>
      </ActionForm>
      <section className="panel">
        <h2>Test the alert</h2>
        <p className="muted small">Save your settings first. Sends one test message to every channel that is set up.</p>
        <ActionForm action={testWhatsApp} submit="Send test message" />
      </section>
    </>
  );
}
