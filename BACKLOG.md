# BACKLOG — Autonomous continuous development

This is the **single source of truth for what to build next**. Both triggers use it:

- The user types **`make progress`** → the **top-priority** task is completed (commit + push), then stop and report.
- The user runs **`scripts/run-overnight.sh`** → the same one-task unit runs repeatedly, with no human input. While the queue has open tasks it builds them; when the queue empties it switches to an audit/replenish pass that measures progress against the original vision and writes the next wave of tasks, so work continues until a genuine stall, a task/time budget, a red pipeline, or an interrupt.

The goal both paths drive toward: a **secure, stable, well-polished, GDPR-compliant, multi-tenant SaaS** for Romanian asociații de proprietari, with 2FA auth, a live Telegram bot, and robust handling of the real problems a residential building faces.

This is a **self-improving loop**: doing a task surfaces problems and ideas, which become new tasks, which raise the quality bar further. The queue is meant to grow — it never "runs out" while the app can still be made safer, more stable, or more helpful.

---

## The `make progress` protocol

Do these steps, in order, every time:

1. **Pick the task.** Read this file. The current task is the **highest-priority unchecked task whose prerequisites are met** — i.e. the topmost `⬜` in `## Task queue` (the queue is kept sorted by priority). If the verification pipeline is currently red, fixing it *is* the task and outranks everything.
2. **Re-establish state.** Read `RESUME.md` (status), `FEATURES.md` (feature truth table), and the relevant code before writing. Match existing conventions exactly.
3. **Implement it fully.** No TODOs, no placeholders, no commented-out code. Follow the established per-feature pattern: logic module → Zustand demo store seeded from `src/shared/demo/demoData.ts` → feature page → flip `registry.ts` toggle to `implemented` → add route → `/command` bot help → RO/EN locales → unit test → one E2E happy-path. UI must be **fully bilingual (RO + EN)** and meet the **premium-feel** bar.
4. **Verify — all must be green.** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. Fix until clean. **Never weaken or delete a test to make it pass** — if a test reveals a real bug, fix the code. (The overnight script independently re-runs this whole pipeline after each commit and halts the loop on red, so a broken commit can never be built upon.)
5. **Update the docs.**
   - Mark the task `✅` in this file with a one-line note (leave it in place or move it to `## Completed`).
   - `FEATURES.md` table → flip the feature to `✅` with an implementation note (when the task is a feature).
   - `RESUME.md` `## 0. Current status` → bump counts, list what was done, update remaining, set the date.
6. **Feed the loop — create tasks from what you found.** Throughout the task, capture every:
   - **problem detected** (bug, security gap, fragile/duplicated code, missing test, accessibility or UX rough edge, performance issue, tech debt), and
   - **improvement or new feature worth having** (something that would make the app more secure, stable, or helpful to a building).

   Turn each into a **new task** and insert it into `## Task queue` **at the position matching its priority** (see the rubric below) — not merely at the bottom. Give it the next free `T##` id, a one-line goal, and a `[P#]` tag. Re-sort the queue if needed so the highest priority is always on top.
7. **Commit + push.** One focused conventional commit (`feat(...)`, `fix(...)`, `chore(...)`, `docs(...)`), end the message with the `Co-Authored-By` trailer, then `git push origin main`. Work directly on `main`.
8. **Stop.** One task per `make progress`. The overnight script handles repetition; do **not** start the next task yourself in interactive mode.

### Priority rubric (how to rank a task)
Keep the queue sorted with the highest priority on top. When two tasks share a priority, order by dependency (prerequisites first), then by smallest-safe-step.

- **P0 — Critical:** anything that makes the app unsafe to run for real residents — security holes, data-loss or privacy risks, a red pipeline, GDPR/legal blockers, tenant-isolation gaps.
- **P1 — High:** core stability and robustness, authentication, finishing committed features, work that unblocks other tasks.
- **P2 — Normal:** polish, performance, accessibility refinements, SaaS platform capabilities, quality-of-life UX.
- **P3 — Later:** speculative or optional enhancements; nice-to-have ideas to revisit.

