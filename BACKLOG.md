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

MVP spine + three-stage deployment (PROD/DEV/DEMO) are done and green; archived in `COMPLETED.md`. Open queue is led by the launch-hardening cluster (security, accessibility, observability), then offline-first feature/UX completion, then the live-activation follow-ups and the platform console.

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

## MVP presentation spine — complete (see COMPLETED.md)

## Three-stage deployment (PROD / DEV / DEMO) — complete (see COMPLETED.md)

## Main queue

### Launch-hardening — top priority (security, accessibility, observability)

> The cluster that makes what already exists safe and compliant for real residents before broadening scope.

### ✅ T181 — [P1] Rate-limit the `invite-email` Netlify function
Done: `checkIpRateLimit(ip, now)` added to `_shared/rateLimiter.ts` (5 sends per 60 s per IP, using the existing `checkSlidingWindow` primitive). `extractClientIp(req)` helper exported from `invite-email.ts` (reads `x-forwarded-for` then `x-real-ip`). Per-IP check added early in the handler before any DB queries; existing per-caller+asociatie limit (20/10 min) retained. Security model comment updated. 15 new assertions across 3 test blocks in `inviteEmailAuth.test.ts`. 175 files / 1715 tests / build / build:pi / build:demo all green.

### ✅ T182 — [P1] Dev-gate console logging so PROD never logs state/PII to the browser console
Done: `src/shared/lib/devLog.ts` added -- `devLog.{log,info,warn,debug}` are live console bindings when `import.meta.env.DEV || VITE_APP_STAGE !== 'prod'`, no-ops otherwise; Vite tree-shakes the no-op branches in the PROD build. Audit found zero raw `console.*` calls in `src/` outside the two allowlisted files (`errorReporting.ts` already DEV-guarded, `telegramWebhook.ts` server-side only). Guard test `devLog.test.ts` (4 assertions): checks all `src/*.ts{,x}` for raw `console.(log|info|warn|debug|error)(` calls, skips the allowlist, and fails the suite if any new violation is introduced. 176 files / 1719 tests / build / build:pi / build:demo all green.

### ✅ T85 — [P1] Wire the remaining state-changing features into the audit trail
Done: Extended `AUDIT_ACTIONS` with 6 new actions (`ticket.submitted`, `aga.scheduled`, `aga.opened`, `aga.closed`, `budget.proposed`, `petition.created`) and `AUDIT_ENTITIES` with 4 new entities (`ticket`, `aga`, `budget`, `petition`). Added matching RO/EN locale keys. Wired `recordAudit` calls in `TicketsPage.tsx` (ticket submit), `BudgetPage.tsx` (proposal add), `PetitionsPage.tsx` (petition create), and `AgaPage.tsx` (meeting schedule + open/close status advance). Added ACTION_TONE entries for all 6 new actions in `AuditLogPage.tsx`. 176 files / 1719 tests / all three builds green.

### ✅ T17 — [P1] Accessibility audit (WCAG 2.1 AA)
Done: Modal — proper focus trap (Tab/Shift+Tab cycles within dialog), focus restore to trigger on close, `aria-labelledby` pointing to the `<h2>` title (bare mode uses `aria-label` fallback), initial focus lands on first interactive element. Select — `aria-invalid`, `aria-describedby` wired to error element with id. Input/Textarea — `aria-describedby` now covers hint text (not just errors). EmptyState title promoted from `<div>` to `<p>`. Button — `aria-busy` when loading. AppLayout — skip-link (`.skip-link` CSS, `href="#main-content"`) as first DOM element; `<main id="main-content">`; workspace button `aria-label`; search `aria-label`. RO/EN i18n keys for skip/workspace/search labels. Tests: 177 files / 1725 tests / all three builds green.

### ✅ T25 — [P2] Accessibility statement (Declarație de accesibilitate)
Done: `src/features/legal/accessibilityContent.ts` — bilingual `accessibilityStatement(lang)` returning `LegalDoc` with 6 sections (conformance target WCAG 2.1 AA / EN 301 549, measures taken, known limitations, feedback/contact, enforcement, technical info). `AccessibilityStatementPage.tsx` renders via existing `LegalDocPage` chrome. Route `/accesibilitate` added to `router.tsx`. Footer link added to `AppLayout.tsx` using `consent.accessibilityLink` i18n key (EN + RO). Unit test `accessibilityContent.test.ts` (4 assertions: EN structure, RO structure, no em-dashes, RO diacritics). 178 files / 1729 tests / build + build:pi + build:demo all green.

