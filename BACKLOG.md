# BACKLOG — Autonomous continuous development

> Single source of truth for what to build next. Open (⬜) tasks only; finished work lives in `COMPLETED.md` (newest first).
>
> - `make progress` — top-priority ⬜, full Definition of Done, commit+push, then add new tasks for problems found.
> - `make task` — same one-task unit, but skips step 6 (no new tasks added).
> - `make mvp` — picks from `## MVP presentation spine` (now complete), skips step 6.
> - `scripts/run-overnight.sh` — runs the `make progress` unit on a loop; when the queue empties it audits + replenishes; halts on red pipeline, time budget, or interrupt.
>
> Goal: secure, stable, polished, GDPR-compliant multi-tenant SaaS for Romanian asociații de proprietari with 2FA auth and robust handling of real building problems.

---

## MVP milestone — complete ✅

MVP spine + three-stage deployment (PROD/DEV/DEMO) are done and green; archived in `COMPLETED.md`. All 67 features (F01–F67) are fully live-wired. E2E closure, live hardening, GDPR, Telegram go-live, the platform console shell (all 8 sections), SaaS billing, observability, PWA, perf/a11y, and code-health refactors (T15–T277) are all complete and archived. The queue was reset on 2026-06-06 to a final **production-readiness wave** (T278–T288) ahead of a pilot launch with 1–2 real buildings: security & abuse hardening, reliability (no silent failures), onboarding polish, low-end-device performance, and a code-side production-readiness self-check. Payments remain out of scope (`## On hold`, T254a/b).

---

## Protocol — common steps

Do these steps, in order, every time (any of the three triggers):

0. **Sync with main.** `git fetch origin main && git pull origin main` before reading any file or writing code.
1. **Pick the task.** Topmost `⬜` whose prerequisites are met. If pipeline is red, fixing it _is_ the task and outranks everything. Source queue depends on trigger (see table).
2. **Re-establish only what this task needs.** Relevant `RESUME.md` §0 status, relevant `FEATURES.md` row (if feature), relevant code. Read a doc only if the task touches its domain. Match existing conventions exactly.
3. **Implement fully.** No TODOs, no placeholders, no commented-out code. Per-feature pattern: logic module → Zustand demo store (seeded from `src/shared/demo/demoData.ts`) → feature page → `registry.ts` toggle to `implemented` → route → `/command` bot help → RO/EN locales → unit test → one E2E happy path. UI fully bilingual, premium-feel.
4. **Verify — all must be green.** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run build:pi`, `npm run build:demo`. Never weaken or delete a test to pass it. Overnight script re-runs the pipeline and halts on red.
5. **Update docs.** Mark task `✅`, move heading + done-note to top of `COMPLETED.md` (newest first). Update `FEATURES.md` (if feature) and `RESUME.md` §0 (counts, date, last task).
6. **Feed the loop (only `make progress`).** Every problem detected (bug, security gap, fragile code, missing test, a11y/UX/perf issue, tech debt) and every worthwhile improvement → new `T##` task inserted at its priority position in the queue, with `[P#]` tag.
7. **Commit + push to `main`.** One focused conventional commit (`feat(...)` / `fix(...)` / `chore(...)` / `docs(...)`), ending with the `Co-Authored-By` trailer. Work directly on `main`.
8. **Stop.** One task per trigger. Overnight script handles repetition.

### Trigger variants

| Trigger         | Step 1 source                                           | Step 6 (feed loop)         |
| --------------- | ------------------------------------------------------- | -------------------------- |
| `make progress` | `## Main queue` (top ⬜)                                | Yes — add new tasks        |
| `make task`     | `## Main queue` (top ⬜)                                | No — queue stays same size |
| `make mvp`      | `## MVP presentation spine` (now empty → falls through) | No                         |

### Priority rubric

- **P0 — Critical:** unsafe for real residents — security holes, data-loss or privacy risks, red pipeline, GDPR/legal blockers, tenant-isolation gaps.
- **P1 — High:** core stability/robustness, auth, accessibility/legal compliance, finishing committed features, work that unblocks other tasks.
- **P2 — Normal:** polish, performance, SaaS platform capabilities, quality-of-life UX.
- **P3 — Later:** speculative/optional enhancements.

