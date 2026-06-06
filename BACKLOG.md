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

MVP spine + three-stage deployment (PROD/DEV/DEMO) are done and green; archived in `COMPLETED.md`. All 67 features (F01–F67) are fully live-wired. E2E closure, live hardening, GDPR, Telegram go-live, the platform console shell (all 8 sections), and SaaS billing are complete and archived. Open work: **Platform console completion** (T249–T256, tenant management depth) and **Code-health refactors** (T244–T247).

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
> **Status (updated 2026-06-05):** Every MVP, hardening, GDPR, platform-console-shell, billing, and perf/a11y task (T15–T243) is complete and archived in `COMPLETED.md`; the redundant `✅` blocks that had accumulated here were removed in the 2026-06-05 cleanup. Two open groups remain: **Platform console completion** (T249–T256, makes the superadmin console fully able to manage tenants, not just list them) and **Code-health refactors** (T244–T247). See `DECISIONS.md`.

## MVP presentation spine — complete (see COMPLETED.md)

## Three-stage deployment (PROD / DEV / DEMO) — complete (see COMPLETED.md)

## Main queue

> Updated 2026-06-05. The redundant `✅` blocks that had accumulated here were removed (they duplicated `COMPLETED.md`). Open groups, picked top-to-bottom: **Platform console completion** (T249-T256, closes the real operability gaps in the superadmin console so it can manage tenants, not just list them), **Code-health refactors** (T244-T247, no user-facing change, from the dedup/cleanup audit), the **performance toggle** (T257), and the **2026-06-05 deep-analysis groups** D-H (T258-T277): observability (T258-T261), client performance & PWA (T262-T265), UX/flows/forms (T266-T269), accessibility & localization quality (T270-T272), and engineering standards & DX (T273-T277). Each platform task follows the same Definition of Done: demo-first + live-ready behind `isSupabaseConfigured`, every privileged write in a service-role Netlify function that re-checks `is_super_admin()`, audited into the tamper-evident chain where it mutates a tenant, RLS scoped, bilingual RO/EN, premium-feel, unit + E2E tests.

### Group A — Platform console completion

> The superadmin console (`src/platform/*`) ships all 8 planned sections (T20 → T91-T100, all ✅), but several are read-mostly: it can list and provision asociații yet cannot suspend/manage them, has no platform-team management, no live aggregate dashboard, and no tenant-wide broadcast. These tasks close those gaps. The platform app is a separate Vite build on its own subdomain; never reachable from the resident/admin origin.

### ✅ T249 — [P1] Asociație detail page + lifecycle (suspend / reactivate / archive)

Today `/consola/asociatii` is list + provision only; there is no way to open a single tenant or change its state. Add a tenant detail route `/consola/asociatii/:id` showing the full identity (name, city, address, CUI, IBAN, contacts), member/apartment counts, last admin sign-in, health/dormant signal, current subscription (link to T254), and the provisioned admin(s). Add a lifecycle control with three states on the `asociatii` row (`active` | `suspended` | `archived`): **suspend** (tenant members are blocked from signing in / app goes read-only and shows a suspension notice; superadmin-set reason), **reactivate**, and **archive** (soft-delete: hidden from default lists, excluded from active counts, recoverable). New migration adds a `status` column (default `active`) + `status_reason` + `status_changed_at` to `asociatii`, with an RLS/`is_member` guard so a suspended/archived tenant cannot mutate. The privileged write is a new `netlify/functions/asociatie-lifecycle.ts` (POST, bearer auth, re-checks `is_super_admin()`, service-role) that flips the status and appends `asociatie.suspended`/`asociatie.reactivated`/`asociatie.archived` to that tenant's audit chain (extend `AUDIT_ACTIONS`). Demo drives a persisted platform store action offline. Surface a status badge on the asociații list cards and a filter (active/suspended/archived). Bilingual, premium-feel, unit tests for the store + lifecycle logic, one E2E (suspend → badge flips → reactivate). Prereq: T120 (live asociatii list), platform shell.

### ✅ T250 — [P1] Pending-invite resend / revoke + per-tenant admin roster

