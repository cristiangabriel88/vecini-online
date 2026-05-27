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

> **Run with `make mvp`.** A hand-picked, dependency-ordered set of tasks that make the **real** end-to-end presentation flow work with **real email addresses + real accounts**: superadmin logs in -> creates an admin (name + email) -> the admin's real inbox receives the invite -> admin opens the link, sets a password, onboards -> admin adds an apartment + sends -> the resident's real inbox receives the invite -> resident opens the link, sets a password, onboards. The screens + pure logic for all of this already exist and pass offline; these tasks switch on the **live backend + email delivery**. `make mvp` takes the topmost `⬜` here and does NOT create new tasks. Hardening/validation polish stays deferred in the normal queue below.

### ✅ T169 — [MVP] Live superadmin account + `is_super_admin()` grant verified

### ✅ T92 — [MVP] Server-side privileged provisioning (Netlify function, service role) + wire the superadmin live send

### ✅ T55 — [MVP] Live invite write/consume + real account creation on redemption (admin + resident)
Done: resolve_onboarding_token + redeem_onboarding_token SECURITY DEFINER RPCs (migration 20260527000004), onboardingApi.ts (resolveTokenLive/redeemTokenLive), inviteWriteApi.ts (writeInviteToLive), AccountSetupPage live branch (signUp + redeemTokenLive + hydrate), ApartmentsPage live invite write. 36 new tests. 142 files / 1282 tests / build green. Live smoke pending credentials.

### ⬜ T115 — [MVP] Live Supabase read/write for the apartment registry
`apartmentsApi.ts` already branches on `isSupabaseConfigured` and the `apartments` table + `persons` column + RLS exist, but the live path has not run against a real backend. Verify and finish it: hydrate on mount, create/update/delete persisting to Supabase, surface a user-visible error on a failed write, and handle the `(asociatie_id, scara, numar_apartament)` unique conflict. The resident invite created when an apartment is added must link to the real apartment id so the resident lands in the right place. Prereq: T55, T168.

### ⬜ T149 — [P2] Live activation: Resend delivery webhook -> stamp `invite_email_delivered_at`
Surfaced building T147: the migration carries an `invite_email_delivered_at` column and the offline model an `emailDeliveredAt`, but nothing sets it (offline only stamps `emailSentAt`, and live there is no delivery callback yet). Add a Resend webhook receiver (Netlify function, signature-verified) that, on an `email.delivered`/`email.bounced` event for an invitation, updates the matching `invite_codes` row's delivery marker via the service role so the invites surface can show delivered vs. bounced rather than only "sent". Behind `isSupabaseConfigured`; document the webhook registration step. Prereq: T147, T142.

### ⬜ T117 — [P2] Reconcile embedded `persons` with account-linked `apartment_residents`
Surfaced in T114: occupant names live embedded on the apartment (`persons` jsonb) for admin pre-account configuration, while `apartment_residents` holds account-linked residency keyed by `user_id`. Once residents enrol (via invite code, T55), define how an embedded person is matched/linked to a real `apartment_residents` row so the two views do not drift (e.g. link on accept, mark a `persons` entry as claimed). Prereq: T114, invite acceptance live path.

### ⬜ T135 — [P2] Cross-origin redirect: bounce a superadmin off the resident origin to the platform subdomain
Surfaced in T134: the main app now routes a server-verified platform superadmin to the in-app `/app/platforma` preview, which is correct for demo + the single-build dev path. In the **live separate-origin deployment** (T20/T93), a superadmin who authenticates on the resident/admin origin should instead be redirected to the dedicated platform subdomain (the real, server-authoritative console with its own CSP + `RequirePlatformAdmin`). Add an optional configured `VITE_PLATFORM_URL`; when set and the hydrated session is a platform superadmin, `AppHome`/`RequireAsociatie` perform a full-page redirect to it rather than rendering the in-app preview. Falls back to the in-app `/app/platforma` when unset (so demo + dev are unchanged). Keep the routing decision in the pure `resolveAsociatieRoute` (add the target host as input). Prereq: T134, T20.