### Hard rules (apply to every task)
- Do not ask the user questions during a task — make the reasonable decision, note it in `DECISIONS.md`, continue.
- Never use the em dash character in code or docs authored here.
- Romanian strings use proper diacritics (ă, â, î, ș, ț). Currency `1.234,56 lei`, dates `DD.MM.YYYY`, time `HH:mm`.
- Security and privacy are not optional: every new table gets RLS scoped by `asociatie_id`; every new field that holds personal data is covered by the GDPR tasks; never log secrets or PII.
- Keep demo mode working (offline, seeded) so the app always runs and E2E stays executable without a backend.

---

## Definition of done (checklist every task must satisfy)
- [ ] Implemented end-to-end, no TODOs/placeholders.
- [ ] `lint` + `typecheck` + `test` + `build` all green.
- [ ] Bilingual RO/EN, premium-feel UI, accessible.
- [ ] Docs updated (this file, `FEATURES.md` if applicable, `RESUME.md`).
- [ ] Problems found and improvements imagined captured as new priority-ranked tasks.
- [ ] One commit, pushed to `origin/main`.

---

## Task queue

> Sorted by priority, highest on top. `make progress` takes the topmost `⬜` whose prerequisites are met. Mark `✅` when the Definition of Done is fully met.

### ✅ T01 — [P0] Live Supabase auth wiring
Flip authentication off demo onto real Supabase Auth: email + password sign-up/login, email verification, password reset. Keep the `isSupabaseConfigured` demo fallback intact so the app still runs and E2E stays offline-executable. Document required env vars. Foundation for all security work below.
**Done:** pure `authLogic` (email/password validation, `canSubmit` per mode, `mapAuthError` → stable bilingual keys, unit-tested) + `authStore` extended with `signUp` (email-confirmation aware), `requestPasswordReset`, `updatePassword`, `resendVerification`, and a `PASSWORD_RECOVERY` → `recovery` flag in `init`. `LoginPage` is now a mode-switching form (sign in / sign up / forgot) with confirmation panels for "check your email" + reset-sent; new `ResetPasswordPage` at `/reset-parola` consumes the recovery session. All paths keep the demo fallback (no creds → `enterDemo`). RO/EN locales (incl. `auth.err.*`), `.auth-link` style, `.env.example` documents the Supabase Auth dashboard config (Confirm email ON, Site URL + `/reset-parola` redirect allow-list) and `VITE_APP_URL`. Unit test + one E2E happy-path (mode switching + demo entry). Pipeline green.

### ✅ T02 — [P0] 2FA / MFA (TOTP)
Two-factor authentication: TOTP enrollment with QR code, verification step at login, single-use recovery codes, and a manage/disable flow. **Enforce** for privileged roles (admin, comitet, cenzor). Built on Supabase MFA. Bilingual flows, accessible, covered by unit + E2E tests. Prereq: T01.
**Done:** pure `mfaLogic` (self-contained RFC 6238/4226 TOTP over Web Crypto, base32 codec, single-use recovery-code generation/hashing/consumption, `requiresMfa` role rule, `challengeNeeded` AAL state machine, `mfaErrorKey`; unit-tested against the published RFC vectors) + `mfaStore` orchestrating both paths. `SecurityPage` at `/app/securitate` does enroll (Supabase QR live / manual setup key demo) → 6-digit confirm → ten single-use recovery codes shown once (copy/download) → manage (regenerate) / disable. `LoginPage` gained a post-password TOTP/recovery challenge step; `AppLayout` steers privileged un-enrolled users to the security page in the live path (demo stays unblocked). Crypto is real, so demo mode genuinely verifies authenticator codes offline; live delegates challenge/verify to Supabase MFA. Recovery codes stored only as SHA-256 hashes (`mfa_recovery_codes` migration, owner-only RLS), consumed single-use. RO/EN `auth.mfa.*` locales, `/securitate` bot command, UserMenu link. Unit test + one E2E happy-path (enrol → recovery codes → challenged at next sign-in). Pipeline green. Surfaced follow-ups T29 (live recovery-code login), T30 (live enforcement E2E), T31 (MFA challenge throttling).