The pending-invites section on the asociații page is display-only, and after provisioning the first admin there is no way to manage a tenant's administrators. On the T249 detail page (or the existing pending list) add: **resend invite** (re-mints the setup link + re-sends the admin email via the existing provisioning function; rate-limited; updates `invitedAt`), **revoke invite** (invalidates an unredeemed setup code so the link no longer works), **provision an additional admin** (reuse the T92 service-role provisioning path to add a second administrator to an existing asociație), and **revoke an admin's access** (remove the `admin` membership server-side, audited). Each privileged action runs through a service-role function re-checking `is_super_admin()` and is audited (`admin.provisioned` exists; add `admin.invite_revoked` / `admin.access_revoked`). Demo exercises the mock path end-to-end. Bilingual, premium-feel, unit + E2E tests. Prereq: T92/T120, T249.

### ✅ T251 — [P1] Platform team management (manage `platform_admins`)

There is no UI to see or manage who the superadmins are; `platform_admins` is only read for auth gating. Add a `/consola/echipa` section (sidebar + overview card): list current platform admins (name, email, added date, last sign-in), **invite a new platform admin** (service-role function that creates the auth account with mandatory-MFA posture per T100 and inserts the `platform_admins` row), and **revoke a platform admin** (with a guard that the last remaining superadmin cannot be removed, and never self-revoke in a way that locks everyone out). Every change is audited to a dedicated platform-level audit stream (or the cross-tenant audit chain with a `platform` scope) so the superadmin roster itself is tamper-evident. Mandatory hardened MFA (T100) applies to every account minted here. Demo seeds 2 platform admins and drives invite/revoke against a persisted store. Bilingual, premium-feel, unit + E2E tests, RLS so only `super_admin` can read/write the roster. Prereq: T91, T100, platform shell.

### ✅ T252 — [P2] Live overview dashboard with real cross-tenant KPIs

In live mode `PlatformHomePage` shows no metrics (only a "live metrics note"); the real numbers already exist in the T95/T96/T97/T99/T19 hydrate paths but are never aggregated on the landing page. Turn the overview into a real operations dashboard: total asociații (active/suspended/dormant breakdown), total members + apartments, 30-day activity (announcements/tickets/votes) rollup, MRR + overdue-invoice count (from subscriptions), open support threads awaiting reply, and recent error-group count, each linking to its section. Reuse the existing `hydrateUsageMetrics` / `platformSubscriptionsStore` / `platformMessengerStore` / `platformErrorStore` selectors (add a small `computeOverview()` pure rollup); no new tables. Keep the demo dataset numbers working offline. Bilingual, premium-feel, unit tests for `computeOverview`. Prereq: T97, T19, T99, T96.

Done: added `platformOverviewLogic.ts` with `computeOverview()` (pure, 5-input rollup); rewired `PlatformHomePage` with three KPI sections (associations breakdown, 30-day activity, operations); all 8 section cards now link to their live pages; 16 unit tests; bilingual RO/EN; CSS sub-label dots for health/lifecycle status. All pipelines green.

### ✅ T253 — [P2] Platform-wide broadcast / maintenance notice

The superadmin has no way to communicate with all tenants at once (planned maintenance, incident notice, policy change). Add a `/consola/anunturi-platforma` section to compose a platform broadcast (title + body, severity info/warning/critical, optional scheduled window) that fans out as an **essential** communication (consent-bypassing like F03) to every tenant, and renders as a dismissible banner in the resident/admin app for the targeted audience (all tenants, or a chosen subset). New `platform_broadcasts` table (super_admin write; all members read active ones) + a render hook in the main app shell. Each publish/expire is audited. Demo shows a seeded active broadcast banner offline. Bilingual, premium-feel, unit tests + one E2E (publish → banner appears in app → dismiss). Prereq: platform shell, T14 (notification fan-out) for the live dispatch.


### ✅ T255 — [P3] Cross-tenant global search

