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

### ⬜ T222 — [P2] E2E batch for projects + safety + community-life features (F41–F48, F49–F55, F57–F65)

Happy paths in `tests/e2e/community.spec.ts`: F41 (advance a project phase), F44 (pledge, funded tracker), F47 (add energy record), F48 (warranty expiry badge), F50 (view evacuation plan), F51 (mark PSI check done), F52 (insurance expiry badge), F53 (add key holder), F57 (post marketplace listing), F62 (tick a welcome step), F63 (opt-in birthday, today section), F65 (submit feedback). At least one passing test per group. Chromium + mobile.

### ⬜ T223 — [P2] E2E for F06 Locator + F66 Profile + F67 Home customization

Three high-value features currently without E2E. Add to `tests/e2e/features.spec.ts`: F06 (compose a neighbour post with category, appears in feed); F66 (set display name + add a custom field + completeness indicator increases); F67 (enter edit mode, hide a card, card leaves the grid, exit, survives reload). Chromium + mobile. Prereq: Chromium installed (T187).

### ⬜ T224 — [P2] Scheduled-announcement server-side hold-back (RLS expression on published_at/scheduled_at)

T188 notes: "scheduled-row hide is client-gated (visibleAnnouncements); true server-side hold-back remains a live-activation follow-up." In live mode a resident querying `announcements` directly can see future-scheduled rows. Add an RLS SELECT policy expression that hides rows where `published_at IS NULL AND scheduled_at > now()` for non-manager roles (`NOT has_role(asociatie_id, ARRAY['admin','presedinte','comitet'])`). New migration `20260603000004_announcement_scheduled_rls.sql`. Extend `rlsTenantIsolation.test.ts` with a parse-based assertion that the policy exists. No UI change. Prereq: T188.

### ⬜ T225 — [P2] Realtime sync extended to governance + community tables

T16 wired realtime for `announcements/tickets/private_threads/private_messages`. High-value tables still missing live updates: `notifications` (new pings arrive immediately), `petitions/petition_signatures` (signature count updates live), `polls/votes` (result bars update during voting), `events/event_rsvps` (RSVP count updates). Extend `realtimeLogic.ts` with `applyNotificationInsert`, `applyPetitionSignatureInsert`, `applyVoteInsert`, `applyRsvpChange` apply helpers. Extend `useRealtimeSync` to subscribe to these tables on the same per-asociatie channel. Unit-test the new apply helpers (25+ assertions). Prereq: T16.

### ⬜ T226 — [P2] Assistant widget Phase 2 — live open polls + my ticket status + upcoming events

FEATURES.md Phase 2: swap `dataSources.ts` from demo fixtures to live store data for: (a) open polls (`useAsociatiePolls()` filtered to open), (b) my open tickets (`ticketsStore` filtered by `reporter_user_id`), (c) upcoming events (`eventsStore` filtered to upcoming). Gate each on `isSupabaseConfigured` + store having loaded data; demo path unchanged. Extend `assistantEngine.test.ts` with assertions for each new data source. Prereq: T185 (events store), T189 (polls store), T57 (tickets store).

### ⬜ T227 — [P2] PWA manifest + mobile installability

Add `public/manifest.webmanifest` with `name: "vecini.online"`, `short_name: "Vecini"`, `start_url: "/app"`, `display: "standalone"`, `theme_color` (warm-graphite dark token), `background_color`, and `icons` (at least 192×192 + 512×512 — SVG or PNG derived from the existing logo mark). Add `<link rel="manifest">` + `<meta name="theme-color">` to `index.html`. New `tests/unit/pwaManifest.test.ts` (4 assertions: file exists, required fields present, icons array non-empty, start_url correct). Enables "Add to Home Screen" on iOS/Android and elevates the mobile premium-feel bar.

### ⬜ T228 — [P2] Notification fan-out for AGA lifecycle (meeting convoked + voting opened)

When `convokeMeeting` succeeds, all active-apartment holders should receive an in-app notification. When `advanceStatus` reaches `in_desfasurare`, same. Add `emitAgaConvoked(meeting, notifStore)` and `emitAgaVotingOpen(meeting, notifStore)` to `notificationFanout.ts` (store-first + `persistAndFanOut` behind `isSupabaseConfigured`). Add `NotificationKind` variants `aga.convoked` + `aga.voting_open`, bilingual locale keys, and `notificationFanout.test.ts` assertions for both helpers (skip when no apartments, skip self-notify, offline-safe). Wire into `agaApi.ts` `convokeMeeting` and `advanceStatus`. Prereq: T127 (notification store), T190 (agaApi).

### ⬜ T78 — [P2] Erasure/export must cover Storage photo objects (pets/bikes/lending/visitors)

