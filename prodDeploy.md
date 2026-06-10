# prodDeploy.md — Hermes agent prompt for the vecini.online production deploy

Paste the block below to the Hermes deploy agent.

---

```
Deploy vecini.online to production from https://github.com/cristiangabriel88/vecini-online
(branch: main). This is a multi-tenant SaaS (React+Vite+TS, Supabase, Netlify functions,
Telegram bot). Follow DEPLOYMENT.md and RUNBOOK-MVP.md in the repo; this prompt is the
ordered checklist with the gotchas made explicit. Do not skip the verification steps.

## ARCHITECTURE: production is TWO Netlify sites from this one repo
1. Resident/admin app  -> vecini.online      -> config netlify.toml          -> `npm run build`          -> publish `dist`
2. Superadmin console  -> hub.vecini.online  -> config netlify-platform.toml -> `npm run build:platform` -> publish `dist-platform`
Both MUST have continuous deploy from `main` AND auto-publish ON. A frozen hub site is a
known silent-failure mode. Node 20.

## STEP 1 — Supabase (do this first)
1. Create a Supabase project (region eu-central-1). Save the Project URL, anon key,
   service_role key, and DB password.
2. Run all migrations: `npx supabase link --project-ref <ref>` then `npx supabase db push`
   (81 migrations, ordered, no manual SQL edits needed). Do NOT run supabase/seed.sql in prod.
3. Auth settings (Authentication -> Providers / URL configuration):
   - Email provider: ENABLED. "Allow new users to sign up": ON. (Invite-only is enforced
     at the app layer; disabling signups breaks invite redemption, which calls
     supabase.auth.signUp() client-side.)
   - "Confirm email": OFF. (The 24h single-use invite link is the email-ownership proof;
     signup must return a session immediately.)
   - Site URL: https://vecini.online. Redirect URLs: add https://vecini.online/reset-parola
     and https://hub.vecini.online/consola.
   - Password policy: min 10 chars, HIBP/leaked-password protection ON.
4. CRITICAL: Authentication -> Hooks -> enable the Custom Access Token Hook
   `custom_access_token_hook` (installed by migration 20260527000001_mfa_channels_hook.sql).
   Without it the app_2fa_at JWT claim never reaches clients and app-managed 2FA silently
   fails to elevate sessions.
5. Storage -> create FIVE private buckets (RLS-controlled, do not make public):
   attachments, documents, avatars, photos, source-maps
6. Superadmin bootstrap: create the superadmin user (Auth -> Users -> create user with a
   strong password), then in the SQL editor insert their auth user id into
   public.platform_admins. Every privileged function re-checks this table server-side.

## STEP 2 — Resend (transactional email; invite flow depends on it)
1. Verify the sending domain (vecini.online) in Resend: add the SPF/DKIM/return-path DNS
   records and wait for verified status. Until verified, Resend only delivers to the
   account owner's address.
2. Create an API key.
3. Register a webhook in Resend pointing to
   https://vecini.online/.netlify/functions/resend-webhook for email.delivered events;
   save the signing secret (becomes RESEND_WEBHOOK_SECRET). Without it, invite delivery
   badges in the admin UI never populate (non-fatal but should be configured).

## STEP 3 — Telegram bot (optional but expected for prod)
1. Create the bot via @BotFather, save the token and username.
2. Generate a random 32+ char webhook secret.
3. AFTER the Netlify deploy, register the webhook:
   curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url":"https://vecini.online/.netlify/functions/telegram-webhook",
          "secret_token":"<TELEGRAM_WEBHOOK_SECRET>","drop_pending_updates":true,
          "allowed_updates":["message","callback_query","my_chat_member"]}'
   Verify with getWebhookInfo (expect pending_update_count: 0).

## STEP 4 — Netlify env vars
Site A (vecini.online, netlify.toml):
  VITE_SUPABASE_URL=<supabase project url>          (build-time AND function runtime)
  VITE_SUPABASE_ANON_KEY=<anon key>
  VITE_APP_URL=https://vecini.online
  VITE_PLATFORM_URL=https://hub.vecini.online       (resident-side superadmins get redirected here)
  VITE_APP_STAGE=prod
  VITE_TELEGRAM_BOT_USERNAME=<bot username, no @>
  SUPABASE_SERVICE_ROLE_KEY=<service role key>      (functions only; never VITE_-prefixed)
  APP_URL=https://vecini.online                     (no trailing slash; used to build invite links)
  PLATFORM_URL=https://hub.vecini.online
  MAIL_MODE=resend
  RESEND_API_KEY=<key>
  RESEND_FROM_EMAIL=<verified sender, e.g. noreply@vecini.online>
  RESEND_WEBHOOK_SECRET=<from step 2.3>
  AUDIT_HMAC_SECRET=<random 32+ hex chars>
  TELEGRAM_BOT_TOKEN=<token>
  TELEGRAM_WEBHOOK_SECRET=<from step 3.2>
  PLATFORM_ALERT_EMAIL=<ops alert address>          (optional; defaults to RESEND_FROM_EMAIL)
  SENTRY_DSN=<optional>
Site B (hub.vecini.online, netlify-platform.toml): same set, plus
  VITE_RESIDENT_APP_URL=https://vecini.online
Functions validate this config at cold start (netlify/functions/_shared/configValidator.ts
is the authoritative list) and fail loud on missing/invalid values — check function logs
after first deploy for config issues.

## STEP 5 — Deploy and verify
1. Deploy both sites; confirm both builds green and both serve the current commit.
2. GET https://vecini.online/.netlify/functions/health -> 200 {"status":"ok","stage":"prod"}
   (same check on the hub origin). The health-probe scheduled function runs every 5 min;
   gdpr-retention-purge is scheduled @monthly in code — both appear under Netlify
   Scheduled Functions automatically.
3. Post-deploy: run `npm run upload-sourcemaps` (needs SUPABASE_SERVICE_ROLE_KEY +
   VITE_SUPABASE_URL env locally) so error symbolication works.
4. Verify the 2FA hook: sign in as any user, decode the access token, confirm the
   app_2fa_at claim is present. If missing, the Custom Access Token Hook is not enabled.

## STEP 6 — End-to-end smoke test (the critical user journey; do not skip)
1. Sign in at hub.vecini.online with the superadmin account.
2. Asociatii -> "Adauga asociatie": enter a real test admin name + email. Expect success
   WITH "invitation sent" wording (if the UI says the email could not be sent, Resend
   config is wrong — stop and fix).
3. Open the email, click the setup link -> lands on vecini.online/configurare-cont?token=...
   showing the asociatie context card. Set a password -> account created, admin membership
   granted, redirected to the /onboarding wizard. Complete profile + feature selection.
4. As that admin: add an apartment in /app/admin/apartamente, then issue a resident invite
   in /app/admin/invitatii (role proprietar or locatar, linked to the apartment, with the
   invitee's email).
5. Open the resident email, click the link, create the account -> expect redirect to /app,
   membership + apartment_residents row created, and the invite marked consumed (re-opening
   the link must show "already used").
6. Negative checks: a tampered/garbage token shows the invalid-link screen; redeeming with
   a different email than the invite's shows email_mismatch.
7. Confirm the invite shows a "delivered" badge in the admin invites page within ~1 min
   (proves the Resend webhook is wired).

## KNOWN SHARP EDGES (verified against the code at deploy time)
- APP_URL must be exact (scheme + host, no trailing slash); invite links are built from it.
- The hardcoded production-fallback Supabase URL in src/shared/lib/supabaseUrl.ts points at
  the canonical prod project; if you provision a DIFFERENT Supabase project, that constant
  must be updated in code first — flag this instead of deploying.
- Demo mode activates automatically if VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY are absent
  at build time. If the deployed site shows seeded Romanian demo data instead of a login
  page, the build-time env vars were not set on that Netlify site.
- Email sends are 503 (email-not-configured) when MAIL_MODE=resend without Resend creds —
  surfaced in the UI, but fix the env rather than switching MAIL_MODE in prod.
- Backups: free Supabase tier has no auto-backup; schedule a pg_dump cron per
  DEPLOYMENT.md § Backups.

Report back: both site URLs + deployed commit SHA, health endpoint outputs, the smoke-test
results for steps 6.1–6.7 (each pass/fail), and any configValidator warnings from function logs.
```
