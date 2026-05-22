# Decisions — IntreVecini

A running log of non-trivial choices made while building the app. Newest first.

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
- Feature flags: a persisted Zustand store (`featureStore`) seeded from the
  recommended set; with a backend this is hydrated from `asociatie_features`.

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
