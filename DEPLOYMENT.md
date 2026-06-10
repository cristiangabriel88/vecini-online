# Deployment — vecini.online

This guide is for the human deploying vecini.online. It covers Supabase, Netlify, and the Telegram bot. Estimated time: 30-45 minutes if everything goes smoothly.

> ## Production is TWO Netlify sites — deploy both
>
> "Deploy to prod" means deploying **two separate Netlify sites from this one repo**:
>
> | Site | Origin | Config file | Build command | Publish dir |
> |---|---|---|---|---|
> | Resident/admin app | `vecini.online` | `netlify.toml` (default) | `npm run build` | `dist` |
> | **Superadmin console (hub)** | `hub.vecini.online` | `netlify-platform.toml` | `npm run build:platform` | `dist-platform` |
>
> They are deliberately separate origins (an XSS in the resident app cannot reach a
> superadmin session token). **Both sites must be set to continuous deploy from `main`**,
> so a single push refreshes both. If the hub site is *not* connected to continuous
> deploy (or its auto-publish is off), it silently freezes at its last manual deploy
> while the resident app keeps shipping — which presents as the console showing stale
> "Coming soon" sections for features that are actually built and tested.
>
> After any prod deploy, verify the hub is current, not just the main app. Full
> two-site setup + env table: `RUNBOOK-MVP.md` § 3 (Netlify).

## Prerequisites

