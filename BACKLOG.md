# BACKLOG — Autonomous continuous development

This is the **single source of truth for what to build next**. Both triggers use it:

- The user types **`make progress`** → exactly **one** task is completed (commit + push), then stop and report.
- The user runs **`scripts/run-overnight.ps1`** → the same one-task unit runs repeatedly, with no human input, until there is nothing left to do (no new commit) or the run is interrupted.

The goal both paths drive toward: a **secure, well-polished, GDPR-compliant, multi-tenant SaaS** for Romanian asociații de proprietari, with 2FA auth, a live Telegram bot, and robust handling of the real problems a residential building faces.

---

## The `make progress` protocol

Do these steps, in order, every time:

1. **Pick the task.** Read this file. The current task is the **first one in `## Task queue` not marked `✅`**. If the verification pipeline is currently red, fixing it *is* the task (do that first).
2. **Re-establish state.** Read `RESUME.md` (status), `FEATURES.md` (feature truth table), and the relevant code before writing. Match existing conventions exactly.
3. **Implement it fully.** No TODOs, no placeholders, no commented-out code. Follow the established per-feature pattern: logic module → Zustand demo store seeded from `src/shared/demo/demoData.ts` → feature page → flip `registry.ts` toggle to `implemented` → add route → `/command` bot help → RO/EN locales → unit test → one E2E happy-path. UI must be **fully bilingual (RO + EN)** and meet the **premium-feel** bar.
4. **Verify — all must be green.** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. Fix until clean. **Never weaken or delete a test to make it pass** — if a test reveals a real bug, fix the code.
5. **Update the docs.**
   - Mark the task `✅` in this file with a one-line note.
   - `FEATURES.md` table → flip the feature to `✅` with an implementation note (when the task is a feature).
   - `RESUME.md` `## 0. Current status` → bump counts, list what was done, update remaining, set the date.
6. **Analyze and extend the queue.** Before committing, think about what *this* task surfaced or left unfinished on the road to a secure polished SaaS, and **append concrete new tasks** to the bottom of `## Task queue`. The backlog is meant to grow — continuous development never "runs out" while the app can still be made better or safer.
7. **Commit + push.** One focused conventional commit (`feat(...)`, `fix(...)`, `chore(...)`, `docs(...)`), end the message with the `Co-Authored-By` trailer, then `git push origin main`. Work directly on `main`.
8. **Stop.** One task per `make progress`. The overnight script handles repetition; do **not** start the next task yourself in interactive mode.

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
- [ ] Follow-up tasks appended to the queue.
- [ ] One commit, pushed to `origin/main`.

---

## Task queue

> Do the first unchecked task. Mark `✅` when its Definition of Done is fully met.

### ⬜ T01 — F35 Apartament info (per-apartment dashboard)
Read-only aggregation page for a single apartament: meter-reading history, submitted tickets, votes cast, payment status (amounts hidden if finance is off), and apartment-specific documents. Owner sees only their own; co-owners share the view; admin can open any in their asociație. No new table — compose views over `apartments`, `meter_readings`, `tickets`, `votes`. `/apartament_meu` bot command. Lowest risk, do first.

### ⬜ T02 — F66 Profil complet (rich profile editor)
Full-page profile editor: photo (crop + initials fallback), structured standard fields (name, phone, email, apartament/scara/etaj, car plate → feeds F28, address, emergency contact, DOB → feeds F63, language), plus user-added typed custom fields via `+ Adaugă câmp` (catalog: text/long-text/number/phone/email/date/bool/select/link/address) each markable private vs. visible-to-neighbours (→ F36 consent). Per-type validation, autosave, completeness indicator. New migration: extend `profiles` + `profile_custom_fields` table + storage photo bucket, all RLS-scoped. `/profil` bot summary + deep link.

### ⬜ T03 — F67 Acasă personalizabil (customizable home)
Pencil icon flips the home screen into edit mode: per-resident show/hide, drag-reorder, and optional sizing of feature cards. Card catalog is exactly the asociație's admin-enabled features (a disabled feature can never be surfaced). `Resetează la implicit` restores the default. Layout persists per resident across devices via a new `home_layouts` table (owner RLS) with an asociație default fallback. Smooth eased enter/exit per the premium-feel mandate.

### ⬜ T04 — F10 AGA digitală (Adunarea Generală)
The heaviest feature. Formal General Assembly compliant with Legea 196/2018: convocator with notice period, agenda with attachments, RSVPs, proxy votes (procură) with admin verification, live per-item voting with quorum tracking, and generation of a legally-valid proces verbal as PDF after the meeting. Tables already exist (`agas`, `aga_agenda_items/attendees/proxies/votes`). Telegram reminders, RSVP, and live vote prompts. After this, all 67 features are built end-to-end.

