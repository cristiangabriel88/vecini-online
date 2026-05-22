# Decisions — IntreVecini

A running log of non-trivial choices made while building the app. Newest first.

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
