# BACKLOG — Autonomous continuous development

This is the **single source of truth for what to build next**. Both triggers use it:

- The user types **`make progress`** → the **top-priority** task is completed (commit + push), then stop and report.
- The user runs **`scripts/run-overnight.sh`** → the same one-task unit runs repeatedly, with no human input. While the queue has open tasks it builds them; when the queue empties it switches to an audit/replenish pass that measures progress against the original vision and writes the next wave of tasks, so work continues until a genuine stall, a task/time budget, a red pipeline, or an interrupt.

The goal both paths drive toward: a **secure, stable, well-polished, GDPR-compliant, multi-tenant SaaS** for Romanian asociații de proprietari, with 2FA auth, a live Telegram bot, and robust handling of the real problems a residential building faces.

This is a **self-improving loop**: doing a task surfaces problems and ideas, which become new tasks, which raise the quality bar further. The queue is meant to grow — it never "runs out" while the app can still be made safer, more stable, or more helpful.

> **Finished work lives in `COMPLETED.md`** (newest first), not here. This file holds only the protocol and the open (`⬜`) queue so the read on every task stays small.

---

## Current MVP milestone — "One real asociație works end-to-end"

> **Status: the MVP spine is complete and green end-to-end in demo/local mode.** Its tasks are archived in `COMPLETED.md`. The acceptance loop below is kept for reference; the open queue is now led by the GDPR / security / feature work and the live-activation follow-ups.

> **MVP presentation flow (priority target — T152-T157):** superadmin opens "Adauga asociatie" page (not a modal) → enters admin name + email → clicks "Trimite invitatie" → polished bilingual email sent with a "[Accept Invitation]" CTA button and embedded QR code (24h expiry) → admin clicks link → `AccountSetupPage` (sets password) → `OnboardingWizard` (enters asociatie name, address, etc.) → lands on **Apartamente page** → downloads CSV template → fills it (scara, numar_apartament, name, email, numar_persoane, proprietar, opt_in) → clicks "Import lista" → apartments created + invite emails sent to every `opt_in = true` resident with an email → residents click their link → `AccountSetupPage` → `/app`. Short alphanumeric invite codes removed from all UI surfaces (T157); all redemption is `?token=` deep link only.

The next wave of work drives a single, real, usable SaaS loop rather than more breadth or more compliance surface. The whole loop must work **locally, in demo mode, with no backend provisioned** — that is the version overnight work builds and verifies. A live Supabase path is layered on as a separate, smaller activation step per slice. A direct production blocker (red pipeline, active security/data-loss hole) always outranks everything.

**Acceptance criteria (the loop — demo/local first, live-ready):**
1. An admin can sign up / log in (live Supabase Auth when configured; demo entry otherwise).
2. Admin can create or select an asociație **locally if no backend is present**, live when configured.
3. After auth the app hydrates profile, memberships, role, and apartment/tenant context (demo seed offline).
4. Admin can generate invite codes / links (local store now; same logic persists to Supabase later).
5. A resident can join with an invite code (local consumption now; RPC under RLS later).
6. Enabled modules load **per asociație from a local store now, from `asociatie_features` when Supabase exists**.
7. Disabled modules are hidden **and** blocked by direct URL (works offline).
8. Admin can publish an announcement; a resident can read it (demo store now, Supabase later).
9. A resident can start / use a structured discussion (forum) (demo store now, Supabase later).
10. A resident can submit a sesizare / reclamație (demo store now, Supabase later).
11. A resident can link Telegram via a mock/local linking path now; `/start CODE` wired against live env vars later.
12. Core RLS / tenant isolation stays safe (schema + offline regression guards now; live cross-tenant test later).
13. lint / typecheck / unit / build pass; E2E has at least one green smoke path for the core flow (demo mode).

The existing GDPR / security / legal tasks (T06, T21, T22, T23, …) are **kept, not dropped** — they remain the "deployable for real residents at scale" blockers and sit right below the MVP spine.

### MVP rules (in force until the loop above is green)
- **Overnight work must never require human setup.** Do not depend on a provisioned Supabase project, created databases, secrets, Telegram webhooks, or any manual configuration to make progress. If a task needs external setup, **split it**: (1) the local/demo/schema/test implementation that can be done now, kept as the spine task; (2) a separate `…L` live-activation follow-up (apply migration, set env vars, register webhook) that is documented but **not a blocker** and sits below the spine.
- **Do not stop because Supabase/Telegram is not provisioned.** Build the useful local/demo fallback and document the live activation steps in the task done-note (and `DECISIONS.md` where architectural).
- **Do not add new feature modules until the MVP spine works end-to-end.** Deepen the spine; don't widen the surface.
- **Prefer one complete vertical slice over many half-wired features.**
- **When a task uncovers a blocker, insert the blocker above the downstream work** it blocks (not at the bottom of the queue).
- **Every task must finish with the commands it ran and the tests / verification noted** in its done-line.
- **Demo mode stays the default, fully-working experience**; a feature must work offline first, then be live-ready behind `isSupabaseConfigured`.

---

## The `make progress` protocol

Do these steps, in order, every time:

1. **Pick the task.** Read this file. The current task is the **highest-priority unchecked task whose prerequisites are met** — i.e. the topmost `⬜` in `## Task queue` (the queue is kept sorted by priority). If the verification pipeline is currently red, fixing it *is* the task and outranks everything.
2. **Re-establish only what this task needs.** Read just the slice of context the task touches, not all of every doc: the relevant `RESUME.md` §0 status entry / counts, the relevant `FEATURES.md` row, and the relevant code. **Read a doc only if the task touches its domain** — skip `FEATURES.md` for a non-feature task, don't read the whole status log when one entry suffices, and consult `COMPLETED.md` only when a prerequisite's history is genuinely needed. Match existing conventions exactly.
3. **Implement it fully.** No TODOs, no placeholders, no commented-out code. Follow the established per-feature pattern: logic module → Zustand demo store seeded from `src/shared/demo/demoData.ts` → feature page → flip `registry.ts` toggle to `implemented` → add route → `/command` bot help → RO/EN locales → unit test → one E2E happy-path. UI must be **fully bilingual (RO + EN)** and meet the **premium-feel** bar.
4. **Verify — all must be green.** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. Fix until clean. **Never weaken or delete a test to make it pass** — if a test reveals a real bug, fix the code. (The overnight script independently re-runs this whole pipeline after each commit and halts the loop on red, so a broken commit can never be built upon.)
5. **Update the docs.**
   - Mark the task `✅` and **move its block (heading + one-line done-note) to the top of `COMPLETED.md`** (newest first), so `BACKLOG.md` keeps only the protocol and the open (`⬜`) queue.
   - `FEATURES.md` table → flip the feature to `✅` with an implementation note (when the task is a feature).
   - `RESUME.md` `## 0. Current status` → bump counts, list what was done, update remaining, set the date.
6. **Feed the loop — create tasks from what you found.** Throughout the task, capture every:
   - **problem detected** (bug, security gap, fragile/duplicated code, missing test, accessibility or UX rough edge, performance issue, tech debt), and
   - **improvement or new feature worth having** (something that would make the app more secure, stable, or helpful to a building).

   Turn each into a **new task** and insert it into `## Task queue` **at the position matching its priority** (see the rubric below) — not merely at the bottom. Give it the next free `T##` id, a one-line goal, and a `[P#]` tag. Re-sort the queue if needed so the highest priority is always on top.
7. **Commit + push.** One focused conventional commit (`feat(...)`, `fix(...)`, `chore(...)`, `docs(...)`), end the message with the `Co-Authored-By` trailer, then `git push origin main`. Work directly on `main`.
8. **Stop.** One task per `make progress`. The overnight script handles repetition; do **not** start the next task yourself in interactive mode.

## The `make task` protocol

`make task` is the **same one-task unit as `make progress`, with one deliberate difference: it never creates new tasks.** It picks from the same `## Task queue` (top priority first) and goes through the same Definition of Done, but skips the "feed the loop" step so the queue stays exactly the size it was, minus the one task just consumed. Use it when you want to draw work down without letting the queue grow.

Do these steps, in order, every time:

1. **Pick the task.** Same as `make progress` step 1 — the topmost `⬜` in `## Task queue` whose prerequisites are met. If the verification pipeline is red, fixing it *is* the task and outranks everything. (If the MVP spine still has open tasks and is the right priority focus, use `make mvp` instead — `make task` does not special-case the spine.)
2. **Re-establish only what this task needs** (same as `make progress` step 2).
3. **Implement it fully.** No TODOs, no placeholders, no commented-out code. Follow the established per-feature pattern.
4. **Verify — all must be green.** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. Never weaken a test to pass it.
5. **Update the docs.** Mark the task `✅` and move its block (heading + done-note) to the top of `COMPLETED.md`; update `FEATURES.md` (if a feature) and `RESUME.md` status.
6. **Do NOT feed the loop.** `make task` does **not** create new tasks. If you find a genuine bug or gap, fix it inline if it blocks the current task, otherwise note it in the task done-note for later — but do not add `T##` entries to the queue. (This is the one explicit difference from `make progress`.)
7. **Commit + push.** One focused conventional commit ending with the `Co-Authored-By` trailer, then `git push origin main`. Work directly on `main`.
8. **Stop.** One task per `make task`.