- A GitHub account
- A [Supabase](https://supabase.com) account (free tier is fine to start)
- A [Netlify](https://netlify.com) account (free tier is fine to start)
- A Telegram account
- Node.js 20+ installed locally
- Optional: a domain name (Netlify provides a free subdomain otherwise)

## Step 1 — Supabase setup

1. Go to https://supabase.com/dashboard and create a new project.
   - Name: `vecini-online-prod` (or similar)
   - Region: closest to your users (likely `eu-central-1` for Romania)
   - Database password: generate a strong one and **save it in a password manager**.
   
2. Wait ~2 minutes for the project to provision.

3. From the project dashboard, grab these values (Settings → API):
   - **Project URL** (looks like `https://xxx.supabase.co`)
   - **anon public key**
   - **service_role secret key** (never expose this in client code)

4. From Settings → Database → Connection string, grab the connection URI (for migrations).

5. Run migrations:
   ```bash
   cd /path/to/bloc-app
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```

6. (Optional, for development) Load seed data:
   ```bash
   npx supabase db seed
   ```

7. Configure Auth:
   - Settings → Authentication → Email Auth: enable Email + Password
   - Disable signups from the public (we want invite-only)
   - Configure SMTP if you want branded emails (otherwise Supabase uses their default)
   - Add your Netlify URL to redirect URLs (you'll do this after Step 2)

8. **(Critical for 2FA)** Enable the Custom Access Token Hook:
   - Authentication → Hooks → enable the custom access token hook installed by the
     migrations (`custom_access_token_hook`, T141)
   - Without it the `app_2fa_at` claim never reaches clients, so app-managed 2FA
     (email OTP step-up, T142–T144) silently fails to elevate sessions in production.

9. Configure Storage:
   - Settings → Storage → Create buckets: `attachments`, `documents`, `avatars`
   - Set all to private (RLS-controlled)

## Step 2 — Telegram bot setup

(Full step-by-step in `BOT_SETUP.md`. Summary here.)

1. Open Telegram, search for `@BotFather`, start chat
2. Send `/newbot`, follow prompts
3. Save the **token** that BotFather gives you (looks like `123456:ABC-DEF...`)
4. Send `/setdescription`, write something like "Asistent digital pentru asociația ta de proprietari"
5. Send `/setcommands`, paste the command list from `BOT_SETUP.md` § Step 3
6. (After deploying) Send `/setdomain` and provide your Netlify URL so Mini Apps work
7. Generate a webhook secret (random 32+ char string) — save it

## Step 3 — Netlify setup

1. Push the vecini.online code to a GitHub repo.

2. Go to https://app.netlify.com → Add new site → Import from Git → select repo.

3. Build settings (should be auto-detected from `netlify.toml`):
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`

4. Add environment variables (Site settings → Environment variables):
   
   | Variable | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | from Step 1.3 |
   | `VITE_SUPABASE_ANON_KEY` | from Step 1.3 |
   | `SUPABASE_SERVICE_ROLE_KEY` | from Step 1.3 (NOT prefixed with VITE) |
   | `TELEGRAM_BOT_TOKEN` | from Step 2.3 |
   | `TELEGRAM_WEBHOOK_SECRET` | random string from Step 2.7 |
   | `TELEGRAM_BOT_USERNAME` | from Step 2.2 |
   | `APP_URL` | your Netlify URL (e.g., `https://vecini.online`) |
   | `PLATFORM_URL` | the hub origin (e.g., `https://hub.vecini.online`), used in platform team-invite emails |
   | `AUDIT_HMAC_SECRET` | 32+ char random hex string; signs the audit-chain head (tamper evidence) |
   | `MAIL_MODE` | `resend` (live email), `log` (dev: log instead of send), or `disabled` (no email) |
   | `SENTRY_DSN` | optional, for error monitoring |
   | `RESEND_API_KEY` | required when `MAIL_MODE=resend`, for transactional emails |
   | `RESEND_FROM_EMAIL` | required when `MAIL_MODE=resend`, the verified sender address |
   
   The full two-site env table (including the `VITE_*` build-time variables for
   both origins) lives in `RUNBOOK-MVP.md` § 3. `netlify/functions/_shared/configValidator.ts`
   is the authoritative list of required server vars; the startup validation (T282)
   fails loud when one is missing.
   
5. Deploy. Wait for first build to complete (~3-5 min).

6. Once deployed, copy your Netlify URL.

7. Update Supabase: Settings → Authentication → URL Configuration → add Netlify URL.

8. Register the Telegram webhook:
   ```bash
   curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://<your-netlify-url>/.netlify/functions/telegram-webhook",
       "secret_token": "<TELEGRAM_WEBHOOK_SECRET>",
       "drop_pending_updates": true,
       "allowed_updates": ["message", "callback_query", "my_chat_member"]
     }'
   ```

9. Test the webhook:
   ```bash
   curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
   ```
   You should see your URL and `"pending_update_count": 0`.

## Step 4 — Provision the first asociație + admin (superadmin)

The app is invite-only: there is no public registration. The flow is documented
in full in `ONBOARDING_FLOW.md`; the operator steps are:

1. Sign in to the superadmin console at your hub origin (`hub.vecini.online`).
   The superadmin account must exist in `platform_admins` (insert your user id
   there once via the Supabase SQL editor; every privileged function re-checks
   this table server-side).
2. Open Asociații → "Adaugă asociație" and enter the first administrator's
   name + email.
3. The `provision-asociatie` function creates the asociație row plus a 24h
   single-use setup invite and emails the admin a secure setup link (when
   `MAIL_MODE=resend`; otherwise resend it later or share the link manually).
4. The admin opens the link, lands on `/configurare-cont`, sets a password
   twice, and the account + `admin` membership are created on redemption.

## Step 5 — Admin completes the asociație

After first sign-in the admin:

1. Completes the asociație identity (name, address, CUI, IBAN) in
   Setări → Date asociație (`BuildingSettingsPage`).
2. Adds apartments in `/app/admin/apartamente` (manual or CSV import).
3. Enables the features the building needs (feature toggles).

## Step 6 — Invite residents

1. The admin opens `/app/admin/invitatii` and issues a **per-resident** invite:
   granted role (proprietar / locatar / comitet / cenzor / presedinte; never
   `admin`) plus an optional apartment link.
2. Each invite renders as a secure link + QR + short fallback code, valid 24h,
   single-use; the email is dispatched via the `invite-email` function when
   `MAIL_MODE=resend`.
3. The resident opens the link, lands on `/configurare-cont`, sets a password,
   and the account + membership (+ apartment link) are created on redemption.
   The admin gets an in-app notification when the resident joins.
4. (Optional) Residents can additionally link Telegram later — the bot's
   `/start <code>` flow is for Telegram notification linking only, not for
   account onboarding.

## Step 7 — Smoke test

Before and after deploying, validate locally:

```bash
npm run preflight
```

This runs lint + typecheck + unit tests and all three stage builds (PROD /
DEV / DEMO) with bundle-size budgets. Then run through the manual smoke test
checklist in `TESTING.md § Manual smoke test checklist`. Fix anything broken
before announcing to residents.

## Custom domain (optional)

1. Netlify → Domain management → Add custom domain
2. Configure your DNS (CNAME or Netlify nameservers)
3. Enable HTTPS (automatic via Let's Encrypt)
4. Update env var `APP_URL` to the new domain
5. Update Supabase redirect URLs
6. Update Telegram webhook URL via `setWebhook`

## Monitoring

- **Supabase:** Dashboard → Database → Logs for query errors, Auth → Logs for auth issues
- **Netlify:** Function logs from Site → Functions
- **Sentry:** if configured, captures unhandled JS errors with stack traces and user context
- **Telegram webhook status:** `getWebhookInfo` periodically (set up an uptime check)

## Backups

Supabase auto-backups daily on paid plans. Free plan: manual backups via `pg_dump`:

```bash
pg_dump "postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres" \
  > backup-$(date +%Y%m%d).sql
```

Schedule this in a GitHub Action or cron job.

## Upgrading

1. Pull latest code, review CHANGELOG.md
2. Run new migrations: `npx supabase db push`
3. Push to GitHub → Netlify auto-deploys **both sites** (resident app + superadmin hub).
   If the hub site is not wired to continuous deploy from `main`, push alone will not
   refresh it — trigger that site's deploy explicitly (Netlify dashboard → the
   `hub.vecini.online` site → Deploys → Trigger deploy → Deploy site).
4. Verify with smoke test — and open `hub.vecini.online` to confirm the console is
   current, not just the resident app.

Always test upgrades on a staging Supabase project + Netlify preview before touching production.

## Scaling

When approaching ~10,000 residents or 500 asociații:
- Upgrade Supabase to Pro plan (better DB performance, more storage, daily backups)
- Upgrade Netlify to Pro (more function executions)
- Consider migrating Postgres to a dedicated cluster (Supabase supports this)
- Move scheduled jobs from Netlify Scheduled Functions to a dedicated queue (BullMQ + Upstash, or Inngest)

Beyond ~50,000 residents:
- Shard by region (separate Supabase projects per geographic cluster)
- Consider a dedicated Telegram bot per large asociație
- Move heavy uploads (videos for project journals) to dedicated S3 + CDN