### ⬜ T138 — [P2] Live-wire the F05 comitet inbox through the privacy-preserving functions
Surfaced in T137: `anonymous_messages` no longer grants the comitet any direct table read, so when F05 gets a live Supabase path the comitet inbox must call `anonymous_messages_for_comitet(asociatie)` (sender-less read) and `set_anonymous_message_status(id, status)` (status-only triage) via `supabase.rpc(...)` rather than selecting/updating the table, and the resident's own-message read/export must go through the kept `owner manage` policy. Add a dual-mode `anonymousApi` (offline store + live RPC, mirroring `apartmentsApi`/`auditStore`) and wire `AnonymousPage` to it when `isSupabaseConfigured`. Keep the offline store as the demo path unchanged. Prereq: T137, a provisioned backend (T08).

### ⬜ T167 — [P3] Keep the triage-row actions usable on a narrow viewport
Surfaced in T162: each feature-request triage row on `FeaturesAdminPage` now carries two actions ("Respinge" + "Activează") in a `flex shrink-0` group to the right of the requester name/count, which can crowd the row on a phone-width screen (the long requester-names line is already truncated, but two buttons plus the icon leave little room). Make the row layout responsive: let the actions wrap below the meta on narrow widths (or stack the row vertically under a breakpoint), keeping both buttons fully tappable per the premium-feel + accessibility bar. UI-only, backend-free; no logic change. Prereq: T162.

### ⬜ T164 — [P3] Seed the new invitee's profile locale from the active UI language
Surfaced in T146: the offline `seedProfile` written on account creation defaults `locale` to `'ro'` (via `emptyProfile`), regardless of the language the invitee actually used to complete the setup landing. A resident who set up their account with the UI in English still gets a `ro` profile locale, which would mis-target their bilingual notifications/emails once those honour the per-user locale. Pass the active i18n language (`i18n.language`, narrowed to a `Locale`) into `seedProfile` from `AccountSetupPage` so the new account's profile locale matches the language they chose. Trivial, backend-free, offline; the live equivalent folds into T55 (account creation) / T103 (profile persistence). Prereq: T146.

### ✅ T165 — [P3] Link the shared `Textarea` error to its control with `aria-describedby`

### ⬜ T163 — [P3] Distinguish row warnings from blocking errors in the CSV import summary
Surfaced in T160: `resolveImportBatch` now returns the malformed-email notice in the same `errors` array as the genuinely-blocking notices ("există deja", "duplicat în CSV", parse failures), and `ApartmentsPage` renders them all in one red error list via `setImportErrors` even though the apartment for a bad-email row was still created. So an admin sees a red "error" for a row that actually imported (just without an invite), which overstates the failure. Split the result into blocking `errors` vs. non-blocking `warnings` (the email-invalid notice becomes a warning), and render warnings in a softer amber/info style separate from the red error list, so the summary truthfully reflects "imported, invite skipped" vs. "row rejected". Pure split unit-tested; bilingual RO/EN. Prereq: T160.

### ⬜ T158 — [P3] Remove orphaned `onboarding.import/invite/csv*` locale keys
Surfaced in T154: the wizard lost its CSV-import step (step 1) and bulk-invite step (step 4). Their locale keys (`onboarding.import`, `onboarding.invite`, `onboarding.csvHelp`, `onboarding.csvParsed`, `onboarding.csvError`, `onboarding.inviteEmails`) are no longer consumed by any component. Confirm no other file references them (ripgrep), then remove the dead keys from both `ro.json` and `en.json`. Trivial, backend-free. Coordinates with T145 (the parallel `join.*` cleanup).