### ✅ T03 — [P0] Auth & session hardening
Password strength policy + known-breach rejection, login rate limiting with temporary lockout, secure session/refresh handling, sign-out-everywhere, and an auth audit-event stream (login, failed login, MFA change, password change). No PII or secrets in logs. Prereq: T01.
**Done:** three pure, unit-tested modules — `passwordPolicy` (min-10 length + bcrypt-72 cap + character-variety + offline breached/common-password blocklist + email-echo rejection + strength score), `loginThrottle` (sliding-window failed-attempt counting with escalating, capped temporary lockout per normalised email) and `authAudit` (privacy-safe event model; `redactEmail` masks to `a***@domain`, never stores a password/token/code/full email). A persisted `securityStore` wraps the throttle map + the recent-activity log and mirrors each event, best-effort, into the new `auth_audit_events` table (append-only, owner-read + admin-read RLS) when a backend is present. `authStore` gained `signOutEverywhere` (`scope:'global'`), throttle-gated `signIn` returning `lockedMs`, and audit logging across sign-in/out, password change, reset request and demo entry; the Supabase client now uses the PKCE flow. `LoginPage` shows a live password-strength meter with first-issue hints on sign-up and a bilingual lockout toast; `SecurityPage` adds an "active sessions / sign out everywhere" card and a "recent security activity" list; `mfaStore` records enable/disable/recovery-regenerate events. RO/EN `auth.pwd.*`/`auth.sessions.*`/`auth.audit.*`/`auth.lockout` locales. 32 new unit tests + one E2E (sign-up rejects a breached password and reports strength). Pipeline green. Surfaced follow-ups T32 (server-side auth-policy parity) and T33 (server-backed throttle so a localStorage wipe cannot reset the lockout).

### ⬜ T34 — [P0] Fix unprotected vote/signature tables (RLS never enabled)
Confirmed tenant-isolation hole found in the 2026-05-22 audit: `budget_votes`, `idea_votes` and `petition_signatures` (junction tables in `20260121000002_features.sql`) have **RLS never enabled and zero policies**, so Supabase/PostgREST exposes who voted on which proposal/idea and who signed which petition to any authenticated user, across every asociație. They carry no direct `asociatie_id` (scoped through their parent), so add an additive migration that `enable row level security` on all three and adds parent-scoped policies: read/insert allowed only when `is_member(...)` of the asociație owning the parent `budget_proposals` / `ideas` / `petitions` row (and one-vote/one-signature semantics preserved by the existing composite PK). No grant to update/delete a cast vote or signature. This is the concrete severe instance of T04; do it first. Add a regression test (see T35).

### ⬜ T04 — [P0] RLS & tenant-isolation security audit
Review and repair **every** RLS policy for strict `asociatie_id` isolation and least privilege (the T34 gap on `budget_votes`/`idea_votes`/`petition_signatures` is the first confirmed instance — sweep for any others). Add automated cross-tenant isolation tests. Add CSP + HSTS (`Strict-Transport-Security`) + the remaining security headers in `netlify.toml` (currently only X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy are set). Run `npm audit` and resolve. Write/refresh `SECURITY.md` (threat model, reporting, controls).