A support operator should jump straight to a tenant/admin without scrolling the list. Add a command-palette-style global search in the platform topbar (mirroring the main app's `CommandPalette`) that searches asociații by name/city/CUI and provisioned admins by name/email across all tenants (super_admin RLS), returning links to the T249 detail page. Live query is debounced and capped; demo searches the seeded dataset. Bilingual, premium-feel, unit tests for the pure search/rank helper. Prereq: T249.

### ✅ T256 — [P3] Per-tenant feature-flag overrides

Support sometimes needs to enable/disable a specific feature for one tenant (e.g. turn off a misbehaving module, or pilot a feature). Add a per-asociație feature-override surface on the T249 detail page that lets the superadmin override the `registry.ts` defaults per tenant, persisted in a new `asociatie_feature_overrides` table (super_admin write; members read their own tenant's overrides) and merged into the resident app's enabled-features computation (the resolver already filters by flags+role; add the override layer). Each change is audited. Demo drives a persisted store and reflects the toggle in the running app. Bilingual, premium-feel, unit tests for the merge logic + one E2E. Prereq: T249.

### Group B — Code-health refactors

> From the 2026-06-05 dedup/cleanup audit. No user-facing change; sequenced by ROI and risk.

### ✅ T244 — [P2] Shared per-asociatie store factory

The ~53 live-wired features each hand-roll the same Zustand store shape: `byAsociatie: Record<string, T[]>` state, a `seed*`/`*ForAsociatie` selector pair, `replaceForAsociatie`, `setFetchError`, a `useAsociatie*()` hook scoped to the active asociație, and `persist({ version: 1, migrate })` that reseeds demo data. This is ~3K LOC of near-identical boilerplate (see `accessStore.ts`, `bikesStore.ts`, `parkingStore.ts`, etc.). Extract a generic `createAsociatieStore<T>(config)` factory in `src/shared/store/` that returns the store + the `useAsociatie*` hook, leaving each feature to supply only its seed data, demo source, and domain actions. Migrate 3–4 representative stores first to prove the seam (one with extra per-row actions, one plain list), keep every existing `useAsociatie*` hook name + signature stable so pages don't change, and verify the full unit + E2E suite stays green. Break the remaining stores into follow-up sub-tasks if one `make progress` unit cannot land them all. No behavior change; persisted-state `version`/`migrate` semantics must be preserved exactly so existing localStorage hydrates. Prereq: none.

### ✅ T245 — [P2] Shared role-permission helper (roleUtils)

The governance permission check `role === 'admin' || role === 'presedinte' || role === 'comitet'` (and close variants) is inlined across 15+ `*Logic.ts` files (`canManageAnnouncements`, `canManagePetitions`, `canManagePriorities`, `canManagePv`, `canManageRepairs`, etc.). Extract the role sets into one `src/shared/lib/roleUtils.ts` (e.g. `GOVERNANCE_ROLES`, `isGovernanceRole(role)`, plus any other recurring groupings the audit finds) and rewrite each `canManage*` to compose from it, preserving each function's exact current semantics (some include `cenzor` or `admin`-only — do not flatten distinct rules into one). Add a focused unit test for the helper and keep each feature's existing `canManage*` test green. Pure mechanical refactor; no RLS or server change (server-side checks stay authoritative). Prereq: none.

Done: created `src/shared/lib/roleUtils.ts` with `GOVERNANCE_ROLES` (Set), `isGovernanceRole()`, `BOARD_ROLES` (Set), and `isBoardRole()`; rewired all 10 canManage* functions + canModerateDiscussion to use `isGovernanceRole`, and canViewAnyProfile to use `isBoardRole`; added 16 unit tests in `tests/unit/roleUtils.test.ts`. All 298 test files (2868 tests) green, all 3 builds pass.

### ✅ T246 — [P3] Shared hydrate() abstraction for feature `*Api.ts`

The ~72 `*Api.ts` files repeat the same live-hydration shell: guard on `isSupabaseConfigured`, `select().eq('asociatie_id', id).order(...)`, error-check → `reportError` + `store.setFetchError`, map rows snake→camel, then `store.replaceForAsociatie`. Design a `createHydrator<Row, T>({ table, columns, transform, apply })` (or a thin `runHydration` wrapper) that encapsulates the query + error + store-update flow, so each feature supplies only its table name, row transform, and store updater. This one needs care: several hydrators do multi-table joins or JS-side tallying (polls/votes, petitions/signatures, budget) — scope the abstraction to the single-table majority and explicitly leave the join-based hydrators as-is (document which). Migrate a handful first; keep offline no-op behavior and every `*Api.test.ts` green. Prereq: T244 (shares the store-update seam).

### ✅ T247 — [P3] Shared frozen-empty-array helper

~40 `*Logic.ts` files each declare their own `const EMPTY_* = Object.freeze([])` to hand a stable reference to selectors (avoids re-render churn from a fresh `[]` each call). Add one `createEmptyArray<T>()` / `EMPTY_FROZEN` helper in `src/shared/lib/` and replace the per-file duplicates, keeping referential stability identical (the returned reference must stay constant across calls so memoized selectors are unaffected). Smallest-safe-step polish; no behavior change. Prereq: none.

### Group C — Performance

### ✅ T257 — [P2] User-facing performance / reduce-motion mode

The "lite" rendering tier (added 2026-06-05, see `DECISIONS.md`) strips the GPU-expensive glass/blur layer and is currently auto-enabled only on the Pi `dev` stage via `document.documentElement.dataset.perf` in `src/main.tsx` and gated in `src/styles/perf-lite.css`. Promote it to a real user preference so any low-end device (not just the Pi) can opt in: add a `?perf=lite` / `?perf=full` URL override and a persisted toggle in Settings (Zustand, mirrors `themeStore`'s `apply()` pattern that sets a root attribute), fully bilingual (RO+EN), defaulting to the stage-derived value when unset. Also fold `prefers-reduced-motion` into the same tier resolution so reduced-motion users get the calmer surface automatically. Keep PROD/DEMO visually unchanged when the preference is unset. Prereq: none.

### Group D — Observability & operational visibility

> From the 2026-06-05 deep-analysis pass. The app reports errors into an in-memory ring buffer + a platform table but has no persistence-across-refresh, no alerting, no coverage metrics, no bundle budget, and nothing watching the health endpoint. These close the operational-visibility gaps without adding a third-party data processor (in-house only, per `DECISIONS.md`).

### ✅ T258a — [P1] Durable error persistence + release/stage tagging

Errors today land in an in-memory 100-item ring buffer (`src/shared/lib/errorReporting.ts`, flushed via `errorSink.ts` -> `netlify/functions/error-report.ts` into the `platform_error_reports` table surfaced at `/consola/erori`, T96), but the buffer is lost on refresh and reports carry no build/stage context. Make client errors flush durably and reliably to `platform_error_reports` (retry/queue that survives a refresh, e.g. a small persisted outbox) and tag each report with the build release id + `VITE_APP_STAGE`. Preserve the existing PII/secret scrubbing exactly. Surface the release/stage on the `/consola/erori` group view. Keep it in-house (no third-party sink, no new CSP `connect-src` exception). Demo / no-key = no-op. Bilingual surfacing, unit tests for the tagging + flush-queue logic. Prereq: T96. (Split from the original T258.)

### ✅ T258b — [P2] Source-map symbolication for error stacks

Stack frames in `platform_error_reports` point at minified bundle positions and are unreadable. Emit hidden source maps on the PROD/DEV builds (kept private, not served publicly so the CSP/exposure posture is unchanged) and add a symbolication step (build-time upload to a private location the platform console can read, or an on-demand resolver in the `/consola/erori` view) that maps a captured frame back to original `file:line`. In-house only, no third-party sink. Unit test for the frame-mapping helper. Prereq: T258a.

Done: `sourcemap: 'hidden'` emitted for PROD/DEV via `loadEnv` in vite.config.ts function form; DEMO skips maps. CDN `.map` access blocked via `netlify.toml` 404 redirect. `stack` column added to `platform_error_reports` (migration + function + store + hydration). Pure `sourcemapUtils.ts` helper (Chrome + Firefox frame parsing, 13 unit tests). `netlify/functions/symbolicate-stack.ts` service-role function (fetches from private Supabase Storage bucket `source-maps/<release>/`, resolves with `source-map-js`). `scripts/upload-sourcemaps.mjs` post-build upload script. Platform errors page: expand/collapse raw stack, Symbolicate button with loading/error states, resolved frame display. Bilingual RO/EN. All 303 test files green, all 3 builds pass.

### ⬜ T258c — [P1] New-error / spike alerting

`platform_error_reports` is passive: nothing notifies the team when a new error group first appears or an existing one spikes. Add an alerting path that emails via the existing `_shared/resend.ts` wrapper and/or raises a flag on the platform overview when a group is first seen or crosses a rate threshold, with de-duplication so an error storm does not spam. In-house only (no new CSP `connect-src` exception); if the in-app store proves insufficient at scale, the documented follow-up is self-hosting a Sentry-compatible collector (GlitchTip) reached only via our own origin. Demo / no-key = no-op. Unit tests for the new-group + spike-trigger logic. Prereq: T258a.

### ⬜ T259 — [P2] Test-coverage tooling + threshold gate

There is no coverage measurement today (2,747 unit tests, but no line/branch metrics). Add the vitest v8 coverage provider, an `npm run test:coverage` script, an HTML report artifact in CI (`.github/workflows/ci.yml`), and a global threshold gate seeded at the current baseline so it can only ratchet upward. Exclude generated/demo-seed files from the denominator and surface a per-feature summary so thin spots are visible. No product change. Prereq: none.

### ⬜ T260 — [P2] Bundle-size budget + analyzer

Nothing guards bundle growth today. Wire `rollup-plugin-visualizer` into the Vite build to emit a treemap artifact, and add a `size-limit` (or `bundlesize`) gate in CI for the main entry + the largest route chunks so a careless import cannot silently bloat the initial payload. Record current sizes as the baseline in the config and document them. Pairs with T264. Prereq: none.

### ⬜ T261 — [P2] Health-probe alerting + ops runbook

`netlify/functions/health.ts` exists but nothing watches it, so an outage is invisible until a resident complains. Add a scheduled Netlify function (e.g. `@every 5m`) that probes `health` plus one lightweight Supabase round-trip and records anomalies to the platform error stream (and emails via `_shared/resend.ts` when configured), and add an `OPS_RUNBOOK.md` documenting external uptime monitoring (UptimeRobot/BetterUptime on the public health URL), the alert thresholds, and an escalation/on-call note. Demo = no-op. Unit test for the probe-evaluation logic. Prereq: none.

### Group E — Client performance & PWA

> From the 2026-06-05 deep-analysis pass. The manifest exists with no service worker, heavy libraries ship in shared chunks, images are unoptimized, and the realtime subscription lifecycle is unverified.

### ⬜ T262 — [P1] Audit + fix realtime subscription lifecycle

`useRealtimeSync` subscribes to Supabase channels from `AppLayout`. Verify the channels are reliably torn down on unmount and, crucially, on a tenant/persona switch (dev role switcher, impersonation start/stop) so subscriptions cannot leak or bleed events across tenants. Trace the subscribe/unsubscribe path in `src/shared/.../realtime*` and `AppLayout.tsx`; if a leak or cross-tenant bleed is possible, fix it (key the channel by `asociatie_id`, unsubscribe in the effect cleanup) and add a regression test that asserts teardown on tenant change. If already clean, document the guarantee in a test and downgrade the residual to P3. Prereq: none.

### ⬜ T263 — [P2] Service worker / installable PWA

`public/manifest.webmanifest` exists (with `pwaManifest.test.ts`) but there is no service worker, so the app is installable in name only with no offline shell. Add `vite-plugin-pwa` (or a hand-rolled SW) providing an offline app-shell + a cache strategy aligned with the offline-first demo ethos, an "update available" prompt when a new build ships, and correct behavior across all three stages (no stale-cache surprises in DEV/DEMO; SW disabled or scoped appropriately where it would interfere with the Pi/demo flows). Keep the strict CSP intact. Unit/E2E check that the SW registers in PROD and the app still boots offline after first load. Prereq: none.

### ⬜ T264 — [P2] Lazy-load heavy dependencies

Heavy libraries such as `xlsx` (and any PDF/render libs used by few features) currently sit in shared/vendor chunks even though only a handful of export/report features need them. Convert those imports to dynamic `import()` at the call sites (behind the existing export buttons) so they leave the initial and common route bundles, load on demand, and show a small loading state while fetching. Confirm the reduction with the T260 analyzer. Prereq: T260 (to measure before/after).

### ⬜ T265a — [P2] Shared `<Photo>` component with lazy/async rendering

User-uploaded photos (tickets, project journal, parking, visitor reports, etc.) render via plain `<img>` with no `loading="lazy"`, no `decoding="async"`, and no width/height hints, causing layout shift and eager network use. Add a shared `<Photo>` image component (`loading="lazy"`, `decoding="async"`, intrinsic width/height, graceful fallback) and migrate the photo render sites onto it. No upload-path change. Keep the demo-stub image paths working. Unit test for the component. Prereq: none. (Split from the original T265.)

### ⬜ T265b — [P2] Client-side image downscale before upload

Photos are stored at full camera resolution, inflating Storage cost and bandwidth. Add a client-side downscale + re-encode step (canvas: cap longest edge + target quality) applied before upload at the photo-upload call sites, skipping re-encode for already-small images. Keep the demo-stub upload path working when Storage is absent. Unit test for the resize helper. Prereq: none.

### Group F — UX, flows & forms

> From the 2026-06-05 deep-analysis pass. Form validation is hand-rolled per page, long forms discard input on navigation, and a few flows lack polish.

### ⬜ T266 — [P2] Consolidate hand-rolled form validation + drop unused dep

Forms are hand-rolled (`validateApartment` + local `useState` in `ApartmentFormPage.tsx`, and similar across feature forms) with slightly different error handling per page; `react-hook-form` is in `package.json` but has zero call sites. Per `DECISIONS.md`, do not introduce a form framework: codify the existing pattern into one small shared helper (a `useFormState` / field-validation utility that drives the existing Input/Select/Textarea `error` + `aria-invalid` props consistently), migrate a few representative forms onto it to prove the seam, and remove the unused `react-hook-form` dependency. No behavior change beyond more consistent error display. Unit tests for the helper. Prereq: none.

### ⬜ T267 — [P2] Unsaved-changes guard

Long create/edit forms (apartment, AGA agenda, RFP/quotes, profile) silently discard typed input when the user navigates away or closes the tab. Add a shared dirty-state guard: a React Router navigation block + `beforeunload` handler that prompts with a bilingual (RO/EN) confirm when the form is dirty, wired through the T266 form helper so every adopting form gets it for free. Premium-feel modal confirm. Unit test for the dirty-tracking logic, one E2E (edit, navigate, see prompt). Prereq: T266.

### ⬜ T268 — [P3] Onboarding progress indicator

The first-run welcome carousel (`src/features/welcome/`) is a 3-slide flow with no step counter, no progress bar, and no obvious skip, so users do not know how far they are. Add a `1 / 3` progress affordance (dots or bar) and a clear "skip" control, premium-feel and bilingual, without changing the seen-per-user persistence. Unit test for the step logic. Prereq: none.

### ⬜ T269 — [P3] Empty-state consistency audit

Some pages route empty lists through the shared `EmptyState` component (icon + title + body + optional action); others inline ad-hoc "no results" text. Sweep the feature pages and replace every ad-hoc empty rendering with `EmptyState`, with appropriate bilingual copy and a primary action where one makes sense (e.g. "Add the first announcement"). No logic change. Prereq: none.

### Group G — Accessibility & localization quality

> From the 2026-06-05 deep-analysis pass. Landmarks and reduced-motion are already handled; remaining gaps are document language sync, automated a11y scanning, and Romanian plural grammar.

### ⬜ T270 — [P2] Sync `<html lang>` to the active locale

The document root `lang` is static, so switching the UI to English never updates `document.documentElement.lang` and screen readers keep announcing content with Romanian pronunciation rules. Set `lang` from the i18next `languageChanged` handler at app init in both apps (`src/main.tsx`, `src/platform/main.tsx`), initialized to the persisted language on first paint. Small, high-value a11y fix. Unit/integration test asserting the attribute updates on language change. Prereq: none.

### ⬜ T271 — [P2] Automated a11y scan in E2E + fixes

`@axe-core/playwright` is available but not run as an explicit gate across representative surfaces. Add axe scans over a key set (dashboard, one feature list page, a form page, an open modal, the login page) in the Playwright suite with a fail-on-serious/critical gate, then fix what it surfaces (likely candidates: icon-only buttons missing `aria-label`, focus order in custom widgets like the DatePicker, any contrast misses). Keep the gate green. Prereq: none.

### ⬜ T272 — [P2] Romanian plural-form correctness

Count-bearing strings appear to use single-form keys, but Romanian has three plural categories (one: 1; few: 2-19; many: 20+ which also inserts "de", e.g. "21 de anunțuri"). Audit the locale files for count strings and convert them to i18next plural keys (`key_one` / `key_few` / `key_other`) in both `ro.json` and `en.json`, fixing the grammar at each call site (`t(key, { count })`). Add a test/lint guard that flags new count interpolations not using the plural form. Prereq: none.

### Group H — Engineering standards & developer experience

> From the 2026-06-05 deep-analysis pass. Shared UI primitives and the design system lack direct tests, a catalog, and drift protection; dependency hygiene is unguarded.

### ⬜ T273 — [P3] Unit tests for shared UI primitives

The shared primitives (`Button`, `Input`, `Select`, `Textarea`, `Modal`, `Switch`, `Checkbox` in `src/shared/components/`) have no direct component tests; only `*Logic.ts` and stores are covered. Add focused render/interaction/a11y tests (variants render, disabled/loading states, error wiring sets `aria-invalid` + `aria-describedby`, modal focus-trap + Escape, switch/checkbox `role`/`aria-checked`). Raises confidence before the T244/T266 refactors touch shared code. Prereq: none.

### ⬜ T274 — [P3] Visual component gallery

There is no catalog of the design system's variants, so contributors reverse-engineer them from CSS. Add a lightweight in-app gallery (a `/dev/components` route gated to dev/demo, or Ladle) that renders Button/Input/Card/Badge/Modal/Select variants across themes (light/dark) and the five palettes, so design review and drift-spotting are one click away. Not shipped to PROD users. Prereq: none.

### ⬜ T275 — [P3] Visual-regression snapshots

Design drift currently slips through (no screenshot diffing). Add Playwright screenshot snapshots for a few key surfaces (dashboard, a feature page, a modal, login) across light/dark and a couple of palettes, with baselines committed and diffs surfaced on CI. Keep the baseline set small and deterministic (freeze time/animations). Pairs with T274. Prereq: none.

### ⬜ T276 — [P2] Disaster-recovery + key-rotation runbook

Backup/restore and secret rotation are undocumented; the audit-HMAC (T87) and token-rotation work explicitly deferred the emergency-revocation and key-rotation procedures. Add a `DR_RUNBOOK.md` covering RTO/RPO targets, a quarterly Supabase restore-from-backup drill (with a step-by-step), and the rotation procedures for `SUPABASE_SERVICE_ROLE_KEY`, `AUDIT_HMAC_SECRET`, `TELEGRAM_BOT_TOKEN`/webhook secret, and `RESEND_API_KEY`, plus the JWT/token emergency-revocation path. Add a scripted restore-smoke if feasible. Docs + checklist; no product change. Prereq: none.

### ⬜ T277 — [P3] Dependency hygiene gate

Unused and vulnerable dependencies are unguarded (e.g. `react-hook-form` sat unused until T266). Add a `depcheck` pass to flag unused/missing deps and an advisory `npm audit` (high/critical) step in CI, and document the triage policy (when to upgrade vs. accept). Keep it advisory-first so it does not block on noisy transitive advisories. Prereq: none.

---

## On hold

> Tasks parked indefinitely — not picked by any trigger until explicitly reinstated.

### ⏸ T254a — [P2] Platform-side subscription: change plan + comp / credit

`PlatformSubscriptionsPage` (`platformSubscriptionsStore.ts`) can only `markPaid`; a complete billing console needs to act on a tenant's plan. Add the two plan-mutating actions: **change plan** (move a tenant between the 3 canonical tiers with a prorated note) and **comp / apply credit** (set a tenant to a free or discounted plan with a reason, e.g. early adopter). Each privileged write is a service-role Netlify function re-checking `is_super_admin()`, audited into the tenant's chain, and mirrored to the `subscriptions` table. Demo drives the persisted `platformSubscriptionsStore`. Bilingual, premium-feel, unit tests for the new store actions + one E2E (change plan -> tier badge updates). Prereq: T19. (Split from the original T254; T254b covers payment + dunning.)

### ⏸ T254b — [P2] Platform-side subscription: record manual payment + trigger dunning

Building on T254a, add the two invoice/lifecycle actions: **record a manual payment** (offline bank transfer marks an invoice paid with a reference) and **trigger dunning** (move an overdue subscription into the grace/past-due flow that the T19 banners already render). Each privileged write is a service-role function re-checking `is_super_admin()`, audited, and mirrored to the `invoices`/`subscriptions` tables. Demo drives the persisted platform store. Bilingual, premium-feel, unit tests for the new store actions + one E2E (record payment -> invoice flips to paid). Prereq: T254a, T19.

### End of queue

When all groups clear, the overnight script's audit/replenish pass generates the next wave.
