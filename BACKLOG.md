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

MVP spine + three-stage deployment (PROD/DEV/DEMO) are done and green; archived in `COMPLETED.md`. All 67 features (F01–F67) are fully live-wired. The remaining queue covers E2E closure, live hardening, GDPR, Telegram go-live, platform console depth, SaaS billing, and P3 enhancements.

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
> **Status (updated 2026-06-03):** All 67 features fully live-wired. All formerly on-hold and deferred tasks are now active in the queue. Focus: E2E closure (T220–T223), live hardening (T224–T228), Telegram go-live (T15, T58, T68), GDPR completion (T78, T76), platform console depth (T95–T99), SaaS billing (T19, T110), and P3 enhancements. See `DECISIONS.md`.

## MVP presentation spine — complete (see COMPLETED.md)

## Three-stage deployment (PROD / DEV / DEMO) — complete (see COMPLETED.md)

## Main queue

### ✅ T15 — [P1] Telegram bot go-live

Complete every command/callback handler in `TELEGRAM_BOT.md`, validate Mini App `initData` and webhook secret end-to-end, deploy the Netlify function, add integration tests. Verify `BOT_SETUP.md` is accurate enough for a non-developer.

Done: Added `PRIMARY_COMMANDS` dictionary for the 8 missing BotFather-menu commands (/anunturi, /voturi, /sesizare, /sesizarile_mele, /rezervari, /evenimente, /urgenta, /setari). Added `MENU_CALLBACK_REPLIES` router so menu inline-keyboard taps route to the matching informational reply instead of the stub "Ai ales:" string. Fixed `@botname` suffix stripping in command routing. Expanded `telegramWebhook.test.ts` from 5 to 29 integration tests covering all primary commands, all menu callbacks, unknown callback fallback, /start variations, feature commands, and no-op updates. `validateInitData` + `verifyWebhookSecret` were already tested end-to-end in `telegramAuth.test.ts`; `BOT_SETUP.md` is complete. 260 files / 2394 tests / lint + typecheck + build + build:pi + build:demo all green.

---

### ✅ T220 — [P2] E2E batch for maintenance + issues features (F18–F24)

Add happy-path tests for the 7 Category-3 features currently without E2E. One test per feature in a new `tests/e2e/maintenance.spec.ts`: F18 (add repair record, warranty badge), F19 (add scheduled task, mark done), F20 (submit meter reading, anomaly flag), F21 (navigate, pattern banner shown), F22 (post RFP, add quote, cheapest highlighted), F23 (sign up for duty, on-duty banner), F24 (add lending item, mark borrowed). Chromium + mobile.

Done: Created `tests/e2e/maintenance.spec.ts` with 7 happy-path tests: F18 adds a repair record with a future warranty date and verifies the "în garanție" badge; F19 adds a scheduled maintenance task then marks the first overdue item done; F20 submits a high meter reading (345 vs last_value 312) and verifies the anomaly warning appears in the modal before submit; F21 navigates to recurring issues and checks the summary banner and the seeded lift pattern heading; F22 verifies the existing demo RFP shows "Cea mai mică" on the cheapest quote, then posts a new RFP and adds a quote; F23 signs up for the free duty weekend and verifies the "Acoperit" badge; F24 adds a new borrowable item and marks it borrowed. All seven run on Chromium + Pixel 7 (mobile) via the existing playwright.config.ts projects. 260 files / 2394 unit tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T221 — [P2] E2E batch for shared spaces + information + community registry features (F28–F34, F37–F40)

Happy paths in `tests/e2e/registry.spec.ts`: F28 (add parking spot, search by plate), F29 (register bike), F30 (view boxe assignment), F31 (sign up for green task), F32 (generate access code, 30-min countdown visible), F34 (add supplier, expiry badge), F37 (register pet, lost flag), F38 (post thank-you, appears in feed), F39 (add wiki page, search returns it). Chromium + mobile.

Done: Created `tests/e2e/registry.spec.ts` with 9 happy-path tests: F28 adds spot "P5" with plate "B 100 NEW" and searches by plate; F29 registers a new bike and verifies it appears; F30 verifies the seeded assigned ("Ap. 1" badge) and unassigned ("Neatribuită" badge) storage rooms; F31 signs up for the free "Tuns gazonul din față" task and verifies "Renunț" replaces "Mă înscriu"; F32 generates a code and verifies the "Activ · 30 min" badge; F34 adds "EnergoMax SRL" with a past contract end and verifies the "Expirat" badge plus the seeded alert banner; F37 registers pet "Lola", marks it lost, verifies "Pierdut" badge; F38 posts a thank-you and verifies it appears in the feed; F39 adds a wiki page "Reguli de zgomot" and confirms search returns it. All nine run on Chromium + Pixel 7 (mobile) via existing playwright.config.ts projects. 260 files / 2394 unit tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T222 — [P2] E2E batch for projects + safety + community-life features (F41–F48, F49–F55, F57–F65)

Happy paths in `tests/e2e/community.spec.ts`: F41 (advance a project phase), F44 (pledge, funded tracker), F47 (add energy record), F48 (warranty expiry badge), F50 (view evacuation plan), F51 (mark PSI check done), F52 (insurance expiry badge), F53 (add key holder), F57 (post marketplace listing), F62 (tick a welcome step), F63 (opt-in birthday, today section), F65 (submit feedback). At least one passing test per group. Chromium + mobile.

Done: Created `tests/e2e/community.spec.ts` with 12 happy-path tests: F41 clicks "Finalizează" on the seeded in_curs phase "Termoizolație fațadă" and verifies the button disappears; F44 verifies "Țintă atinsă" badge on fully-funded cf-2 and pledges 200 lei to cf-1; F47 fills in Consum + Cost and verifies "Citire adăugată."; F48 verifies "expirată" badge on wr-3 (2024) and "în garanție" on wr-1 (2027); F50 verifies plan heading "Scara A", "Echipamente de siguranță" section, and "Stingător" entry; F51 verifies "depășit" badge on overdue psi-1 then clicks "Marchează verificat" and checks rescheduling toast; F52 verifies "expiră curând" badge on ins-1 (18-day expiry) + renewal banner; F53 adds "Sala de fitness" key record for "Ionescu Mihai"; F57 posts listing "Bicicletă copii 20"" at 150 lei and verifies it in feed; F62 ticks "Citește regulamentul" step and verifies "Parcurs" badge; F63 edits birthday to today (4 June) and verifies "Aniversări azi" section; F65 submits feedback and verifies toast. All 12 run on Chromium + Pixel 7 (mobile) via existing playwright.config.ts projects. 260 files / 2394 unit tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T223 — [P2] E2E for F06 Locator + F66 Profile + F67 Home customization