### ✅ T05 — [P0] GDPR consent & legal surface
Cookie/consent banner with granular categories, Privacy Policy and Terms pages (RO/EN), a consent-records table (who consented to what, when, version), and granular notification consent honored by the fan-out service. Lawful-basis notes per data category in `DECISIONS.md`.
**Done:** global `ConsentBanner` (Accept all / Doar esențiale / Personalizează with per-category switches), public `/confidentialitate`, `/termeni`, `/cookies` pages (bilingual, GDPR + Legea 190/2018 + ANSPDCP + ANPC/SOL content via `legalContent.ts`), in-app `/app/confidentialitate` consent-management page with decision history, `consentLogic` + `consentGate` (the `mayNotify` fan-out gate) unit-tested, persisted `consentStore`, additive `consent_records` migration (owner RLS + admin read), legal links in app footer + login, lawful-basis notes in `DECISIONS.md`. Reordered ahead of T01–T04 because it is the only fully-testable P0 with no provisioned-backend prerequisite. Pipeline green; one E2E happy-path added.

### ⬜ T06 — [P0] GDPR data-subject rights
Per-user data export (machine-readable JSON + CSV of all their personal data), account deletion / right-to-erasure with proper anonymization of records that must be retained (e.g. votes, financial), and a documented data-retention policy with a cleanup routine. Admin tooling to action requests with an audit trail. Prereq: T05.

### ⬜ T21 — [P0] DPA + records of processing (art. 28 & 30 GDPR)
The asociație is the data controller and vecini.online is the processor. Ship a Data Processing Agreement template surface and a per-asociație "Registru al activităților de prelucrare" (record of processing activities, art. 30): which feature processes which data category, lawful basis, retention, recipients — generated from the feature/data model and viewable/exportable by the admin. Surfaced from the privacy settings. Builds on T05's lawful-basis notes.

### ⬜ T22 — [P0] Personal-data breach procedure (art. 33/34)
Documented breach-notification procedure and an admin tool to record a breach, classify risk, and produce the 72-hour notification to ANSPDCP plus, where required, the notice to affected residents. Append-only breach log tied to the audit stream (T09). No PII in logs beyond what the record needs.

### ⬜ T35 — [P1] Automated RLS-coverage guard (regression test)
T34 existed because three tables shipped without RLS and nothing caught it. Add a static, backend-free guard that parses `supabase/migrations/*.sql`, collects every `create table` in `public`, and asserts each one is later covered by an `enable row level security` (directly or via the `apply_standard_rls` / `apply_owner_rls` helpers). Fail the unit suite on any uncovered table so a future migration cannot reintroduce the class of bug. Runs offline in CI today (no provisioned Postgres needed); complements the live cross-tenant tests in T04/T08. Prereq: T34.

### ⬜ T27 — [P1] Post-authentication association onboarding (live path)
After a real (non-demo) sign-up + email verification, the user has a session but no membership, so they land on an empty app. Route a member-less authenticated user to create an asociație or join one by invite code, wiring the existing `auth.noAsociatie`/`auth.createFirst` strings and the onboarding wizard into the live auth path. `RequireAuth` (or a new gate) must distinguish "no session" from "session but no asociație". Prereq: T01.

### ⬜ T28 — [P1] Profile & membership hydration in authStore
`init` sets the session but never loads `profile`/`memberships` from the backend, so role-gated UI (admin/comitet/cenzor) has nothing to read in the live path. Fetch the signed-in user's profile + memberships (under RLS) on session change, expose a current-asociație selector, and keep the demo seed as the fallback. Prereq: T01. Unblocks role enforcement in T02/T03.

### ⬜ T29 — [P1] Live recovery-code login (server routine)
2FA recovery codes are generated, hashed and stored (`mfa_recovery_codes`, T02) and fully work in demo mode, but in the live path a recovery code cannot client-side step a session up to AAL2 — Supabase grants AAL2 only via an MFA verify. Add a privileged server routine (Supabase Edge Function using the service-role/admin API) that verifies a submitted recovery code against the stored hash, consumes it single-use, and completes the second factor, then wire `verifyChallenge`'s live branch to it. Until then a privileged user who loses their authenticator is locked out in production. Prereq: T02, T28.

