# BACKLOG — Autonomous continuous development

> Single source of truth for what to build next. Open (⬜) tasks only; finished work lives in `COMPLETED.md` (newest first).
>
> - `make progress` — top-priority ⬜, full Definition of Done, commit+push, then add new tasks for problems found.
> - `make task` — same one-task unit, but skips step 6 (no new tasks added).
> - `make mvp` — picks from `## MVP presentation spine` (now complete), skips step 6.
> - `scripts/run-overnight.sh` — runs the `make progress` unit on a loop; when the queue empties it audits + replenishes; halts on red pipeline, time budget, or interrupt.
>
> Goal: secure, stable, polished, GDPR-compliant multi-tenant SaaS for Romanian asociații de proprietari with 2FA auth and robust handling of real building problems. The Telegram bot is **deferred** (see `## Deferred (post-MVP)`).

---

## MVP milestone — complete ✅

MVP spine + three-stage deployment (PROD/DEV/DEMO) are done and green; archived in `COMPLETED.md`. Open queue is led by GDPR / security / feature work and the live-activation follow-ups.

---

## Protocol — common steps

Do these steps, in order, every time (any of the three triggers):

0. **Sync with main.** `git fetch origin main && git pull origin main` before reading any file or writing code.
1. **Pick the task.** Topmost `⬜` whose prerequisites are met. If pipeline is red, fixing it *is* the task and outranks everything. Source queue depends on trigger (see table).
2. **Re-establish only what this task needs.** Relevant `RESUME.md` §0 status, relevant `FEATURES.md` row (if feature), relevant code. Read a doc only if the task touches its domain. Match existing conventions exactly.
3. **Implement fully.** No TODOs, no placeholders, no commented-out code. Per-feature pattern: logic module → Zustand demo store (seeded from `src/shared/demo/demoData.ts`) → feature page → `registry.ts` toggle to `implemented` → route → `/command` bot help (deferred) → RO/EN locales → unit test → one E2E happy path. UI fully bilingual, premium-feel.
4. **Verify — all must be green.** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run build:pi`, `npm run build:demo`. Never weaken or delete a test to pass it. Overnight script re-runs the pipeline and halts on red.
5. **Update docs.** Mark task `✅`, move heading + done-note to top of `COMPLETED.md` (newest first). Update `FEATURES.md` (if feature) and `RESUME.md` §0 (counts, date, last task).
6. **Feed the loop (only `make progress`).** Every problem detected (bug, security gap, fragile code, missing test, a11y/UX/perf issue, tech debt) and every worthwhile improvement → new `T##` task inserted at its priority position in the queue, with `[P#]` tag.
7. **Commit + push to `main`.** One focused conventional commit (`feat(...)` / `fix(...)` / `chore(...)` / `docs(...)`), ending with the `Co-Authored-By` trailer. Work directly on `main`.
8. **Stop.** One task per trigger. Overnight script handles repetition.

### Trigger variants

| Trigger | Step 1 source | Step 6 (feed loop) |
| --- | --- | --- |
| `make progress` | `## Main queue` (top ⬜) | Yes — add new tasks |
| `make task` | `## Main queue` (top ⬜) | No — queue stays same size |
| `make mvp` | `## MVP presentation spine` (now empty → falls through) | No |

### Priority rubric

- **P0 — Critical:** unsafe for real residents — security holes, data-loss or privacy risks, red pipeline, GDPR/legal blockers, tenant-isolation gaps.
- **P1 — High:** core stability/robustness, auth, finishing committed features, work that unblocks other tasks.
- **P2 — Normal:** polish, performance, accessibility, SaaS platform capabilities, quality-of-life UX.
- **P3 — Later:** speculative/optional enhancements.

When two tasks share a priority: prerequisites first, then smallest-safe-step.

### Hard rules

- Never use the em dash character (`—`) in code or docs. (This file uses it; new entries should avoid it.)
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

> Sorted by priority, highest on top. `make progress` takes the topmost `⬜` whose prerequisites are met.

## MVP presentation spine — complete (see COMPLETED.md)

## Three-stage deployment (PROD / DEV / DEMO) — complete (see COMPLETED.md)

## MVP live-activation follow-ups

> Require external provisioning (Supabase, env vars, deployed functions). Documented, not blockers.