When two tasks share a priority: prerequisites first, then smallest-safe-step.

### Hard rules

- Never use the em dash character (`—`) in code (source, comments, strings). Prose in markdown docs (this file included) may use it.
- Romanian strings use real diacritics (ă, â, î, ș, ț). Currency `1.234,56 lei`, dates `DD.MM.YYYY`, time `HH:mm`.
- Every new table gets RLS scoped by `asociatie_id`. Personal data covered by GDPR tasks. Never log secrets or PII.
- Demo mode stays the default, fully-working experience. Features work offline first, live-ready behind `isSupabaseConfigured`.
- All three stages (PROD/DEV/DEMO) must build and run after every task.
- Do not ask the user questions during a task — decide, record in `DECISIONS.md`, continue.

### Definition of done

- [ ] Implemented end-to-end, no TODOs/placeholders.
- [ ] `lint` + `typecheck` + `test` + `build` + `build:pi` + `build:demo` all green.
- [ ] Bilingual RO/EN, premium-feel UI, accessible.
- [ ] Docs updated (`BACKLOG.md`, `FEATURES.md` if applicable, `RESUME.md` §0, `COMPLETED.md` archive).
- [ ] Problems found + improvements imagined captured as new priority-ranked tasks (only for `make progress`).
- [ ] One commit, pushed to `origin/main`.

---

## Task queue

> Sorted by priority, highest on top. `make progress` takes the topmost `⬜` whose prerequisites are met. Sections group related work; the intended pick order runs top-to-bottom through the sections.
>
> **Status (updated 2026-06-06):** The full T15–T277 build is complete and archived in `COMPLETED.md` (every MVP, hardening, GDPR, platform-console, billing, observability, PWA, perf, a11y, and DX task). The queue was reset to a final **production-readiness wave** (T278–T288) for the upcoming pilot launch with 1–2 real buildings (real residents, real personal data). Theme order: security & abuse hardening first, then reliability (no silent failures), onboarding polish, low-end-device performance, and a code-side production-readiness self-check. Scope is **code-ready only** (no deployment/account/secrets tasks) and **in-house monitoring only** (no third-party integrations). Payments stay out of scope (`## On hold`, T254a/b).

## MVP presentation spine — complete (see COMPLETED.md)

## Three-stage deployment (PROD / DEV / DEMO) — complete (see COMPLETED.md)

## Main queue

> Production-readiness wave for the pilot launch. Every task is one `make progress` unit: fully implemented (no TODOs/placeholders), demo-first + live-ready behind `isSupabaseConfigured`, every privileged write in a service-role Netlify function that re-checks the caller, RLS scoped by `asociatie_id`, bilingual RO/EN with real diacritics, premium-feel, accessible, all three stages (PROD/DEV/DEMO) building, and **shipped with tests** (unit always; one E2E where a user flow is involved). Picked top-to-bottom by priority: security, then reliability, onboarding, performance, final QA.

### Group 0 — Defects found in the 2026-06-06 full-pipeline audit

> Found during a top-to-bottom verification (full pipeline green: 317 files / 3121 tests, all 3 builds, bundle budgets, E2E). These are confirmed, file-cited bugs in shipped code that the existing tests do not catch -- they outrank the planned hardening below because they break a security/accountability control and expose a destructive endpoint.

### ✅ T289 — [P0] Unauthenticated destructive endpoint: `gdpr-retention-purge.ts`

`netlify/functions/gdpr-retention-purge.ts` hard-`delete()`s rows from `auth_audit_events` and `tickets` (lines 74-86). Its own header (lines 11-15) documents that "Manual POST invocations require a valid bearer token from an admin," but the handler performs **no** caller verification -- the only gates are `isSupabaseAdminConfigured()` and a per-IP sliding-window rate limit (5/hr). Because the per-IP limit is trivially bypassed by rotating source IPs, an unauthenticated caller who reaches the function URL can purge the auth audit trail and resolved tickets off-schedule. Fix: gate the manual POST path behind `verifyBearerToken` + a platform-admin (`is_super_admin()`) check exactly as the header promises, while still allowing the Netlify scheduled (`@monthly`) invocation that carries no bearer (distinguish the scheduled invocation from a manual HTTP POST). Audit each purge run into the tamper-evident chain. Unit tests: rejects an unauthenticated POST (401/403), accepts the scheduled invocation, accepts an authenticated platform admin. Prereq: none.