### ⬜ T05 — Live Supabase auth wiring
Flip authentication off demo onto real Supabase Auth: email + password sign-up/login, email verification, password reset. Keep `isSupabaseConfigured` demo fallback intact so the app still runs and E2E stays offline-executable. Document required env vars. Foundation for all security work below.

### ⬜ T06 — 2FA / MFA (TOTP)
Two-factor authentication: TOTP enrollment with QR code, verification step at login, single-use recovery codes, and a manage/disable flow. **Enforce** for privileged roles (admin, comitet, cenzor). Built on Supabase MFA. Bilingual flows, accessible, and covered by unit + E2E tests.

### ⬜ T07 — Auth & session hardening
Password strength policy + known-breach rejection, login rate limiting with temporary lockout, secure session/refresh handling, sign-out-everywhere, and an auth audit-event stream (login, failed login, MFA change, password change). No PII or secrets in logs.

### ⬜ T08 — RLS & tenant-isolation security audit
Review and repair **every** RLS policy for strict `asociatie_id` isolation and least privilege. Add automated cross-tenant isolation tests. Add CSP + security headers in `netlify.toml`. Run `npm audit` and resolve. Write/refresh `SECURITY.md` (threat model, reporting, controls).

### ⬜ T09 — GDPR consent & legal surface
Cookie/consent banner with granular categories, Privacy Policy and Terms pages (RO/EN), a consent-records table (who consented to what, when, version), and granular notification consent honored by the fan-out service. Lawful-basis notes per data category in `DECISIONS.md`.

### ⬜ T10 — GDPR data-subject rights
Per-user data export (machine-readable JSON + CSV of all their personal data), account deletion / right-to-erasure with proper anonymization of records that must be retained (e.g. votes, financial), and a documented data-retention policy with a cleanup routine. Admin tooling to action requests with an audit trail.

### ⬜ T11 — Audit log surface
Admin-viewable, filterable audit trail of state changes across features (actor, timestamp, before/after), backed by the existing audit infrastructure. Tamper-evident ordering, export, and retention aligned with T10.

### ⬜ T12 — Email notification channel (live)
Wire the real email channel into the notification fan-out (Supabase/SMTP), bilingual templated emails, respecting per-user channel preferences and quiet hours (urgent/alert bypasses). Unsubscribe + preference management.

### ⬜ T13 — Telegram bot go-live
Complete every command/callback handler in `TELEGRAM_BOT.md`, validate Mini App `initData` and webhook secret end-to-end, deploy the Netlify function, and add integration tests. Verify `BOT_SETUP.md` is accurate enough for a non-developer.

### ⬜ T14 — Realtime updates
Live updates via Supabase Realtime under RLS for announcements, tickets, votes, and chat surfaces, with optimistic UI and graceful reconnection. Falls back cleanly in demo mode.

### ⬜ T15 — Resilience & error handling
Global error boundary, standardized loading/empty/error states across all pages, request retry/backoff, and a client-side error-reporting hook (Sentry-ready, no PII). Friendly bilingual error copy.

### ⬜ T16 — E2E suite green
Install Playwright browsers, make `tests/e2e` pass (smoke + per-feature happy paths), and add specs for auth + 2FA + tenant isolation. Wire a CI workflow that runs lint/typecheck/unit/build/E2E on push.

### ⬜ T17 — Accessibility audit (WCAG 2.1 AA)
axe-core clean on every page, full keyboard navigation, correct focus management in modals/drawers, ARIA labelling, and sufficient contrast in both light and warm-graphite dark themes.

### ⬜ T18 — Performance & Lighthouse
Bundle and route-preload audit, image/avatar strategy, and meeting Lighthouse thresholds (Performance ≥ 85, Accessibility ≥ 95, Best Practices ≥ 90, SEO ≥ 90) on public pages.

### ⬜ T19 — SaaS billing & plans
Subscription tiers per asociație with per-tier feature/usage limits enforced server-side, a billing abstraction (Stripe-ready, mocked in demo mode), invoices/receipts, and a billing admin surface. Dunning + grace handling.

### ⬜ T20 — Super-admin platform console
Platform-owner console: manage asociații, the global feature catalog, support impersonation with full audit, and platform health/usage metrics. Strictly separated from tenant admin.

---

## Completed

> Move tasks here (or leave them `✅` above) as they finish, with the commit hash.

_(none yet — the queue above is the seed)_
