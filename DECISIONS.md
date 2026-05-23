# Decisions — IntreVecini

A running log of non-trivial choices made while building the app. Newest first.

## Three owner-requested capability areas: documents, invite QR, superadmin tier (T88-T100)

A planning pass that specced and queued three capabilities (no code yet). The
non-trivial choices:

**Building documents extend F33, not a new feature.** The owner's "page where the
admin loads the building's documents (contracts with salubritate)" is exactly
F33 Document arhivă's existing scope, which already has a page, store, a
`documents` table and standard RLS but only stored a title/category/free-text.
Rather than build a parallel feature, T88 adds **real file upload** to F33:
admin/comitet upload, every member views + downloads (the standard "comitet write
/ members read" RLS already encodes this). Offline/demo persists the file as a
**size-capped, type-allowlisted base64 data URL** in the store so the demo keeps
working with no backend and a download works fully offline; the live path (T89)
stores the object in a per-asociatie **Supabase Storage** bucket served via signed
URLs with Storage RLS. Splitting offline (T88) from live Storage (T89) follows the
MVP rule that overnight work must never require provisioning.

**Invite QR uses `qrcode.react` (a dependency, against the usual dependency-light
ethos).** The project normally hand-rolls (TOTP, the audit hash, dependency-free
error reporting), so a vendored encoder was the default suggestion, but the owner
chose the well-known `qrcode.react`. Recorded so the later QR work (T90) doesn't
re-litigate it. The QR encodes the **invite redeem link** (the
`/onboarding/alatura` deep link carrying the code, built from `VITE_APP_URL`), not
the bare code, so a scan lands the resident straight in the join flow.

**Superadmin is a separate app on its own subdomain, not a route in the main app.**
The owner's concern was blast radius: with only ~2 superadmins, a compromised
admin must never endanger the platform. The decision and its rationale:
- **The real security boundary is database RLS + server-side `super_admin`
  re-checks, not the frontend.** A compromised *admin* is scoped to one asociatie
  by Postgres RLS and recorded in the tamper-evident audit log; they cannot reach
  the superadmin tier or another asociatie regardless of which bundle they load.
  This is built (T91/T92) independent of packaging.
- **A separate origin is still worth it for session isolation.** Browsers isolate
  stored tokens by origin, so hosting the superadmin app on its own subdomain
  (e.g. `admin.vecini.online`) means an XSS in the resident/admin app physically
  cannot read a superadmin session token, and the superadmin's privileged code is
  never shipped to regular users. Chosen over a same-origin `/platforma` route
  (weakest — shared session storage) and over a brand-new repository (same
  isolation but duplicates the Supabase client/types/i18n/build and falls outside
  this backlog loop). So: **same monorepo under `src/platform/*`, own Vite build
  + demo mode, deployed to a separate subdomain** (T93).
- **Privileged operations run server-side.** Account creation and impersonation go
  through Netlify functions using the service role that **re-verify the caller is
  `super_admin`** (T92/T98); the client is never trusted. Superadmins carry
  **mandatory, non-removable MFA** (T100).
- **Division of labour:** the superadmin **creates asociatii and provisions their
  admins** (T94); each admin then **adds their own residents via the existing
  invite lifecycle** (T41/T42). Oversight is read-only and cross-tenant only for
  `super_admin`: a cross-asociatie audit viewer (T95), a platform error feed from
  the T07 reporting hook (T96), usage/health metrics (T97), and audited read-only
  impersonation (T98). The admin↔superadmin messenger (T99) reuses the F04
  `adminchat` thread/message shape.

## GDPR data-subject rights: self-service export, admin-actioned erasure (T06)

The two rights a resident exercises over their personal data are split by how
reversible they are:

- **Export (art. 15 + 20) is self-service.** The resident downloads a complete
  JSON/CSV copy immediately in-app, with no admin in the loop, because access /
  portability is a read that carries no risk. The request is still logged to the
  queue so the controller keeps an accountability trail of who asked and when.
- **Erasure (art. 17) is filed pending and actioned by an admin/president.**
  Deletion is irreversible and may need a manual check (e.g. outstanding debts,
  ongoing governance), so it is not auto-executed. The admin completes or rejects
  it, and the actor + time are stamped on the row.

**Erasure is a per-category plan, not a blanket delete.** Profile/contact and
marketplace listings are deleted; tickets/ideas are anonymized (kept for
continuity/context with the identity stripped to a bilingual placeholder); votes,
financial records, consent proof and the security log are retained because
erasing them would invalidate adopted decisions (Legea 196/2018), breach
accounting law, or destroy the proof of lawful processing. The resident sees this
plan with per-category rationale before requesting erasure. The pure
`ERASURE_PLAN`/`RETENTION_POLICY` model in `gdprLogic.ts` is the single source;
`DATA_RETENTION.md` is its human-readable counterpart.

**The actual cross-store mutation + periodic cleanup run server-side, later.**
Offline, the request queue and an erased-id marker work in the persisted
`gdprStore`; no destructive mutation runs because there is no backend store to
mutate. Executing the plan (delete/anonymize/retain across tables) and purging
expired records on a schedule belongs to a service-role Supabase routine when a
backend is provisioned, so it stays out of the client and the offline build.

**The `data_subject_requests` table is append/no-delete under RLS.** A resident
files + reads only their own requests; admin/president read the asociație queue
and may only advance a pending request's status — no delete policy exists for
anyone, so the accountability trail cannot be rewritten. The row carries request
metadata only (never exported personal data; `actioned_by` is the admin's display
name, not extra identifiers).

## Fixing the `aga_votes` RLS column mismatch by editing the source migration (T70)

`20260121000002_features.sql` called `apply_standard_rls('aga_votes')`, but
`aga_votes` carries no `asociatie_id` column (it is tenant-scoped through its
parent `agas`, like `aga_agenda_items`/`aga_attendees`). The macro generates
`create policy ... using (is_member(asociatie_id))`, and Postgres validates the
policy expression's column references at `CREATE POLICY` time, so on a real
database that statement raises `column "asociatie_id" does not exist` and aborts
the entire migration. Demo mode never runs the SQL, which is why it went
unnoticed.

- **Parent-scoped policies, not a new column.** Two correct fixes existed: add an
  `asociatie_id` column to `aga_votes` (and keep the macro), or replace the macro
  call with parent-resolved policies through `agas`. Chosen the latter because it
  matches the sibling AGA child tables exactly (`aga_agenda_items`,
  `aga_attendees`), needs no denormalised column kept in sync with the parent via
  a trigger, and keeps `aga_votes` consistent with the batch-5 `"self cast aga
  vote"` insert policy that already resolves the tenant through `agas`. The
  replacement adds `"members read votes"` (select, parent `is_member`) and
  `"comitet write votes"` (`for all`, parent `has_role`).
- **Edited the source migration rather than adding a follow-up migration.** The
  project convention is additive, idempotent migrations that never edit history,
  but that convention assumes the prior migration applied. Here the prior
  migration *aborts* on the bad `create policy`, so no later migration would ever
  run — an additive fix is impossible. Because no Supabase project has ever been
  provisioned (the app runs demo-only), there is no applied migration history to
  diverge from, so correcting the source line is safe and is the only fix that
  makes the suite applicable at all. Recorded here because it is a deliberate,
  one-off exception to the additive-migrations rule.
- **Regression guard against the whole bug class.** `tests/unit/rlsHelperColumns.test.ts`
  parses every `create table` and every `apply_standard_rls` /
  `apply_member_insert_rls` / `(re)apply_owner_rls` call across the suite and
  asserts each call's target table actually declares the columns the generated
  policy references (`asociatie_id` for the standard/insert macros, plus the owner
  column). The audit confirmed `aga_votes` was the only offender; the test now
  fails the suite if any future helper call references a missing column.

## Auth & session hardening (T03)

Five hardening surfaces, all kept demo-runnable and unit-tested:

- **Breach rejection is offline, by design.** Rather than an online HaveIBeenPwned
  lookup, `passwordPolicy` checks a curated, normalised blocklist of the most
  commonly-breached / trivially-guessable passwords (plus Romanian and
  product-specific guesses). This keeps the check deterministic, fully private
  (the password never leaves the device), and exercisable in demo mode and E2E.
  The online augmentation — Supabase Auth's leaked-password (HIBP k-anonymity)
  protection, which also never sends the full password — is deferred to the
  server side as T32 so the app stays offline-runnable. The policy applies only
  when a password is *set* (sign-up / reset); sign-in keeps the looser
  minimum-length gate so a resident whose password predates the policy can still
  log in.
- **The login lockout is client-side and escalating.** `loginThrottle` is pure
  (sliding 15-minute window, 5-failure budget, lockout doubling from 60s up to a
  30-minute cap, per normalised email). It is persisted in `localStorage` so a
  reload cannot trivially reset a lock, and gates `signIn` before the network
  call. It is explicitly a first line of defence layered on Supabase's
  server-side rate limiting, not a replacement: a determined attacker can clear
  local storage, which is why server-backed counters are queued as T33. The
  lockout is applied only on the live path (demo sign-in has no password to
  brute-force); the escalation logic is unit-tested directly.
- **The audit stream is privacy-safe at the type level.** `authAudit.buildAuthEvent`
  accepts only an event type and an optional email — there is no parameter
  through which a password, token or code could be attached — and `redactEmail`
  masks every address to `a***@domain`. So "no PII or secrets in logs" is
  enforced by the shape, not just by discipline. The local log (capped at 50
  entries) is the source for the in-app activity list so it works offline; with a
  backend each event is also mirrored, best-effort, into `auth_audit_events`
  (append-only: owner-read + admin-read, no update/delete grants, keeping the
  ordering tamper-evident).
- **Session handling: PKCE + global sign-out.** The Supabase client switches to
  the PKCE flow so an intercepted authorization code (e.g. from an email link)
  cannot be redeemed elsewhere; token refresh stays on Supabase's silent
  auto-refresh with `SIGNED_OUT` clearing derived state. `signOutEverywhere`
  uses `scope: 'global'` to revoke every session's refresh token, surfaced as an
  "active sessions" control on the security page.
- **Cross-store wiring via `getState()`.** `authStore` and `mfaStore` record audit
  events and consult the throttle through `useSecurityStore.getState()` inside
  their actions (never at module top level), and `securityStore` reads
  `useAuthStore.getState()` only inside the live-mirror closure. The import cycle
  is therefore resolved lazily at call time and never during module evaluation.

## 2FA / MFA — TOTP (T02)

TOTP (RFC 6238) is the second factor, built on Supabase MFA for the live path.
The cryptography is implemented locally (`mfaLogic`) over Web Crypto so demo mode
genuinely verifies codes from a standard authenticator app offline, keeping the
flow faithful and E2E-executable without a backend; the live path delegates the
actual challenge/verify to Supabase so the secret is never trusted client-side
in production. The logic is unit-tested against the published RFC 4226/6238
vectors, which is why those exact secrets/codes appear in the test.

Enforced roles are super_admin, admin, președinte, comitet and cenzor (the spec
named "admin, comitet, cenzor"; președinte and super_admin are added because they
hold the same or greater privileged access, mirroring the assistant's role
buckets). Enforcement is a redirect to `/app/securitate` and is applied only on
the live (backed) path — demo mode has no real backend role (memberships are
empty → resident), so demo stays fully inspectable and the existing E2E suite is
unaffected. The unit tests cover the role rule directly; the live-path redirect
is queued for an E2E harness in T30.

QR rendering: the live path shows Supabase's returned QR via `<img src=data:...>`
(an SVG loaded through `<img>` cannot execute scripts, so there is no
HTML-injection surface and no dependency added); demo mode shows the base32 setup
key for manual entry (every authenticator supports "enter a setup key"), since
there is no backend to mint a QR and we deliberately avoid a QR-encoder
dependency.

Recovery codes are ten single-use codes, shown once at enrollment and stored only
as SHA-256 hashes (`mfa_recovery_codes`, owner-only RLS — no admin read path, as
they are credentials), consumed single-use. Recovery-code *login* works fully in
demo mode; in the live path a recovery code cannot client-side elevate a session
to AAL2 (Supabase grants AAL2 only via an MFA verify), so live recovery-code
login is deferred to a privileged server routine (Edge Function) — queued as T29.
Until then the live challenge accepts only an authenticator code and surfaces a
clear bilingual message for recovery-code attempts.

## T05 GDPR consent & legal surface — scope, ordering, lawful bases

The first production-readiness task (BACKLOG.md). Three decisions:

- **Reordered ahead of T01–T04.** T01–T04 (live Supabase auth, 2FA, session
  hardening, RLS audit) can only be meaningfully verified against a provisioned
  Supabase backend, which this environment does not have — their only testable
  surface here is the demo fallback. T05 is pure front end + a demo-backed store,
  so it is fully exercisable now (lint/typecheck/test/build + an E2E happy-path)
  and is the most direct step toward a legally deployable Romanian app. It has no
  backend prerequisite, so taking it first respects "highest-priority task whose
  prerequisites are met". T01–T04 remain the next P0s for when creds exist.
- **Legal copy lives in a typed content module (`legalContent.ts`), not in the
  i18n JSON.** Privacy/Terms/Cookies are long, paragraph-structured documents
  edited as a block; a bilingual TS module (`privacyPolicy(lang)` etc.) is
  clearer and less error-prone than hand-maintained arrays inside the translation
  files. It is still fully bilingual — it switches on `i18n.language` — and the
  UI chrome around it (banner, buttons, settings labels) stays in the i18n JSON.
  The text is informational template content for a Romanian asociație de
  proprietari and should be reviewed by the association before going live.
- **Notification consent reuses the cookie-consent categories.** The fan-out gate
  `mayNotify(record, kind)` maps `essential` -> always (contract / legal
  obligation / legitimate or vital interest, never blocked), `community` -> the
  `preferences` category, `marketing` -> the `marketing` category. So one consent
  record governs both non-essential storage and non-essential messaging. The live
  channels (T14/T15) must call this gate — tracked as T26.

**Lawful basis per data category** (art. 6 GDPR), recorded for accountability:
- Identity, contact, apartment/scara/etaj, building-life data (meters, tickets,
  votes, attendance, bookings, documents, messages): **art. 6(1)(b)** performance
  of the association relationship and **art. 6(1)(c)** the association's legal
  obligations under Legea 196/2018.
- Security alerts (F03), audit logging: **art. 6(1)(f)** legitimate interest in a
  safe, well-run building (and vital interest for emergencies).
- Resident directory (F36), birthdays (F63), car plate, custom profile fields,
  non-essential cookies/analytics/marketing, optional notifications: **art.
  6(1)(a)** consent — opt-in, withdrawable, logged in `consent_records`.
- Children's data (F64): aggregate-only age ranges, never identifying a child;
  no consent of a minor is relied upon (tracked as T23).

## F10 AGA digitală — scope of "legally-valid PV" and quorum/vote modeling

The spec asks for a Legea 196/2018-compliant General Assembly that "generates a
legally-valid proces-verbal as PDF". Two pragmatic decisions kept this shippable
without new dependencies while preserving the real shape:

- **Proces-verbal as downloadable plain text, not a rendered PDF.** Adding a
  client PDF engine (pdfmake/jsPDF, ~hundreds of KB) for one document would blow
  the bundle budget for little gain in demo mode. `generateProcesVerbal` builds a
  structured, signature-ready Romanian minutes document (title, date, place,
  represented apartments + quorum verdict, each agenda item with its vote tally
  and adoptat/respins decision, and the Legea 196/2018 footer) and the page
  downloads it as `proces-verbal-<id>.txt`. The PV text is **always Romanian**
  regardless of UI language because it is a legal document. Swapping the Blob for
  a server-side PDF render is a later, isolated change.
- **Quorum and voting are modeled per-apartment with the current demo apartment
  tracked separately.** Each meeting carries `represented_apartments` (everyone
  else) and the current apartment's `my_rsvp`; `presentApartments` adds the
  current apartment when it is `prezent` or `procura` (a proxy still represents an
  apartment). Each agenda item carries `votes` (everyone else) and `my_vote`;
  `itemTally` folds the current vote in. Outcomes require quorum, then apply the
  item's `MajorityRule` (reused from the polls engine): `simple` (pentru >
  contra), `absolute` (pentru > total/2), `qualified_2_3` (pentru ≥ ⅔ of votes
  cast). RSVP and voting are independent in demo (we do not force presence before
  a vote) to keep the flow one-tap; the backend `aga_votes` insert policy still
  scopes voting to an `in_desfasurare` assembly within the asociație.