### ✅ T18 — [P2] Performance & Lighthouse
Done: xlsx lazy-loaded via dynamic `import('xlsx')` in `csv.ts` (`generateApartmentsXlsxTemplate` + `parseApartmentsXlsx` made async); `xlsx: ['xlsx']` added to vite.config `manualChunks`; ApartmentsPage bundle shrank from 451 kB to 27 kB (gzip 7.8 kB), xlsx becomes a 429 kB chunk only fetched on first use. SEO: `public/robots.txt` (Allow: /, Disallow: /app/, Sitemap pointer) + `public/sitemap.xml` (6 public routes). `index.html` extended with OG meta (`og:type/url/title/description/locale`), Twitter card, canonical link, and `robots` meta. 3 csv.test.ts xlsx tests updated to async. New `seo.test.ts` (4 assertions: robots.txt, sitemap.xml, OG tags, meta description). 179 files / 1733 tests / build + build:pi + build:demo all green.

### ✅ T83 — [P2] Adopt the standardized loading/empty/error states across all feature pages
Done: Audit found 77/96 pages already using `EmptyState` correctly. Remaining gaps fixed: `MetersPage` now shows `EmptyState` when the meters list is empty (new i18n key `meters.empty` RO/EN). Live-fetch error surface: `fetchError: string | null` + `setFetchError` action added to `announcementsStore`, `ticketsStore`, `discussionStore`. Hydrate functions (`hydrateAnnouncements`, `hydrateTickets`, `hydrateThreads`) now call `setFetchError('load')` on failure and `setFetchError(null)` on success. `AnnouncementsPage`, `TicketsPage`, `DiscussionsPage` render `ErrorState` with a retry button when `fetchError` is non-null (demo mode: never triggers; live path: surfaces Supabase read failures). New `common.loadError` i18n key (EN/RO). Unit test `fetchErrorState.test.ts` (9 assertions). 180 files / 1742 tests / all three builds green.

### ✅ T84 — [P2] Route async store-action failures through the error-reporting hook
Surfaced in T07: T07's `reportError` hook + `installGlobalErrorHandlers` catch render-time errors and unhandled rejections, but the deliberate `try/catch` blocks in async store actions (e.g. `authStore.hydrate`, the live read/write paths landing in T55-T57, the security/audit mirrors) swallow or only locally handle failures, so observability does not yet cover data-layer errors. Wire `reportError` (with a non-PII `source` + breadcrumbs) into those catch blocks behind `isSupabaseConfigured`, so when a live sink is attached (T82) the report stream covers store/query failures, not only UI crashes. Keep demo mode silent. Prereq: T07; coordinates with T82.

### ✅ T82 — [P2] Wire a live error sink (Sentry-ready) + CSP report endpoint
Surfaced in T07: the `errorReporting` hook ships with a pluggable `setErrorSink` and no default sink, so in production errors are reported nowhere. When observability lands, attach a real sink (Sentry SDK or a lightweight Netlify-function collector) via `setErrorSink`, gated on an env flag, scrubbed reports only, and reconcile the `connect-src`/`report-to` CSP directives so the sink's origin is allowed and CSP violations are collected by the same path. Requires an external service (Sentry DSN or a deployed collector) so it is a documented live-activation follow-up, not an overnight blocker. Prereq: T07; coordinates with T39 (CSP report-uri) and T84.

### ✅ T86 — [P2] Live activation: audit_log read + server-authoritative chain
Surfaced in T09: the store mirrors entries to `audit_log` best-effort but the live read path and a server-authoritative ordering are not built — offline the seq/prev_hash/hash are computed client-side, which is fine for demo but a forging client could mint its own chain live. When a backend is provisioned, read the asociație's `audit_log` under RLS for the page, and compute `seq` + the hash chain server-side (a trigger or an Edge Function that reads the current tail and stamps `seq`/`prev_hash`/`hash`), so the chain authority is the database, behind `isSupabaseConfigured` with the local chain as the offline fallback. Requires a provisioned project. Prereq: T09.