### ✅ T290 — [P0] Tamper-evident audit chain is written incorrectly by 6 platform functions

The integrity verifier `verifyChain` (`src/features/audit/auditLogic.ts:256-268`) requires each row's `hash` to equal `computeHash(row-without-hash)`, its `prev_hash` to equal the predecessor's `hash`, and the genesis sentinel to be `GENESIS_HASH` (`'0000000000000000'`). But six functions insert `hash: prevHash` (the *previous* row's hash, never a hash of the new row) and use the wrong sentinel `'GENESIS'`: `admin-invite-action.ts:133`, `asociatie-lifecycle.ts:145`, `feature-override.ts:137`, `platform-broadcast.ts:136` and `:184`, `provision-additional-admin.ts:163`, `revoke-admin-access.ts:125`. Only `impersonate.ts:170-184` computes a real hash (`computeAuditHash`). Consequence: every provisioning / admin-grant / admin-revoke / lifecycle / feature-override / broadcast operation appends a structurally invalid link, so the affected tenant and platform audit logs verify as **tampered** for legitimate activity -- which both alarms operators and masks genuine tampering, defeating the control. Two related defects share the root cause and must be fixed together: (a) `seq` is allocated read-max-then-insert with no uniqueness guard (concurrent writes to the same chain collide and break `verifyChain`'s sequential check); (b) the audit `insert` result is not error-checked, so the privileged op returns `{ ok: true }` even if the audit row failed to persist. Fix: extract one shared `appendAudit()` helper (mirroring `impersonate.ts`) that computes the real hash with the correct genesis, allocates `seq` safely (DB sequence/`ON CONFLICT` or a transaction), and propagates the insert error; route all seven functions through it. Add a regression test that runs each function's audit write through `verifyChain` and asserts the chain stays intact across multiple appends. Prereq: none.

### Group A — Security & abuse protection

> Pilot = real residents and real personal data, so the fundamentals must be airtight: no one can brute-force a login or one-time code, no building can ever read or touch another building's data, and the shared surfaces cannot be spammed. The isolation rules already exist and are tested; this wave re-proves them across every table and adds the missing brute-force and abuse limits.

### ✅ T278 — [P0] Brute-force / rate-limit guard on all auth-sensitive endpoints

The shared limiter (`netlify/functions/_shared/rateLimiter.ts`) is applied to some endpoints but not all: `mfa-otp-verify.ts` (and the request/recovery siblings) currently have no rate-limit guard, so a one-time code or recovery code can be brute-forced. Audit every auth-sensitive path -- `mfa-otp-request`, `mfa-otp-verify`, `mfa-recovery-verify`, the login submission, and invite/setup-code redemption -- and apply the existing limiter everywhere it is missing, keyed by identifier + IP, plus a short temporary lockout after N consecutive failures. Every lockout/throttle event is audited (extend `AUDIT_ACTIONS` with an `auth.rate_limited` / `auth.locked_out` action where appropriate) and emits a bilingual, non-leaky error ("too many attempts, try again in N minutes") that never reveals whether the account/code exists. Reuse `auth_audit_events` for the failed-attempt counter. Demo / no-key = no-op. Unit tests for the limiter + lockout logic and a test asserting `mfa-otp-verify` is throttled after the threshold. Prereq: none.

### ✅ T279 — [P1] Cross-tenant isolation regression sweep