### ⬜ T145 — [P3] Remove the now-unused `join.*` locale keys
Surfaced in T124: `JoinAsociatiePage` was superseded by `AccountSetupPage` and deleted, but its `join.*` translation block (`title`/`subtitle`/`codeLabel`/`codeHint`/`submit`/`success`/`err_*`/`createPrompt`/`createLink`) remains in `ro.json` + `en.json` with no consumer, while the new landing uses its own `setup.*` keys. Remove the dead `join.*` keys from both locale files (confirm nothing else references them first) so the locale files do not accumulate orphaned strings. Trivial, backend-free. Prereq: T124.

---

## MVP spine — complete ✅

> The ordered vertical slice that makes one real asociație work end-to-end is **done and green offline** (T27/T28/T41–T54 etc.). All spine tasks are archived in `COMPLETED.md`; their live-activation follow-ups are the section below.

---

## MVP live-activation follow-ups (documented, NOT blockers — do after the local loop is green)

> Each requires external provisioning (a Supabase project, env vars, a deployed function, a registered bot) and so must never block overnight progress. They layer the live path onto a slice whose local/demo version already works.

### ⬜ T56 — [P2] Live activation: per-asociație feature flags read/write (`asociatie_features`)
Load the active asociație's flags from `asociatie_features` on hydrate and persist admin toggles back, behind `isSupabaseConfigured`, with the T43 local store as the offline fallback. Prereq: T43.

### ⬜ T57 — [P2] Live activation: content slices read/write Supabase (Anunțuri / Discuții / Sesizări)
Wire the T47/T48/T49 stores to read/write `announcements` / `discussion_threads`+`discussion_messages` / `tickets` under RLS, scoped by `asociatie_id`, behind `isSupabaseConfigured`, demo store as fallback. Prereq: T47, T48, T49.

### ⬜ T129 — [P2] Live activation: F04 private messaging read/write Supabase
Surfaced building the F04 role-aware inbox: `adminChatApi.ts` already branches on `isSupabaseConfigured` (hydrate `private_threads` + nested `private_messages`, mirror create/reply/markRead/toggleStatus) and migration `20260525000002_private_threads_inbox.sql` aligns the schema and installs the party-or-admin RLS (a resident reads only their own threads; admin/președinte read all in the asociație). The live path has never run against a real backend. Apply the migration, verify hydration + each mutation under RLS for both a resident JWT and an admin JWT, harden the best-effort mirrors (surface a user-visible error on a failed write), and add a live E2E that proves a resident cannot read another resident's thread. Behind `isSupabaseConfigured`, demo store stays the offline fallback. Prereq: F04 rework; coordinates with T57, T08.

### ⬜ T130 — [P2] Link admin-initiated F04 threads to the resident's account
Surfaced building the F04 inbox: when the administrator starts a thread toward an apartment, the resident party is recorded from the embedded `persons` list (person id + name), which is fine for demo but in live mode will not equal the resident's `auth.uid()`, so the targeted resident would not see the thread under the party-or-admin RLS. Once occupants are account-linked, set `resident_user_id` to the linked account (or leave it pending until the resident claims the apartment) so an admin-initiated conversation reaches the right inbox. Prereq: T117 (persons ↔ `apartment_residents` reconciliation).

### ⬜ T58 — [P2] Live activation: Telegram webhook deploy + env (`/start CODE`)
Deploy the Netlify webhook function, set `TELEGRAM_BOT_TOKEN`/secret, register the bot + Mini App, and exercise the T50 linking path live. Requires a bot token + deployment. Coordinate with / folds into T15. Prereq: T50.

### ⬜ T127 — [P2] Live activation: notifications fan-out (`notifications` under RLS + channels)
Surfaced building T126: the in-app inbox runs offline first; live, persist `notifications` rows + read-state under RLS (owner-scoped read/update, scoped by `asociatie_id`) and hydrate on mount, behind `isSupabaseConfigured` with the T126 local store as the offline fallback. Reuse the same write to fan out across the email (T14) and Telegram (T15) channels honouring the resident's notification preferences and the consent gate (T26). Requires a provisioned project; document the apply steps. Prereq: T126; coordinates with T14, T15, T26.