### Feature & UX completion (offline-first)

> Finishing committed feature behaviour and tenant scoping in demo/offline mode, ahead of (and decoupled from) backend provisioning.

### ✅ T65 — [P2] Persist the content stores offline (publish survives reload)
The per-asociație content stores (`announcementsStore` from T47, and the upcoming `discussions`/`tickets` stores in T48/T49) are in-memory `create(...)` stores reseeded on every load, so a demo/local publish vanishes on refresh — the invite and feature stores already persist via `zustand/middleware`. Wrap the content stores in `persist` (a `version` + a `migrate` that reseeds the demo asociație from `DEMO_*` so a stale persisted demo list is refreshed, mirroring the T43 featureStore migration), keying by asociație so the local loop keeps published content across reloads. Keep the demo seed authoritative for the demo asociație. Coordinates with T57 (live read/write supersedes the local store when a backend exists). Prereq: T47.

### ⬜ T66 — [P2] Enforce the discussion post rate limit (anti-spam)
`discussionLogic` has `canPost(recentMessageCount, vetted)` + `NEW_USER_HOURLY_LIMIT` (T48), but the post flow never calls it, so an unvetted user is not actually rate-limited when starting threads or replying. Wire it in: track each author's recent message timestamps (per asociație), compute the last-hour count, and block + surface a bilingual "you are posting too fast" notice when an unvetted author exceeds the limit, while vetted users (comitet/admin) stay unthrottled. Reuse the existing pure helper; add a store/integration test. Coordinate with the T03 throttle style. Prereq: T48.

### ⬜ T67 — [P2] Comitet/admin ticket status-lifecycle surface (offline)
T49 lets a resident submit a sesizare, but it is stuck at `primit` offline — there is no way for a comitet/admin to advance it through the F17 lifecycle (`primit` → `asignat` → `in_lucru` → `rezolvat` → `verificat`/`respins`), assign a handler, add resolution notes, or for the reporter to rate after resolution. Add a pure status-transition helper (allowed transitions, who may make each) + an admin/comitet action surface on `TicketsPage` (gated on `activeRole()` per T51), updating the ticket in the per-asociație store and stamping `resolved_at`/`verified_at`. Unit-test the transition rules; add an E2E. Coordinates with T51 (role selectors) and the `ticket_status_history` table for live. Prereq: T49; coordinates with T51.

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

### ⬜ T37 — [P2] Server-rendered proces-verbal PDF (F10 AGA)
F10 currently downloads the legally-required proces-verbal as signature-ready Romanian plain text (a deliberate bundle-budget choice — see `DECISIONS.md`). For a polished, court-presentable deliverable, render it as a real PDF: do it server-side (Supabase Edge Function / Netlify function) so no heavy PDF engine lands in the client bundle, keep the text generator (`generateProcesVerbal`) as the single source of the content, and stamp the asociație header + Legea 196/2018 footer. Demo mode keeps the text download. Prereq: a provisioned backend.

### Live-activation (needs a provisioned backend; documented, not blockers)

> Require external provisioning (Supabase, env vars, deployed functions). Each ships behind `isSupabaseConfigured` with the offline store as the fallback. Document the apply steps.

### ⬜ T127 — [P2] Live activation: notifications fan-out (`notifications` under RLS + channels)
Surfaced building T126: the in-app inbox runs offline first; live, persist `notifications` rows + read-state under RLS (owner-scoped read/update, scoped by `asociatie_id`) and hydrate on mount, behind `isSupabaseConfigured` with the T126 local store as the offline fallback. Reuse the same write to fan out across the email (T14) channel (and Telegram once T15 is unfrozen) honouring the resident's notification preferences and the consent gate (T26). Requires a provisioned project; document the apply steps. Prereq: T126; coordinates with T14, T26.

### ⬜ T80 — [P2] Live activation: wire the attribution-free tally functions for F09/F15/F13 results
T38 added the `security definer` aggregate functions `survey_tally` / `poll_tally` / `priority_ranking_turnout` so members can see poll/survey/ranking results without reading each other's individual rows, but nothing calls them yet (demo computes tallies client-side from the Zustand store, and the live path for F09 Voturi / F15 Sondaje / F13 Priorități is not built). When the live read path for those features lands, call these RPCs to render results (since under the new RLS a member can no longer read other rows), add the `grant execute ... to authenticated` the live API needs, and extend `poll_tally` (or add a sibling) to aggregate **ranked** polls from `ranked_options` jsonb (it currently covers only the `selected_option_ids` poll types). Behind `isSupabaseConfigured`, demo keeps the client-side tally. Requires a provisioned project. Prereq: T38; coordinates with T57.