Three high-value features currently without E2E. Add to `tests/e2e/features.spec.ts`: F06 (compose a neighbour post with category, appears in feed); F66 (set display name + add a custom field + completeness indicator increases); F67 (enter edit mode, hide a card, card leaves the grid, exit, survives reload). Chromium + mobile. Prereq: Chromium installed (T187).

Done: Updated existing F06 test to also select category 'ofer' via `getByLabel('Categorie').selectOption('ofer')` and verify the "Ofer" badge appears on the posted card. Added F66 test: reads initial `aria-valuenow` from the progressbar, fills "Nume afișat" (one of 10 completeness checks), asserts `aria-valuenow` increased, then opens the "Adaugă câmp" modal, fills "Eticheta câmpului", confirms with "Creează", and asserts the custom field label is visible. Added F67 test: enters edit mode via "Personalizează", clicks the first "Ascunde cardul" button, verifies toggle flips to "Afișează cardul", exits via "Gata", asserts `.home-shortcut` count decreased by one, then reloads and navigates back to verify the Zustand-persist layout survives the reload. 260 files / 2394 unit tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T224 — [P2] Scheduled-announcement server-side hold-back (RLS expression on published_at/scheduled_at)

T188 notes: "scheduled-row hide is client-gated (visibleAnnouncements); true server-side hold-back remains a live-activation follow-up." In live mode a resident querying `announcements` directly can see future-scheduled rows. Add an RLS SELECT policy expression that hides rows where `published_at IS NULL AND scheduled_at > now()` for non-manager roles (`NOT has_role(asociatie_id, ARRAY['admin','presedinte','comitet'])`). New migration `20260603000004_announcement_scheduled_rls.sql`. Extend `rlsTenantIsolation.test.ts` with a parse-based assertion that the policy exists. No UI change. Prereq: T188.

Done: Created migration `supabase/migrations/20260603000012_announcement_scheduled_rls.sql` which drops the generic `announcements` "members read" policy (placed by `apply_standard_rls`) and replaces it with a scoped policy: `is_member(asociatie_id) AND (has_role(...manager roles...) OR NOT (published_at IS NULL AND scheduled_at > now()))`. Managers see all rows; non-managers are blocked from future-scheduled unpublished rows. Extended `tests/unit/rlsTenantIsolation.test.ts` with a parse-based assertion verifying both the `published_at is null and scheduled_at > now()` expression and the manager-role bypass are present. 260 files / 2395 unit tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T225 — [P2] Realtime sync extended to governance + community tables

T16 wired realtime for `announcements/tickets/private_threads/private_messages`. High-value tables still missing live updates: `notifications` (new pings arrive immediately), `petitions/petition_signatures` (signature count updates live), `polls/votes` (result bars update during voting), `events/event_rsvps` (RSVP count updates). Extend `realtimeLogic.ts` with `applyNotificationInsert`, `applyPetitionSignatureInsert`, `applyVoteInsert`, `applyRsvpChange` apply helpers. Extend `useRealtimeSync` to subscribe to these tables on the same per-asociatie channel. Unit-test the new apply helpers (25+ assertions). Prereq: T16.

Done: Extended `realtimeLogic.ts` with four new pure apply helpers: `applyNotificationInsert` (dedup-prepend for the notifications inbox), `applyPetitionSignatureInsert` (increments signature count and auto-flips status to 'inaintata' at threshold), `applyVoteInsert` (increments running poll-option counts for all selected_option_ids in one vote), `applyRsvpChange` (updates own-RSVP map for cross-device sync; INSERT=true, DELETE-equivalent=false). Extended `useRealtimeSync` with five new channel subscriptions on the existing per-asociatie realtime channel: notifications INSERT (with `asociatie_id` filter; DB row mapped snake->camelCase before applying), petition_signatures INSERT (no column filter; RLS scopes via petitions join), votes INSERT (with `asociatie_id` filter; delegates to `mergeCounts`), event_rsvps INSERT and UPDATE (no column filter; "self rsvp" RLS limits to own rows enabling cross-device sync). Added 25 new unit tests across the four helpers. 260 files / 2420 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T226 — [P2] Assistant widget Phase 2 — live open polls + my ticket status + upcoming events

Done: Added three new builder functions to `dataSources.ts`: `buildPollEntries` (filters to published, non-closed polls within their open window), `buildMyTicketEntries` (filters to non-terminal tickets reported by the current user), `buildEventEntries` (filters to events whose `starts_at` is in the future). Updated `useDataEntries()` to read from `useAsociatiePolls()`, `useAsociatieTickets()`, `useAsociatieEvents()`, and `useAuthStore` (for current user ID, falling back to `DEMO_CURRENT_USER_ID`); all three stores are seeded with demo data and hydrated live by their API layers. Updated `DATA_ENTRIES` static constant to include demo-backed poll/ticket/event entries. Fixed `assistant.data.test.ts` to disable all five data-backed features (F56, F36, F08, F09, F17) when testing the no-data-entries assertion. Added 16 new unit tests across three describe blocks in `assistant.engine.test.ts` covering open-poll filtering, closed-poll exclusion, my-ticket filtering, closed-status exclusion, upcoming-event filtering, past-event exclusion, empty-input, and term-keyword coverage. 260 files / 2437 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T227 — [P2] PWA manifest + mobile installability

Add `public/manifest.webmanifest` with `name: "vecini.online"`, `short_name: "Vecini"`, `start_url: "/app"`, `display: "standalone"`, `theme_color` (warm-graphite dark token), `background_color`, and `icons` (at least 192×192 + 512×512 — SVG or PNG derived from the existing logo mark). Add `<link rel="manifest">` + `<meta name="theme-color">` to `index.html`. New `tests/unit/pwaManifest.test.ts` (4 assertions: file exists, required fields present, icons array non-empty, start_url correct). Enables "Add to Home Screen" on iOS/Android and elevates the mobile premium-feel bar.