## Product name: IntreVecini vs. BlocHub

The repository, environment, and master prompt name the product **IntreVecini**.
The `/docs` (ARCHITECTURE, FEATURES, etc.) were written against an earlier
working title, **BlocHub**. The prompt says docs win on conflicts, but a product
name is a branding decision, not an architectural one, and the repo/prompt are
the more authoritative source for it. **Decision:** ship as *IntreVecini* in all
user-facing strings, code, and package name; leave the historical docs as-is
(they remain accurate for architecture/data/feature specs).

## Scope delivered in this session vs. registered-but-not-built

The spec defines 65 features plus a full E2E/Lighthouse pipeline — a multi-month
program. This session delivers a **production-shaped foundation** that is
buildable, type-safe, lint-clean, and unit-tested, with a representative set of
features fully implemented end-to-end and the remaining features registered and
toggleable so the platform is complete in shape.

- **Fully implemented UI (interactive):** F01 Anunțuri, F03 Alerte, F08
  Evenimente, F09 Voturi, F17 Sesizări, F56 Numere de urgență. Plus the admin
  feature-flag panel, the apartment registry, the 5-step onboarding wizard,
  auth/login, home feed, hubs, and profile.
- **Database:** complete schema with RLS for the core tables **and all 65
  features' tables** (`supabase/migrations/`), so the data layer matches the
  full spec even where the UI is not yet built.