### ⬜ T130 — [P2] Link admin-initiated F04 threads to the resident's account
Surfaced building the F04 inbox: when the administrator starts a thread toward an apartment, the resident party is recorded from the embedded `persons` list (person id + name), which is fine for demo but in live mode will not equal the resident's `auth.uid()`, so the targeted resident would not see the thread under the party-or-admin RLS. Once occupants are account-linked, set `resident_user_id` to the linked account (or leave it pending until the resident claims the apartment) so an admin-initiated conversation reaches the right inbox. Prereq: T117 (persons ↔ `apartment_residents` reconciliation).

### ⬜ T127 — [P2] Live activation: notifications fan-out (`notifications` under RLS + channels)
Surfaced building T126: the in-app inbox runs offline first; live, persist `notifications` rows + read-state under RLS (owner-scoped read/update, scoped by `asociatie_id`) and hydrate on mount, behind `isSupabaseConfigured` with the T126 local store as the offline fallback. Reuse the same write to fan out across the email (T14) channel (and Telegram once T15 is unfrozen) honouring the resident's notification preferences and the consent gate (T26). Requires a provisioned project; document the apply steps. Prereq: T126; coordinates with T14, T26.

### ⬜ T80 — [P2] Live activation: wire the attribution-free tally functions for F09/F15/F13 results
T38 added the `security definer` aggregate functions `survey_tally` / `poll_tally` / `priority_ranking_turnout` so members can see poll/survey/ranking results without reading each other's individual rows, but nothing calls them yet (demo computes tallies client-side from the Zustand store, and the live path for F09 Voturi / F15 Sondaje / F13 Priorități is not built). When the live read path for those features lands, call these RPCs to render results (since under the new RLS a member can no longer read other rows), add the `grant execute ... to authenticated` the live API needs, and extend `poll_tally` (or add a sibling) to aggregate **ranked** polls from `ranked_options` jsonb (it currently covers only the `selected_option_ids` poll types). Behind `isSupabaseConfigured`, demo keeps the client-side tally. Requires a provisioned project. Prereq: T38; coordinates with T57.

### ⬜ T72 — [P2] Live activation: server-side erasure execution + retention cleanup
T06 files erasure requests and marks an erased-id offline, but the actual cross-store mutation (delete/anonymize/retain per `ERASURE_PLAN`) and the periodic purge of expired records (per `RETENTION_POLICY` windows) must run server-side with the service role. Add a scheduled Supabase routine / Edge Function that, on a completed erasure, applies the plan across the subject's rows (anonymizing to `ANONYMIZED_NAME`, retaining votes/financial/consent/security), and a cron that purges records past their retention window, behind `isSupabaseConfigured`. Document the apply steps. Requires a provisioned project. Prereq: T06. See `DATA_RETENTION.md`.

### ⬜ T76 — [P2] Live activation: deliver the breach resident notice + record breach events in the audit stream
T22 generates the art. 34 resident notice as a downloadable text and logs the breach append-only, but on a high-risk breach the notice should actually reach the affected residents. When the notification fan-out lands (email T14), dispatch the art. 34 notice through it as an **essential** security communication (bypassing consent like F03), targeted to the affected residents, and record each breach lifecycle event (recorded / authority-notified / residents-notified / closed) into the unified audit stream (T09) so the breach trail is part of one tamper-evident log. Behind `isSupabaseConfigured`, demo keeps the offline download. Prereq: T22, T14; coordinates with T09. (Telegram delivery folds in when T15 is unfrozen.)

### ⬜ T75 — [P2] Live activation: persist the per-asociație ROPA snapshot + DPA adoption record
T21 generates the art. 30 register and the art. 28 DPA template on the fly and lets the admin download them, but the controller's GDPR accountability evidence should be persisted: a point-in-time snapshot of the register (so the asociație can show what processing it ran on a given date) and a DPA adoption record (version, adopted-at, adopted-by). Add the table(s) under RLS scoped by `asociatie_id` (admin/președinte manage, members read), write a snapshot on demand and on a feature-flag change, and record DPA adoption, behind `isSupabaseConfigured` with the offline generated view as the fallback. Requires a provisioned project. Prereq: T21.