### ⬜ T72 — [P2] Live activation: server-side erasure execution + retention cleanup
T06 files erasure requests and marks an erased-id offline, but the actual cross-store mutation (delete/anonymize/retain per `ERASURE_PLAN`) and the periodic purge of expired records (per `RETENTION_POLICY` windows) must run server-side with the service role. Add a scheduled Supabase routine / Edge Function that, on a completed erasure, applies the plan across the subject's rows (anonymizing to `ANONYMIZED_NAME`, retaining votes/financial/consent/security), and a cron that purges records past their retention window, behind `isSupabaseConfigured`. Document the apply steps. Requires a provisioned project. Prereq: T06. See `DATA_RETENTION.md`.

### ⬜ T78 — [P2] Erasure/export must cover Storage photo objects (pets/bikes/lending/visitors)
T73's export carries photo `photo_path` references as metadata, and `ERASURE_PLAN` deletes the pets/bikes/lending listings, but the actual uploaded photo objects live in Supabase Storage. The server-side erasure execution (T72) must also delete those Storage objects for the subject (pets, bikes, lending items, visitor-report photos) so an erased resident's images do not remain, and the export could optionally include signed links to them. Behind `isSupabaseConfigured`; folds into T72's server-side erasure routine. Prereq: T73, T72.

### ⬜ T76 — [P2] Live activation: deliver the breach resident notice + record breach events in the audit stream
T22 generates the art. 34 resident notice as a downloadable text and logs the breach append-only, but on a high-risk breach the notice should actually reach the affected residents. When the notification fan-out lands (email T14), dispatch the art. 34 notice through it as an **essential** security communication (bypassing consent like F03), targeted to the affected residents, and record each breach lifecycle event (recorded / authority-notified / residents-notified / closed) into the unified audit stream (T09) so the breach trail is part of one tamper-evident log. Behind `isSupabaseConfigured`, demo keeps the offline download. Prereq: T22, T14; coordinates with T09. (Telegram delivery folds in when T15 is unfrozen.)

### ⬜ T75 — [P2] Live activation: persist the per-asociație ROPA snapshot + DPA adoption record
T21 generates the art. 30 register and the art. 28 DPA template on the fly and lets the admin download them, but the controller's GDPR accountability evidence should be persisted: a point-in-time snapshot of the register (so the asociație can show what processing it ran on a given date) and a DPA adoption record (version, adopted-at, adopted-by). Add the table(s) under RLS scoped by `asociatie_id` (admin/președinte manage, members read), write a snapshot on demand and on a feature-flag change, and record DPA adoption, behind `isSupabaseConfigured` with the offline generated view as the fallback. Requires a provisioned project. Prereq: T21.

### ⬜ T103 — [P2] Live activation: persist profile + custom fields (`users`/`profile_custom_fields`) + Storage avatar
T11 (F66) keeps the rich profile offline in `profileStore` and the migration extends `users` + adds `profile_custom_fields`, but nothing reads/writes them live yet, and the avatar is an offline data URL. Load the signed-in user's standard profile columns + their `profile_custom_fields` on hydrate, persist edits back under RLS (owner-scoped), and add a Supabase Storage bucket for the profile photo (size/type-capped upload, store the object path in `users.avatar_url`, signed read), behind `isSupabaseConfigured` with the offline store as the fallback. Document the apply steps. Requires a provisioned project. Prereq: T11; coordinates with T28 (hydration) and T89 (the F33 Storage pattern).

