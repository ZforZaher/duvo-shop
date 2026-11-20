import 'server-only';
// Checks the settings in .env.local (or the host's environment) once, with clear messages.
// Secrets are only ever read here on the server; none use the NEXT_PUBLIC_ prefix, so none reach browsers.

type Env = {
  sessionSecret: string;
  bootstrapUser?: string;
  bootstrapPassword?: string;
  siteUrl: string;
  whatsapp: { provider: 'none' | 'wapilot' | 'cloud' | 'callmebot'; wapilotToken?: string; wapilotInstance?: string; token?: string; phoneNumberId?: string; template?: string; templateLang: string; callmebotKey?: string; to?: string };
};

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const e = process.env;
  const problems: string[] = [];
  const sessionSecret = e.ADMIN_SESSION_SECRET ?? '';
  if (sessionSecret.length < 32) problems.push('ADMIN_SESSION_SECRET must be at least 32 random characters.');
  if (e.DATABASE_URL && !/^postgres(ql)?:\/\/\S+$/.test(e.DATABASE_URL.trim())) problems.push('DATABASE_URL must be the PostgreSQL connection string from Supabase (it starts with postgresql://).');
  const provider = (e.WHATSAPP_PROVIDER ?? 'none').toLowerCase();
  if (!['none', 'wapilot', 'cloud', 'callmebot'].includes(provider)) problems.push('WHATSAPP_PROVIDER must be none, wapilot, cloud or callmebot.');
  if (provider === 'wapilot' && (!e.WAPILOT_TOKEN || !e.WAPILOT_INSTANCE_ID)) problems.push('WHATSAPP_PROVIDER=wapilot needs WAPILOT_TOKEN and WAPILOT_INSTANCE_ID.');
  if (e.WAPILOT_INSTANCE_ID && !/^[A-Za-z0-9_.-]{1,255}$/.test(e.WAPILOT_INSTANCE_ID)) problems.push('WAPILOT_INSTANCE_ID should be the instance unique name from WaPilot (letters, numbers, _ . -).');
  if (provider === 'cloud' && (!e.WHATSAPP_TOKEN || !e.WHATSAPP_PHONE_NUMBER_ID)) problems.push('WHATSAPP_PROVIDER=cloud needs WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID.');
  if (provider === 'callmebot' && !e.CALLMEBOT_API_KEY) problems.push('WHATSAPP_PROVIDER=callmebot needs CALLMEBOT_API_KEY.');
  if (e.ADMIN_PASSWORD && e.ADMIN_PASSWORD.length < 12) problems.push('ADMIN_PASSWORD must be at least 12 characters.');
  if (problems.length) throw new Error('Settings problem in .env.local:\n- ' + problems.join('\n- '));
  cached = {
    sessionSecret,
    bootstrapUser: e.ADMIN_USERNAME?.trim().toLowerCase() || undefined,
    bootstrapPassword: e.ADMIN_PASSWORD || undefined,
    siteUrl: (e.SITE_URL || 'http://localhost:3000').replace(/\/+$/, ''),
    whatsapp: {
      provider: provider as Env['whatsapp']['provider'],
      wapilotToken: e.WAPILOT_TOKEN, wapilotInstance: e.WAPILOT_INSTANCE_ID,
      token: e.WHATSAPP_TOKEN, phoneNumberId: e.WHATSAPP_PHONE_NUMBER_ID, template: e.WHATSAPP_TEMPLATE || undefined,
      templateLang: e.WHATSAPP_TEMPLATE_LANG || 'en', callmebotKey: e.CALLMEBOT_API_KEY, to: e.WHATSAPP_TO,
    },
  };
  return cached;
}