### ⬜ T103 — [P2] Live activation: persist profile + custom fields (`users`/`profile_custom_fields`) + Storage avatar
T11 (F66) keeps the rich profile offline in `profileStore` and the migration extends `users` + adds `profile_custom_fields`, but nothing reads/writes them live yet, and the avatar is an offline data URL. Load the signed-in user's standard profile columns + their `profile_custom_fields` on hydrate, persist edits back under RLS (owner-scoped), and add a Supabase Storage bucket for the profile photo (size/type-capped upload, store the object path in `users.avatar_url`, signed read), behind `isSupabaseConfigured` with the offline store as the fallback. Document the apply steps. Requires a provisioned project. Prereq: T11; coordinates with T28 (hydration) and T89 (the F33 Storage pattern).

### ⬜ T106 — [P2] Live activation: persist the per-resident home layout (`home_layouts`)
T12 (F67) keeps each resident's home layout offline in `homeLayoutStore` and the migration adds the owner-RLS `home_layouts` table, but nothing reads/writes it live yet. Load the signed-in resident's layout for the active asociație on hydrate and persist edits back under RLS (owner-scoped, the ordered `cards` jsonb), behind `isSupabaseConfigured` with the offline store as the fallback, so a personalized home truly follows the resident across devices. Reconcile the loaded layout against the asociație's live enabled features (`reconcileLayout`) exactly as the offline path does. Requires a provisioned project; document the apply steps. Prereq: T12; coordinates with T28 (hydration) and T56 (live feature flags).

---

## Main queue

### ✅ T179 — [P0] Hide signup form when invite token is invalid + remove self-service create-asoc CTA on `/configurare-cont`
Scanning an invalid/expired/used/revoked invite still renders the full name+email+password form, the (disabled) submit button, and a "Creează o nouă asociație" link at the bottom, even though the server RPC would reject any submit. The UX implies the form is fillable and offers a self-service escape into `/onboarding`. Restructure `AccountSetupPage` so an invalid `tokenError` renders an error-only state (icon + headline + status-specific `setup.err_<status>` body + new `setup.contactAdmin` guidance + the existing login link), with no form inputs and no create-asoc link. Remove the create-asoc CTA unconditionally; new asociatii are only minted by the platform superadmin (`provision-asociatie` Netlify function), so a self-service link on the signup page is a security/business-model leak. Add a pure `isInvalidTokenState(resolved, resolving, isLive)` helper in `accountSetupLogic.ts` with unit tests; add `setup.invalidTitle` + `setup.contactAdmin` strings in RO + EN. Pairs with T180; can ship independently.

### ✅ T180 — [P0] Gate `/onboarding` so only a provisioned admin can run the wizard in PROD
The `/onboarding` route at `src/app/router.tsx:159` currently has no guards. Any user (authenticated or not) who knows the URL, or who clicks the bottom-of-`/configurare-cont` link (removed in T179), runs `OnboardingWizard` and calls `createLocalAsociatie`, ending up in `/app/admin/apartamente` with a self-minted local tenant. In PROD the only legitimate entry is the post-redeem redirect from a successful `admin_setup` invite. Wrap the route in `RequireAuth` plus a new `RequireOnboardingEntry` guard that, in PROD, requires an `admin` membership on a placeholder asociatie (`name === '(de completat)'`, the value `netlify/functions/provision-asociatie.ts` writes); DEV/DEMO pass through to preserve Pi + demo bootstrap. Update `RequireAsociatie` so in PROD a member-less user is sent to `/` with a "no valid invitation, contact platform team" toast instead of bouncing into `/onboarding`. Add a defensive in-component PROD guard inside `OnboardingWizard`. Extract the placeholder name + the gate predicate to a pure `src/features/onboarding/onboardingGateLogic.ts` (`PROVISIONAL_ASOCIATIE_NAME` constant + `findProvisionalAdminMembership`) with unit tests. Prereq: T179 recommended (shared rationale), but this task can ship first.

### ⬜ T78 — [P2] Erasure/export must cover Storage photo objects (pets/bikes/lending/visitors)
T73's export carries photo `photo_path` references as metadata, and `ERASURE_PLAN` deletes the pets/bikes/lending listings, but the actual uploaded photo objects live in Supabase Storage. The server-side erasure execution (T72) must also delete those Storage objects for the subject (pets, bikes, lending items, visitor-report photos) so an erased resident's images do not remain, and the export could optionally include signed links to them. Behind `isSupabaseConfigured`; folds into T72's server-side erasure routine. Prereq: T73, T72.