The isolation guarantee is already tested narrowly (`tests/unit/rlsTenantIsolation.test.ts`, `tests/unit/rlsPolicyCoverage.test.ts`, `tests/e2e/isolation.spec.ts`), but the coverage does not span every live-wired table, and the write path is under-tested. Build a representative-table list (one per feature domain) and extend the existing suites to assert, for both **read and write**, that a member of building A cannot select, insert, update, or delete building B's rows -- including the trickier surfaces (anonymous messages, private threads, votes/signatures after lock, storage objects). Add a structural guard test that fails if a new table ships without an `asociatie_id`-scoped RLS policy, so the gate ratchets. No product change; this is a permanent safety net. Prereq: none.

### ✅ T280 — [P1] Abuse / spam guards on resident-generated content

The high-volume resident-writable surfaces (discussion messages, neighbor classifieds, private messages, ideas, FAQ questions, comments) have no per-user posting-rate cap or hard content-length limit, so a single resident can flood a channel. Add a shared, configurable guard: a per-user/per-feature posting-rate cap and a max-length check, enforced client-side (disabled submit + bilingual helper text + remaining-characters affordance) and re-checked server-side / in the RLS-facing write path so the client cannot bypass it. Keep the limits generous enough not to annoy normal use, and make them constants in one place. Demo enforces the same caps offline. Unit tests for the rate/length logic. Prereq: none.

### Group B — Reliability (no silent failures)

> The worst failures are the quiet ones: an email that never arrives, a half-configured setting that silently breaks a feature in production, or a dropped connection that loses what a resident just typed. This group makes failures loud and recoverable. With a pilot there is no ops team watching dashboards, so the app must announce its own problems.

### ⬜ T281 — [P1] Email delivery robustness (retry + visible failure)

`netlify/functions/_shared/resend.ts` sends transactional mail (invites, OTP, provisioning, health, breach notices) but a transient Resend failure is effectively dropped, and `MAIL_MODE` misconfiguration fails as a silent `not-configured`. Add bounded retry with backoff for transient/5xx failures, and on permanent failure record the event to the platform error stream (the T258a durable path) tagged with the template + recipient class (never the raw PII) and surface a visible signal to the relevant admin (e.g. "invite email failed to send -- retry"). Distinguish disabled/log mode (expected no-op) from a real send failure (alertable). Unit tests for the retry branch + the failure-recording branch. Prereq: none.

### ⬜ T282 — [P1] Startup config validation (fail loud, not silent)

Today a missing or malformed env var (`SUPABASE_SERVICE_ROLE_KEY`, `AUDIT_HMAC_SECRET`, `RESEND_*`, `TELEGRAM_*`, `APP_URL`, etc.) degrades silently at runtime -- a function half-works or a feature quietly no-ops in PROD. Add one shared validator that, at function cold-start and at app boot, checks every required variable for presence and basic shape (URL is a URL, key has the expected prefix/length) and fails loud with a clear, **non-secret** message naming what is missing -- never printing the value. Centralize the required-variable list in one documented place so the set is auditable. In demo / no-key mode the validator recognizes the intentional offline posture and stays quiet. Unit test for the validator across present/missing/malformed cases. Prereq: none.

### ⬜ T283 — [P1] Graceful network-failure recovery in the live app

When a Supabase read or write fails mid-session (network blip, transient 5xx), the app can fail quietly and a resident can lose what they just typed. Add a consistent recovery affordance: failed reads show a bilingual "couldn't load -- retry" state instead of an empty or stuck view, and failed writes keep the user's input and offer a retry rather than discarding it (compose with the existing `useUnsavedGuard` so a dirty form is never silently lost). Use the existing `reportError` + store `setFetchError` seam; do not introduce a new data layer. Demo (no network) is unaffected. Unit tests for the retry/error-surfacing logic + one E2E that simulates an offline blip on a write and asserts the input survives. Prereq: none.

### Group C — Onboarding new buildings

> For a pilot, onboarding is the first impression. The full path from "I signed up" to "my residents are inside" must be smooth and dead-end-free, and a brand-new empty building should tell its admin what to do first instead of showing blank screens.

### ⬜ T284 — [P1] End-to-end onboarding polish + E2E