## The `make mvp` protocol

`make mvp` drives the **MVP presentation flow** (a real, end-to-end, presentable invite/onboarding loop) to completion. It is the **same one-task unit as `make progress`, with one deliberate difference: it never creates new tasks.** The queue is a fixed, hand-picked spine; `make mvp` consumes it, it does not grow it.

Do these steps, in order, every time:

1. **Pick the task.** The current task is the **topmost `⬜` in `## MVP presentation spine`** (the dedicated section at the top of the queue). Only if that section is empty do you fall through to the normal `## Task queue`. If the verification pipeline is red, fixing it *is* the task and outranks everything.
2. **Re-establish only what this task needs** (same as `make progress` step 2).
3. **Implement it fully.** No TODOs, no placeholders, no commented-out code. The goal is the **presentation working end-to-end with real email + real accounts**; do not gold-plate validation/hardening that the spine task does not call for (those stay deferred in the normal queue).
4. **Verify — all must be green.** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. The demo runs on a real build, so keep the pipeline green. Never weaken a test to pass it.
5. **Update the docs.** Mark the task `✅` and move its block (heading + one-line done-note) to the top of `COMPLETED.md`; update `FEATURES.md`/`RESUME.md` where applicable.
6. **Do NOT feed the loop.** `make mvp` does **not** create new tasks. If you find a genuine bug or gap, fix it inline if it blocks the spine, otherwise note it in the task done-note for later — but do not add `T##` entries to the queue. (This is the one explicit difference from `make progress`.)
7. **Commit + push.** One focused conventional commit ending with the `Co-Authored-By` trailer, then `git push origin main`. Work directly on `main`.
8. **Stop.** One task per `make mvp`.

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

## MVP presentation spine

> **Run with `make mvp`.** A hand-picked, dependency-ordered set of tasks that make the **real** end-to-end presentation flow work with **real email addresses + real accounts**: superadmin logs in -> creates an admin (name + email) -> the admin's real inbox receives the invite -> admin opens the link, sets a password, onboards -> admin adds an apartment + sends -> the resident's real inbox receives the invite -> resident opens the link, sets a password, onboards. The screens + pure logic for all of this already exist and pass offline; these tasks switch on the **live backend + email delivery**. `make mvp` takes the topmost `⬜` here and does NOT create new tasks. Because this is a real production launch handling residents' personal data (not a throwaway demo), the security-hardening tasks **T128** (hash tokens at rest + rate-limit + audit redemption) and **T100** (mandatory superadmin MFA) were promoted into this spine and gate the launch; only lower-value polish stays deferred in the normal queue below. Remaining spine: **complete**. T169/T92/T55/T170/T115/T149/T128/T100 all done.

### ✅ T169 — [MVP] Live superadmin account + `is_super_admin()` grant verified

### ✅ T92 — [MVP] Server-side privileged provisioning (Netlify function, service role) + wire the superadmin live send

### ✅ T55 — [MVP] Live invite write/consume + real account creation on redemption (admin + resident)
Done: resolve_onboarding_token + redeem_onboarding_token SECURITY DEFINER RPCs (migration 20260527000004), onboardingApi.ts (resolveTokenLive/redeemTokenLive), inviteWriteApi.ts (writeInviteToLive), AccountSetupPage live branch (signUp + redeemTokenLive + hydrate), ApartmentsPage live invite write. 36 new tests. 142 files / 1282 tests / build green. Live smoke pending credentials.

### ✅ T170 — [P0/MVP] Fix live resident-invite email: strip the `inv-` id prefix before calling the function
Done: Applied `startsWith('inv-') ? id.slice(4) : id` inline in the `JSON.stringify` body of `sendInviteEmail` (`src/features/invites/inviteEmailApi.ts`), mirroring the existing guard in `writeInviteToLive`. Added `tests/unit/inviteEmailApi.test.ts` (3 static-analysis tests asserting the stripping expression is present, the raw `invite.id` is not posted directly, and the ternary handles already-bare UUIDs). lint / typecheck / 1298 tests / build green.

### ✅ T115 — [MVP] Live Supabase read/write for the apartment registry

### ✅ T149 — [P2] Live activation: Resend delivery webhook -> stamp `invite_email_delivered_at`
Done: migration adds `resend_message_id text` to `invite_codes`; `resend.ts` returns `messageId` from response body; `invite-email.ts` stamps `invite_email_sent_at` + stores `resend_message_id` after a successful send; `resend-webhook.ts` Netlify function with svix HMAC-SHA256 signature verification and ±5 min timestamp freshness stamps `invite_email_delivered_at` by `resend_message_id` lookup; `markInviteEmailDelivered` added to `inviteLogic`; `markEmailDelivered` action added to `inviteStore`; `hydrateInviteDelivery` function added to `inviteWriteApi`; `InvitesAdminPage` hydrates delivery timestamps on mount and shows `emailDeliveredOn` in the card metadata; bilingual `emailDeliveredOn` strings added; `RESEND_WEBHOOK_SECRET` added to `.env.example` and RUNBOOK-MVP.md §2b. 145 files / 1323 tests / build green.

### ✅ T128 — [P0/MVP] Token-security hardening: hash onboarding/invite tokens at rest + rate-limit + audit redemption
Done: migration `20260528000003_token_security_hardening.sql`: pgcrypto enabled; existing tokens hashed in-place; `token_redemption_attempts` table (RLS, no public policy); `resolve_onboarding_token` and `redeem_onboarding_token` updated to hash before lookup + rate-limit (10/15 min per token hash) + audit `invite.redeemed` on success. `inviteWriteApi.ts` stores hash via Web Crypto. `RedeemRpcResult` adds `'rate_limited'`; `AUDIT_ACTIONS` adds `'invite.redeemed'`; locale + tone keys added. 11 new tests. 156 files / 1452 tests / build green.

### ✅ T117 — [P2] Reconcile embedded `persons` with account-linked `apartment_residents`
Done: `ApartmentPerson` gains optional `claimed_user_id?: string | null`; migration `20260527000006` updates `redeem_onboarding_token` (CREATE OR REPLACE) to set `claimed_user_id` in the matching persons entry via jsonb_set -- name match (case-insensitive trim) first, role fallback second, both passes skip already-claimed entries; pure `isPersonClaimed` + `claimPersonInList` helpers in `apartmentsLogic.ts` mirror the server match logic; `ApartmentFormPage` persons editor shows a "Account linked / Cont înregistrat" badge on claimed entries and makes the name field read-only for them; bilingual `personLinked` locale keys added. 21 new tests. 146 files / 1344 tests / build green.

### ✅ T135 — [P2] Cross-origin redirect: bounce a superadmin off the resident origin to the platform subdomain
Done: `AsociatieRoute` gains `'platform-redirect'` variant; `AsociatieRouteInput` gains optional `platformUrl`; `resolveAsociatieRoute` returns `'platform-redirect'` when superadmin + platformUrl set, else `'superadmin'` (no change when platformUrl absent); `RequireAsociatie` computes route before early returns (hooks unconditional), fires `window.location.href` in `useEffect`, returns null immediately; `AppHome` does the same redirect via useEffect + returns null (falls back to in-app Navigate when platformUrl null); `env.ts` reads `VITE_PLATFORM_URL` into `env.platformUrl`; `VITE_PLATFORM_URL` documented in `.env.example`. 19 new tests. Existing hydrationLogic tests all pass unchanged. 147 files / 1363 tests / build green.

### ✅ T138 — [P2] Live-wire the F05 comitet inbox through the privacy-preserving functions
Done: `AnonymousMessage.sender_user_id` made optional (absent from comitet function rows). `anonymousStore` gains `replaceAll` (live hydration) + `setStatus` (explicit status set). New `anonymousApi.ts`: `hydrateAnonymousMessages` (RPC path for privileged roles, owner-RLS table path for residents, no-op offline), `submitAnonymousMessage` (prepends to store + best-effort `anonymous_messages` insert), `setAnonymousMessageStatus` (store update + `set_anonymous_message_status` RPC). `AnonymousPage` wired: `useEffect` hydrates on mount when configured, submit/toggle branch on `isSupabaseConfigured`, role-aware (`isPrivileged` flag). 14 new tests in `anonymousApi.test.ts`. 148 files / 1375 tests / build green. Live smoke pending credentials.