### ✅ T101 — [P3] Label each export section's asociație for a multi-asociație resident
Surfaced in T77: the export now gathers tickets + discussions across all the subject's memberships, but the `DataSubjectExport.subject` still names a single `asociatie` and the offline `apartment` is single-tenant, so a resident in more than one asociație gets a union of rows without a clear per-row indication of which asociație each ticket/thread (and each flat-store listing) belongs to. For a fully self-describing art. 15 copy, either add an `asociatie` column to the rows that carry an `asociatie_id` or group the export by asociație (a per-tenant subject block), and surface the resident's apartment per asociație rather than only the demo one. Keep `collectPersonalData` pure. Prereq: T77.

### ✅ T109 — [P3] Catch features that should declare a ROPA processing override but don't
Surfaced in T74: the new `ropaLogic` guard proves every declared `FeatureDef.processing` override is well-formed and that an override-free feature inherits its category default verbatim, but it cannot catch the inverse risk — a feature whose *real* processing differs from its category default yet declares **no** override, so it silently misstates its art. 30 profile (e.g. a future financial feature filed under a non-financial category inheriting `legitimate`/`active` instead of `legal`/`legal10y`). Add a semantic safety net: either a heuristic guard (a feature whose data categories include `financial` must not resolve a non-legal/contract basis; a `consent`-basis feature must list `optional`; etc.) or a lightweight per-feature `processingReviewed: true` acknowledgement so a newly-added implemented feature fails the suite until its ROPA profile is deliberately reviewed. Keep it backend-free. Prereq: T74.

### ✅ T29 — [P1] Live recovery-code login (server routine)
2FA recovery codes are generated, hashed and stored (`mfa_recovery_codes`, T02) and fully work in demo mode, but in the live path a recovery code cannot client-side step a session up to AAL2 — Supabase grants AAL2 only via an MFA verify. Add a privileged server routine (Supabase Edge Function using the service-role/admin API) that verifies a submitted recovery code against the stored hash, consumes it single-use, and completes the second factor, then wire `verifyChallenge`'s live branch to it. Until then a privileged user who loses their authenticator is locked out in production. **Reuse the `session_elevations` table + Custom Access Token Hook elevation primitive from T141/T142** (the same "service-role function verifies an app-managed secret, then elevates the session via the `app_2fa_at` claim") rather than inventing a second mechanism. Prereq: T02, T28; build after T141/T142.

### ✅ T32 — [P1] Server-side auth-policy parity
T03's password strength/breach policy and login throttle run client-side, so they harden the UX but are bypassable by a direct API call. Bring the backend into line: enable Supabase Auth's minimum-password-length and leaked-password (HIBP) protection, confirm/raise the server-side auth rate limits, and document the exact dashboard settings in `.env.example` and `SECURITY.md` (the latter lands with T04). The client policy stays as the first line; the server becomes the authority. Prereq: T01, T03.

### ✅ T33 — [P2] Server-backed login lockout
The T03 login lockout state lives in `localStorage` (so a temporary lock survives reload), but a determined attacker can clear it between attempts. Once a backend is provisioned, record failed-attempt counters server-side (keyed by account, behind RLS or an Edge Function) so the lockout cannot be reset client-side, and reconcile it with the client throttle. Prereq: T03, T28.

