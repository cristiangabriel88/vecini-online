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

### ⬜ T01 — [P0] Live Supabase auth wiring
Flip authentication off demo onto real Supabase Auth: email + password sign-up/login, email verification, password reset. Keep the `isSupabaseConfigured` demo fallback intact so the app still runs and E2E stays offline-executable. Document required env vars. Foundation for all security work below.

### ⬜ T02 — [P0] 2FA / MFA (TOTP)
Two-factor authentication: TOTP enrollment with QR code, verification step at login, single-use recovery codes, and a manage/disable flow. **Enforce** for privileged roles (admin, comitet, cenzor). Built on Supabase MFA. Bilingual flows, accessible, covered by unit + E2E tests. Prereq: T01.

### ⬜ T03 — [P0] Auth & session hardening
Password strength policy + known-breach rejection, login rate limiting with temporary lockout, secure session/refresh handling, sign-out-everywhere, and an auth audit-event stream (login, failed login, MFA change, password change). No PII or secrets in logs. Prereq: T01.

### ⬜ T04 — [P0] RLS & tenant-isolation security audit
Review and repair **every** RLS policy for strict `asociatie_id` isolation and least privilege. Add automated cross-tenant isolation tests. Add CSP + security headers in `netlify.toml`. Run `npm audit` and resolve. Write/refresh `SECURITY.md` (threat model, reporting, controls).

### ✅ T05 — [P0] GDPR consent & legal surface
Cookie/consent banner with granular categories, Privacy Policy and Terms pages (RO/EN), a consent-records table (who consented to what, when, version), and granular notification consent honored by the fan-out service. Lawful-basis notes per data category in `DECISIONS.md`.
**Done:** global `ConsentBanner` (Accept all / Doar esențiale / Personalizează with per-category switches), public `/confidentialitate`, `/termeni`, `/cookies` pages (bilingual, GDPR + Legea 190/2018 + ANSPDCP + ANPC/SOL content via `legalContent.ts`), in-app `/app/confidentialitate` consent-management page with decision history, `consentLogic` + `consentGate` (the `mayNotify` fan-out gate) unit-tested, persisted `consentStore`, additive `consent_records` migration (owner RLS + admin read), legal links in app footer + login, lawful-basis notes in `DECISIONS.md`. Reordered ahead of T01–T04 because it is the only fully-testable P0 with no provisioned-backend prerequisite. Pipeline green; one E2E happy-path added.

### ⬜ T06 — [P0] GDPR data-subject rights
Per-user data export (machine-readable JSON + CSV of all their personal data), account deletion / right-to-erasure with proper anonymization of records that must be retained (e.g. votes, financial), and a documented data-retention policy with a cleanup routine. Admin tooling to action requests with an audit trail. Prereq: T05.

### ⬜ T21 — [P0] DPA + records of processing (art. 28 & 30 GDPR)
The asociație is the data controller and vecini.online is the processor. Ship a Data Processing Agreement template surface and a per-asociație "Registru al activităților de prelucrare" (record of processing activities, art. 30): which feature processes which data category, lawful basis, retention, recipients — generated from the feature/data model and viewable/exportable by the admin. Surfaced from the privacy settings. Builds on T05's lawful-basis notes.

### ⬜ T22 — [P0] Personal-data breach procedure (art. 33/34)
Documented breach-notification procedure and an admin tool to record a breach, classify risk, and produce the 72-hour notification to ANSPDCP plus, where required, the notice to affected residents. Append-only breach log tied to the audit stream (T09). No PII in logs beyond what the record needs.

### ⬜ T07 — [P1] Resilience & error handling
Global error boundary, standardized loading/empty/error states across all pages, request retry/backoff, and a client-side error-reporting hook (Sentry-ready, no PII). Friendly bilingual error copy.

### ⬜ T08 — [P1] E2E suite green + CI
Install Playwright browsers, make `tests/e2e` pass (smoke + per-feature happy paths), and add specs for auth + 2FA + tenant isolation. Wire a CI workflow that runs lint/typecheck/unit/build/E2E on push. Once done, E2E joins the per-task gate.

### ⬜ T09 — [P1] Audit log surface
Admin-viewable, filterable audit trail of state changes across features (actor, timestamp, before/after), backed by the existing audit infrastructure. Tamper-evident ordering, export, retention aligned with T06.

### ⬜ T10 — [P1] F35 Apartament info (per-apartment dashboard)
Read-only aggregation page for a single apartament: meter-reading history, tickets, votes cast, payment status (amounts hidden if finance is off), apartment-specific documents. Owner sees only their own; co-owners share the view; admin can open any in their asociație. No new table — compose views over `apartments`, `meter_readings`, `tickets`, `votes`. `/apartament_meu` bot command.

### ⬜ T11 — [P1] F66 Profil complet (rich profile editor)
Full-page profile editor: photo (crop + initials fallback), structured standard fields (name, phone, email, apartament/scara/etaj, car plate → F28, address, emergency contact, DOB → F63, language), plus user-added typed custom fields via `+ Adaugă câmp` (text/long-text/number/phone/email/date/bool/select/link/address) each markable private vs. visible-to-neighbours (→ F36 consent). Per-type validation, autosave, completeness indicator. New migration: extend `profiles` + `profile_custom_fields` + storage photo bucket, RLS-scoped. `/profil` bot summary + deep link.

### ⬜ T12 — [P1] F67 Acasă personalizabil (customizable home)
Pencil icon flips the home into edit mode: per-resident show/hide, drag-reorder, optional sizing of feature cards. Card catalog is exactly the asociație's admin-enabled features (a disabled feature can never be surfaced). `Resetează la implicit` restores the default. Persists per resident across devices via a new `home_layouts` table (owner RLS) with an asociație default fallback. Smooth eased enter/exit per the premium-feel mandate.

### ⬜ T13 — [P1] F10 AGA digitală (Adunarea Generală)
The heaviest feature. Formal General Assembly compliant with Legea 196/2018: convocator with notice period, agenda with attachments, RSVPs, proxy votes (procură) with admin verification, live per-item voting with quorum tracking, and generation of a legally-valid proces verbal as PDF after the meeting. Tables exist (`agas`, `aga_agenda_items/attendees/proxies/votes`). Telegram reminders, RSVP, live vote prompts. After this, all 67 features are built end-to-end.

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