T73's export carries photo `photo_path` references as metadata, and `ERASURE_PLAN` deletes the pets/bikes/lending listings, but the actual uploaded photo objects live in Supabase Storage. The server-side erasure execution (T72) must also delete those Storage objects for the subject (pets, bikes, lending items, visitor-report photos) so an erased resident's images do not remain, and the export could optionally include signed links to them. Behind `isSupabaseConfigured`; folds into T72's server-side erasure routine. Prereq: T73, T72.

### ⬜ T76 — [P2] Live activation: deliver the breach resident notice + record breach events in the audit stream

T22 generates the art. 34 resident notice as a downloadable text and logs the breach append-only, but on a high-risk breach the notice should actually reach the affected residents. When the notification fan-out lands (email T14), dispatch the art. 34 notice through it as an **essential** security communication (bypassing consent like F03), targeted to the affected residents, and record each breach lifecycle event (recorded / authority-notified / residents-notified / closed) into the unified audit stream (T09) so the breach trail is part of one tamper-evident log. Behind `isSupabaseConfigured`, demo keeps the offline download. Prereq: T22, T14; coordinates with T09.

### ⬜ T58 — [P2] Live activation: Telegram webhook deploy + env (`/start CODE`)

Deploy the Netlify webhook function, set `TELEGRAM_BOT_TOKEN`/secret, register the bot + Mini App, and exercise the T50 linking path live. Requires a bot token + deployment. Coordinate with / folds into T15. Prereq: T50.

### ⬜ T68 — [P2] In-app "Link Telegram" resident surface (mock path, live-ready)