### ⬜ T30 — [P1] MFA enforcement E2E for live privileged roles
The privileged-role enforcement added in T02 (`AppLayout` steers an un-enrolled admin/comitet/cenzor to `/app/securitate`) is unit-tested at the `requiresMfa` level but not exercised end-to-end, because demo mode has no backend role (resident). Add a test harness (seeded/mocked membership + faked AAL) proving an enrolled-but-unverified privileged session is routed to the security page and cannot reach other routes until it enrols. Prereq: T02, T28.

### ⬜ T31 — [P1] MFA challenge attempt throttling
The TOTP / recovery challenge step accepts unlimited attempts, so a stolen password plus brute force over the 6-digit space is not rate-limited client-side. Add attempt throttling with backoff/temporary lockout on the challenge (and recovery) step, surfaced bilingually, complementing the login rate limiting in T03. Reuse the `loginThrottle` module from T03. Prereq: T02; coordinate with T03.

### ⬜ T32 — [P1] Server-side auth-policy parity
T03's password strength/breach policy and login throttle run client-side, so they harden the UX but are bypassable by a direct API call. Bring the backend into line: enable Supabase Auth's minimum-password-length and leaked-password (HIBP) protection, confirm/raise the server-side auth rate limits, and document the exact dashboard settings in `.env.example` and `SECURITY.md` (the latter lands with T04). The client policy stays as the first line; the server becomes the authority. Prereq: T01, T03.

### ⬜ T33 — [P2] Server-backed login lockout
The T03 login lockout state lives in `localStorage` (so a temporary lock survives reload), but a determined attacker can clear it between attempts. Once a backend is provisioned, record failed-attempt counters server-side (keyed by account, behind RLS or an Edge Function) so the lockout cannot be reset client-side, and reconcile it with the client throttle. Prereq: T03, T28.

### ⬜ T07 — [P1] Resilience & error handling
Global error boundary, standardized loading/empty/error states across all pages, request retry/backoff, and a client-side error-reporting hook (Sentry-ready, no PII). Friendly bilingual error copy.

### ⬜ T08 — [P1] E2E suite green + CI
Install Playwright browsers, make `tests/e2e` pass (smoke + per-feature happy paths), and add specs for auth + 2FA + tenant isolation. Wire a CI workflow that runs lint/typecheck/unit/build/E2E on push. Once done, E2E joins the per-task gate.

### ⬜ T09 — [P1] Audit log surface
Admin-viewable, filterable audit trail of state changes across features (actor, timestamp, before/after), backed by the existing audit infrastructure. Tamper-evident ordering, export, retention aligned with T06.

### ✅ T10 — [P1] F35 Apartament info (per-apartment dashboard)
Read-only aggregation page for a single apartament: meter-reading history, tickets, votes cast, payment status (amounts hidden if finance is off), apartment-specific documents. Owner sees only their own; co-owners share the view; admin can open any in their asociație. No new table — compose views over `apartments`, `meter_readings`, `tickets`, `votes`. `/apartament_meu` bot command.
**Done:** delivered as **F35** (see `FEATURES.md` / `RESUME.md`) — `apartmentLogic` + `ApartmentInfoPage` + registry toggle + route + `/apartament_meu` bot command + RO/EN locales + one E2E happy-path; computed over existing tables, no migration. (Queue entry resolved during the 2026-05-22 audit — it duplicated the already-shipped feature.)

### ⬜ T11 — [P1] F66 Profil complet (rich profile editor)
Full-page profile editor: photo (crop + initials fallback), structured standard fields (name, phone, email, apartament/scara/etaj, car plate → F28, address, emergency contact, DOB → F63, language), plus user-added typed custom fields via `+ Adaugă câmp` (text/long-text/number/phone/email/date/bool/select/link/address) each markable private vs. visible-to-neighbours (→ F36 consent). Per-type validation, autosave, completeness indicator. New migration: extend `profiles` + `profile_custom_fields` + storage photo bucket, RLS-scoped. `/profil` bot summary + deep link.