### ✅ T81 — [P2] Server-side MFA challenge attempt limiting (parity)
The T31 MFA challenge throttle lives in `localStorage` (persisted so a reload can't reset it), but like the T33 login lockout it can be cleared client-side between attempts. Once a backend is provisioned, enforce the second-factor attempt limit server-side — confirm/raise Supabase Auth's MFA verify rate limits and, for the recovery-code path, count and lock failed attempts in the privileged server routine (the T29 recovery verify) so the brute-force budget cannot be reset from the browser. Reconcile with the client `challengeThrottle`. Behind `isSupabaseConfigured`; coordinate with T29 (live recovery) and T33 (server-backed login lockout). Prereq: T31, T29.

### ✅ T142 — [P2] Live activation: service-role functions for email/Telegram OTP (request + verify, elevate session)
Surfaced building the easier-2FA channels (decision in `DECISIONS.md`): the repo's **first service-role Netlify functions**. Add `_shared/supabaseAdmin.ts` (service-role client, new env `SUPABASE_SERVICE_ROLE_KEY` documented in `.env.example`/`SECURITY.md`) and `_shared/resend.ts` (`sendEmail` over `https://api.resend.com/emails` using the already-configured `RESEND_API_KEY`/`RESEND_FROM_EMAIL`, never logging the recipient or code, RO/EN templates by `users.locale`). `mfa-otp-request.ts`: bearer-auth the caller (`getUser()` gives the trusted `user_id` + `session_id`; never trust client-supplied ids), enforce server-side resend cooldown + an issue ceiling, verify the channel is enabled, mint code (+ confirm token for email) and insert the hashed `mfa_otp_challenges` row, then deliver — email via Resend (code + `${residentAppUrl}/confirma-2fa?token=...` link) or Telegram via the existing `telegram.sendMessage(telegram_user_id, ...)` against the `telegram_users` row. `mfa-otp-verify.ts`: bearer-auth, pick the freshest non-consumed non-expired challenge, constant-time hash compare (or confirm-token for the link path), increment `attempts` and lock after N (only a wrong code counts, mirroring `mfaStore.verifyChallenge`), on match mark `consumed_at` and upsert a `session_elevations` row for the caller's `session_id`. No secrets/PII in logs. Requires a provisioned backend + the hook enabled (T141); document the apply steps. Prereq: T140, T141. **Telegram delivery half of this folds into the Deferred work — keep the email path independent.**

### ✅ T143 — [P2] Live activation: wire mfaStore to the OTP functions + claim-aware enforcement
Surfaced building the easier-2FA channels: wire the live branches behind `isSupabaseConfigured`. `requestOtp`/`verifyOtp` call the T142 functions; on a successful verify the client `await supabase.auth.refreshSession()` to pick up the `app_2fa_at` claim minted by the Custom Access Token Hook. `challengeRequired()` reads `app_2fa_at` from the refreshed access token (decode the JWT payload client-side for the gate only; the authoritative check stays server-side) in addition to the native AAL, and feeds both `aalSatisfied` and the new `app2faSatisfied` axis into `mfaEnforcementRedirect` (the axis already exists from T139). `loadChannels`/`enableChannel`/`disableChannel` read/write `mfa_channels` (Telegram enable verifies a linked `telegram_users` row — gated until T15 is unfrozen). Demo path unchanged as the offline fallback. Requires a provisioned project. Prereq: T142, T28.

### ✅ T144 — [P2] Live activation: server-side OTP attempt-limit parity (folds into T81)
Surfaced building the easier-2FA channels: the client per-channel `otpThrottle` (T140) is clearable client-side, like the T33 login lockout and the T81 MFA-challenge throttle. The authoritative limit must be the server: confirm the `mfa-otp-verify` attempt counter + lockout (T142) cannot be reset from the browser and reconcile it with the client `otpThrottle`, alongside the recovery-code (T29) and login (T33) server lockouts so all second-factor brute-force budgets are server-held. Behind `isSupabaseConfigured`. Prereq: T142; coordinates with T81, T29, T33.

### ✅ T113 — [P3] Carry a return-to through the AAL2 step-up
Surfaced in T112: when a re-gated session completes the in-app step-up on the security page it navigates to `/app`, dropping whatever deep route it was originally headed for (the path `useMfaEnforcement` redirected it away from). Capture the originally-requested location when the gate steers a session to `/app/securitate` (e.g. via router `state` or a stored `from`) and, after a successful step-up, return the session there instead of the home route, so the 2FA re-gate is transparent. Keep the redirect decision pure. Behind `isSupabaseConfigured`; demo stays ungated. Prereq: T112.

### ✅ T14 — [P1] Email notification channel (live)
Wire the real email channel into the notification fan-out (Supabase/SMTP), bilingual templated emails, respecting per-user channel preferences and quiet hours (urgent/alert bypasses). Unsubscribe + preference management.

### ✅ T16 — [P1] Realtime updates
Live updates via Supabase Realtime under RLS for announcements, tickets, votes, and chat surfaces, with optimistic UI and graceful reconnection. Falls back cleanly in demo mode.

### ✅ T26 — [P1] Consent-gate enforcement in the fan-out
When the live notification channels land (T14 email; Telegram T15 is deferred), make every non-essential dispatch path call `mayNotify` (the T05 gate) and add tests proving a resident who refused a category receives nothing of that kind while essential alerts (F03) always go through. Prereq: T14.

### ✅ T88 — [P2] F33 real file upload, role-gated (offline data-URL; live Storage in T89)
F33 Document arhivă has a page, store and `documents` table (with an unused `storage_path`) but only stores a title, category and free text — there is no real file. Add real document upload so an admin/comitet can upload the building's documents (statut, regulament, contracte cu salubritate/apă/gaz, cadastru) and every member can view + download them, while only admin/comitet can upload or delete. Offline (demo, no backend): persist the file as a size-capped, type-allowlisted base64 data URL in the `documents` store so demo keeps working and a download/open works fully offline; the page shows the upload control only to admin/comitet (`activeRole()`), the download button to everyone. Keep the logic pure + unit-tested, add one E2E and RO/EN strings, and emit a `document.uploaded`/`document.deleted` audit event (extends T09/T85). No backend required. Prereq: T09; coordinates with T51 (role selectors).

### ✅ T89 — [P2] Live activation: Supabase Storage for F33 documents
Wire T88's upload/download to a real Supabase Storage bucket behind `isSupabaseConfigured`: create a per-asociație-scoped bucket (or path prefix), upload on add, store the `storage_path`, serve downloads via signed URLs, and add Storage RLS so admin/comitet write and members read, scoped by `asociatie_id`, with the demo data-URL path as the offline fallback. Fold the document objects into the GDPR Storage erasure scope. Requires a provisioned project; document the apply steps. Prereq: T88; coordinates with T78 (Storage erasure).

### ✅ T104 — [P2] Wire the F66 profile into F28 Parcare + F36 directory (and admin profile view)
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
The T04 Content-Security-Policy uses a `https://*.supabase.co` / `wss://*.supabase.co` wildcard for `connect-src` because the project URL is environment-specific. Tighten it by templating the **exact** `VITE_SUPABASE_URL` origin into the deployed header at build/deploy time (Netlify build plugin or a generated `_headers` file) so only the real project is reachable, and add a `report-to`/`report-uri` directive plus a lightweight collector (Netlify function or Sentry, coordinate with T07) so CSP violations are observed rather than silent. Re-widen `connect-src` when Sentry (T07) or the email channel (T14) need new origins. Prereq awareness: T04 (done), T07.

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

---

## Deferred (post-MVP)

> Tasks parked until the core app ships. The Telegram bot is a Phase-2 feature — code paths are already passive without env tokens, so nothing functional needs gating. Re-enter the queue at their original priority after MVP closeout.

### ⬜ T15 — [P1] Telegram bot go-live
Complete every command/callback handler in `TELEGRAM_BOT.md`, validate Mini App `initData` and webhook secret end-to-end, deploy the Netlify function, add integration tests. Verify `BOT_SETUP.md` is accurate enough for a non-developer.

### ⬜ T58 — [P2] Live activation: Telegram webhook deploy + env (`/start CODE`)
Deploy the Netlify webhook function, set `TELEGRAM_BOT_TOKEN`/secret, register the bot + Mini App, and exercise the T50 linking path live. Requires a bot token + deployment. Coordinate with / folds into T15. Prereq: T50.

### ⬜ T68 — [P2] In-app "Link Telegram" resident surface (mock path, live-ready)
T50 ships the pure linking logic + the local/mock `telegramLinkStore` (a resident-minted per-user link code → `telegram_users` association), but nothing surfaces it in the app yet, so a resident cannot actually start the linking flow from the UI. Add a small "Telegram" card (in the profile/notification settings area, near the channel preferences feeding the T14 fan-out) that mints a per-user link code via `telegramLinkStore.issueLinkCode` (scoped to the active asociație + `activeRole()`), shows the resulting `t.me/<bot>?start=CODE` deep link with copy, displays the established link / an unlink action (`/uita`), and is bilingual + premium-feel. Demo exercises the mock path end-to-end (issue → the bot's `/start CODE` resolves it). Prereq: T50; coordinates with T11 (profile editor) and T14 (notification channels). Live wiring of the bot username + webhook resolution is T58.