Walk the complete new-building chain (provision building -> first admin sets password + MFA -> admin invites residents -> resident redeems the invite -> lands in the app) and remove any dead ends: every step has a clear next action, a visible error state on failure, and a way back. Tighten the rough edges found along the way (expired/invalid invite messaging, double-submit protection, post-setup redirect) without changing the security model. Add or extend one E2E that drives the whole chain in demo mode so the happy path is locked. Bilingual, premium-feel. Prereq: none.

### ⬜ T285 — [P2] First-run "get started" checklist for an empty building

A freshly-provisioned building is empty, and a new admin sees blank lists with no guidance. Add a dismissible, bilingual "set up your building" checklist on the admin home (add apartments, invite residents, publish the first announcement, choose which features are on) with live progress that ticks items off as they are completed and a clear skip/dismiss that persists per admin. Reuse the existing `EmptyState` and welcome-flow patterns; no new backend. Unit tests for the step/progress logic. Prereq: none.

### Group D — Performance on low-end phones

> Many residents will be on old Android phones and weak connections. The "lite" rendering tier (T257) and the image/bundle work (T260/T264/T265) already exist; this group auto-applies them where they help and verifies a fast cold load on a throttled connection.

### ⬜ T286 — [P2] Low-end-device auto-detect -> lite mode

The perf-lite tier (T257) is opt-in or stage-derived; a resident on a cheap phone never gets it unless they find the toggle. Detect low-end signals at boot (`navigator.deviceMemory`, `hardwareConcurrency`, the Save-Data header / `connection.saveData`, slow `effectiveType`) and either auto-apply lite mode or show a one-time, dismissible bilingual prompt suggesting it, always leaving the explicit user toggle authoritative (an explicit choice is never overridden). Keep PROD/DEMO visually unchanged for capable devices. Unit tests for the pure detection/resolution helper. Prereq: T257.

### ⬜ T287 — [P2] Cold-load budget on a throttled connection

A first visit on slow 3G has never been measured against a target. Measure the cold-load first-paint payload under throttling, trim what is reasonable (defer/lazy any non-critical initial import the T260 analyzer flags), and codify a critical-path budget so a regression is caught -- extend the existing `scripts/check-bundle-size.mjs` budgets with an explicit "initial route" ceiling and document the measured cold-load number. No feature change. Prereq: T260.

### Group E — Final production QA (code-side only)

> "Code-ready" should mean verified code-ready. This is a repeatable check and a written test plan, with no accounts and no deployment.

### ⬜ T288 — [P1] Production-readiness self-check + smoke-test plan

There is no single command that says "the build is sound for all three stages" and no written pre-launch test script. Add a code-side `scripts/preflight.mjs` (npm `preflight`) that runs the full verification (lint, typecheck, test, build, build:pi, build:demo), checks each stage's artifacts exist and the config shape is valid (reusing the T282 validator with placeholder env), confirms the bundle and dep gates pass, and prints a clear go/no-go summary -- no network, no secrets, no deploy. Pair it with a `LAUNCH_CHECKLIST.md` manual smoke-test plan (log in, onboard a building, post an announcement, run a vote, export GDPR data, switch language, install the PWA) to run before flipping live. Unit test for the preflight result-aggregation logic. Prereq: none.

### Group F — Test-coverage & quality gaps (from the 2026-06-06 audit)

> The full pipeline is green, but a coverage/i18n/a11y audit found security-relevant code paths and user flows that are not directly tested, plus a few untranslated screen-reader strings. Closing these makes the "complete testing" claim real where it matters most.

### ⬜ T291 — [P1] Direct tests for security-critical, currently-uncovered code paths