### ⬜ T12 — [P1] F67 Acasă personalizabil (customizable home)
Pencil icon flips the home into edit mode: per-resident show/hide, drag-reorder, optional sizing of feature cards. Card catalog is exactly the asociație's admin-enabled features (a disabled feature can never be surfaced). `Resetează la implicit` restores the default. Persists per resident across devices via a new `home_layouts` table (owner RLS) with an asociație default fallback. Smooth eased enter/exit per the premium-feel mandate.

### ✅ T13 — [P1] F10 AGA digitală (Adunarea Generală)
The heaviest feature. Formal General Assembly compliant with Legea 196/2018: convocator with notice period, agenda with attachments, RSVPs, proxy votes (procură) with admin verification, live per-item voting with quorum tracking, and generation of a legally-valid proces verbal as PDF after the meeting. Tables exist (`agas`, `aga_agenda_items/attendees/proxies/votes`). Telegram reminders, RSVP, live vote prompts.
**Done:** delivered as **F10** (see `FEATURES.md` / `RESUME.md`) — `agaLogic` (quorum/present/tally/percent/outcome/sort/lifecycle/PV) + `agaStore` + `AgaPage` + registry toggle + route + `/aga` bot command + RO/EN locales + batch5 owner-RLS migration + one E2E happy-path. The proces-verbal ships as downloadable plain-text (Romanian, signature-ready); swapping it for a server-rendered PDF is the only follow-up (see new T37). (Queue entry resolved during the 2026-05-22 audit — it duplicated the already-shipped feature.)

### ⬜ T14 — [P1] Email notification channel (live)
Wire the real email channel into the notification fan-out (Supabase/SMTP), bilingual templated emails, respecting per-user channel preferences and quiet hours (urgent/alert bypasses). Unsubscribe + preference management.

### ⬜ T15 — [P1] Telegram bot go-live
Complete every command/callback handler in `TELEGRAM_BOT.md`, validate Mini App `initData` and webhook secret end-to-end, deploy the Netlify function, add integration tests. Verify `BOT_SETUP.md` is accurate enough for a non-developer.

### ⬜ T16 — [P1] Realtime updates
Live updates via Supabase Realtime under RLS for announcements, tickets, votes, and chat surfaces, with optimistic UI and graceful reconnection. Falls back cleanly in demo mode.

### ⬜ T23 — [P1] Minors' consent guardrails (Legea 190/2018)
Codify and enforce that no feature collects identifying data about children. Keep F64 strictly aggregate (age-range counts, never names), add a documented rule + a test that the kids store never stores a child's identity, and require parental/representative handling for any future minor-facing data. Privacy-policy "Minori" section already states the position; this makes it enforced, not just declared.

### ⬜ T24 — [P1] Consumer-rights surface (ANPC / SOL)
For the SaaS billing relationship with consumer residents, surface the mandatory consumer-protection information: ANPC contact, the EU ODR/SOL platform link, withdrawal/refund terms, and clear pre-contractual info. Wire into the Terms page and the future billing surface (T19). Prereq awareness: T19.

### ⬜ T26 — [P1] Consent-gate enforcement in the fan-out
When the live notification channels land (T14 email, T15 Telegram), make every non-essential dispatch path call `mayNotify` (the T05 gate) and add tests proving a resident who refused a category receives nothing of that kind while essential alerts (F03) always go through. Prereq: T14, T15.

### ⬜ T25 — [P2] Accessibility statement (Declarație de accesibilitate)
Public accessibility-statement page describing the conformance target (WCAG 2.1 AA / EN 301 549), known limitations, and a feedback/contact route, linked from the legal footer. Lands alongside the accessibility audit. Prereq: T17.

### ⬜ T37 — [P2] Server-rendered proces-verbal PDF (F10 AGA)
F10 currently downloads the legally-required proces-verbal as signature-ready Romanian plain text (a deliberate bundle-budget choice — see `DECISIONS.md`). For a polished, court-presentable deliverable, render it as a real PDF: do it server-side (Supabase Edge Function / Netlify function) so no heavy PDF engine lands in the client bundle, keep the text generator (`generateProcesVerbal`) as the single source of the content, and stamp the asociație header + Legea 196/2018 footer. Demo mode keeps the text download. Prereq: a provisioned backend.