### ⬜ T128 — [P2] Token-security hardening: hash onboarding/invite tokens at rest
Surfaced reviewing the onboarding data flow (D1): the secure tokens from T123 must never be stored in plaintext live. Store the onboarding/setup + invite tokens **hashed at rest** (the link carries the only plaintext copy), look them up in constant time, **rate-limit redemption attempts** (per token + per IP), and **audit each redemption** into the T09 stream. Behind `isSupabaseConfigured`; the offline demo keeps its local token. Requires a provisioned project; document the apply steps. Prereq: T123; coordinates with T55, T92, T86 (audit chain).

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

### ⬜ T08 — [P1] E2E suite green + CI
Install Playwright browsers, make `tests/e2e` pass (smoke + per-feature happy paths), and add specs for auth + 2FA + tenant isolation. Wire a CI workflow that runs lint/typecheck/unit/build/E2E on push. Once done, E2E joins the per-task gate.

### ⬜ T14 — [P1] Email notification channel (live)
Wire the real email channel into the notification fan-out (Supabase/SMTP), bilingual templated emails, respecting per-user channel preferences and quiet hours (urgent/alert bypasses). Unsubscribe + preference management.

### ⬜ T15 — [P1] Telegram bot go-live
Complete every command/callback handler in `TELEGRAM_BOT.md`, validate Mini App `initData` and webhook secret end-to-end, deploy the Netlify function, add integration tests. Verify `BOT_SETUP.md` is accurate enough for a non-developer.

### ⬜ T16 — [P1] Realtime updates
Live updates via Supabase Realtime under RLS for announcements, tickets, votes, and chat surfaces, with optimistic UI and graceful reconnection. Falls back cleanly in demo mode.

### ⬜ T26 — [P1] Consent-gate enforcement in the fan-out
When the live notification channels land (T14 email, T15 Telegram), make every non-essential dispatch path call `mayNotify` (the T05 gate) and add tests proving a resident who refused a category receives nothing of that kind while essential alerts (F03) always go through. Prereq: T14, T15.

### ⬜ T111 — [P2] Drop `super_admin` from the per-asociație `memberships` role check (offline)
Surfaced in T91: now that the platform tier lives in `platform_admins` + `is_super_admin()` (not a per-asociație role), the `memberships.role` check constraint in `20260121000001_init_core.sql` still lists `'super_admin'` as an allowed value, so a `super_admin` could in principle be granted as a tenant membership — a second, weaker source of truth for the platform role that bypasses the `platform_admins` roster. Add an additive, idempotent migration that drops+recreates the `memberships` role check without `'super_admin'` (the remaining tenant roles unchanged), audit `hydrationLogic`/`ROLE_RANK` + any `has_role(..., array[... 'super_admin'])` for stale references, and update the `Role`-vs-membership-role split if needed (the `Role` type can keep `super_admin` for the platform tier; the membership role enum should not). Backend-free migration + parse-based regression test that no membership role check admits `super_admin`. Prereq: T91.

### ⬜ T100 — [P1] Mandatory hardened MFA for super_admin accounts
With only two superadmins guarding the platform, a stolen password must never be enough. Enforce mandatory MFA for any `super_admin` session — un-enrolled superadmins are steered to enrollment and cannot reach the console until a second factor is set, the factor cannot be disabled while the role is held, and the login challenge is required every session. Reuse the T02 `mfaLogic`/`mfaStore` and the T31 challenge throttle; document that the superadmin origin additionally carries the tightest CSP / access controls. Breaks down T20. Prereq: T91, T02. Note (from T93): the platform login (`src/platform/PlatformLoginPage.tsx`) currently signs in without an MFA challenge step; wiring the challenge into the platform login + gate is part of this task.

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