The coverage report flags several auth/privacy-sensitive modules with little or no direct coverage: `src/features/auth/recoveryVerifyApi.ts` (~7% -- MFA recovery-code path, an account-recovery surface), `src/features/invites/inviteWriteApi.ts` (0% -- invite creation grants tenant access), `src/shared/store/consentStore.ts` (0% -- GDPR consent state), and `src/shared/store/breachStore.ts` (0% -- breach-notification fan-out). Additionally, the Netlify function handlers are excluded from coverage entirely (`vite.config.ts` coverage `include` is `src/**` only), so the function boundary (auth gating, request parsing, error responses) is unmeasured. Add focused unit tests for those four modules and handler-level tests for the highest-risk functions (`gdpr-erasure`, `gdpr-retention-purge`, `revoke-admin-access`, `feature-override`, `billing-checkout`) asserting they reject unauthenticated/cross-tenant callers, and add `netlify/functions/**` to the coverage denominator. Ratchet the line/statement coverage gate up from its current weak 30% baseline once these land. Prereq: T289, T290 (so the function tests assert the fixed behavior).

### ⬜ T292 — [P1] E2E for the required flows that currently have no spec

`TESTING.md` names flows that have no Playwright coverage: the full **onboarding wizard** from a blank building to first published announcement (only shallow `smoke.spec.ts` touches exist), the **AGA lifecycle** (convocare -> RSVP -> live vote -> quorum -> proces-verbal; `quorum`/`procesverbal` appear in 0 E2E files), and **GDPR data export / subject-access** (`export` appears in 0 E2E files; `MyDataPage.tsx` is at 0% coverage). Add one E2E per flow in demo mode (deterministic, frozen time/animations). Also widen the `tests/e2e/a11y.spec.ts` axe gate beyond its current 5 surfaces to a broader representative set, and convert the disabled `color-contrast` rule into a tracked follow-up. Coordinate with T284 (which already adds the onboarding E2E) so the onboarding spec is authored once. Prereq: none.

### ⬜ T293 — [P2] Translate hardcoded screen-reader strings + example placeholders

Locale parity, diacritics, and alt-text are complete and test-guarded, but the audit found a few user-facing strings bypassing i18n: hardcoded English aria-labels in `src/shared/components/DatePicker.tsx` (`"previous month"`, `"next month"`, `"calendar"` at lines 248, 259, 348, 362 -- the component already imports `useTranslation` but destructures only `{ i18n }`, not `t`), `aria-label="Platform notices"` in `src/shared/components/BroadcastBanner.tsx:60`, and Romanian-only example placeholders shown to EN users (`exemplu@email.com` in `ApartmentFormPage.tsx:572` and `ApartmentsPage.tsx:1240`, `#parcare` in `DiscussionsPage.tsx:365`). Move each to a `t()` key in both `ro.json` and `en.json` (an `emailPlaceholder`-style key already exists to follow). Small a11y + i18n correctness fix. Prereq: none.

---

## On hold

> Tasks parked indefinitely — not picked by any trigger until explicitly reinstated.

### ⏸ T254a — [P2] Platform-side subscription: change plan + comp / credit

`PlatformSubscriptionsPage` (`platformSubscriptionsStore.ts`) can only `markPaid`; a complete billing console needs to act on a tenant's plan. Add the two plan-mutating actions: **change plan** (move a tenant between the 3 canonical tiers with a prorated note) and **comp / apply credit** (set a tenant to a free or discounted plan with a reason, e.g. early adopter). Each privileged write is a service-role Netlify function re-checking `is_super_admin()`, audited into the tenant's chain, and mirrored to the `subscriptions` table. Demo drives the persisted `platformSubscriptionsStore`. Bilingual, premium-feel, unit tests for the new store actions + one E2E (change plan -> tier badge updates). Prereq: T19. (Split from the original T254; T254b covers payment + dunning.)

### ⏸ T254b — [P2] Platform-side subscription: record manual payment + trigger dunning

Building on T254a, add the two invoice/lifecycle actions: **record a manual payment** (offline bank transfer marks an invoice paid with a reference) and **trigger dunning** (move an overdue subscription into the grace/past-due flow that the T19 banners already render). Each privileged write is a service-role function re-checking `is_super_admin()`, audited, and mirrored to the `invoices`/`subscriptions` tables. Demo drives the persisted platform store. Bilingual, premium-feel, unit tests for the new store actions + one E2E (record payment -> invoice flips to paid). Prereq: T254a, T19.

### End of queue

When all groups clear, the overnight script's audit/replenish pass generates the next wave.