- **Telegram:** webhook function with secret verification and Mini App
  `initData` validation (both unit-tested), command/callback routing skeleton.
- **Registered-only features:** the other ~59 features appear in the admin
  toggles and navigation; opening one shows a clear "registered, page not in
  this build" state rather than a broken or fake page. This keeps the
  feature-flag system honest (no fake data) while making the roadmap visible.

This boundary is documented per-feature in `FEATURES.md`'s tracking table.

## No backend required to run (demo mode)

The app detects missing Supabase credentials (`isSupabaseConfigured`) and runs in
a **demo mode** seeded with realistic Romanian sample data held in Zustand
stores. This lets the UI be inspected, demoed, and E2E-tested without
provisioning Supabase. With credentials present, the same components are wired to
Supabase. No mock data ships in the Supabase path — seed data lives only in
`supabase/seed.sql` and the client-side demo module, which is gated behind the
not-configured check.

## State management

- Server/async state: React Query (configured, used where a backend exists).
- Demo/interactive data: small per-feature Zustand stores seeded from
  `src/shared/demo/demoData.ts` so create/vote/RSVP actions work offline.
- Feature flags: a persisted Zustand store (`featureStore`) keyed by asociație
  (`byAsociatie: Record<asociatieId, flags>`), seeded with the recommended set for
  the demo asociație (T43). The active asociație's set is resolved via the
  `useAsociatieFlags()` hook from `authStore.currentAsociatieId`, so different
  local asociații can enable different modules; pure resolution/mutation lives in
  `featureFlagsLogic`. Persisted at `intrevecini.features` with a `version: 2`
  migrate that carries a pre-T43 flat `flags` map onto the demo asociație. With a
  backend an asociație's set is hydrated from / written back to `asociatie_features`
  (live activation is T56).

