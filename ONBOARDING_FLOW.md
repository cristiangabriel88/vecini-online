# Onboarding & provisioning data flow

The single reference for how a new asociație and its people get into vecini.online,
from the superadmin provisioning the asociație through to a locatar setting their
password. Code and backend stay English; every user-facing surface in the flow is
bilingual (RO + EN). See `ARCHITECTURE.md` for the app boundaries, `DATA_MODEL.md`
for the `invite_codes` / `notifications` / `memberships` tables, and `BACKLOG.md`
for the task ids that deliver each piece.

This describes the **target** flow. Items not yet built are marked with their task
id; everything works **offline in demo mode first**, with the live (Supabase) path
layered on behind `isSupabaseConfigured` as a separate activation step.

---

## The actors

- **Superadmin (platform operator)** — lives on the separate-origin console
  (`src/platform/*`), gated server-side by `is_super_admin()`. Provisions asociații
  and their first admin. Never adds residents.
- **Admin (building administrator)** — the founder member of one asociație. Edits
  the asociație, manages apartments + locatari, invites residents.
- **Locatar (resident)** — proprietar / chirias / comitet / cenzor / presedinte.
  Joins via an invite from their admin.

---

## Stage A — Superadmin provisions the asociație + first admin

1. A building admin asks the superadmin to join (out-of-band).
2. The superadmin opens the console (`/consola/asociatii`) and provisions a new
   asociație, entering its identity:
   - asociație name, city
   - **CIF/CUI**, registration number
   - **IBAN** (bank account)
   - address
   - contact phone + email
   - first admin name + email
3. Provisioning **emails the admin** a **secure setup link + QR**. The link
   carries an opaque high-entropy token; the QR encodes the same link, pointing
   at the resident app origin (`vecini.online`), never the hub. A short 8-char
   code is shown for reference only and is never typed in to redeem.
4. The link/QR is valid for **24h (fixed)**, single-use.

Live: a service-role Netlify function re-verifies `is_super_admin()` server-side,
creates the asociație with the identity fields, and issues the hashed setup token
(**T92**, scope widened). Offline: the platform store mints the token + code locally.

## Stage B — Admin onboards via the setup link

1. The admin opens the setup link (or scans the QR), landing on the
   "create your account" page.
2. The admin enters their email and **sets a password twice** (the shared password
   policy applies; see `src/features/auth/passwordPolicy.ts`).
3. On submit the token is consumed (single-use, replay-safe, 24h check) and the
   **account is created on redemption** with an `admin` membership of the
   provisioned asociație.
4. The admin lands in `/app`, can **edit/complete the asociație details** (same
   identity fields, in `BuildingSettingsPage`), and **adds apartments + locatari**
   (the apartment registry, `/app/admin/apartamente`).

## Stage C — Admin invites locatari

1. The admin opens Invitații (`/app/admin/invitatii`) and **sends a per-locatar
   email invite**: recipient name + email, the granted role (proprietar / chirias /
   comitet / cenzor / presedinte; never `admin`) and an optional apartment link.
   The page sends invites by email only; there is no standalone code generation.
2. The invite is delivered by email as a **secure link + QR** (24h fixed,
   single-use), both targeting the resident origin (`vecini.online`); the short
   code is shown for reference in the email and the Invitații list, never typed in.

## Stage D — Locatar onboards via the invite link

1. The locatar opens the link (or scans the QR), landing on the same
   "create your account" page.
2. The locatar's **invited email is pre-filled and locked**; they **set a password
   twice** and configure their account.
3. The token is consumed (single-use, 24h, replay-safe); the account is created on
   redemption with the code's role and the apartment link (where the code carries
   one) written server-side.
4. The asociație's **admin receives an inbox notification** that the locatar joined
   successfully (in-app notifications inbox, **T126**).

---

## Token & security model

- **Opaque token in the link** — high-entropy, not the short code. The QR encodes
  the link, always targeting the resident app origin (`vecini.online`), never the
  hub. The short 8-char code (`generateInviteCode`) is shown for reference (email +
  Invitații list) but is never an entry method.
- **Hashed at rest (live)** — onboarding/invite tokens are stored hashed, never in
  plaintext; lookup is constant-time and redemption attempts are rate-limited
  (**T128**). Offline keeps an equivalent local token for demo.
- **24h fixed expiry** for onboarding links (admin setup + locatar invite); a `24h`
  preset is also added to the general invite expiry options.
- **Single-use + replay-safe** — consumption re-validates inside the state update,
  so a single-use token cannot be double-spent (the existing `inviteStore.consume`
  guarantee, extended to the token path).
- **Least privilege** — privileged cross-tenant writes (create asociație, create
  admin account) run only in a service-role Netlify function that re-checks
  `is_super_admin()`; the browser is never trusted with the platform role.

---

## Demo vs live split

| Concern | Demo / offline (default, always works) | Live (behind `isSupabaseConfigured`) |
| --- | --- | --- |
| Provisioning | Local platform store mints token + code | Service-role function (**T92**) |
| Account creation | Local session + membership on redemption | Supabase Auth sign-up on redemption (**T55**) |
| Invite consume | Replay-safe local `inviteStore.consume` | Hashed-token RPC under RLS (**T55**) |
| Token hashing + rate limit | Plaintext local token (demo only) | sha256 at rest in `invite_codes.token`; every writer stores the digest, RPCs hash before lookup; 10 redeem attempts / 15 min per token (**T128**) |
| Redemption audit | None | `invite.redeemed` event in `audit_log` (**T128**) |
| Notifications | Local inbox store seeded from demo | `notifications` rows + read-state under RLS (**T127**) |

---

## Stage → file / task map

| Step | Primary file(s) | Task |
| --- | --- | --- |
| Provision with full identity | `src/platform/platformProvisioningLogic.ts`, `PlatformAsociatiiPage.tsx`, `demoPlatform.ts`, `platformAsociatiiStore.ts` | **T122** |
| Secure tokenized link + QR + 24h | `src/features/invites/inviteLogic.ts`, `inviteStore.ts`, `src/shared/lib/inviteCode.ts`, `platformProvisioningLogic.ts` | **T123** |
| QR rendering (invite + setup link) | shared QR component, `InvitesAdminPage.tsx`, `PlatformAsociatiiPage.tsx` | **T90** |
| "Set password twice" landing | new `/configurare-cont` page, supersedes `JoinAsociatiePage.tsx`, reuses `passwordPolicy.ts` | **T124** |
| Admin edits asociație details | `src/features/admin/BuildingSettingsPage.tsx` | **T122** (field parity) |
| Apartments + locatari | `src/features/admin/Apartments*` | T114 (done) |
| Notifications inbox + "joined" notice | new inbox store, `NotificationsPage.tsx` | **T126** |
| Live provisioning | Netlify service-role function | **T92** |
| Live consume + account-on-redemption | invite RPC / Edge Function | **T55** |
| Live notifications fan-out | `notifications` under RLS | **T127** |
| Token hardening (hash at rest) | invite/setup token persistence | **T128** |