T50 ships the pure linking logic + the local/mock `telegramLinkStore` (a resident-minted per-user link code → `telegram_users` association), but nothing surfaces it in the app yet, so a resident cannot actually start the linking flow from the UI. Add a small "Telegram" card (in the profile/notification settings area, near the channel preferences feeding the T14 fan-out) that mints a per-user link code via `telegramLinkStore.issueLinkCode` (scoped to the active asociație + `activeRole()`), shows the resulting `t.me/<bot>?start=CODE` deep link with copy, displays the established link / an unlink action (`/uita`), and is bilingual + premium-feel. Demo exercises the mock path end-to-end (issue → the bot's `/start CODE` resolves it). Prereq: T50; coordinates with T11 (profile editor) and T14 (notification channels). Live wiring of the bot username + webhook resolution is T58.

### ⬜ T20 — [P2] Super-admin platform console (umbrella — broken down into T95–T99)

Platform-owner console: manage asociații, provision admins, the global feature catalog, support impersonation with full audit, platform health/usage metrics, and an admin↔superadmin messenger. Strictly separated from tenant admin — built as a **separate app on its own subdomain** (`src/platform/*`), gated to `super_admin` with server-side re-checks (origin/session isolation; see `DECISIONS.md`). Platform shell, access E2E, and live provisioning wiring are done (T119–T121 in COMPLETED.md). Remaining: T95 (cross-asociatie audit viewer), T96 (platform error feed), T97 (usage/health metrics), T98 (audited impersonation), T99 (admin↔superadmin messenger). Track the work under those sub-tasks; this entry stays as the umbrella.

### ⬜ T95 — [P2] Cross-asociatie audit viewer (platform app)

Surface the T09 tamper-evident audit trail across **all** asociații in the superadmin app, read-only: aggregate every asociație's hash-chained log, show a per-asociație chain-integrity badge (`verifyChain`), and reuse the T09 filters (actor/action/entity/text/date) plus an asociație filter, so the superadmin can see what each admin is doing platform-wide. Cross-tenant read is granted only to `super_admin`. Prereq: T09, platform shell.

### ⬜ T96 — [P2] Platform error feed (superadmin app)

Give the superadmin visibility into app problems: persist the scrubbed error reports from the T07 `errorReporting` hook (no PII, the `IV-XXXX-XXXX` reference) to a `super_admin`-readable store/table and surface them as a filterable feed in the platform app (message, reference, route, count, first/last seen), so the two superadmins can spot errors and regressions. Wire to the live sink (T82) when present; demo shows the local report buffer. Prereq: T07, platform shell; coordinates with T82.

### ⬜ T97 — [P2] Platform usage/health metrics (superadmin app)

A platform dashboard of per-asociație health: member count, enabled features, recent activity (announcements/tickets/votes in a window), last admin sign-in, and platform-wide rollups, so the superadmin can see adoption and spot dormant or struggling asociații. Read-only, cross-tenant under super_admin RLS; demo computes from the seeded stores. Prereq: platform shell.

### ⬜ T98 — [P2] Audited superadmin impersonation (read-only)

Let a superadmin enter a chosen asociație's context **read-only** to diagnose a reported problem, with every entry and exit written to the audit trail (actor, asociație, when) so impersonation is never silent. No write actions while impersonating; a clear, persistent banner shows the impersonated tenant. The privileged context switch is server-mediated (a service-role function) and re-checks `super_admin`. Security-sensitive. Prereq: T09, platform shell.

### ⬜ T99 — [P2] Admin ↔ superadmin support messenger

A back-and-forth messenger between an asociație's admins and the platform superadmins, modeled on F04 (`adminchat`: `private_threads`/`private_messages`, thread + embedded messages, per-message read receipts, open/resolved status): a per-asociație support thread where admins raise issues to the superadmin and the superadmin replies. The admin side lives in the main app (a "Contact platformă" surface), the superadmin side is an inbox across all asociații in the platform app. Bilingual on the admin side, demo + live, scoped so only that asociație's admins and the superadmins see a thread. Prereq: platform shell.

### ⬜ T19 — [P2] SaaS billing & plans

Subscription tiers per asociație with per-tier feature/usage limits enforced server-side, a billing abstraction (Stripe-ready, mocked in demo mode), invoices/receipts, billing admin surface. Dunning + grace handling. Note: this is platform-subscription billing (vecini.online charging the asociație), NOT asociatie-internal resident accounting, which is out of scope (see `DECISIONS.md`).

### ⬜ T110 — [P2] Present consumer pre-contractual info + withdrawal at the point of sale (billing)

Surfaced in T24: the consumer-protection information now lives on the `/protectia-consumatorului` page and is referenced from Terms, but for a consumer distance contract the pre-contractual information (main characteristics, total price incl. taxes, billing period, duration, renewal/cancellation) and the right-of-withdrawal notice must be presented **at the moment of purchase** on a durable medium, and where the service starts during the withdrawal period the consumer must give express consent + acknowledge losing the right once fully performed (OUG 34/2014). When the billing surface (T19) lands, render this at checkout/plan-selection (a clear pre-contractual summary + an express-consent checkbox + a confirmation on a durable medium), reusing the `consumerRights` content as the single source. Behind the billing flow; demo shows the mock checkout. Prereq: T19, T24.

---

### ⬜ T229 — [P3] Health-check Netlify function + uptime-monitoring documentation

Add `netlify/functions/health.ts`: GET-only, no auth required, returns `{"status":"ok","stage":"<VITE_APP_STAGE>"}` with `Content-Type: application/json`. Add rate-limit: 120 req/60 s per IP (reuse `checkSlidingWindow`). Document the `/api/health` endpoint in `RUNBOOK-MVP.md` as the watch URL for an uptime service (UptimeRobot / BetterUptime). New `tests/unit/healthFunction.test.ts` (3 assertions: returns 200 OK, correct JSON shape, rejects non-GET with 405). Prereq: none.

### ⬜ T108 — [P3] Rich per-card home widgets (beyond feature-shortcut links)

Surfaced in T12: F67 makes the home's feature-shortcut cards customizable (show/hide/reorder/size), but each card is still a plain icon+title link, while the F67 spec envisions each card exposing a small live widget (latest announcement, my open tickets, next event, active polls, etc.). Add per-feature home-widget content rendered inside the card (especially when sized `expanded`), drawn from the active asociație's stores, so a pinned card shows useful at-a-glance state rather than just a shortcut. Keep the widget content pure/derived and bilingual; reuse the existing per-asociație selectors. Prereq: T12.

### ⬜ T87 — [P3] Stronger cryptographic tamper-evidence for the audit chain

Surfaced in T09: the audit chain uses a fast non-cryptographic hash (cyrb53), so it detects accidental edits/reorders and, combined with the append-only RLS, gives honest-store tamper-evidence — but a determined party who can write to the table could recompute a consistent forged chain. For a stronger guarantee, sign each entry's hash with a server-held secret (HMAC) or periodically anchor the chain head (a Merkle root) to an append-only external store, so the integrity check no longer depends only on the store being honest. Requires a server-held secret / external anchor, so it is a documented follow-up, not an overnight blocker. Prereq: T09, T86.

### ⬜ T79 — [P3] Guard that every RLS-enabled table carries at least one policy

Surfaced in T35: the new coverage guard proves RLS is enabled on every table, but a table with RLS ON and **zero** policies is deny-all (no one can read/write it) — not a leak, but a silently broken feature that the coverage guard does not catch. Add a backend-free guard that, for every RLS-enabled public table, asserts at least one policy targets it (a `create policy ... on X`, a `select apply_standard_rls('X')` which adds two, or a parent-scoped policy), and document the intentionally locked tables (if any) so a genuinely access-less table is a deliberate, asserted choice rather than an oversight. Lower priority than the leak-class guards since deny-all fails safe. Prereq: T35.