## i18n structure

Used a single `translation` namespace per locale (`ro.json`, `en.json`) with
nested keys rather than one file per feature. Simpler to maintain at this size
and still trivially extendable to more languages; Romanian is the source of
truth and English covers the admin surface.

## Rich text & XSS

Announcements render stored HTML. All such HTML passes through `sanitizeHtml`
(DOMPurify) with a strict tag/attribute allowlist before
`dangerouslySetInnerHTML`.

## Bundle splitting

`manualChunks` separates `react`, `@supabase/supabase-js`, React Query, and
i18n vendors; feature pages are lazy-loaded. The `Icon` component imports only
the lucide icons referenced by the registry (importing the full `icons` map
added ~700 KB). Initial route is ~190 KB gzipped, under the 250 KB budget.

## TypeScript build

Avoided `tsc -b` project references (composite/`noEmit` friction) in favour of
explicit `tsc -p tsconfig.app.json` + `tsconfig.node.json` `--noEmit` checks.
The Netlify function reuses the browser-safe crypto helpers from
`src/shared/lib/telegramAuth.ts` via a relative import so the signature logic is
unit-tested once.

## Tooling versions

Upgraded Vitest to v3 so it shares Vite 6 (Vitest 2 pulled a conflicting nested
Vite 5, breaking config typing).

## Testing environment limitation

Playwright browser binaries could not be downloaded in the build sandbox
(`cdn.playwright.dev` is outside the network allowlist). The E2E specs
(`tests/e2e/`) and config are complete and run locally/in CI; they were not
executed here. Unit tests (Vitest) run and pass.

## Live Supabase auth wiring (T01)

Email + password is the only first-party method wired (magic-link / OAuth are
out of scope here); it maps cleanly onto Supabase Auth and keeps the demo path
unchanged. Sign-up assumes "Confirm email" is ON in the Supabase dashboard, so a
sign-up that returns no session is treated as "check your email" rather than an
error. Password reset uses `resetPasswordForEmail` with a redirect to
`<VITE_APP_URL>/reset-parola`; the resulting `PASSWORD_RECOVERY` event (via
`detectSessionInUrl`) sets a `recovery` flag the reset page reads. Opaque
Supabase error strings are mapped to a small set of stable keys in `authLogic`
(`mapAuthError`) so the UI copy stays bilingual and never leaks raw backend
text; unrecognised messages fall back to a generic key. The "same as old
password" message is matched before the weak-password rule because both contain
the substring "should be". Password validation here enforces only a minimum
length (8) by design; the full strength policy and known-breach rejection belong
to T03, and role-gated profile/membership loading to T28.

## RLS & tenant-isolation security audit (T04)

