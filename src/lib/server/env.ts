import 'server-only';
// Checks the settings in .env.local (or the host's environment) once, with clear messages.
// Secrets are only ever read here on the server; none use the NEXT_PUBLIC_ prefix, so none reach browsers.

type Env = {
  sessionSecret: string;
  bootstrapUser?: string;
  bootstrapPassword?: string;
  siteUrl: string;
  whatsapp: { provider: 'none' | 'wapilot' | 'cloud' | 'callmebot'; wapilotToken?: string; wapilotInstance?: string; token?: string; phoneNumberId?: string; template?: string; templateLang: string; callmebotKey?: string; to?: string };
  /** Order alerts to the owner's phone through a Telegram bot (set when both values are present). */
  telegram?: { token: string; chatId: string };
  /** Push notifications through the ntfy app: a secret channel ("topic") on an ntfy server. */
  ntfy?: { server: string; topic: string };
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
  const tgToken = e.TELEGRAM_BOT_TOKEN?.trim(), tgChat = e.TELEGRAM_CHAT_ID?.trim();
  if (tgToken && !/^\d{5,}:[A-Za-z0-9_-]{30,}$/.test(tgToken)) problems.push('TELEGRAM_BOT_TOKEN should look like 123456789:AA… (the token @BotFather gave you).');
  if (tgChat && !/^-?\d{3,20}$/.test(tgChat)) problems.push('TELEGRAM_CHAT_ID should be a number (run npm run telegram:link to fill it in).');
  const ntfyTopic = e.NTFY_TOPIC?.trim(), ntfyServer = (e.NTFY_SERVER?.trim() || 'https://ntfy.sh').replace(/\/+$/, '');
  if (ntfyTopic && !/^[A-Za-z0-9_-]{20,64}$/.test(ntfyTopic)) problems.push('NTFY_TOPIC must be 20–64 letters, numbers, - or _ (long, so nobody can guess it).');
  if (!/^https:\/\/[^\s/]+$/.test(ntfyServer)) problems.push('NTFY_SERVER must be an https:// address, e.g. https://ntfy.sh');
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
    telegram: tgToken && tgChat ? { token: tgToken, chatId: tgChat } : undefined,
    ntfy: ntfyTopic ? { server: ntfyServer, topic: ntfyTopic } : undefined,
  };
  return cached;
}
