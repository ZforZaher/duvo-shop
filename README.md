# Duvo shop

Online shop where cafés order Duvo twin cups and sleeves by the carton and pay by invoice.
Built with Next.js 15 (App Router, TypeScript) and three.js for the 3D cups.

## Run it on this PC

```bash
npm install
npm run dev
```

Then open http://localhost:3000. The admin panel is at http://localhost:3000/admin; sign in with
`ADMIN_USERNAME` and `ADMIN_PASSWORD` from `.env.local`. Restart `npm run dev` after changing them.

**Dev mode is slow on purpose** (no minifying, extra checks). To see the real speed, or to run Lighthouse, use
the production build:

```bash
npm run build
npm start
```

`npm run dev` builds into `.next-dev` and `npm start` uses `.next`, so both can run at the same time.

## Where things are

| What | Where |
|---|---|
| Add, edit, hide or delete products; prices and carton sizes | Admin › Products (saved in `.data/settings.json`) |
| Built-in products, carton discounts, VAT | `src/lib/catalog.ts` |
| Pages | `src/app/` — home, `shop`, `shop/[slug]`, `cart`, `checkout`, `order/[id]`, `admin` |
| Order storage | `src/lib/server/orders.ts`: online in Supabase when `DATABASE_URL` is set, otherwise `.data/` |
| Dashboard sign-in | `src/lib/server/admin-auth.ts` |
| 3D cup viewer | `src/components/CupViewer.tsx` |
| 3D display models | `public/models/cups.json` (made by `npm run bake`) |
| Still pictures shown before the 3D starts | `public/posters/` (made by `npm run posters`, see below) |

## Speed

- The 3D engine (three.js) is not part of the first page load. Each cup first shows a still picture; the
  live 3D starts when the visitor touches, scrolls or moves the mouse, or after the page has been quiet
  for 5 seconds. The models are decoded in a background worker.
- After changing a cup (`npm run bake`), re-make the still pictures: run `npm run build && npm start`,
  then `npm run posters` in a second terminal.

## Protecting the cup design

`design/geometry.mjs` is the full cup design. It is never sent to visitors and is kept out of git.
`npm run bake` turns it into display-only models: the lid's insides are removed and proportions are
nudged a few percent, so measurements taken from the website are wrong. Re-run it after changing a cup.

## Online database (Supabase)

Orders, shop settings and admin accounts are stored online when `DATABASE_URL` is set; without it they
stay in `.data/` on this computer.

1. Create a free project at supabase.com (pick the region closest to you, e.g. Frankfurt) and save the
   database password it asks for.
2. In the project, press **Connect** and copy the **Transaction pooler** connection string. Put it in
   `.env.local` as `DATABASE_URL=...`, with your database password in place of `[YOUR-PASSWORD]`.
3. Run `npm run db:setup`. It creates the tables, locks them so only the shop's server can read them, and
   copies your existing orders, settings and admin accounts in (it never overwrites what is already online).
4. Restart the server. You can see orders in Supabase › Table editor › `orders`.

On the free plan Supabase pauses a project after a week with no activity; open the dashboard to wake it.

## Order alerts on your phone (Telegram)

1. In Telegram, open **@BotFather**, send `/newbot`, and pick a name and a username ending in `bot`.
   BotFather replies with a token like `123456789:AA...`. Keep it secret.
2. Put it in `.env.local` as `TELEGRAM_BOT_TOKEN=...`.
3. Open your new bot in Telegram (BotFather gives the link) and press **Start**.
4. Run `npm run telegram:link`. It finds your chat, saves `TELEGRAM_CHAT_ID` in `.env.local`, and sends a
   confirmation to your phone.
5. Restart the shop, tick "Send me an alert for every new order" in Admin › Settings, save, and press
   **Send test message**.

Each new order arrives as a Telegram message with the café, items, totals and a link to the order.

## WhatsApp order alerts (WaPilot)

One WaPilot instance is enough: the instance is the WhatsApp number that **sends** the alerts; the alert
goes to any number or group you choose.

1. In WaPilot, open your instance and make sure it is connected (QR scanned). Copy the API token and the
   instance's unique name (also listed by `GET https://api.wapilot.net/api/v2/instances`).
2. In `.env.local` set `WHATSAPP_PROVIDER=wapilot`, `WAPILOT_TOKEN=…` and `WAPILOT_INSTANCE_ID=…`, then restart the server.
3. In Admin › Settings, tick the alerts box and enter who receives them: a phone number with country code
   (not the instance's own number, or it lands in "Message yourself" without a notification), or a group id
   ending in `@g.us` to alert you and your staff together. Press **Send test message**.

Each order is sent once (its order id is the idempotency key). If the instance disconnects, the order is
still saved and Admin › Settings shows why the last alert failed.

## Admin accounts

The first sign-in creates the owner account from `ADMIN_USERNAME` / `ADMIN_PASSWORD` (stored hashed in
`.data/admins.json`). After that you can remove `ADMIN_PASSWORD` from `.env.local` and manage the team in
Admin › Team. Behind a host that sets the real visitor IP (e.g. Vercel), add `TRUST_PROXY=platform`.

## Before going live

1. Replace the example prices in `src/lib/catalog.ts` and set `EXAMPLE_PRICES = false`.
2. Set `DATABASE_URL` (see "Online database"): hosts like Vercel don't keep files on disk.
3. Set `ADMIN_USERNAME`, `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` in the host's environment settings (never commit `.env.local`).
4. Add order emails (to you and the café), then deploy (e.g. Vercel) and connect your domain.
