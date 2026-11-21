// Connects order alerts to your Telegram:  npm run telegram:link
// Before running: put your bot's token in .env.local as TELEGRAM_BOT_TOKEN=..., then open your bot in
// Telegram and send it any message (e.g. "hi"). This finds that chat, saves TELEGRAM_CHAT_ID in .env.local
// and sends a confirmation to your phone. The token is never printed.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const FILE = '.env.local';
let env = existsSync(FILE) ? readFileSync(FILE, 'utf8') : '';
const token = (env.match(/^TELEGRAM_BOT_TOKEN=(.*)$/m)?.[1] ?? '').trim().replace(/^["']|["']$/g, '');
if (!/^\d{5,}:[A-Za-z0-9_-]{30,}$/.test(token)) {
  console.error('Put the token from @BotFather in .env.local as TELEGRAM_BOT_TOKEN=123456789:AA... first.');
  process.exit(1);
}
const api = async (method, body) => {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}),
  });
  const d = await r.json().catch(() => ({}));
  if (!d.ok) throw new Error(`Telegram: ${d.description || r.status}`);
  return d.result;
};

try {
  const me = await api('getMe');
  console.log(`Bot: @${me.username}`);
  const updates = await api('getUpdates', { allowed_updates: ['message'] });
  const chats = updates.map(u => u.message?.chat).filter(c => c && c.type === 'private');
  const chat = chats[chats.length - 1];
  if (!chat) {
    console.error(`No message found. Open https://t.me/${me.username} in Telegram, press Start (or send "hi"), then run this again.`);
    process.exit(1);
  }
  env = /^TELEGRAM_CHAT_ID=.*$/m.test(env) ? env.replace(/^TELEGRAM_CHAT_ID=.*$/m, `TELEGRAM_CHAT_ID=${chat.id}`) : `${env.trimEnd()}\nTELEGRAM_CHAT_ID=${chat.id}\n`;
  writeFileSync(FILE, env);
  await api('sendMessage', { chat_id: chat.id, text: 'Duvo order alerts are connected. New orders will appear here.' });
  console.log(`Linked to ${chat.first_name ?? 'your'} chat and saved TELEGRAM_CHAT_ID in .env.local. Check your phone for a confirmation.`);
  console.log('Restart the shop, then turn alerts on in Admin › Settings.');
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