### ⬜ T17 — [P2] Accessibility audit (WCAG 2.1 AA)
axe-core clean on every page, full keyboard navigation, correct focus management in modals/drawers, ARIA labelling, sufficient contrast in both light and warm-graphite dark themes.

### ⬜ T18 — [P2] Performance & Lighthouse
Bundle and route-preload audit, image/avatar strategy, and meeting Lighthouse thresholds (Performance ≥ 85, Accessibility ≥ 95, Best Practices ≥ 90, SEO ≥ 90) on public pages.

### ⬜ T19 — [P2] SaaS billing & plans
Subscription tiers per asociație with per-tier feature/usage limits enforced server-side, a billing abstraction (Stripe-ready, mocked in demo mode), invoices/receipts, billing admin surface. Dunning + grace handling.

### ⬜ T20 — [P2] Super-admin platform console
Platform-owner console: manage asociații, the global feature catalog, support impersonation with full audit, and platform health/usage metrics. Strictly separated from tenant admin.

---

## Completed

> Move tasks here (or leave them `✅` above) as they finish, with the commit hash.

- **T05 — GDPR consent & legal surface** ✅ (kept in place above with its done-note). Consent banner + privacy/terms/cookie pages + consent management + `consent_records` migration + notification consent gate. First production-readiness task completed; reordered ahead of T01–T04 as the only fully-testable P0 with no backend prerequisite.
- **T01 — Live Supabase auth wiring** ✅ (kept in place above with its done-note). Email + password sign-up/login, email verification, and password reset wired onto Supabase Auth with the demo fallback intact; `authLogic` + extended `authStore` + mode-switching `LoginPage` + `ResetPasswordPage`. Surfaced two follow-ups: T27 post-auth association onboarding and T28 profile/membership hydration.
- **T02 — 2FA / MFA (TOTP)** ✅ (kept in place above with its done-note). RFC 6238 TOTP enrollment (QR live / manual key demo), login challenge with recovery codes, manage/disable, privileged-role enforcement, built on Supabase MFA with a fully-offline demo path; `mfaLogic` + `mfaStore` + `SecurityPage` + login challenge + `mfa_recovery_codes` migration. Surfaced three follow-ups: T29 live recovery-code login, T30 live enforcement E2E, T31 MFA challenge throttling.
- **T03 — Auth & session hardening** ✅ (kept in place above with its done-note). Password strength + offline breach blocklist (`passwordPolicy`), escalating login lockout (`loginThrottle`), privacy-safe auth audit stream (`authAudit` + `securityStore` + `auth_audit_events` migration), `signOutEverywhere`, PKCE flow, strength meter + lockout toast on `LoginPage`, sessions + activity cards on `SecurityPage`. Surfaced two follow-ups: T32 server-side auth-policy parity, T33 server-backed login lockout.
- **T10 — F35 Apartament info** ✅ and **T13 — F10 AGA digitală** ✅ — both were already delivered as features (`FEATURES.md` rows F35/F10) but still sat as ⬜ in the queue; the 2026-05-22 audit pass resolved them in place. T13 surfaced T37 (server-rendered PV PDF).
- **2026-05-22 audit/replenish pass** (no feature built): measured vision coverage (~58%, recorded in `RESUME.md §0`), swept RLS coverage across all 122 tables and found three with no RLS at all → T34 (P0). Fed in T34 (fix the unprotected vote/signature tables), T35 (automated RLS-coverage guard), T37 (server-rendered PV PDF), and sharpened T04 (CSP + HSTS specifics, cross-reference to T34). Confirmed lint/typecheck/test (76 files / 425 tests) /build all green and RO/EN i18n parity clean (the two RO-only `_few` keys are correct Romanian plural forms).