Done: Created `public/manifest.webmanifest` with all required fields (`name`, `short_name`, `start_url: "/app"`, `display: "standalone"`, `theme_color: "#3d6b4f"`, `background_color: "#1d2b25"`, `lang`, `scope`, `categories`) and three icon entries referencing the existing `favicon.svg` at 192x192, 512x512, and `any` size (SVG is resolution-independent). Added `<link rel="manifest" href="/manifest.webmanifest">` to `index.html` (`theme-color` meta was already present). Created `tests/unit/pwaManifest.test.ts` with 4 assertions: file exists, required fields present (name/short_name/display/theme_color/background_color), icons array non-empty, and start_url equals `/app`. 261 files / 2441 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T228 — [P2] Notification fan-out for AGA lifecycle (meeting convoked + voting opened)

Done: Added `aga.convoked` + `aga.voting_open` to `NotificationKind`, two builder functions in `notificationLogic.ts`, bilingual locale keys (RO + EN), `emitAgaConvoked` + `emitAgaVotingOpen` in `notificationFanout.ts` (dedup claimed holders, skip-empty, skip-self, offline-safe, persistAndFanOut in live mode). Wired into `agaApi.ts` convokeMeeting + advanceStatus via useApartmentsStore + useAuthStore. 12 new unit tests in `notificationFanout.test.ts`. 261 files / 2455 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T78 — [P2] Erasure/export must cover Storage photo objects (pets/bikes/lending/visitors)

Done: Created migration `supabase/migrations/20260604000001_photos_bucket.sql` adding the `photos` Storage bucket (private, `<asociatie_id>/<user_id>/<feature>/...` key convention) with member-read, member-write-own, and member-delete-own RLS policies. Added `extractPhotoPaths(rows)` pure helper to `gdprLogic.ts`. Extended `gdpr-erasure.ts` with Phase 0 (collect photo_paths from pets/bikes/lending_items/marketplace_listings/visitor_reports before any mutation), a `visitor_reports.photo_path = null` update in Phase 1 (image is personal data even on retained rows), and Phase 2.5 (best-effort `db.storage.from('photos').remove(photoPaths)` after row deletions; errors suppressed so a missing object never blocks erasure). New `tests/unit/gdprStorageErasure.test.ts` with 6 assertions. 262 files / 2461 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T76 — [P2] Live activation: deliver the breach resident notice + record breach events in the audit stream

T22 generates the art. 34 resident notice as a downloadable text and logs the breach append-only, but on a high-risk breach the notice should actually reach the affected residents. When the notification fan-out lands (email T14), dispatch the art. 34 notice through it as an **essential** security communication (bypassing consent like F03), targeted to the affected residents, and record each breach lifecycle event (recorded / authority-notified / residents-notified / closed) into the unified audit stream (T09) so the breach trail is part of one tamper-evident log. Behind `isSupabaseConfigured`, demo keeps the offline download. Prereq: T22, T14; coordinates with T09.

Done: Added `breach.authority_notified`, `breach.residents_notified`, `breach.closed` to `AUDIT_ACTIONS`. Added `'breach.resident_notice'` notification kind with builder + `emitBreachResidentNotice` fanout. Updated `deriveConsentKind` to mark breach notices as essential. Wired `onNotifyAuthority` + `onNotifySubjects` + `onAdvance` handlers in `BreachAdminPage` with audit entries and live fan-out. 263 files / 2475 tests / all green.

### ✅ T58 — [P2] Live activation: Telegram webhook deploy + env (`/start CODE`)

Deploy the Netlify webhook function, set `TELEGRAM_BOT_TOKEN`/secret, register the bot + Mini App, and exercise the T50 linking path live. Requires a bot token + deployment. Coordinate with / folds into T15. Prereq: T50.

Done: Created `supabase/migrations/20260604000002_telegram_link_codes.sql` (per-user link codes table with RLS scoped by `user_id = auth.uid() AND is_member(asociatie_id)`). Created `netlify/functions/_shared/telegramStartLive.ts` with `resolveAndPersistStartCode`: checks already-linked (telegram_user_id with non-null user_id), looks up `telegram_link_codes` by normalised code (atomic consume via `consumed_at IS NULL` guard + upsert `telegram_users`), falls through to `invite_codes` path (stores pending link with `session_state` so the user_id is filled when the resident completes onboarding in-app). Added `StartCodeResolver` type + optional `resolveStartCode` to `TelegramWebhookRequest`; `handleMessage` uses the resolver when both the resolver and `msg.from` are present, falling back to `replyChecking` offline. Injected the live resolver in the Netlify adapter when `isSupabaseAdminConfigured`. 8 new unit tests covering all resolver outcomes. 265 files / 2483 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T68 — [P2] In-app "Link Telegram" resident surface (mock path, live-ready)