The full RLS sweep found no uncovered or over-permissive table beyond the three
already fixed in T34, so T04 added no migration; the audit conclusion plus two
backend-free regression guards (`rlsTenantIsolation.test.ts`,
`securityHeaders.test.ts`) are the deliverable. The guards parse the migration
SQL and `netlify.toml` rather than hitting a database, so they run in CI today
without a provisioned Postgres; live cross-tenant checks against real Postgres
stay in T08 and the table-by-table coverage guard in T35 (kept separate from
T04's isolation-invariant test to avoid overlap).

The Content-Security-Policy keeps `script-src 'self'` (no `unsafe-inline` for
scripts) because the production `index.html` carries only an external module
script; `style-src` does allow `'unsafe-inline'` because the motion layer sets
element style attributes, and removing that would break animations. `connect-src`
uses a `https://*.supabase.co` / `wss://*.supabase.co` wildcard rather than the
exact project origin because the Supabase URL is environment-specific and the
header is static in `netlify.toml`; tightening it to the exact origin at
build/deploy time plus CSP violation reporting is queued as T39. HSTS uses a
two-year `max-age` with `includeSubDomains; preload` to be submission-ready for
the preload list. `npm audit` reported 0 vulnerabilities, so nothing to resolve.

## Invite-code lifecycle + admin surface (T41)

The invite model lives in two layers so the offline loop is complete and the
live path is a thin follow-up. Pure `inviteLogic` owns the lifecycle (create /
validate / consume / revoke); a persisted `inviteStore` (`intrevecini.invites`)
keeps issued codes across all asociații and filters by the active one. Codes are
generated with the existing `generateInviteCode` (unambiguous 8-char alphabet)
and regenerated on the rare collision so they stay unique within the store.

`validateInvite` returns `ok | expired | used | revoked | unknown` with a
deliberate precedence: unknown first, then revoked (an admin action overrides
everything), then `used` for a consumed single-use code (so a spent code reads
`used` even once also expired), then `expired`, else `ok`. Timestamps are stored
as epoch ms (not ISO strings) for cheap comparison and compact persistence.

The local `InviteCode` adds a granted `role` and a `singleUse` flag that the
`invite_codes` table does not yet have (the table models single-use only
implicitly via `consumed_by_user_id`). Rather than reshape the table now, those
are local-model extensions and the additive migration to add `role` +
`single_use` columns for live parity is queued as T60 (folds into T55). The
store's `consume` re-validates inside the state update so a single-use code
cannot be double-spent under a race; it does not create the membership, which is
T42's concern, keeping issue/redeem (T41) and join/membership (T42) cleanly
split. `INVITABLE_ROLES` excludes `admin`/`super_admin` so an invite can never
mint a founder/platform role.

## Resident join via invite code (T42)

`authStore.joinByInvite(code)` is the offline join: it peeks the code
(`findByCode` + `validateInvite`) before consuming so an already-member retry
just re-selects the asociație instead of burning a single-use code, then
delegates the actual spend to the T41 `inviteStore.consume` (which re-validates
inside the state update, so the consume is the one replay-safe gate). On success
it builds the granted membership with the pure `buildMembershipFromInvite` and
selects the asociație. The method returns the `InviteStatus` rather than throwing
so the UI maps `expired`/`used`/`revoked`/`unknown` to precise bilingual copy.

The invite's `apartmentId` is intentionally not written to any local store on
join: the offline `Membership` model carries only role + asociație, and there is
no writable local apartment-ownership store (the demo apartments are a static
seed). The apartment link rides along on the invite to the live join RPC (T55),
which writes the ownership association server-side under RLS. This keeps the
offline join honest (no fake apartment write) while preserving the full model for
the live path.

The join entry point is a separate public page (`/onboarding/alatura`) reached
from a link on the create-asociație wizard's first step, rather than restructuring
the wizard into a create/join chooser, to keep the existing create flow and its
E2E intact. A joiner does not learn the asociație's display name from a bare code,
so no `localAsociatii` name entry is recorded on join; resolving the joined name
(so the chrome stops showing the fallback) is queued as T62, folding into T59.

## Disabled-module route gating + demo as full showcase (T44)

A disabled module was hidden from the nav but its page was still mounted in the
router, so a direct `/app/<path>` URL loaded it. T44 adds a single
`FeatureRouteGuard` wrapping the `/app` `<Outlet />` rather than wrapping each of
the ~70 feature routes individually: it resolves the active pathname to a feature
key via the pure `featureRouteLogic.PATH_TO_FEATURE` map (built from the registry,
so the path table is never duplicated) and, when that feature's flag is OFF for
the active asociație, renders a bilingual "module not enabled" notice instead of
the page. One guard, derived from the same per-asociație flag set that drives the
nav (T43), keeps the nav and URL access in lockstep and cannot drift.

Because the guard makes the feature flags authoritative for URL access, the demo
asociație now enables **every implemented module** (`DEMO_FEATURES` = all
`implemented` features, previously the curated `RECOMMENDED_FEATURES` 10). The
demo is a showcase meant to be fully explorable offline, and the per-feature E2E
happy paths reach each page by direct URL; gating those URLs while seeding only 10
flags would have made ~38 of the feature pages unreachable in demo and broken
their specs. A real, newly created asociație is unaffected: onboarding still seeds
the curated `RECOMMENDED_FEATURES` starter set, and an admin enables more from the
features admin page. The guard gates on the enabled flag only; enforcing each
feature's `audience`/role is tracked separately as T64.

## Telegram `/start CODE` linking: dual-code design + dependency-free split (T50)

The bot accepts two distinct codes through the same `/start <payload>` deep link,
resolved with a defined precedence (per-user link code first, then invite code):

- an **invite code** (T41/T42) onboards a *new* joiner — it grants asociație
  membership, but the joining app user is created/linked server-side by the live
  join RPC (T58), so the offline `TelegramLink` it produces carries a null
  `userId` (the role + apartment the invite grants ride along for that step);
- a **per-user link code**, minted by an *already-registered* resident, binds
  their Telegram chat to their existing account so they receive notifications
  there. This resolves to a concrete `userId` and is the fully-offline-testable
  path.

The local/mock `telegramLinkStore.linkByPayload` therefore records + consumes the
**link-code path** but, for the invite path, returns the validated outcome
without recording anything offline (there is no app user to attach a
`telegram_users` row to until provisioning, and `telegram_users` has no
`asociatie_id` column — the asociație linkage is via the user's membership).
Persisting the invite-via-Telegram association is part of the live activation
(T58). The pure `resolveTelegramStart` resolver covers both branches and is what
the unit tests exercise.

The parsing + reply layer (`telegramStart`, in `src/shared/lib/`) is kept
deliberately **dependency-free** — it imports only the pure `inviteCode` helper,
no `@/` aliases and no Zustand/React — because the Netlify webhook is bundled by
esbuild (`node_bundler = "esbuild"`) and historically imports only relative paths
with no alias resolution. The resolver + link-code lifecycle, which reuse
`inviteLogic` and the domain types via `@/` aliases, live separately in
`src/features/telegram/telegramLinkLogic.ts` (app + tests only) and are never
imported by the function, so the bundle stays alias-free. The bot's replies are
Romanian only: it is a backend surface, not a localized UI, matching the existing
webhook copy (the in-app surfaces remain fully bilingual). The in-app "Link
Telegram" resident UI that mints a link code + deep link is queued as T68.

## T46 — parent-child tenant consistency via composite FK (not a trigger)

Where a child row references a parent row and **both** carry a direct
`asociatie_id`, nothing previously stopped the child from pointing at a parent in
another asociație: RLS only checks `is_member(child.asociatie_id)`. The fix
(`20260522000014_tenant_consistency_fk.sql`) enforces `child.asociatie_id =
parent.asociatie_id` declaratively with a **composite foreign key** — the parent
gets a `unique (id, asociatie_id)` target and the child gets an FK on
`(fk_col, asociatie_id) -> parent (id, asociatie_id)`. A generic
`add_tenant_fk(child, fk_col, parent)` helper applies it to all 43 such pairs.

Chosen over a per-row `before insert/update` trigger because a composite FK is
declarative, enforced by the planner, cannot be bypassed (including by a future
`security definer` routine), and needs no function of our own to audit. The FK
uses MATCH SIMPLE (the default), so a NULL `fk_col` is not enforced — matching
the existing nullable references (e.g. `tickets.apartment_id`). It keeps the
default `on delete no action` so it never converts a restricting parent FK into a
cascading one: where the original single-column FK cascades, the child is removed
first and this check then passes; where it restricts, the restriction stands.

Scope: only child tables that carry their **own** `asociatie_id` are covered.
Parent-scoped junction tables without one (`aga_votes`, `budget_votes`,
`petition_signatures`, `aga_attendees`) have no tenant column to keep equal, so
their `apartment_id` cross-tenant exposure is tracked separately (T71), and the
latent `aga_votes` RLS-on-missing-column bug surfaced here is T70.

## T71 — apartment-ref tenant consistency via a trigger (not a composite FK)

The T46 composite FK only covers child tables that carry their **own**
`asociatie_id`. The remaining gap is junction tables that have no tenant column
of their own (their tenant is the parent's) yet reference `apartments` directly:
`aga_votes.apartment_id`, `aga_attendees.apartment_id`/`proxy_for_apartment_id`,
`budget_votes.apartment_id`, `idea_votes.apartment_id` (found while auditing —
not named in T71's prose but the identical gap) and
`petition_signatures.apartment_id`. The invariant is
`apartment.asociatie_id = parent.asociatie_id` (the parent being
`agas`/`budget_proposals`/`ideas`/`petitions`).

A composite FK is **not available** here because the child has no `asociatie_id`
column to put into the key, and adding a denormalised one would have to be kept
in sync by a trigger anyway. So `20260522000015_apartment_ref_tenant_consistency.sql`
enforces it with a `before insert or update` trigger
(`check_apartment_parent_tenant`) that resolves the parent's and the apartment's
`asociatie_id` and rejects a mismatch. It runs `security definer` with a fixed
`search_path = public` (like `is_member`/`has_role`) so it is unaffected by RLS
or a hostile session search_path, reads `NEW` via `to_jsonb` so one generic
function serves every table, and treats a NULL apartment reference as allowed
(matching the nullable columns). A generic
`add_apartment_tenant_trigger(child, apt_col, parent, parent_fk_col)` helper
applies it to the six references. `apartment_residents` is intentionally excluded:
its only tenant anchor *is* the apartment, so there is no second parent to keep
consistent with.

## T69 — least-privilege owner grants on governance tables (vote/signature lock, not status)

`apply_owner_rls` gives the author one blanket "owner manage" (`for all`) policy
on their own row. Correct for purely personal rows (a pet, a bike, a listing),
but too broad for governance/voting tables (`budget_proposals`, `ideas`,
`petitions`): once other residents cast votes/signatures the row stops being the
author's alone, yet the blanket grant still let them update or delete it (a delete
even cascading the votes/signatures away). The cast votes/signatures are already
immutable under RLS (T34); this closes the parent side.

`20260522000016_governance_owner_least_privilege.sql` replaces the blanket grant
on those three tables with operation-scoped owner policies via a new
`apply_governance_owner_rls(tbl, owner_col, child_tbl, child_fk)` helper:
`"owner insert"` (author may create their own row in an asociație they belong to),
`"owner update unlocked"` and `"owner delete unlocked"` (author may edit/remove it
only while NO child vote/signature row exists). Comitet/președinte/admin keep
full moderation through the standard `"comitet write"` (`for all`) policy and
every member keeps read via `"members read"` — those are left untouched.

The lock condition is the **existence of a child vote/signature row**, not a
per-table `status`: it is the uniform, meaningful "others have acted on it"
signal across all three (`budget_proposals` carries no status column of its own),
and the author, being a member of the asociație, can always see those child rows
under T34's parent-scoped read policy, so the `not exists` lock evaluates
reliably for them. The helper is additive and idempotent (drops `"owner manage"`
and any prior run of the scoped policies before recreating). It only narrows the
owner grant; no other policy changes.

## T21 — ROPA generated from the feature model; DPA as an informational template

The asociația de proprietari is the **data controller** and vecini.online the
**processor** (art. 28). Rather than ship a static, hand-maintained "Registru al
activităților de prelucrare" (art. 30) that drifts the moment a module is enabled
or disabled, the register is **generated from the feature/data model**: each
`FeatureCategory` carries a default processing profile (data categories, lawful
basis, retention, recipients), sharpened by a small set of per-feature overrides
in `ropaLogic` for the genuinely-different cases (financial records F12/F20/F44
with a 10-year accounting retention; opt-in/consent features F36/F37/F49/F63/F64;
the anonymous channel F05, which carries no identity). `buildRopa(enabledKeys)`
then lists four always-present platform activities (account/auth, security log,
consent records, data-subject requests) followed by one entry per enabled,
implemented feature, so the register an admin sees reflects exactly the modules
that asociație runs. A unit guard asserts every implemented feature resolves a
non-empty profile, so a new feature cannot silently fall outside the register.

The override map lives in `ropaLogic` for now; T74 will move the profile onto
`FeatureDef` so the registry is the single source of truth. The DPA (art. 28) is
an **informational bilingual template** in `dpaContent.ts` (controller name
interpolated, the art. 28(3)(a-h) processor obligations), downloadable as text;
it is explicitly to be reviewed before an asociație relies on it, consistent with
how `legalContent.ts` treats the public policy prose. Persisting a point-in-time
ROPA snapshot + a DPA adoption record under RLS is the live follow-up T75.

## T22 — breach procedure: downloadable text notifications + append-only log

The asociație is the **data controller**; on a personal-data breach it must
notify the supervisory authority (ANSPDCP) within 72 hours of becoming aware
(art. 33) and, on a high risk, inform the affected residents (art. 34). The
breach surface (`/app/admin/incidente-date`, controller-role only) records a
breach, classifies its risk, and **generates** the two notifications.

Decisions:

- **Risk drives the duty, not the admin's free choice.** `classifyRisk` maps the
  WP29/EDPB severity factors (sensitivity, scale, identifiability, whether the
  risk is neutralised, e.g. encryption per art. 34(3)(a)) to `low` / `risk` /
  `high`, and the app derives whether the authority and/or the residents must be
  notified. The admin may override the suggested level, but the default is
  computed so the obligation is not under-stated by omission.
- **Notifications are downloadable bilingual plain text**, not a rendered PDF or
  an automated submission — the same bundle-budget choice as the AGA
  proces-verbal (T13). The platform prepares the art. 33 notification and the
  art. 34 notice; **submitting** to the ANSPDCP and **delivering** to residents
  remain the controller's act. Live in-app delivery of the resident notice
  through the notification fan-out (as an essential, consent-bypassing security
  communication like F03) is the follow-up T76.
- **The breach log is append-only.** `data_breaches` has insert/select/update
  policies for the controller roles but **no delete policy** for anyone, so the
  documentation art. 33(5) requires stays tamper-evident; the lifecycle only
  advances forward and notification times are stamped once. The task names the
  audit stream (T09), which is not yet built; the log stands on its own now and
  T76 folds the breach lifecycle events into the unified audit stream when T09
  lands.
- **No breached data is stored** — only the breach description, its approximate
  scope (categories as i18n keys, affected count) and the handling trail; the
  reporter is recorded by display name only, mirroring the T06 DSR model.

## T73 — data-subject export driven by one section spec (export + erasure + retention)

The art. 15 export was broadened from 6 to 26 sections covering every store that
holds rows attributable to a resident. Rather than maintaining the export
sections, the erasure plan and the retention policy as three parallel lists that
can drift, all three are **derived from a single private `SUBJECT_SECTIONS`
array** in `gdprLogic`. Each entry declares, in one place, how to `select` the
subject's rows, the erasure `action` + rationale key, and the retention period +
basis key. Adding a personal-data feature means adding one entry, which makes it
part of the export, the erasure plan and the retention policy at once, so a new
feature can never silently fall outside any of them.

Decisions:

- **`collectPersonalData` stays pure.** It takes the store arrays as input (the
  page wires the stores in) and each section's `select` filters to the subject's
  rows by that store's real attribution field (`user_id` / `owner_user_id` /
  `author_user_id` / `reporter_user_id` / `sender_user_id` / `from_user_id` /
  `organizer_user_id` / `resident_user_id`). Backend-free, so it runs in demo
  mode and is fully unit-testable.
- **`votes` and `financial` are retain-only.** The resident contributed to them
  but does not hold them as exportable rows of their own (votes are scoped by
  apartment, financial records by ledger), so they have no export section but
  remain in the erasure plan + retention policy as retained categories.
- **Parking is excluded** — spots are assigned by apartment label, with no
  `user_id`, so no row is attributable to a subject.
- **Feedback exports only non-anonymous rows** (`!anonymous && user_id === me`),
  so anonymous feedback stays anonymous even in the author's own export.
- **The section set is locked by test.** `gdprLogic.test.ts` asserts the exact
  `EXPORT_SECTION_KEYS` set (a new store must be added there), that every export
  section has an erasure outcome + retention period, and that every category's
  i18n section label + every reason/period/basis key resolves in both ro.json
  and en.json — so a section cannot ship without bilingual strings.

## T38 — Least-privilege RLS for individual response rows (survey/vote/ranking privacy)

`survey_responses`, `votes` and `priority_rankings` shipped with the standard
`apply_standard_rls` "members read · comitet write" RLS. The "members read"
policy (`for select using (is_member(asociatie_id))`) let any member of the
asociație read every individual row — who answered an "anonymous" survey
(`surveys.anonymous` defaults to `true`), how each neighbour voted, what each
apartment ranked. A within-tenant privacy leak (less severe than the
cross-tenant T34 gap, but real). Fixed in
`20260522000020_response_privacy.sql`.

Decisions:

- **Additive narrowing migration, not a source edit.** Unlike T70 (where a
  broken `create policy` aborted the migration so the source had to be fixed in
  place), the standard policies here apply cleanly. So a new additive migration
  drops the over-permissive `"members read"` / `"comitet write"` policies and
  recreates least-privilege ones, matching T34/T45/T46/T71. Idempotent (guarded
  drops, `create or replace` functions).
- **Self-read only, plus a narrow comitet exception for named surveys.** A
  respondent reads only their own row. Comitet may read individual
  `survey_responses` rows ONLY for a non-anonymous survey
  (`surveys.anonymous = false`); for an anonymous survey nobody — not even
  comitet — can read attributed rows.
- **Votes default to ballot secrecy.** `polls` carries no per-poll secrecy flag,
  so the privacy-preserving default is that a voter reads only their own vote and
  everyone else sees results through the aggregate. Formal AGA votes, which are
  attributable by Legea 196/2018, live in the separate `aga_votes` table and
  keep comitet visibility there — unchanged.
- **Cast rows stay immutable; rankings are revisable.** `survey_responses` and
  `votes` get no update/delete/for-all policy (a cast answer/vote is immutable,
  like T34's vote/signature tables). `priority_rankings` is a per-apartment
  preference list a resident may revise, so it gets a single `for all` self
  policy scoped through `apartment_residents` (the `event_rsvps` "self rsvp"
  precedent) — select/insert/update/delete all confined to the resident's own
  apartment.
- **Aggregates served by SECURITY DEFINER functions, attribution-free.**
  `survey_tally`, `poll_tally` and `priority_ranking_turnout` read past RLS to
  aggregate but return counts only (never a user/voter/apartment id), gated on
  `is_member` of the owning asociație with a fixed `search_path` (matching
  `is_member`/`has_role`). Ranked polls aggregate their `ranked_options` jsonb at
  the application layer; the functions cover the option-selection poll types.
- **Locked by test.** `responsePrivacyRls.test.ts` asserts the blanket policies
  are dropped, the self-scoped reads exist, the comitet survey read is gated on
  non-anonymous, votes/responses carry no mutation policy, the ranking policy is
  apartment-scoped (no `has_role`), and the aggregate functions are security
  definer with a fixed search_path and project no identity column.

## T31 — MFA challenge attempt throttling (2026-05-23)

- **Reuse the T03 `loginThrottle` module, no new primitive.** The MFA challenge
  step is throttled with the same pure sliding-window + escalating-lockout logic
  as login (`registerFailure`/`registerSuccess`/`remainingLockMs`), so the two
  rate limiters behave identically and there is one place to tune the budget.
- **A single per-device challenge channel, not keyed by account.** Login
  throttles per normalised email; the challenge runs after the password step for
  the one session being authenticated, and only one challenge is ever in flight
  per browser, so `mfaStore` holds a single `challengeThrottle` rather than a
  keyed map. Simpler, and it cannot be sidestepped by varying an identifier.
- **Throttle only on a wrong-credential guess.** A failure counts toward the
  lockout only when `mfaErrorKey(error) === 'invalidCode'` (the demo
  `invalid-code` and the live Supabase "invalid..." message). Config/availability
  errors (`not-enrolled`, `recovery-live-unavailable`, `challenge-failed`) are not
  attacker probes and never lock anyone out, so a mis-setup or an online recovery
  attempt is not penalised. The brute-force surface (the 6-digit TOTP space and
  demo recovery guessing) is exactly what increments the budget.
- **Persisted but client-side.** `challengeThrottle` is persisted so a reload
  cannot reset a lockout; a localStorage wipe still can. Server-side parity is
  T81 (alongside T29 live recovery and T33 server-backed login lockout).
- **New audit events.** `mfaChallengeFailed`/`mfaChallengeLocked` join the
  privacy-safe auth stream (no code/secret stored). The `auth_audit_events`
  `event_type` is unconstrained text, so no migration was needed.

## T09 — audit log surface: tamper-evident hash chain + append-only RLS (2026-05-23)

The audit trail records state changes across features (actor, time, before/after).

- **Tamper-evidence is two-layered, not one mechanism.** The real guarantee is
  the storage being append-only: the `audit_log` RLS grants admin/președinte
  read and member self-append, but **no** update or delete to anyone (admins
  included), so the ordering cannot be rewritten in place. On top of that, each
  entry carries `seq`, the predecessor's hash (`prev_hash`) and its own `hash`
  over its content + that link, forming a chain `verifyChain` re-derives on every
  view; editing or reordering any row breaks every hash after it. The chain
  detects an honest-but-careless mutation and surfaces exactly where; the
  append-only grant is what stops a deliberate one.
- **Non-cryptographic hash (cyrb53), deliberately.** The chain uses a fast
  synchronous 64-bit hash, not SHA/HMAC. The app's hashing is synchronous and
  runs in the demo path with no secret to key an HMAC with; a non-crypto digest
  is sufficient for ordering/integrity evidence given the append-only store.
  Stronger, secret-keyed or Merkle-anchored evidence (so integrity no longer
  depends on the store being honest) is the explicit follow-up T87.
- **Persisted, unlike the content stores.** `auditStore` uses `persist`
  (`intrevecini.audit`), whereas announcements/discussions/tickets are not yet
  persisted (T65). An audit trail must survive a reload to be tamper-evident at
  all, so the seeded demo chain plus recorded entries are kept in local storage
  offline; the seq/hash chain is therefore continuous across reloads.
- **Emit from pages, not stores.** `recordAudit` is called from the event
  handlers of the admin/content pages (feature toggle, invite issue/revoke, DSR
  decision, breach record/advance, announcement publish), where the actor +
  active asociație are already resolved. Emitting from inside the feature stores
  would couple every store to `auditStore` and risk import cycles; the page is
  the natural authorization boundary and keeps `auditStore` a leaf.
- **Live ordering authority deferred.** Offline the seq/hashes are computed
  client-side (fine for demo); a forging client could mint its own chain live.
  Server-authoritative seq/hash stamping (a trigger or Edge Function reading the
  current tail) is T86, behind `isSupabaseConfigured`.