### ⬜ T106 — [P2] Live activation: persist the per-resident home layout (`home_layouts`)
T12 (F67) keeps each resident's home layout offline in `homeLayoutStore` and the migration adds the owner-RLS `home_layouts` table, but nothing reads/writes it live yet. Load the signed-in resident's layout for the active asociație on hydrate and persist edits back under RLS (owner-scoped, the ordered `cards` jsonb), behind `isSupabaseConfigured` with the offline store as the fallback, so a personalized home truly follows the resident across devices. Reconcile the loaded layout against the asociație's live enabled features (`reconcileLayout`) exactly as the offline path does. Requires a provisioned project; document the apply steps. Prereq: T12; coordinates with T28 (hydration) and T56 (live feature flags).

### ⬜ T130 — [P2] Link admin-initiated F04 threads to the resident's account
Surfaced building the F04 inbox: when the administrator starts a thread toward an apartment, the resident party is recorded from the embedded `persons` list (person id + name), which is fine for demo but in live mode will not equal the resident's `auth.uid()`, so the targeted resident would not see the thread under the party-or-admin RLS. Once occupants are account-linked, set `resident_user_id` to the linked account (or leave it pending until the resident claims the apartment) so an admin-initiated conversation reaches the right inbox. Prereq: T117 (persons ↔ `apartment_residents` reconciliation).

### Platform / Superadmin console + SaaS

> The superadmin app shell + provisioning console are built (former T93/T94, see COMPLETED.md). Remaining items extend oversight and the SaaS business layer.

### ⬜ T20 — [P2] Super-admin platform console (umbrella — broken down into T119-T121, T95-T99)
Platform-owner console: manage asociații, provision admins, the global feature catalog, support impersonation with full audit, platform health/usage metrics, and an admin↔superadmin messenger. Strictly separated from tenant admin — built as a **separate app on its own subdomain** (`src/platform/*`), gated to `super_admin` with server-side re-checks (origin/session isolation; see `DECISIONS.md`). The dependency chain: platform identity + cross-asociatie RLS, server-side provisioning, mandatory hardened MFA, the separate app shell and the asociații + admin provisioning console are done (see COMPLETED.md); the remaining oversight surfaces are T95 (cross-asociatie audit viewer), T96 (platform error feed), T97 (usage/health metrics), T98 (audited impersonation), T99 (admin↔superadmin messenger), plus the access/provisioning E2E and live wiring (T119-T121). Track the work under those; this entry stays as the umbrella.

### ⬜ T119 — [P2] Platform-shell access E2E (gate denies non-superadmin, grants superadmin)
Surfaced in the platform-shell build: the platform gate's decision is unit-tested as a pure function, but the wired shell has no end-to-end coverage. Add Playwright coverage for the platform origin: the demo console smoke (enter demo → reach `/consola` overview → sign out returns to the platform login), and, in the live path (folding into T08 once a backend exists), that a non-superadmin session lands on the denial screen while a `super_admin` reaches the console. Authored to run against `platform.html`. Prereq: platform shell (done); coordinates with T08.

### ⬜ T120 — [P2] Live activation: cross-tenant asociații list read + server-mediated provisioning
Surfaced in the provisioning-console build: the console's asociații list + provisioning run fully against the offline `platformAsociatiiStore` (seeded from the demo dataset). Wire the live path behind `isSupabaseConfigured`: (1) hydrate the list from a real cross-tenant read of `asociatii` under the super_admin RLS, with real member counts (from `memberships`) and apartment counts (from `apartments`), falling back to the local store offline; (2) route the provisioning write through the service-role Netlify function (create the asociație + the admin's auth account, re-verifying `super_admin` server-side) instead of the local-only store mutation, surfacing a user-visible error on failure. Keep the demo path as the offline fallback. Requires a provisioned project. Coordinates with T97 (the counts feed usage/health).

### ⬜ T121 — [P2] E2E for the asociații provisioning console (platform app)
Surfaced in the provisioning-console build: the provisioning logic + store are unit-tested but the wired page has no end-to-end coverage. Add a Playwright happy-path against `platform.html` (folding into T119/T08): enter the demo console, open `/consola/asociatii`, provision a new asociație (fill name/city/admin name + email), and assert it appears in the list with its admin's setup code and a pending-setup badge; also assert the inline validation blocks an empty/invalid form. Authored to run offline in demo. Coordinates with T119.