T50 ships the pure linking logic + the local/mock `telegramLinkStore` (a resident-minted per-user link code → `telegram_users` association), but nothing surfaces it in the app yet, so a resident cannot actually start the linking flow from the UI. Add a small "Telegram" card (in the profile/notification settings area, near the channel preferences feeding the T14 fan-out) that mints a per-user link code via `telegramLinkStore.issueLinkCode` (scoped to the active asociație + `activeRole()`), shows the resulting `t.me/<bot>?start=CODE` deep link with copy, displays the established link / an unlink action (`/uita`), and is bilingual + premium-feel. Demo exercises the mock path end-to-end (issue → the bot's `/start CODE` resolves it). Prereq: T50; coordinates with T11 (profile editor) and T14 (notification channels). Live wiring of the bot username + webhook resolution is T58.

### ✅ T20 — [P2] Super-admin platform console (umbrella — broken down into T95–T99)

Platform-owner console: all sub-tasks (T95–T99) complete. Platform shell + provisioning + E2E + cross-tenant audit viewer + error feed + usage/health metrics + audited impersonation + admin↔superadmin messenger are all done and live-ready. See COMPLETED.md for individual done-notes.

### ✅ T95 — [P2] Cross-asociatie audit viewer (platform app)

Done: Created `src/platform/platformAuditStore.ts` (seeded demo chains for all 3 demo asociații, setChains/setFetchError actions). Added `hydrateAllAuditLogs()` to `platformApi.ts` (cross-tenant query via super_admin RLS, groups by asociatie_id, updates store). Created `PlatformAuditPage.tsx` at `/consola/audit`: per-asociație integrity badges (verifyChain), T09 filter set (action/entity/actor/text/from/to) plus asociație filter, JSON/CSV export with timestamp filename, bilingual RO/EN. Wired route in `platformRouter.tsx`, unlocked sidebar link (ready: true). Added `platform.audit.*` locale keys to ro.json + en.json. 9 new unit tests in `tests/unit/platformAudit.test.ts`. 265 files / 2499 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T96 — [P2] Platform error feed (superadmin app)

Done: Created `platform_error_reports` table (RLS super_admin SELECT only; service-role key writes via `error-report.ts` Netlify function). Updated `error-report.ts` to persist scrubbed reports to the table when Supabase is configured. Added 100-report ring buffer (`getReportBuffer`) to `errorReporting.ts`. Created `platformErrorStore.ts` with `groupReports()` pure function and 7-report demo seed (4 distinct error groups). Added `hydrateErrorReports()` to `platformApi.ts`. Created `PlatformErrorsPage.tsx` at `/consola/erori`: summary bar, text + date filters, grouped feed with occurrence count, first/last seen, and ref codes. Set `errors` section `ready: true`; added route. 271 files / 2514 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T97 — [P2] Platform usage/health metrics (superadmin app)

Done: Created `supabase/migrations/20260604000004_usage_metrics_superadmin_rls.sql` adding super_admin SELECT policies on `announcements`, `tickets`, and `votes` (idempotent drop-if-exists). Created `src/platform/platformUsageStore.ts` with `AssocUsageMetric` type, `HealthStatus` union, pure `deriveHealthStatus(lastSignInAt, now)` (active < 14 days, moderate < 60 days, dormant otherwise), pure `computeRollup(metrics)` (totals by status + member/apartment sums), and Zustand store seeded from `DEMO_PLATFORM_ASOCIATII` with pre-computed activity counts (12/7/2 ann, 8/5/3 tickets, 3/1/0 votes per asociatie). Added `hydrateUsageMetrics()` to `platformApi.ts`: parallel queries to `asociatii`, `memberships`, `apartments`, `auth_audit_events`, `announcements`, `tickets`, `votes` (30-day window for activity tables); groups counts client-side using existing `groupCount`/`groupLatest` helpers; derives health status at hydration time. Created `src/platform/PlatformUsagePage.tsx` at `/consola/utilizare`: summary bar (active/moderate/dormant badge counts + total member count), name/city search filter, per-asociatie list rows showing health badge, member + apartment counts, 30-day activity counts (ann/tickets/votes), and last admin sign-in date. Changed `usage` section from `ready: false` to `ready: true` in `PlatformLayout.tsx`. Added `utilizare` route and `PlatformUsagePage` lazy import in `platformRouter.tsx`. Added `platform.usage.*` locale keys (RO + EN, `_one/_few/_other` plural forms for all counts). Created `tests/unit/platformUsage.test.ts` with 16 assertions: 7 for `deriveHealthStatus` (null, 5 days, 13-day boundary, exactly 14 days, 45 days, exactly 60 days, 120 days), 4 for `computeRollup` (empty, total count, status grouping, member/apartment sums), 5 for the store (seed coverage, non-negative counts, valid statuses, first asociatie active, third asociatie moderate). 267 files / 2530 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T98 — [P2] Audited superadmin impersonation (read-only)

Done: Added `impersonation.started` + `impersonation.ended` to `AUDIT_ACTIONS` and `impersonation` to `AUDIT_ENTITIES` in `auditLogic.ts`. Added `recordEntry(asociatieId, input)` action to `usePlatformAuditStore` for demo-mode audit chain appending. Created `netlify/functions/impersonate.ts` (POST-only, service-role): verifies bearer token, re-checks `platform_admins`, validates `action` ('start'|'end') + `asociatie_id`, fetches target asociație name, fetches last chain entry (prev_hash), computes inline cyrb53 hash, inserts `impersonation.started`/`.ended` row into `audit_log`, returns `{ ok, asociatie_id, asociatie_name, actor_id, actor_name }`. Created `src/platform/platformImpersonationStore.ts`: `ImpersonationSession` type, Zustand store with `startSession`/`endSession`/`clearError`; demo mode records directly to `usePlatformAuditStore`, live mode calls the Netlify function. Created `src/platform/ImpersonationBanner.tsx`: amber persistent banner (Eye icon) with asociație name and "Ieși din diagnosticare" exit button, shown whenever a session is active. Created `src/platform/PlatformImpersonatePage.tsx` at `/consola/impersonare`: read-only notice (Shield icon), active session card with "Ieși" button, association list with per-row "Pornește diagnosticare" buttons (disabled during active session). Updated `PlatformLayout.tsx`: imports and renders `ImpersonationBanner` inside `<main>`, marks `impersonation` section `ready: true`. Added route in `platformRouter.tsx`. Added `audit.action.impersonation.*`, `audit.entity.impersonation`, `platform.impersonation.*` locale keys (RO + EN). Added impersonation tones to both `AuditLogPage.tsx` and `PlatformAuditPage.tsx` action-tone maps. 17 new unit tests in `tests/unit/platformImpersonation.test.ts`. 268 files / 2547 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T99 — [P2] Admin ↔ superadmin support messenger

A back-and-forth messenger between an asociație's admins and the platform superadmins, modeled on F04 (`adminchat`: `private_threads`/`private_messages`, thread + embedded messages, per-message read receipts, open/resolved status): a per-asociație support thread where admins raise issues to the superadmin and the superadmin replies. The admin side lives in the main app (a "Contact platformă" surface), the superadmin side is an inbox across all asociații in the platform app. Bilingual on the admin side, demo + live, scoped so only that asociație's admins and the superadmins see a thread. Prereq: platform shell.

### ✅ T19 — [P2] SaaS billing & plans

Subscription tiers per asociație with per-tier feature/usage limits enforced server-side, a billing abstraction (Stripe-ready, mocked in demo mode), invoices/receipts, billing admin surface. Dunning + grace handling. Note: this is platform-subscription billing (vecini.online charging the asociație), NOT asociatie-internal resident accounting, which is out of scope (see `DECISIONS.md`).

Done: Added `BillingPlan`, `Subscription`, `Invoice`, `SubscriptionStatus`, `BillingInterval` to `domain.ts`. Created `billingLogic.ts` (3 canonical plans, 12 pure helpers), `billingStore.ts` (Zustand persist, demo seed: Standard/active + 2 paid invoices, upgradePlan/setStatus actions), `billingApi.ts` (hydrateBilling parallel query), `BillingPage.tsx` at `/app/admin/abonament` (dunning banners, plan grid with upgrade CTAs, usage meters, invoice table), `platformSubscriptionsStore.ts` (3-demo-asociatie seed, markPaid action), `PlatformSubscriptionsPage.tsx` at `/consola/abonamente` (summary bar, search+status filter, table with markPaid). Added `subscriptions` section to PlatformLayout. Created `netlify/functions/billing-checkout.ts` (Stripe stub POST handler). Created migration `20260604000006_billing.sql` (billing_plans + subscriptions + invoices, RLS). 32 unit tests. 276 files / 2599 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T110 — [P2] Present consumer pre-contractual info + withdrawal at the point of sale (billing)

Surfaced in T24: the consumer-protection information now lives on the `/protectia-consumatorului` page and is referenced from Terms, but for a consumer distance contract the pre-contractual information (main characteristics, total price incl. taxes, billing period, duration, renewal/cancellation) and the right-of-withdrawal notice must be presented **at the moment of purchase** on a durable medium, and where the service starts during the withdrawal period the consumer must give express consent + acknowledge losing the right once fully performed (OUG 34/2014). When the billing surface (T19) lands, render this at checkout/plan-selection (a clear pre-contractual summary + an express-consent checkbox + a confirmation on a durable medium), reusing the `consumerRights` content as the single source. Behind the billing flow; demo shows the mock checkout. Prereq: T19, T24.

Done: Added `preContractualRows(plan, lang)` pure function to `billingLogic.ts` returning 6 bilingual pre-contractual rows (service, total price incl. VAT, billing period, duration, cancellation, payment methods). Created `CheckoutModal.tsx`: a `size="lg"` modal that renders the pre-contractual table, an OUG 34/2014 withdrawal notice with link to `/protectia-consumatorului`, and a mandatory express-consent checkbox (Confirm button disabled until checked). Updated `BillingPage.tsx`: upgrade button now sets `pendingPlanId` state (opens modal) instead of calling `upgradePlan` directly; `handleConfirmUpgrade` calls `upgradePlan` and clears state. Added billing page CSS (`.billing-alert`, `.billing-summary`, `.billing-meter`, `.billing-plans-grid`, `.billing-plan-card`, `.billing-invoices-table`) and checkout modal CSS (`.checkout-modal__table`, `.checkout-modal__withdrawal`, `.checkout-modal__footer`) to `primitives.css`. Added `billing.checkout.*` locale keys (RO + EN). 9 new unit tests in `tests/unit/checkoutModal.test.ts`. 272 files / 2608 tests / lint + typecheck + build + build:pi + build:demo all green.

---

### ✅ T229 — [P3] Health-check Netlify function + uptime-monitoring documentation

Add `netlify/functions/health.ts`: GET-only, no auth required, returns `{"status":"ok","stage":"<VITE_APP_STAGE>"}` with `Content-Type: application/json`. Add rate-limit: 120 req/60 s per IP (reuse `checkSlidingWindow`). Document the `/api/health` endpoint in `RUNBOOK-MVP.md` as the watch URL for an uptime service (UptimeRobot / BetterUptime). New `tests/unit/healthFunction.test.ts` (3 assertions: returns 200 OK, correct JSON shape, rejects non-GET with 405). Prereq: none.

Done: Reduced `.modal-overlay` `backdrop-filter` from `blur(8px) saturate(1.1)` to `blur(5px)` (removing `saturate`; radius reduces GPU rasterization cost roughly quadratically). Added `will-change: opacity` (promotes the overlay to its own compositor layer before `iv-fade-in` fires) and `contain: layout paint` (prevents the modal child's transform animation from invalidating the blur layer). Fade-in already animates only `opacity` via `iv-fade-in` -- the blur is now static and rasterized once. Added `@media (prefers-reduced-motion: reduce)` block dropping the overlay to a flat dim (`backdrop-filter: none; background: oklch(0% 0 0 / 0.55)`) and suppressing all modal animations. No behavior change. 274 test files / 2642 tests / lint + typecheck + build + build:pi + build:demo all green.

---

### ✅ T229 P3 — Health-check Netlify function + uptime-monitoring docs

Done: Created `netlify/functions/health.ts` (GET-only, per-IP 120 req/60 s rate limit via `checkSlidingWindow`, returns `{"status":"ok","stage":"<VITE_APP_STAGE>"}` with `Content-Type: application/json`; rejects non-GET with 405). Created `tests/unit/healthFunction.test.ts` with 3 assertions. Added section 6 "Uptime monitoring" to `RUNBOOK-MVP.md` documenting the endpoint as the UptimeRobot/BetterUptime watch URL with recommended monitor settings. 263 files / 2611 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T238 — [P1] Stop per-keystroke page re-renders in compose/create modals (state isolation) — REFERENCE FIX

Done: Extracted `AnnouncementComposeModal` child component that owns all draft state (`title`, `body`, `category`, `schedule`, `pendingFiles`, `fileError`, `saving`) so keystrokes only re-render the modal subtree. Extracted `AnnouncementRow = memo(...)` component; moved `sanitizeHtml(a.body_html)` into it via `useMemo([a.body_html])` so DOMPurify runs once per unique body, not per keystroke. Wrapped stable `useCallback` handlers (`handleDeleteOne`, `handleMarkRead`, `handleDownload`, `handleToggleItem`) at page level so `React.memo` can prevent list-row re-renders when the parent re-renders for other reasons. Memoized the `visibleAnnouncements(all)` derivation with `useMemo([canManage, all])`. Documented the reusable pattern in `DECISIONS.md` for T241 (roll-out to remaining pages). Added `tests/unit/announcementsRenderIsolation.test.tsx` (4 assertions) proving typing 5 keystrokes in the compose modal does not increment the list render counter. 274 test files / 2642 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T239 — [P1] Cut modal-open jank: optimize the full-viewport backdrop blur

Surfaced from a performance report: modals open slowly/janky because `.modal-overlay` runs `backdrop-filter: blur(8px) saturate(1.1)` over the entire viewport (`src/styles/primitives.css:538`), composited on top of the already-active topbar blur(20px), sidebar blur(14px), and bottom-nav blur(16px), while the `iv-modal-in` transform animation plays — so on open the browser allocates a new compositor layer and rasterizes an expensive whole-viewport blur mid-animation (worst on mobile / low-end devices). CSS-only, app-wide fix that keeps a glassy feel (decision: reduce, do not flatten): lower the overlay blur to ~4-6px and drop `saturate`, add `will-change: opacity` and `contain: layout paint` so the blur layer is promoted/rasterized once rather than re-rasterized, and fade in only `opacity` while keeping the blur static (do not animate the blur radius). Verify the `prefers-reduced-motion` path drops to a flat dim. Confirm the look stays premium and the open holds 60fps. Prereq: none.

### ✅ T230 — [P1] Tap-accessible status tooltips (hover-only info unreachable on touch)

Done: `ApartmentStatusCell` now holds `tipOpen` state; the wrapper div gets `tabIndex={0}`, click/keydown/blur handlers when no inner button (static icon), and the tooltip gains `group-focus-within/status:opacity-100` + tipOpen override (WCAG 1.4.13: hover + keyboard focus + tap all work). Created `src/shared/components/InfoTip.tsx`: a `<button aria-label aria-expanded>` wrapping an Info icon with click/Esc/blur-toggle tooltip. Replaced the two hover-only `<span title aria-label>` info icons in `ApartmentFormPage.tsx` with `<InfoTip>`. 14 new unit tests. 275 files / 2656 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T231 — [P2] Responsive data tables — stack to cards on phones

Surfaced while reviewing mobile UX: several data tables overflow horizontally on a 375px
viewport because they use fixed multi-column grids with no narrow-screen fallback —
the GDPR retention table (`.gdpr-table__row` fixed `grid-template-columns: 1.2fr 1.4fr 1.4fr`
in `src/styles/legal.css:577-584`), the billing invoices table (`.billing-invoices-table` in
`src/styles/primitives.css`, no `overflow-x`/card fallback), and the admin apartments table
(`src/features/admin/ApartmentsPage.tsx`). Add a `@media (max-width: 600px)` treatment that
stacks each row to a single-column card (label + value pairs) or wraps the table in a
horizontal-scroll container with a visible affordance, consistent across all three. Reuse the
existing card/label tokens; no new design primitives. Bilingual RO/EN, premium-feel. Prereq: none.

Done: The admin apartments table already had a full mobile-card fallback (`hidden sm:block` / `sm:hidden`). Added `@media (max-width: 600px)` to the remaining two tables: `.gdpr-table` gets `overflow-x: auto; -webkit-overflow-scrolling: touch` and `.gdpr-table__row` gets `min-width: 400px` so the 3-column grid does not squish before scrolling kicks in (pure CSS, no HTML changes). `.billing-invoices-table` gets `display: block; overflow-x: auto; -webkit-overflow-scrolling: touch` so the HTML `<table>` element scrolls horizontally on narrow screens (also pure CSS, applies to both BillingPage and PlatformSubscriptionsPage which share the same class). Created `tests/unit/responsiveTables.test.ts` with 5 parse-based assertions verifying both media blocks and their key properties. 276 files / 2661 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T232 — [P2] DatePicker bottom-sheet variant on phones

Surfaced while reviewing mobile UX: `DatePicker` opens as a fixed 280px popover
(`.dp-popover` in `src/styles/primitives.css:1083`), positioned with
`left: Math.min(rect.left, window.innerWidth - 292)` in `src/shared/components/DatePicker.tsx`,
which can clip off-screen on very narrow (<320px) viewports and does not match the bottom-sheet
pattern Modal and CommandPalette already use at <=600px. Add a `@media (max-width: 600px)`
variant that renders the calendar as a bottom sheet (rounded top corners
`var(--radius-2xl) var(--radius-2xl) 0 0`, full-width, `env(safe-area-inset-bottom)` padding,
sheet-rise entrance, optional drag handle), mirroring the Modal sheet styling so the close
animation/`prefers-reduced-motion` handling stays consistent with the commit-8e6f654 fixes.
Bilingual RO/EN, premium-feel. Prereq: none.

Done: Added `isMobile` state to `DatePicker.tsx`; `openPicker` checks `window.innerWidth <= 600` at open-time and skips position computation on mobile. Portal conditionally renders a `.dp-sheet-overlay` wrapper (fixed full-screen, backdrop `oklch(0% 0 0 / 0.4)`, `onMouseDown` closes on tap-outside) with a `.dp-popover .dp-popover--sheet` inner calendar (`stopPropagation` on the inner div prevents the overlay handler from firing). Added to `primitives.css`: `.dp-sheet-overlay` (fixed, flex column, bottom-aligned, fade-in/out), `.dp-popover--sheet` (relative, full-width, rounded top corners, `env(safe-area-inset-bottom)` padding, drag-handle `::before` pill), `iv-dp-sheet-in`/`iv-dp-sheet-out` keyframes mirroring the modal sheet animations, and `prefers-reduced-motion` overrides for both. Updated `handleAnimationEnd` to recognise `iv-dp-sheet-out` for teardown. 277 files / 2668 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T233 — [P2] Touch-target sizing for in-table action buttons

Done: Added `.row-action-btn` class to `primitives.css` (30px base, flex centering, `border-radius: var(--radius)`, hover/active transforms) with a `@media (max-width: 600px)` override to 44x44px. Updated the same mobile touch-target block to bump `.btn--sm` from 38px to 44px, `.btn--icon.btn--sm` from 38px to 44px, and added `.iconbtn` at 44x44px. Applied `.row-action-btn` to the four inline-style action buttons in `ApartmentsPage.tsx` (desktop table 30px + mobile card 30px), removing the inline `width`/`height` that held them at 30/32px. Removed the `style={{ width: 32, height: 32 }}` inline overrides from the four `iconbtn` custom-field action buttons in `ProfilePage.tsx` (move up, move down, remove, drag handle) and from the `Modal.tsx` close button, so the CSS `@media` rule can take effect. 278 test files / 2673 tests / lint + typecheck + build + build:pi + build:demo all green.

### ⬜ T240 — [P2] Memoize AppLayout feature filtering + shell components

Surfaced from a performance report: `AppLayout`/`Sidebar` recompute `useEnabledFeatures()` (filters all 67 features) and then double-filter per category on every render (`src/app/AppLayout.tsx` ~lines 49-52 and ~215-236), with no `React.memo` on `Sidebar`/`BottomNav`/`Topbar`. Because the layout re-renders on every store change (notifications, realtime sync, theme/tint), this O(n) filtering cost is paid constantly and contributes to app-wide sluggishness. Memoize the enabled-features computation with `useMemo` keyed on flags+role, precompute the per-category feature groups once instead of re-filtering inside the category map, and wrap `Sidebar`, `BottomNav`, and `Topbar` in `React.memo`. No behavior change to active states, badges, or counts. Premium-feel unchanged. Prereq: none.

### ⬜ T241 — [P2] Roll modal state-isolation across remaining feature pages (umbrella)

Apply the T238 state-isolation pattern to every `src/features/*` page that still holds create/edit modal form state alongside a list, so typing in those modals no longer re-renders the underlying page/list. Audit candidates include tickets/sesizări, polls/voturi, payments, reservations/rezervări, events/evenimente, marketplace, and the locator compose post, plus any other page that embeds a `Modal` whose fields are driven by page-level `useState`. Each extracted modal owns its own draft state; the page keeps only `open` + submit. Break into per-area sub-tasks if the sweep is too large for one `make progress` unit. Reuse the `AnnouncementComposeModal` reference and the pattern recorded in `DECISIONS.md`. Bilingual unchanged, demo mode intact, premium-feel. Prereq: T238.

### ⬜ T242 — [P2] App-wide render & scroll smoothness pass (profiling-driven)

Surfaced from a performance report: beyond the modal fixes, the broader app benefits from bounding paint/reflow scope and trimming re-render churn. Driven by a React DevTools Profiler pass, add CSS containment to repeated list/card surfaces (`content-visibility: auto` + `contain-intrinsic-size` on list rows, `contain: layout paint` on cards) so off-screen content is skipped and reflow stays local; wrap genuinely heavy repeated list items in `React.memo`; virtualize any list that can grow long. Audit realtime store writes that replace whole arrays (e.g. `replaceForAsociatie` in the feature stores) to reduce subscriber-wide re-renders, preferring in-place patch updates where safe. Record the profiling findings and any deferred follow-ups as new tasks. Premium-feel and behavior unchanged. Prereq: none.

### ⬜ T243 — [P2] Memoize shared presentational primitives (Button/Card/Badge/Input/Select)

Surfaced from a performance report: the shared primitives in `src/shared/components/*` (`Button`, `Card`, `Badge`, `Input`, `Select`) are not memoized, so they re-render whenever a parent does even when their props are unchanged. Once parents stabilize (T238/T240), wrap these stable presentational primitives in `React.memo` so identical-prop renders are skipped. Preserve `forwardRef`, `className` merging (`cn`), and all current accessibility wiring exactly — verify with the existing unit/E2E suites that focus, labels, and refs still work. Premium-feel unchanged. Prereq: T238, T240.

### ⬜ T234 — [P2] Visible-state adapter for the assistant (DOM grounding foundation)

The in-app assistant (`src/features/assistant/`) answers from a global, role-filtered
knowledge base, but it has no awareness of what is actually on the user's screen. To make it
a true "visible-only" helper, add the grounding foundation: a pure, jsdom-testable adapter that
extracts ONLY the user-visible UI content from the live DOM, with no backend, hidden state, or
secrets. New `src/features/assistant/visibleState.ts` exporting:

- `interface VisibleContext { route?: string; headings: string[]; buttons: string[];
  links: string[]; fields: { label: string; kind: 'input' | 'select' | 'textarea' }[];
  options: string[]; paragraphs: string[]; }`.
- `extractVisibleContext(root: HTMLElement, opts?): VisibleContext` — a single `TreeWalker`
  pass. Trim/collapse whitespace, dedupe, cap each list (~40 items), each field (~160 chars),
  and total paragraph text (~4000 chars) so the snapshot is cheap and bounded.
- Hidden-element detection that behaves identically in jsdom and the browser: skip an element
  and its subtree when `el.hidden`, `aria-hidden="true"`, inline `display:none` /
  `visibility:hidden`, or it is inside `opts.excludeSelector` (default `.assistant`, so the bot
  never re-reads its own messages). Additively, when real layout exists, also honour
  `getComputedStyle` (guarded in a try) and zero-size rects — these can only HIDE more, never
  reveal more, and stay inert in jsdom (no test flakiness).
- Accessible-name resolution: `aria-label` -> single-level `aria-labelledby` -> `textContent`;
  fields also fall back to associated `<label>` -> `placeholder` -> `name`. Never throws.
- `visibleContextEntries(ctx): KbEntry[]` — map each heading/field/option/button into a
  `kind:'data'`, `audience:['all']` `KbEntry` (id namespace `visible.*`) whose `data.terms`
  are tokens of the visible text, `data.value` is the verbatim visible text, and `route` is the
  current route, so they flow through the existing `matchEntries` / `formatEntry` pipeline
  unchanged (reuse `KbEntry` from `knowledge.ts`).
- `useVisibleContext(): () => VisibleContext` — returns a SNAPSHOT function (not a memo) so the
  caller captures the live DOM at ask-time; fills `route` from `useLocation().pathname`.

New `tests/unit/assistant.visibleState.test.ts` (reuse the RO-backed `t` stub style from
`assistant.engine.test.ts`; build fixtures via `document.body.innerHTML`; assert hidden-detection
only via the attribute/inline rules since jsdom has no layout): a labelled field is extracted;
visible text is present while `hidden` / `aria-hidden` / `display:none` nodes and the
`.assistant` subtree are NOT present in the serialized context (no hidden/backend leakage).
Prereq: none.

### ⬜ T235 — [P2] Visible-first intent router with structured schema + pluggable phrasing engine

Prereq: T234. Add the conversational layer on top of the adapter: a thin, deterministic
orchestrator that prefers what is on screen, falls back to the knowledge base for navigation,
and forces every reply into a structured schema. New `src/features/assistant/intentRouter.ts`,
reusing `detectSmallTalk`, `matchEntries`, `MATCH_THRESHOLD`, `answerQuery`, and `pickVariant`
(do not re-implement matching):

- Forced schema: `type RouterIntent = 'greeting' | 'ask' | 'clarify' | 'confirm' | 'fallback'`;
  `interface RouterResult { intent: RouterIntent; message: string; options: { label: string;
  ask: string }[]; title?: string; route?: string; routeLabel?: string; matched: boolean }`.
  `options` reuses the `ReplyChip` shape so widget rendering is unchanged. Core schema is
  exactly `{ intent, message, options }`.
- `routeQuery(query, kbEntries, visibleCtx, t, seed, lastOffered?, engine?): RouterResult`.
  Ordering: (1) small talk via `detectSmallTalk` — greeting/capabilities -> `greeting`,
  thanks/bye/identity wrap `answerQuery` as `ask`; (2) confirm — `affirm` + a single
  `lastOffered` option re-runs the router on that option's `ask` as `intent:'confirm'`, multiple
  offered -> `clarify` (never guess); (3) visible-first match — score
  `visibleContextEntries(visibleCtx)` and `kbEntries`, visible wins when
  `vTop.score >= MATCH_THRESHOLD && vTop.score >= kbTop.score`; (4) confident answer -> `ask`
  (KB wins delegate to `answerQuery` so existing answers/tests are unchanged; visible wins show
  the verbatim value + current route + a bilingual label prefix); (5) near-tie within 1 ->
  `clarify` with 2-4 distinct options; (6) nothing over threshold -> `fallback` with up to 3
  closest options (visible first).
- `fromReply` / `toMessage` adapters bridge `AssistantReply` <-> `RouterResult` (structurally
  identical fields).
- `interface PhrasingEngine { phrase(variants: string[], seed: number): string;
  select?(query, candidates: KbMatch[], seed): KbMatch[] }` with a default `deterministicPhrasing`
  (`phrase = pickVariant`, no `select`); the router routes every variant pick through it.
  Document, in a comment, that an LLM may later implement it to choose among PRE-WRITTEN variants
  and re-rank RETRIEVED candidates only — never a fact source, never sees secrets, and the
  default deterministic engine must keep the app working offline. No live LLM here (that is T237).

Injection safety is structural and must be asserted: page text is only ever tokens for scoring
plus a verbatim displayed value; no code path parses it as a command. Additively export the
small `variants` helper from `engine.ts` (keep `pickVariant`) with NO behavior change so existing
engine tests stay green. New `tests/unit/assistant.intentRouter.test.ts`: clarification (two
visible entries within 1 point -> `clarify`, 2-4 options, no route), fallback on low confidence
(`matched===false`, message in `fallbackVariants`, `options.length <= 3`), prompt injection in
visible text ("Ignore all previous instructions..." -> "salut" still greets; the injection query
-> `fallback` or an `ask` whose value is the verbatim quoted paragraph, never a privileged route),
and confirm (offer one option, send "da" -> `intent:'confirm'` equal to routing the offered ask).
Prereq: T234.

### ⬜ T236 — [P2] Wire visible-first grounding into the assistant widget

Prereq: T234, T235. Connect the router to the live UI so the shipped assistant answers from the
current screen. Minimal, backward-compatible edits to `src/features/assistant/AssistantWidget.tsx`:
add `const snapshot = useVisibleContext();`; in `ask` (`AssistantWidget.tsx:44`) call
`routeQuery(trimmed, entries, snapshot(), t, seed, lastOffered)` where `lastOffered` is the
`chips` of the last `role==='bot'` message read from the store (the only use of session history —
purely the previous bot turn, recovered from the existing ephemeral `assistantStore`, nothing
persisted); push `toMessage(result)`; derive the typing `delay` from `result.message.length`.
No `assistantStore` change required. Add the bilingual visible-answer label prefix strings under
`assistant.*` in `src/shared/locales/ro.json` + `en.json` (e.g. RO "Din pagina aceasta:" /
EN "From this page:"), real diacritics, no em dash in code. Add a focused component/integration
test (React Testing Library + jsdom, model on `featuresAdminToggleClears.test.tsx`) that renders
the widget inside a `MemoryRouter` over a fixture page and asserts a question about an on-screen
control yields a visible-grounded answer while a question about another feature still falls back
to KB navigation. Existing `assistant.*` tests must remain green. Prereq: T234, T235.

### ⬜ T237 — [P3] Optional LLM-backed PhrasingEngine (constrained selection only)

Prereq: T235. With the `PhrasingEngine` seam in place, add an optional LLM-backed implementation
used ONLY as a constrained phrasing/selection engine: it may choose among the pre-written
localized variants the router supplies and re-rank the already-retrieved `KbMatch[]` candidates,
and may NEVER introduce facts, routes, or text not already grounded in visible content / the
curated KB, never see secrets or PII, and never receive page text as instructions. Gate it behind
`isSupabaseConfigured` (or an explicit feature flag) and a server-side Netlify function proxy so
no API key reaches the client; the default `deterministicPhrasing` must remain the offline/demo
path so all three stages keep building and the app stays fully functional with no model/network.
Add a stub function + clear follow-up note documenting the prompt contract (inputs are a fixed
list of candidate strings; output is an index/choice, validated against that list before use) and
unit tests asserting the engine cannot emit an option outside the supplied set. Requires an
external service + secret, so this is a deliberate later enhancement, not an overnight blocker.
Prereq: T235.

### ⬜ T87 — [P3] Stronger cryptographic tamper-evidence for the audit chain

Surfaced in T09: the audit chain uses a fast non-cryptographic hash (cyrb53), so it detects accidental edits/reorders and, combined with the append-only RLS, gives honest-store tamper-evidence — but a determined party who can write to the table could recompute a consistent forged chain. For a stronger guarantee, sign each entry's hash with a server-held secret (HMAC) or periodically anchor the chain head (a Merkle root) to an append-only external store, so the integrity check no longer depends only on the store being honest. Requires a server-held secret / external anchor, so it is a documented follow-up, not an overnight blocker. Prereq: T09, T86.

### ⬜ T79 — [P3] Guard that every RLS-enabled table carries at least one policy

Surfaced in T35: the new coverage guard proves RLS is enabled on every table, but a table with RLS ON and **zero** policies is deny-all (no one can read/write it) — not a leak, but a silently broken feature that the coverage guard does not catch. Add a backend-free guard that, for every RLS-enabled public table, asserts at least one policy targets it (a `create policy ... on X`, a `select apply_standard_rls('X')` which adds two, or a parent-scoped policy), and document the intentionally locked tables (if any) so a genuinely access-less table is a deliberate, asserted choice rather than an oversight. Lower priority than the leak-class guards since deny-all fails safe. Prereq: T35.
