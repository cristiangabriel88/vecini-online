# RUNBOOK-MVP — get the real invite/onboarding flow live

This runbook stands up the **real, presentable** end-to-end flow with real email
addresses and real accounts:

1. Superadmin logs into the platform console, creates an admin (name + email),
   clicks send -> the admin's real inbox receives the invite.
2. Admin opens the link, sets a password, completes onboarding.
3. Admin adds an apartment and sends -> the resident's real inbox receives the invite.
4. Resident opens the link, sets a password, completes onboarding.

The app screens + pure logic for all of this already exist and pass offline in
demo mode. The work tracked by the **MVP presentation spine** in `BACKLOG.md`
(T168-T115, run with `make mvp`) switches on the **live backend + email delivery**.
This file is the human/infra checklist that accompanies that code.

> Run target: **deploy to Netlify.** Email links must resolve to a public URL,
> and the repo already carries `netlify.toml` (resident/admin app) and
> `netlify-platform.toml` (superadmin console on its own subdomain). A local
> `netlify dev` + a tunnel works but is more fragile for a live demo.

---

## 1. Supabase (backend)

The project already exists; migrations are applied by the Hermes migration agent.

- **Keys** (Project Settings > API): provide `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. The service-role key
  is read by Netlify functions only and must **never** be exposed to the client.
- **Auth providers + URLs** (Authentication > Providers / URL configuration):
  - Enable the **Email** provider.
  - Turn **"Confirm email" OFF.** The single-use, 24h, opaque invite link is the
    proof of email ownership, so the flow is one email -> set password -> in,
    with no second confirmation email. (Decision recorded in `DECISIONS.md`.)
  - Set **Site URL** to the resident/admin origin (`VITE_APP_URL`).
  - Add `"<VITE_APP_URL>/reset-parola"` and the **platform origin** to the
    Redirect URLs allow-list.
- **Migrations:** confirm `supabase/migrations/*` are applied, including the
  T169 superadmin seed/grant migration. The app signals when the SQL is complete;
  Hermes applies it.
- **Superadmin account (T169):** a real auth user must exist and be registered so
  `is_super_admin()` returns true for it (via the T169 seed/grant migration).

## 2. Resend (transactional email)

No provider exists yet — set one up:

1. Create an account at https://resend.com.
2. **Verify a sending domain** (Domains > Add Domain). Recommended: `vecini.online`
   (or a subdomain such as `mail.vecini.online`). Add the DNS records Resend shows
   (SPF / DKIM / return-path) at the domain registrar and wait for verification.
   - Until a domain is verified, Resend only delivers to your own account address,
     so a verified domain is **required** to email arbitrary invitees in the demo.
3. Create an API key (API Keys > Create). Set `RESEND_API_KEY`.
4. Set `RESEND_FROM_EMAIL` to an address on the verified domain, e.g.
   `noreply@vecini.online`.

The function-side guard `isResendConfigured()` returns true only when both
`RESEND_API_KEY` and `RESEND_FROM_EMAIL` are present; otherwise the email
endpoints return 503 and the app stays in its offline fallback.

## 3. Netlify (hosting + functions)

Two sites from this one repo:

- **Resident/admin app** — uses `netlify.toml` (serves `index.html`).
- **Superadmin console** — a second Netlify site pointed at `netlify-platform.toml`
  (Site settings > Build & deploy > Configuration file path =
  `netlify-platform.toml`); serves `platform.html` on its own subdomain
  (e.g. `admin.vecini.online`).

Set these environment variables on **both** sites (Site settings > Environment):

| Variable | Where read | Value |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | client + functions | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | client | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | functions only | service-role key (never client) |
| `RESEND_API_KEY` | functions | Resend API key |
| `RESEND_FROM_EMAIL` | functions | `noreply@vecini.online` |
| `APP_URL` | functions | resident/admin origin (no trailing slash) |
| `VITE_APP_URL` | client | resident/admin origin |
| `VITE_RESIDENT_APP_URL` | client (platform build) | resident/admin origin, so links minted in the console point at the resident app |

`APP_URL` is what the `invite-email` function uses to build the onboarding link
(`buildOnboardingLink(APP_URL, token)` -> `<APP_URL>/configurare-cont?token=...`),
so it must be the resident origin on both sites.

## 4. Verify env wiring (no code change)

These gates already exist and are confirmed:

- `isSupabaseConfigured` (`src/shared/lib/env.ts`) = both `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY` present.
- `isResendConfigured()` / `isSupabaseAdminConfigured()`
  (`netlify/functions/_shared/*`) gate the live email + service-role paths; either
  missing returns 503 so the offline path is never blocked.
- The invite link base URL resolves from `APP_URL` in `netlify/functions/invite-email.ts`.

## 5. End-to-end smoke (after the spine tasks land)

1. Deploy both sites with the env above; confirm the build is green.
2. On the platform site, log in as the superadmin; create an admin with a real
   email; click send. Confirm the email arrives (T168 + T92).
3. Open the link, set a password, finish onboarding; confirm a real auth user +
   `users` row + admin membership exist (T55).
4. Add an apartment with a real resident email; click send; confirm the apartment
   persisted (T115) and the resident email arrived (T55 invite row -> invite-email).
5. Open the resident link, set a password, finish onboarding; confirm the resident
   auth user + membership exist.

## Status of the spine (run with `make mvp`)

- **T168** — this env + Resend + runbook setup. (config/docs)
- **T169** — live superadmin account + `is_super_admin()` grant.
- **T92** — server-side provisioning function + wire the superadmin live send.
- **T55** — live invite write/consume + real account creation on redemption.
- **T115** — live Supabase read/write for the apartment registry.

Hardening (token hashing T128, mandatory superadmin MFA T100, server-side
rate-limit parity, live OTP channels) stays deferred in the normal queue and does
not block the presentation.