### ⬜ T95 — [P2] Cross-asociatie audit viewer (platform app)
Surface the T09 tamper-evident audit trail across **all** asociații in the superadmin app, read-only: aggregate every asociație's hash-chained log, show a per-asociație chain-integrity badge (`verifyChain`), and reuse the T09 filters (actor/action/entity/text/date) plus an asociație filter, so the superadmin can see what each admin is doing platform-wide. Cross-tenant read is granted only to `super_admin`. Breaks down T20. Prereq: T09, platform shell.

### ⬜ T96 — [P2] Platform error feed (superadmin app)
Give the superadmin visibility into app problems: persist the scrubbed error reports from the T07 `errorReporting` hook (no PII, the `IV-XXXX-XXXX` reference) to a `super_admin`-readable store/table and surface them as a filterable feed in the platform app (message, reference, route, count, first/last seen), so the two superadmins can spot errors and regressions. Wire to the live sink (T82) when present; demo shows the local report buffer. Breaks down T20. Prereq: T07, platform shell; coordinates with T82.

### ⬜ T97 — [P2] Platform usage/health metrics (superadmin app)
A platform dashboard of per-asociație health: member count, enabled features, recent activity (announcements/tickets/votes in a window), last admin sign-in, and platform-wide rollups, so the superadmin can see adoption and spot dormant or struggling asociații. Read-only, cross-tenant under super_admin RLS; demo computes from the seeded stores. Breaks down T20. Prereq: platform shell.

### ⬜ T98 — [P2] Audited superadmin impersonation (read-only)
Let a superadmin enter a chosen asociație's context **read-only** to diagnose a reported problem, with every entry and exit written to the audit trail (actor, asociație, when) so impersonation is never silent. No write actions while impersonating; a clear, persistent banner shows the impersonated tenant. The privileged context switch is server-mediated (a service-role function) and re-checks `super_admin`. Security-sensitive. Breaks down T20. Prereq: T09, platform shell.

### ⬜ T99 — [P2] Admin ↔ superadmin support messenger
A back-and-forth messenger between an asociație's admins and the platform superadmins, modeled on F04 (`adminchat`: `private_threads`/`private_messages`, thread + embedded messages, per-message read receipts, open/resolved status): a per-asociație support thread where admins raise issues to the superadmin and the superadmin replies. The admin side lives in the main app (a "Contact platformă" surface), the superadmin side is an inbox across all asociații in the platform app. Bilingual on the admin side, demo + live, scoped so only that asociație's admins and the superadmins see a thread. Breaks down T20. Prereq: platform shell.

### ⬜ T19 — [P2] SaaS billing & plans
Subscription tiers per asociație with per-tier feature/usage limits enforced server-side, a billing abstraction (Stripe-ready, mocked in demo mode), invoices/receipts, billing admin surface. Dunning + grace handling. Note: this is platform-subscription billing (vecini.online charging the asociație), NOT asociatie-internal resident accounting, which is out of scope (see `DECISIONS.md`).

### ⬜ T110 — [P2] Present consumer pre-contractual info + withdrawal at the point of sale (billing)
Surfaced in T24: the consumer-protection information now lives on the `/protectia-consumatorului` page and is referenced from Terms, but for a consumer distance contract the pre-contractual information (main characteristics, total price incl. taxes, billing period, duration, renewal/cancellation) and the right-of-withdrawal notice must be presented **at the moment of purchase** on a durable medium, and where the service starts during the withdrawal period the consumer must give express consent + acknowledge losing the right once fully performed (OUG 34/2014). When the billing surface (T19) lands, render this at checkout/plan-selection (a clear pre-contractual summary + an express-consent checkbox + a confirmation on a durable medium), reusing the `consumerRights` content as the single source. Behind the billing flow; demo shows the mock checkout. Prereq: T19, T24.

### Later (P3 — speculative / optional)

### ⬜ T108 — [P3] Rich per-card home widgets (beyond feature-shortcut links)
Surfaced in T12: F67 makes the home's feature-shortcut cards customizable (show/hide/reorder/size), but each card is still a plain icon+title link, while the F67 spec envisions each card exposing a small live widget (latest announcement, my open tickets, next event, active polls, etc.). Add per-feature home-widget content rendered inside the card (especially when sized `expanded`), drawn from the active asociație's stores, so a pinned card shows useful at-a-glance state rather than just a shortcut. Keep the widget content pure/derived and bilingual; reuse the existing per-asociație selectors. Prereq: T12.

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