### ✅ T167 — [P3] Keep the triage-row actions usable on a narrow viewport
Done: icon+meta wrapped in a `flex min-w-0 flex-1 items-center gap-3` group; outer row changed from `flex items-center gap-3` to `flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-3`; title/key/count inner row gains `flex-wrap` so long meta wraps gracefully on very narrow screens. On mobile the actions div drops to its own row below the meta; on `sm+` the existing side-by-side layout is preserved. 4 new structural tests in `featuresAdminTriageResponsive.test.tsx`. 149 files / 1379 tests / build green.

### ✅ T164 — [P3] Seed the new invitee's profile locale from the active UI language
Done: `seedProfile` gains an optional `locale?: Locale` parameter (spreads over `emptyProfile`'s `'ro'` default only when provided); `AccountSetupPage` offline path narrows `i18n.language` to `Locale` (`'en'` or `'ro'`) and passes it to `seedProfile`; 2 new locale tests in `profileLogic.test.ts`. 149 files / 1381 tests / build green.

### ✅ T165 — [P3] Link the shared `Textarea` error to its control with `aria-describedby`

### ✅ T163 — [P3] Distinguish row warnings from blocking errors in the CSV import summary

### ✅ T158 — [P3] Remove orphaned `onboarding.import/invite/csv*` locale keys

### ✅ T145 — [P3] Remove the now-unused `join.*` locale keys

---

## Three-stage deployment formalization (PROD / DEV / DEMO)

> Formalize the implicit three-mode setup into three named, verifiable stages. **PROD** = current Netlify cloud build (cloud Supabase + Resend, MFA strict). **DEV** = local Raspberry Pi build (local Supabase, email not required, used to test each role with one seeded user per role; data may be inserted directly into the local DB). **DEMO** = local frontend-only mode for design iteration (no network, demo seed only, auto-bypass login, floating role switcher on every page). After T171 lands, every `make progress` / `make task` / `make mvp` task must keep all three stages building and running — the verification pipeline gains `npm run build:pi` + `npm run build:demo` alongside the existing `npm run build`. Decision recorded in the plan at `.claude/plans/i-want-the-app-elegant-marble.md`. T171 is the load-bearing prerequisite for the rest; do them in id order.

### ⬜ T171 — [P1] Introduce `VITE_APP_STAGE` + `getStage()` and extend the protocol gate to three stages
The app cannot currently tell PROD from Pi self-host from offline-demo — only "is Supabase configured?". Add `appStage: 'prod' | 'dev' | 'demo'` to `ClientEnv` in `src/shared/lib/env.ts`, derived from `import.meta.env.VITE_APP_STAGE` with the safe default `isSupabaseConfigured ? 'prod' : 'demo'` so existing deploys do not change behavior. Export `getStage()` + `isProd()`/`isDev()`/`isDemo()` helpers. Add `VITE_APP_STAGE=prod` to `.env.example`, `VITE_APP_STAGE=dev` to `.env.pi.example`, and create a new `.env.demo.example` (no Supabase creds, comment explaining it is frontend-only). Add `src/shared/lib/env.test.ts` covering all three stages + the default. In the same task, extend the protocol blocks in `BACKLOG.md` (`make progress`/`make task`/`make mvp` step 4) so the verification list reads `lint` + `typecheck` + `test` + `npm run build` + `npm run build:pi` + `npm run build:demo` all green (with a one-line fallback note that the stage build scripts land in T172). Add a non-negotiable bullet in `CLAUDE.md` ("All three stages must build and run after every task"). Update `RESUME.md` §0 with one sentence anchoring the three-stage model. Prereq: none.

### ⬜ T172 — [P1] Stage-specific build/dev scripts (`build:pi`, `build:demo`, `dev:demo`, `dev:pi`)
The protocol gate added in T171 references `npm run build:pi` + `npm run build:demo`; those scripts must exist before the next task runs. Add to `package.json`: `"build:prod": "npm run build"` (alias for symmetry), `"build:pi": "tsc -b && vite build --mode pi"`, `"build:demo": "tsc -b && vite build --mode demo"`, `"dev:demo": "vite --mode demo"`, `"dev:pi": "vite --mode pi"`. Add a committed `.env.pi` + `.env.demo` (non-`.example` files with safe placeholder values) so `vite --mode pi/demo` resolves env vars cleanly; document any `.gitignore` exceptions if needed. Keep a single `dist/` output (no per-stage directories) for simplicity. No `vite.config.ts` change expected — Vite already honors `--mode`. Verify each new script produces a working build. Prereq: T171.

### ⬜ T173 — [P1] Floating dev role switcher (DEV + DEMO, hidden in PROD)
Today, role switching only happens at `LoginPage`. For DEV (testing every role view) and DEMO (designing across roles) the user wants to flip roles from any page. Add `src/shared/components/DevRoleSwitcher.tsx` — a small floating chip-bar (top-right, warm-graphite per the premium-feel mandate) listing the seven roles from `Role` in `src/shared/types/domain.ts`. In DEMO it calls `useAuthStore().enterDemo(role)`; in DEV it calls a new `signInAsDevUser(role)` that runs the real Supabase password login against the user seeded by T176. Mount in `src/app/AppLayout.tsx` (confirm exact path while implementing) gated on `getStage() !== 'prod'`. Extract the role-preview buttons currently in `src/features/auth/LoginPage.tsx` into the same component so there is one source of truth. Tree-shake/absent in `npm run build`. Bilingual labels. Prereq: T171.

### ⬜ T174 — [P1] Auto-bypass login in DEMO + remember last role
The DEMO use case is "open the app, see the pages, tweak CSS". A LoginPage between Cristi and the design is friction. When `isDemo()`, the root `/` route in `src/app/router.tsx` resolves directly into the authenticated shell instead of `LoginPage`, calling `enterDemo(lastDemoRole ?? 'admin')` on first render. Persist `lastDemoRole` in the existing Zustand `persist` middleware on `authStore` (so refreshing the page keeps the role the user last clicked in the T173 switcher). Leave `LoginPage` untouched — it remains the entry point for PROD + DEV. Verify: `npm run dev:demo` lands straight in the resident shell, refresh preserves the last role. Prereq: T171, T173.

### ⬜ T175 — [P1] `MAIL_MODE=resend|log|disabled` for the invite-email function
Pi DEV stage shouldn't require Resend creds. Today `invite-email.ts` returns 503 when unconfigured — usable but unfriendly for testing the admin flow on the Pi. Add `getMailMode(): 'resend' | 'log' | 'disabled'` to `netlify/functions/_shared/resend.ts` (reading `process.env.MAIL_MODE`, default `'resend'`; keep `isResendConfigured()` for backward compat). Branch `netlify/functions/invite-email.ts` on it: `resend` keeps the existing path; `log` writes to a new `email_outbox` table + `console.info` and returns 200 with `{ delivered: false, logged: true }`; `disabled` returns 200 with `{ delivered: false, reason: 'mail_disabled' }`. Add migration `supabase/migrations/NNNN_email_outbox.sql` creating `email_outbox (id uuid pk, asociatie_id uuid, to_email text, subject text, body text, created_at timestamptz)` with RLS scoped to admin role per existing pattern. Set `MAIL_MODE=log` in `.env.pi.example`, `MAIL_MODE=resend` in `.env.example`. In the admin invitations page, show a small "Outbox (DEV)" link when `!isProd()` listing the rows. Prereq: T171.

### ⬜ T176 — [P1] `npm run pi:seed` — one Supabase user per role with a known dev password
With email disabled on Pi DEV (T175), the admin needs a way to log in as each role. Add `scripts/pi-seed.mjs` — a node script using a service-role client (reuse `netlify/functions/_shared/supabaseAdmin.ts` shape) that: (1) creates one auth user per role (`admin@dev.local`, `presedinte@dev.local`, `comitet@dev.local`, `cenzor@dev.local`, `proprietar@dev.local`, `chirias@dev.local`, `super.admin@dev.local`) all sharing a fixed dev password (also writable via `--password`), (2) inserts matching `memberships` rows pointing at a seeded `asociatie_id` (mirror `supabase/seed.sql`), (3) for `super_admin` also grants the platform flag via the path T169 added. Guard: refuse to run if `VITE_APP_STAGE !== 'dev'` or if `SUPABASE_URL` looks like a cloud URL (regex matches `*.supabase.co`). Add a `seed` subcommand to `scripts/pi.sh` and `"pi:seed": "bash scripts/pi.sh seed"` to `package.json`. Document the role/password map in `PI_DEPLOYMENT.md`. Prereq: T171, T169.

### ⬜ T177 — [P2] Visible stage banner in the app shell (DEV / DEMO only)
When running three terminals on three stages, it is easy to lose track of which is which. Add `src/shared/components/StageBanner.tsx` — a fixed-position chip (bottom-left, amber for `DEV (Pi)`, warm-graphite for `DEMO`, hidden in PROD). Use the existing design-system tokens (warm-graphite per the premium-feel mandate). Mount in `src/app/AppLayout.tsx` next to `<DevRoleSwitcher />`. Bilingual labels. Verify visible in `npm run dev:demo` and `npm run dev:pi`, absent in `npm run build` against prod env. Prereq: T173.

### ⬜ T178 — [P2] Documentation pass for the three-stage model
Anchor the model in the docs read first. `RESUME.md` §0: replace the protocol-style paragraph with a paragraph anchoring the three-stage model and pointing at the completed T171–T176 work. `DECISIONS.md`: add an entry titled "Three-stage deployment model (PROD / DEV / DEMO)" capturing why three (not two), why the stage is a runtime flag (not a build-time entry), why one user per role on Pi (real auth path, no backdoor), why `MAIL_MODE` over removing email. `PI_DEPLOYMENT.md`: top-section pointer to the plan; section on the `MAIL_MODE=log` workflow + `pi:seed`. `FEATURES.md`: confirm no row needs flipping (this is operational, not a feature). `BACKLOG.md`: sanity-check the protocol changes from T171 read correctly now that the supporting tasks are done. Read top-to-bottom; no stale references to "demo = missing creds" without the new stage flag. Prereq: T171–T177.

---

## MVP spine — complete ✅

> The ordered vertical slice that makes one real asociație work end-to-end is **done and green offline** (T27/T28/T41–T54 etc.). All spine tasks are archived in `COMPLETED.md`; their live-activation follow-ups are the section below.

---

## MVP live-activation follow-ups (documented, NOT blockers — do after the local loop is green)

> Each requires external provisioning (a Supabase project, env vars, a deployed function, a registered bot) and so must never block overnight progress. They layer the live path onto a slice whose local/demo version already works.

### ✅ T56 — [P2] Live activation: per-asociație feature flags read/write (`asociatie_features`)

### ✅ T57 — [P2] Live activation: content slices read/write Supabase (Anunțuri / Discuții / Sesizări)
Done: migration `20260528000001` adds `title text` to `discussion_threads` and `author_name text` to `discussion_messages` (avoids a self-read-only users JOIN). Three API modules: `announcementsApi.ts` (`hydrateAnnouncements` + `publishAnnouncement`), `discussionApi.ts` (`hydrateThreads` + `addThread` + `postMessage` + `togglePin` + `deleteMessage`), `ticketsApi.ts` (`hydrateTickets` + `submitTicket`); each applies the store change synchronously then best-effort mirrors to the DB when `isSupabaseConfigured`. All three stores gain `replaceForAsociatie` for hydration. `AnnouncementsPage`, `DiscussionsPage`, `TicketsPage` wired: `useEffect` hydrates on mount and mutations route through the API modules. 32 new tests across 3 test files. 153 files / 1420 tests / build green. Live smoke pending credentials.

### ⬜ T129 — [P2] Live activation: F04 private messaging read/write Supabase
Surfaced building the F04 role-aware inbox: `adminChatApi.ts` already branches on `isSupabaseConfigured` (hydrate `private_threads` + nested `private_messages`, mirror create/reply/markRead/toggleStatus) and migration `20260525000002_private_threads_inbox.sql` aligns the schema and installs the party-or-admin RLS (a resident reads only their own threads; admin/președinte read all in the asociație). The live path has never run against a real backend. Apply the migration, verify hydration + each mutation under RLS for both a resident JWT and an admin JWT, harden the best-effort mirrors (surface a user-visible error on a failed write), and add a live E2E that proves a resident cannot read another resident's thread. Behind `isSupabaseConfigured`, demo store stays the offline fallback. Prereq: F04 rework; coordinates with T57, T08.

### ⬜ T130 — [P2] Link admin-initiated F04 threads to the resident's account
Surfaced building the F04 inbox: when the administrator starts a thread toward an apartment, the resident party is recorded from the embedded `persons` list (person id + name), which is fine for demo but in live mode will not equal the resident's `auth.uid()`, so the targeted resident would not see the thread under the party-or-admin RLS. Once occupants are account-linked, set `resident_user_id` to the linked account (or leave it pending until the resident claims the apartment) so an admin-initiated conversation reaches the right inbox. Prereq: T117 (persons ↔ `apartment_residents` reconciliation).

### ⬜ T58 — [P2] Live activation: Telegram webhook deploy + env (`/start CODE`)
Deploy the Netlify webhook function, set `TELEGRAM_BOT_TOKEN`/secret, register the bot + Mini App, and exercise the T50 linking path live. Requires a bot token + deployment. Coordinate with / folds into T15. Prereq: T50.

### ⬜ T127 — [P2] Live activation: notifications fan-out (`notifications` under RLS + channels)
Surfaced building T126: the in-app inbox runs offline first; live, persist `notifications` rows + read-state under RLS (owner-scoped read/update, scoped by `asociatie_id`) and hydrate on mount, behind `isSupabaseConfigured` with the T126 local store as the offline fallback. Reuse the same write to fan out across the email (T14) and Telegram (T15) channels honouring the resident's notification preferences and the consent gate (T26). Requires a provisioned project; document the apply steps. Prereq: T126; coordinates with T14, T15, T26.

### ⬜ T80 — [P2] Live activation: wire the attribution-free tally functions for F09/F15/F13 results
T38 added the `security definer` aggregate functions `survey_tally` / `poll_tally` / `priority_ranking_turnout` so members can see poll/survey/ranking results without reading each other's individual rows, but nothing calls them yet (demo computes tallies client-side from the Zustand store, and the live path for F09 Voturi / F15 Sondaje / F13 Priorități is not built). When the live read path for those features lands, call these RPCs to render results (since under the new RLS a member can no longer read other rows), add the `grant execute ... to authenticated` the live API needs, and extend `poll_tally` (or add a sibling) to aggregate **ranked** polls from `ranked_options` jsonb (it currently covers only the `selected_option_ids` poll types). Behind `isSupabaseConfigured`, demo keeps the client-side tally. Requires a provisioned project. Prereq: T38; coordinates with T57.

### ⬜ T72 — [P2] Live activation: server-side erasure execution + retention cleanup
T06 files erasure requests and marks an erased-id offline, but the actual cross-store mutation (delete/anonymize/retain per `ERASURE_PLAN`) and the periodic purge of expired records (per `RETENTION_POLICY` windows) must run server-side with the service role. Add a scheduled Supabase routine / Edge Function that, on a completed erasure, applies the plan across the subject's rows (anonymizing to `ANONYMIZED_NAME`, retaining votes/financial/consent/security), and a cron that purges records past their retention window, behind `isSupabaseConfigured`. Document the apply steps. Requires a provisioned project. Prereq: T06. See `DATA_RETENTION.md`.

### ⬜ T76 — [P2] Live activation: deliver the breach resident notice + record breach events in the audit stream
T22 generates the art. 34 resident notice as a downloadable text and logs the breach append-only, but on a high-risk breach the notice should actually reach the affected residents. When the notification fan-out lands (email T14 / Telegram T15), dispatch the art. 34 notice through it as an **essential** security communication (bypassing consent like F03), targeted to the affected residents, and record each breach lifecycle event (recorded / authority-notified / residents-notified / closed) into the unified audit stream (T09) so the breach trail is part of one tamper-evident log. Behind `isSupabaseConfigured`, demo keeps the offline download. Prereq: T22, T14; coordinates with T09.

### ⬜ T75 — [P2] Live activation: persist the per-asociație ROPA snapshot + DPA adoption record
T21 generates the art. 30 register and the art. 28 DPA template on the fly and lets the admin download them, but the controller's GDPR accountability evidence should be persisted: a point-in-time snapshot of the register (so the asociație can show what processing it ran on a given date) and a DPA adoption record (version, adopted-at, adopted-by). Add the table(s) under RLS scoped by `asociatie_id` (admin/președinte manage, members read), write a snapshot on demand and on a feature-flag change, and record DPA adoption, behind `isSupabaseConfigured` with the offline generated view as the fallback. Requires a provisioned project. Prereq: T21.

### ⬜ T103 — [P2] Live activation: persist profile + custom fields (`users`/`profile_custom_fields`) + Storage avatar
T11 (F66) keeps the rich profile offline in `profileStore` and the migration extends `users` + adds `profile_custom_fields`, but nothing reads/writes them live yet, and the avatar is an offline data URL. Load the signed-in user's standard profile columns + their `profile_custom_fields` on hydrate, persist edits back under RLS (owner-scoped), and add a Supabase Storage bucket for the profile photo (size/type-capped upload, store the object path in `users.avatar_url`, signed read), behind `isSupabaseConfigured` with the offline store as the fallback. Document the apply steps. Requires a provisioned project. Prereq: T11; coordinates with T28 (hydration) and T89 (the F33 Storage pattern).

### ⬜ T106 — [P2] Live activation: persist the per-resident home layout (`home_layouts`)
T12 (F67) keeps each resident's home layout offline in `homeLayoutStore` and the migration adds the owner-RLS `home_layouts` table, but nothing reads/writes it live yet. Load the signed-in resident's layout for the active asociație on hydrate and persist edits back under RLS (owner-scoped, the ordered `cards` jsonb), behind `isSupabaseConfigured` with the offline store as the fallback, so a personalized home truly follows the resident across devices. Reconcile the loaded layout against the asociație's live enabled features (`reconcileLayout`) exactly as the offline path does. Requires a provisioned project; document the apply steps. Prereq: T12; coordinates with T28 (hydration) and T56 (live feature flags).

---

### ⬜ T78 — [P2] Erasure/export must cover Storage photo objects (pets/bikes/lending/visitors)
T73's export carries photo `photo_path` references as metadata, and `ERASURE_PLAN` deletes the pets/bikes/lending listings, but the actual uploaded photo objects live in Supabase Storage. The server-side erasure execution (T72) must also delete those Storage objects for the subject (pets, bikes, lending items, visitor-report photos) so an erased resident's images do not remain, and the export could optionally include signed links to them. Behind `isSupabaseConfigured`; folds into T72's server-side erasure routine. Prereq: T73, T72.

### ⬜ T101 — [P3] Label each export section's asociație for a multi-asociație resident
Surfaced in T77: the export now gathers tickets + discussions across all the subject's memberships, but the `DataSubjectExport.subject` still names a single `asociatie` and the offline `apartment` is single-tenant, so a resident in more than one asociație gets a union of rows without a clear per-row indication of which asociație each ticket/thread (and each flat-store listing) belongs to. For a fully self-describing art. 15 copy, either add an `asociatie` column to the rows that carry an `asociatie_id` or group the export by asociație (a per-tenant subject block), and surface the resident's apartment per asociație rather than only the demo one. Keep `collectPersonalData` pure. Prereq: T77.

### ⬜ T109 — [P3] Catch features that should declare a ROPA processing override but don't
Surfaced in T74: the new `ropaLogic` guard proves every declared `FeatureDef.processing` override is well-formed and that an override-free feature inherits its category default verbatim, but it cannot catch the inverse risk — a feature whose *real* processing differs from its category default yet declares **no** override, so it silently misstates its art. 30 profile (e.g. a future financial feature filed under a non-financial category inheriting `legitimate`/`active` instead of `legal`/`legal10y`). Add a semantic safety net: either a heuristic guard (a feature whose data categories include `financial` must not resolve a non-legal/contract basis; a `consent`-basis feature must list `optional`; etc.) or a lightweight per-feature `processingReviewed: true` acknowledgement so a newly-added implemented feature fails the suite until its ROPA profile is deliberately reviewed. Keep it backend-free. Prereq: T74.

### ⬜ T29 — [P1] Live recovery-code login (server routine)
2FA recovery codes are generated, hashed and stored (`mfa_recovery_codes`, T02) and fully work in demo mode, but in the live path a recovery code cannot client-side step a session up to AAL2 — Supabase grants AAL2 only via an MFA verify. Add a privileged server routine (Supabase Edge Function using the service-role/admin API) that verifies a submitted recovery code against the stored hash, consumes it single-use, and completes the second factor, then wire `verifyChallenge`'s live branch to it. Until then a privileged user who loses their authenticator is locked out in production. **Reuse the `session_elevations` table + Custom Access Token Hook elevation primitive from T141/T142** (the same "service-role function verifies an app-managed secret, then elevates the session via the `app_2fa_at` claim") rather than inventing a second mechanism. Prereq: T02, T28; build after T141/T142.

### ⬜ T32 — [P1] Server-side auth-policy parity
T03's password strength/breach policy and login throttle run client-side, so they harden the UX but are bypassable by a direct API call. Bring the backend into line: enable Supabase Auth's minimum-password-length and leaked-password (HIBP) protection, confirm/raise the server-side auth rate limits, and document the exact dashboard settings in `.env.example` and `SECURITY.md` (the latter lands with T04). The client policy stays as the first line; the server becomes the authority. Prereq: T01, T03.

### ⬜ T33 — [P2] Server-backed login lockout
The T03 login lockout state lives in `localStorage` (so a temporary lock survives reload), but a determined attacker can clear it between attempts. Once a backend is provisioned, record failed-attempt counters server-side (keyed by account, behind RLS or an Edge Function) so the lockout cannot be reset client-side, and reconcile it with the client throttle. Prereq: T03, T28.

### ⬜ T81 — [P2] Server-side MFA challenge attempt limiting (parity)
The T31 MFA challenge throttle lives in `localStorage` (persisted so a reload can't reset it), but like the T33 login lockout it can be cleared client-side between attempts. Once a backend is provisioned, enforce the second-factor attempt limit server-side — confirm/raise Supabase Auth's MFA verify rate limits and, for the recovery-code path, count and lock failed attempts in the privileged server routine (the T29 recovery verify) so the brute-force budget cannot be reset from the browser. Reconcile with the client `challengeThrottle`. Behind `isSupabaseConfigured`; coordinate with T29 (live recovery) and T33 (server-backed login lockout). Prereq: T31, T29.

### ⬜ T142 — [P2] Live activation: service-role functions for email/Telegram OTP (request + verify, elevate session)
Surfaced building the easier-2FA channels (decision in `DECISIONS.md`): the repo's **first service-role Netlify functions**. Add `_shared/supabaseAdmin.ts` (service-role client, new env `SUPABASE_SERVICE_ROLE_KEY` documented in `.env.example`/`SECURITY.md`) and `_shared/resend.ts` (`sendEmail` over `https://api.resend.com/emails` using the already-configured `RESEND_API_KEY`/`RESEND_FROM_EMAIL`, never logging the recipient or code, RO/EN templates by `users.locale`). `mfa-otp-request.ts`: bearer-auth the caller (`getUser()` gives the trusted `user_id` + `session_id`; never trust client-supplied ids), enforce server-side resend cooldown + an issue ceiling, verify the channel is enabled, mint code (+ confirm token for email) and insert the hashed `mfa_otp_challenges` row, then deliver — email via Resend (code + `${residentAppUrl}/confirma-2fa?token=...` link) or Telegram via the existing `telegram.sendMessage(telegram_user_id, ...)` against the `telegram_users` row. `mfa-otp-verify.ts`: bearer-auth, pick the freshest non-consumed non-expired challenge, constant-time hash compare (or confirm-token for the link path), increment `attempts` and lock after N (only a wrong code counts, mirroring `mfaStore.verifyChallenge`), on match mark `consumed_at` and upsert a `session_elevations` row for the caller's `session_id`. No secrets/PII in logs. Requires a provisioned backend + the hook enabled (T141); document the apply steps. Prereq: T140, T141.

### ⬜ T143 — [P2] Live activation: wire mfaStore to the OTP functions + claim-aware enforcement
Surfaced building the easier-2FA channels: wire the live branches behind `isSupabaseConfigured`. `requestOtp`/`verifyOtp` call the T142 functions; on a successful verify the client `await supabase.auth.refreshSession()` to pick up the `app_2fa_at` claim minted by the Custom Access Token Hook. `challengeRequired()` reads `app_2fa_at` from the refreshed access token (decode the JWT payload client-side for the gate only; the authoritative check stays server-side) in addition to the native AAL, and feeds both `aalSatisfied` and the new `app2faSatisfied` axis into `mfaEnforcementRedirect` (the axis already exists from T139). `loadChannels`/`enableChannel`/`disableChannel` read/write `mfa_channels` (Telegram enable verifies a linked `telegram_users` row). Demo path unchanged as the offline fallback. Requires a provisioned project. Prereq: T142, T28.

### ⬜ T144 — [P2] Live activation: server-side OTP attempt-limit parity (folds into T81)
Surfaced building the easier-2FA channels: the client per-channel `otpThrottle` (T140) is clearable client-side, like the T33 login lockout and the T81 MFA-challenge throttle. The authoritative limit must be the server: confirm the `mfa-otp-verify` attempt counter + lockout (T142) cannot be reset from the browser and reconcile it with the client `otpThrottle`, alongside the recovery-code (T29) and login (T33) server lockouts so all second-factor brute-force budgets are server-held. Behind `isSupabaseConfigured`. Prereq: T142; coordinates with T81, T29, T33.

### ⬜ T113 — [P3] Carry a return-to through the AAL2 step-up
Surfaced in T112: when a re-gated session completes the in-app step-up on the security page it navigates to `/app`, dropping whatever deep route it was originally headed for (the path `useMfaEnforcement` redirected it away from). Capture the originally-requested location when the gate steers a session to `/app/securitate` (e.g. via router `state` or a stored `from`) and, after a successful step-up, return the session there instead of the home route, so the 2FA re-gate is transparent. Keep the redirect decision pure. Behind `isSupabaseConfigured`; demo stays ungated. Prereq: T112.

### ✅ T08 — [P1] E2E suite green + CI
Done: `.github/workflows/ci.yml` added (lint + typecheck + unit + build job then Playwright E2E job for chromium); `tests/e2e/isolation.spec.ts` added (unauthenticated `/app` and nested-route redirect to `/`, sign-out returns to login + demo button visible); lint/typecheck/1426 unit tests/build all green.

### ⬜ T14 — [P1] Email notification channel (live)
Wire the real email channel into the notification fan-out (Supabase/SMTP), bilingual templated emails, respecting per-user channel preferences and quiet hours (urgent/alert bypasses). Unsubscribe + preference management.

### ⬜ T15 — [P1] Telegram bot go-live
Complete every command/callback handler in `TELEGRAM_BOT.md`, validate Mini App `initData` and webhook secret end-to-end, deploy the Netlify function, add integration tests. Verify `BOT_SETUP.md` is accurate enough for a non-developer.

### ⬜ T16 — [P1] Realtime updates
Live updates via Supabase Realtime under RLS for announcements, tickets, votes, and chat surfaces, with optimistic UI and graceful reconnection. Falls back cleanly in demo mode.

### ⬜ T26 — [P1] Consent-gate enforcement in the fan-out
When the live notification channels land (T14 email, T15 Telegram), make every non-essential dispatch path call `mayNotify` (the T05 gate) and add tests proving a resident who refused a category receives nothing of that kind while essential alerts (F03) always go through. Prereq: T14, T15.

### ✅ T111 — [P2] Drop `super_admin` from the per-asociație `memberships` role check (offline)
Done: migration `20260528000002_drop_super_admin_from_memberships_role.sql` drops and recreates `memberships_role_check` with exactly the six tenant roles (admin/presedinte/comitet/cenzor/proprietar/chirias), no `super_admin`. `tests/unit/membershipRoleConstraint.test.ts` added with 4 regression assertions: drop is idempotent, last effective constraint excludes `super_admin`, covers all six roles exactly, and no `has_role(..., 'super_admin')` appears in RLS policies. `ROLE_RANK` keeps `super_admin` (TypeScript exhaustiveness over `Role`); no `has_role` with `super_admin` existed. 154 files / 1430 tests / build green.

### ✅ T100 — [P1] Mandatory hardened MFA for super_admin accounts

### ⬜ T88 — [P2] F33 real file upload, role-gated (offline data-URL; live Storage in T89)
F33 Document arhivă has a page, store and `documents` table (with an unused `storage_path`) but only stores a title, category and free text — there is no real file. Add real document upload so an admin/comitet can upload the building's documents (statut, regulament, contracte cu salubritate/apă/gaz, cadastru) and every member can view + download them, while only admin/comitet can upload or delete. Offline (demo, no backend): persist the file as a size-capped, type-allowlisted base64 data URL in the `documents` store so demo keeps working and a download/open works fully offline; the page shows the upload control only to admin/comitet (`activeRole()`), the download button to everyone. Keep the logic pure + unit-tested, add one E2E and RO/EN strings, and emit a `document.uploaded`/`document.deleted` audit event (extends T09/T85). No backend required. Prereq: T09; coordinates with T51 (role selectors).

### ⬜ T89 — [P2] Live activation: Supabase Storage for F33 documents
Wire T88's upload/download to a real Supabase Storage bucket behind `isSupabaseConfigured`: create a per-asociație-scoped bucket (or path prefix), upload on add, store the `storage_path`, serve downloads via signed URLs, and add Storage RLS so admin/comitet write and members read, scoped by `asociatie_id`, with the demo data-URL path as the offline fallback. Fold the document objects into the GDPR Storage erasure scope. Requires a provisioned project; document the apply steps. Prereq: T88; coordinates with T78 (Storage erasure).

### ⬜ T104 — [P2] Wire the F66 profile into F28 Parcare + F36 directory (and admin profile view)
Surfaced in T11: the profile editor captures `car_plate` (with an F28 note) and lets a resident mark custom fields "visible to neighbours" (F36), and `profileLogic.neighbourVisibleFields` already exposes them, but nothing consumes either yet. Wire the resident's `car_plate` into the F28 Parcare registry (auto-suggest/link the resident's plate rather than re-typing it) and surface their neighbour-visible custom fields in the F36 directory entry, subject to F36's existing consent rules. Add the admin/comitet read path so a controller can open any resident's profile in their asociație (live: RLS resolving membership; offline: from the local store). Keep the cross-feature glue pure + unit-tested. Mostly offline; the live admin read folds into T103. Prereq: T11; coordinates with T51 (role selectors).

### ⬜ T105 — [P3] Drag-and-drop reorder for profile custom fields
Surfaced in T11: custom fields are reordered with accessible up/down buttons (`moveCustomField`), which is complete and keyboard-friendly but not the "drag" the F66 spec describes. Add pointer/touch drag-reorder on top of the existing pure `moveCustomField`/`sortedCustomFields` ops (keeping the buttons as the accessible fallback), with smooth eased motion per the premium-feel mandate. Pure ordering logic stays unit-tested; the drag is a UI layer. Prereq: T11.

### ⬜ T107 — [P3] Touch-friendly pointer drag for the customizable home cards
Surfaced in T12: the F67 home edit mode reorders cards with native HTML5 drag-and-drop, which works on a desktop pointer but is poor on touch, plus accessible up/down buttons as the fallback. Replace (or augment) the native DnD with a pointer/touch drag layer over the existing pure `moveCard`/`moveCardTo` ops (keeping the buttons as the accessible fallback), with smooth eased motion per the premium-feel mandate. Pure ordering logic stays unit-tested; the drag is a UI layer. Shares the approach with T105 (profile custom-field drag). Prereq: T12.

### ⬜ T108 — [P3] Rich per-card home widgets (beyond feature-shortcut links)
Surfaced in T12: F67 makes the home's feature-shortcut cards customizable (show/hide/reorder/size), but each card is still a plain icon+title link, while the F67 spec envisions each card exposing a small live widget (latest announcement, my open tickets, next event, active polls, etc.). Add per-feature home-widget content rendered inside the card (especially when sized `expanded`), drawn from the active asociație's stores, so a pinned card shows useful at-a-glance state rather than just a shortcut. Keep the widget content pure/derived and bilingual; reuse the existing per-asociație selectors. Prereq: T12.

### ⬜ T25 — [P2] Accessibility statement (Declarație de accesibilitate)
Public accessibility-statement page describing the conformance target (WCAG 2.1 AA / EN 301 549), known limitations, and a feedback/contact route, linked from the legal footer. Lands alongside the accessibility audit. Prereq: T17.

### ⬜ T37 — [P2] Server-rendered proces-verbal PDF (F10 AGA)
F10 currently downloads the legally-required proces-verbal as signature-ready Romanian plain text (a deliberate bundle-budget choice — see `DECISIONS.md`). For a polished, court-presentable deliverable, render it as a real PDF: do it server-side (Supabase Edge Function / Netlify function) so no heavy PDF engine lands in the client bundle, keep the text generator (`generateProcesVerbal`) as the single source of the content, and stamp the asociație header + Legea 196/2018 footer. Demo mode keeps the text download. Prereq: a provisioned backend.

### ⬜ T39 — [P2] CSP hardening: exact Supabase origin + violation reporting
The T04 Content-Security-Policy uses a `https://*.supabase.co` / `wss://*.supabase.co` wildcard for `connect-src` because the project URL is environment-specific. Tighten it by templating the **exact** `VITE_SUPABASE_URL` origin into the deployed header at build/deploy time (Netlify build plugin or a generated `_headers` file) so only the real project is reachable, and add a `report-to`/`report-uri` directive plus a lightweight collector (Netlify function or Sentry, coordinate with T07) so CSP violations are observed rather than silent. Re-widen `connect-src` when Sentry (T07) or the email/Telegram channels (T14/T15) need new origins. Prereq awareness: T04 (done), T07.

### ⬜ T51 — [P2] Migrate role-gated UI + scoped reads to `activeRole()` / `currentAsociatieId`
T28 added `activeRole()` and `currentAsociatieId` but existing consumers (`useMfaEnforcement`, `SecurityPage`, `AssistantWidget`, `securityStore`) still read `memberships[0]?.role` / `memberships[0]?.asociatie_id` directly. They are consistent today because hydration sorts memberships by privilege, but a user who switches active asociație via `setActiveAsociatie` would not be reflected. Migrate these reads to the new selectors so role and tenant scope follow the chosen active asociație. Prereq: T28.

### ⬜ T64 — [P2] Enforce feature `audience`/role in the route guard + nav
The T44 `FeatureRouteGuard` blocks a route only when the feature's flag is OFF; it does not consider the feature's `audience` (e.g. `comitet`/`admin`-only modules like F18 Istoric reparații, F22 Oferte). So an enabled module is reachable by any role, even a resident, by URL or via the hub. Extend the guard (and the nav/hub filtering) to also gate on the feature `audience` against `activeRole()` / `currentAsociatieId` (per T51), rendering the same bilingual "not available for your role" state. Pure `audience`-vs-role check unit-tested. Coordinates with T51 (role selectors) and T43 (per-asociație flags). Prereq: T44, T51.

### ⬜ T59 — [P2] Surface the active asociație's name/branding (replace hardcoded DEMO_ASOCIATIE)
`HomePage` and `AppLayout` display `DEMO_ASOCIATIE.name` directly, so a locally-created or live asociație shows the demo name. Surface the active asociație's name/branding from `authStore` (the new `localAsociatii` entry for offline-created ones, the hydrated `asociatii` row when live) so the chrome reflects the real active tenant. Small display refactor. Prereq: T27, T28.

### ⬜ T62 — [P2] Record/resolve the joined asociație's name (replace fallback after T42)
`authStore.joinByInvite` (T42) creates the joined membership and selects the asociație but adds no `localAsociatii` name entry (the joiner does not know the asociație's display name from a bare code), so the chrome shows the hardcoded demo/fallback name until T59 lands. Resolve the joined asociație's name: offline, look it up from any locally-known asociație (the issuer's `localAsociatii` / `DEMO_ASOCIATIE`) or carry a denormalised name on the invite; live, read the `asociatii` row after the join RPC. Folds into / coordinates with T59. Prereq: T42, T59.

### ⬜ T63 — [P2] Show the active asociație on FeaturesAdminPage + empty-state when none
T43 scoped feature toggles to `currentAsociatieId`, but `FeaturesAdminPage` doesn't tell the admin which asociație's modules they are editing, and when no asociație is active the switches just render disabled with no explanation. Add a clear header line naming the active asociație (resolve via T59) and a bilingual empty-state ("select or create an asociație first") when `currentAsociatieId` is null, so the per-asociație scoping is visible. Small UI pass. Prereq: T43; coordinates with T59.

### ⬜ T61 — [P2] Wire (or remove) the ApartmentsPage "generate codes" button
`ApartmentsPage`'s "Generează coduri de invitație" button calls `generateInviteCode()` once per apartment and only toasts a throwaway example — the codes are never persisted, validatable, or redeemable now that T41 ships a real invite lifecycle. Either wire it to bulk-issue real per-apartment codes via the `inviteStore` (role `proprietar`, `apartmentId` set, an expiry) and link to the invites surface, or remove the button to avoid a misleading dead action. Prereq: T41.

### ⬜ T65 — [P2] Persist the content stores offline (publish survives reload)
The per-asociație content stores (`announcementsStore` from T47, and the upcoming `discussions`/`tickets` stores in T48/T49) are in-memory `create(...)` stores reseeded on every load, so a demo/local publish vanishes on refresh — the invite and feature stores already persist via `zustand/middleware`. Wrap the content stores in `persist` (a `version` + a `migrate` that reseeds the demo asociație from `DEMO_*` so a stale persisted demo list is refreshed, mirroring the T43 featureStore migration), keying by asociație so the local loop keeps published content across reloads. Keep the demo seed authoritative for the demo asociație. Coordinates with T57 (live read/write supersedes the local store when a backend exists). Prereq: T47.

### ⬜ T66 — [P2] Enforce the discussion post rate limit (anti-spam)
`discussionLogic` has `canPost(recentMessageCount, vetted)` + `NEW_USER_HOURLY_LIMIT` (T48), but the post flow never calls it, so an unvetted user is not actually rate-limited when starting threads or replying. Wire it in: track each author's recent message timestamps (per asociație), compute the last-hour count, and block + surface a bilingual "you are posting too fast" notice when an unvetted author exceeds the limit, while vetted users (comitet/admin) stay unthrottled. Reuse the existing pure helper; add a store/integration test. Coordinate with the T03 throttle style. Prereq: T48.

### ⬜ T67 — [P2] Comitet/admin ticket status-lifecycle surface (offline)
T49 lets a resident submit a sesizare, but it is stuck at `primit` offline — there is no way for a comitet/admin to advance it through the F17 lifecycle (`primit` → `asignat` → `in_lucru` → `rezolvat` → `verificat`/`respins`), assign a handler, add resolution notes, or for the reporter to rate after resolution. Add a pure status-transition helper (allowed transitions, who may make each) + an admin/comitet action surface on `TicketsPage` (gated on `activeRole()` per T51), updating the ticket in the per-asociație store and stamping `resolved_at`/`verified_at`. Unit-test the transition rules; add an E2E. Coordinates with T51 (role selectors) and the `ticket_status_history` table for live. Prereq: T49; coordinates with T51.

### ⬜ T68 — [P2] In-app "Link Telegram" resident surface (mock path, live-ready)
T50 ships the pure linking logic + the local/mock `telegramLinkStore` (a resident-minted per-user link code → `telegram_users` association), but nothing surfaces it in the app yet, so a resident cannot actually start the linking flow from the UI. Add a small "Telegram" card (in the profile/notification settings area, near the channel preferences feeding the T14 fan-out) that mints a per-user link code via `telegramLinkStore.issueLinkCode` (scoped to the active asociație + `activeRole()`), shows the resulting `t.me/<bot>?start=CODE` deep link with copy, displays the established link / an unlink action (`/uita`), and is bilingual + premium-feel. Demo exercises the mock path end-to-end (issue → the bot's `/start CODE` resolves it). Prereq: T50; coordinates with T11 (profile editor) and T14 (notification channels). Live wiring of the bot username + webhook resolution is T58.

### ⬜ T83 — [P2] Adopt the standardized loading/empty/error states across all feature pages
Surfaced in T07: T07 added the `ErrorState` component + the route-level `ErrorBoundary` (so any page crash now shows a friendly recovery state) and `SkeletonList`/`EmptyState` already exist, but the ~90 feature pages were not individually audited to render these uniformly — many use ad-hoc inline loading/empty markup, and react-query/store fetch *errors* are not surfaced through `ErrorState` (a failed live read can render as a silent empty list rather than a clear error with a retry). Sweep the feature pages so loading uses `SkeletonList`, empty uses `EmptyState`, and a fetch/query error renders `ErrorState` with a retry action, so the resilience UX is consistent on every surface, not just on render-time crashes. Pure where possible; mostly a UI consistency pass. Prereq: T07.

### ⬜ T84 — [P2] Route async store-action failures through the error-reporting hook
Surfaced in T07: T07's `reportError` hook + `installGlobalErrorHandlers` catch render-time errors and unhandled rejections, but the deliberate `try/catch` blocks in async store actions (e.g. `authStore.hydrate`, the live read/write paths landing in T55-T57, the security/audit mirrors) swallow or only locally handle failures, so observability does not yet cover data-layer errors. Wire `reportError` (with a non-PII `source` + breadcrumbs) into those catch blocks behind `isSupabaseConfigured`, so when a live sink is attached (T82) the report stream covers store/query failures, not only UI crashes. Keep demo mode silent. Prereq: T07; coordinates with T82.

### ⬜ T82 — [P2] Wire a live error sink (Sentry-ready) + CSP report endpoint
Surfaced in T07: the `errorReporting` hook ships with a pluggable `setErrorSink` and no default sink, so in production errors are reported nowhere. When observability lands, attach a real sink (Sentry SDK or a lightweight Netlify-function collector) via `setErrorSink`, gated on an env flag, scrubbed reports only, and reconcile the `connect-src`/`report-to` CSP directives so the sink's origin is allowed and CSP violations are collected by the same path. Requires an external service (Sentry DSN or a deployed collector) so it is a documented live-activation follow-up, not an overnight blocker. Prereq: T07; coordinates with T39 (CSP report-uri) and T07's T84.

### ⬜ T85 — [P2] Wire the remaining state-changing features into the audit trail
Surfaced in T09: the audit log + `recordAudit` infrastructure is live, but only five surfaces emit entries (feature toggles, invite issue/revoke, DSR decisions, breach record/advance, announcement publish). For the trail to genuinely be "across features", call `recordAudit` from the other consequential state changes — apartment CRUD (`ApartmentsPage`), ticket status lifecycle (T67), AGA convocation/vote close, budget proposal/decision, petitions, document/contract changes, role/membership changes — each with a meaningful before/after. Extend `AUDIT_ACTIONS`/`AUDIT_ENTITIES` + the `audit.action.*`/`audit.entity.*` locales accordingly, and keep emission in the page/handler (not the store) per the T09 decision. Doable offline. Prereq: T09.

### ⬜ T86 — [P2] Live activation: audit_log read + server-authoritative chain
Surfaced in T09: the store mirrors entries to `audit_log` best-effort but the live read path and a server-authoritative ordering are not built — offline the seq/prev_hash/hash are computed client-side, which is fine for demo but a forging client could mint its own chain live. When a backend is provisioned, read the asociație's `audit_log` under RLS for the page, and compute `seq` + the hash chain server-side (a trigger or an Edge Function that reads the current tail and stamps `seq`/`prev_hash`/`hash`), so the chain authority is the database, behind `isSupabaseConfigured` with the local chain as the offline fallback. Requires a provisioned project. Prereq: T09.

### ⬜ T17 — [P2] Accessibility audit (WCAG 2.1 AA)
axe-core clean on every page, full keyboard navigation, correct focus management in modals/drawers, ARIA labelling, sufficient contrast in both light and warm-graphite dark themes.

### ⬜ T18 — [P2] Performance & Lighthouse
Bundle and route-preload audit, image/avatar strategy, and meeting Lighthouse thresholds (Performance ≥ 85, Accessibility ≥ 95, Best Practices ≥ 90, SEO ≥ 90) on public pages.

### ⬜ T19 — [P2] SaaS billing & plans
Subscription tiers per asociație with per-tier feature/usage limits enforced server-side, a billing abstraction (Stripe-ready, mocked in demo mode), invoices/receipts, billing admin surface. Dunning + grace handling.

### ⬜ T110 — [P2] Present consumer pre-contractual info + withdrawal at the point of sale (billing)
Surfaced in T24: the consumer-protection information now lives on the `/protectia-consumatorului` page and is referenced from Terms, but for a consumer distance contract the pre-contractual information (main characteristics, total price incl. taxes, billing period, duration, renewal/cancellation) and the right-of-withdrawal notice must be presented **at the moment of purchase** on a durable medium, and where the service starts during the withdrawal period the consumer must give express consent + acknowledge losing the right once fully performed (OUG 34/2014). When the billing surface (T19) lands, render this at checkout/plan-selection (a clear pre-contractual summary + an express-consent checkbox + a confirmation on a durable medium), reusing the `consumerRights` content as the single source. Behind the billing flow; demo shows the mock checkout. Prereq: T19, T24.

### ⬜ T20 — [P2] Super-admin platform console (umbrella — broken down into T91–T100)
Platform-owner console: manage asociații, provision admins, the global feature catalog, support impersonation with full audit, platform health/usage metrics, and an admin↔superadmin messenger. Strictly separated from tenant admin — built as a **separate app on its own subdomain** (`src/platform/*`), gated to `super_admin` with server-side re-checks (origin/session isolation; see `DECISIONS.md`). Now broken down into the dependency chain: T91 (platform identity + cross-asociatie RLS), T92 (server-side provisioning), T100 (mandatory hardened MFA), T93 (separate app shell), T94 (asociații + admin provisioning), T95 (cross-asociatie audit viewer), T96 (platform error feed), T97 (usage/health metrics), T98 (audited impersonation), T99 (admin↔superadmin messenger). Track the work under those; this entry stays as the umbrella.

### ⬜ T119 — [P2] Platform-shell access E2E (gate denies non-superadmin, grants superadmin)
Surfaced in T93: the platform gate's decision is unit-tested as a pure function, but the wired shell has no end-to-end coverage. Add Playwright coverage for the platform origin: the demo console smoke (enter demo → reach `/consola` overview → sign out returns to the platform login), and, in the live path (folding into T08 once a backend exists), that a non-superadmin session lands on the denial screen while a `super_admin` reaches the console. Authored to run against `platform.html`. Prereq: T93; coordinates with T08.

### ⬜ T120 — [P2] Live activation: cross-tenant asociații list read + server-mediated provisioning
Surfaced in T94: the console's asociații list + provisioning run fully against the offline `platformAsociatiiStore` (seeded from the demo dataset). Wire the live path behind `isSupabaseConfigured`: (1) hydrate the list from a real cross-tenant read of `asociatii` under the T91 super_admin RLS, with real member counts (from `memberships`) and apartment counts (from `apartments`), falling back to the local store offline; (2) route the provisioning write through the T92 service-role Netlify function (create the asociație + the admin's auth account, re-verifying `super_admin` server-side) instead of the local-only store mutation, surfacing a user-visible error on failure. Keep the demo path as the offline fallback. Requires a provisioned project. Prereq: T94, T92, T91; coordinates with T97 (the counts feed usage/health).

### ⬜ T121 — [P2] E2E for the asociații provisioning console (platform app)
Surfaced in T94: the provisioning logic + store are unit-tested but the wired page has no end-to-end coverage. Add a Playwright happy-path against `platform.html` (folding into T119/T08): enter the demo console, open `/consola/asociatii`, provision a new asociație (fill name/city/admin name + email), and assert it appears in the list with its admin's setup code and a pending-setup badge; also assert the inline validation blocks an empty/invalid form. Authored to run offline in demo. Prereq: T94, T93; coordinates with T119.

### ⬜ T95 — [P2] Cross-asociatie audit viewer (platform app)
Surface the T09 tamper-evident audit trail across **all** asociații in the superadmin app, read-only: aggregate every asociație's hash-chained log, show a per-asociație chain-integrity badge (`verifyChain`), and reuse the T09 filters (actor/action/entity/text/date) plus an asociație filter, so the superadmin can see what each admin is doing platform-wide. Cross-tenant read is granted only to `super_admin` (T91). Breaks down T20. Prereq: T91, T93, T09.

### ⬜ T96 — [P2] Platform error feed (superadmin app)
Give the superadmin visibility into app problems: persist the scrubbed error reports from the T07 `errorReporting` hook (no PII, the `IV-XXXX-XXXX` reference) to a `super_admin`-readable store/table and surface them as a filterable feed in the platform app (message, reference, route, count, first/last seen), so the two superadmins can spot errors and regressions. Wire to the live sink (T82) when present; demo shows the local report buffer. Breaks down T20. Prereq: T93, T07; coordinates with T82.

### ⬜ T97 — [P2] Platform usage/health metrics (superadmin app)
A platform dashboard of per-asociație health: member count, enabled features, recent activity (announcements/tickets/votes in a window), last admin sign-in, and platform-wide rollups, so the superadmin can see adoption and spot dormant or struggling asociații. Read-only, cross-tenant under T91; demo computes from the seeded stores. Breaks down T20. Prereq: T93.

### ⬜ T98 — [P2] Audited superadmin impersonation (read-only)
Let a superadmin enter a chosen asociație's context **read-only** to diagnose a reported problem, with every entry and exit written to the audit trail (actor, asociație, when) so impersonation is never silent. No write actions while impersonating; a clear, persistent banner shows the impersonated tenant. The privileged context switch is server-mediated (a T92-style function) and re-checks `super_admin`. Security-sensitive. Breaks down T20. Prereq: T91, T93, T09.

### ⬜ T99 — [P2] Admin ↔ superadmin support messenger
A back-and-forth messenger between an asociație's admins and the platform superadmins, modeled on F04 (`adminchat`: `private_threads`/`private_messages`, thread + embedded messages, per-message read receipts, open/resolved status): a per-asociație support thread where admins raise issues to the superadmin and the superadmin replies. The admin side lives in the main app (a "Contact platformă" surface), the superadmin side is an inbox across all asociații in the platform app. Bilingual on the admin side, demo + live, scoped so only that asociație's admins and the superadmins see a thread. Breaks down T20. Prereq: T91, T93.

### ⬜ T87 — [P3] Stronger cryptographic tamper-evidence for the audit chain
Surfaced in T09: the audit chain uses a fast non-cryptographic hash (cyrb53), so it detects accidental edits/reorders and, combined with the append-only RLS, gives honest-store tamper-evidence — but a determined party who can write to the table could recompute a consistent forged chain. For a stronger guarantee, sign each entry's hash with a server-held secret (HMAC) or periodically anchor the chain head (a Merkle root) to an append-only external store, so the integrity check no longer depends only on the store being honest. Requires a server-held secret / external anchor, so it is a documented follow-up, not an overnight blocker. Prereq: T09, T86.

### ⬜ T79 — [P3] Guard that every RLS-enabled table carries at least one policy
Surfaced in T35: the new coverage guard proves RLS is enabled on every table, but a table with RLS ON and **zero** policies is deny-all (no one can read/write it) — not a leak, but a silently broken feature that the coverage guard does not catch. Add a backend-free guard that, for every RLS-enabled public table, asserts at least one policy targets it (a `create policy ... on X`, a `select apply_standard_rls('X')` which adds two, or a parent-scoped policy), and document the intentionally locked tables (if any) so a genuinely access-less table is a deliberate, asserted choice rather than an oversight. Lower priority than the leak-class guards since deny-all fails safe. Prereq: T35.
