# COMPLETED — vecini.online

Permanent archive of finished `make progress` tasks, newest first.
Reference only -- not read during a normal `make progress` task.
`RESUME.md` §0 is the dated chronological summary.

### T266 ✅ 2026-06-06 -- Consolidate hand-rolled form validation + drop unused dep

Created `src/shared/lib/useFormState.ts`: a small `useFormState<TErrors>(errors)` hook that encapsulates the "submitted" gate used by hand-rolled forms. Returns `{ submitted, fieldError, handleSubmit, isValid }` -- `fieldError(key)` returns the raw error code only after `handleSubmit()` is called, ensuring pristine forms never show red text on first paint. `handleSubmit()` sets submitted and returns `isValid` synchronously so save handlers can bail out in one expression. Migrated two representative forms: `ApartmentFormPage.tsx` (replaced `submitted`/`setSubmitted` + fixed 3 fields that incorrectly bypassed the submitted gate) and `BuildingSettingsPage.tsx` (replaced `touched`/`setTouched` + local `fieldError` helper). Removed unused `react-hook-form@^7.54.1` and `@hookform/resolvers@^3.9.1` from `package.json`. Added 11 unit tests in `tests/unit/useFormState.test.ts`. All 311 test files (3029 tests) green, all 3 builds pass.
- new: src/shared/lib/useFormState.ts, tests/unit/useFormState.test.ts
- modified: src/features/admin/ApartmentFormPage.tsx, src/features/admin/BuildingSettingsPage.tsx, package.json

### T265b ✅ 2026-06-06 -- Client-side image downscale before upload

New `src/shared/lib/imageResize.ts`: exports `PHOTO_MAX_EDGE` (2048 px), `PHOTO_JPEG_QUALITY` (0.82), `isResizableImage(mime)` (PNG/JPEG/WebP only; GIF/SVG/PDF pass through), `calcResizeDimensions(w, h, maxEdge)` (pure aspect-ratio geometry, returns null when already small), and `downscalePhoto(file, maxEdge?, quality?)` (canvas-based resize returning a new JPEG File, with safe fallback to the original on any decode/canvas failure). Wired into: `ticketsApi.uploadTicketAttachments` (live path), `announcementsApi.uploadAnnouncementAttachments` (live path), `TicketsPage` demo submission path (before readFileAsDataUrl), `AnnouncementsPage` file-selection path (before readFileAsDataUrl). Non-image files and already-small images pass through unchanged in all paths. 23 unit tests in `imageResize.test.ts` covering: constants range, isResizableImage (all accepted/rejected types), calcResizeDimensions (boundary, landscape, portrait, square, custom maxEdge), downscalePhoto (pass-through for non-image/GIF/SVG, fallback contract via Image stub). All 310 test files (3018 tests) green, all 3 builds pass.
- new: src/shared/lib/imageResize.ts, tests/unit/imageResize.test.ts
- modified: src/features/tickets/ticketsApi.ts, src/features/announcements/announcementsApi.ts, src/features/tickets/TicketsPage.tsx, src/features/announcements/AnnouncementsPage.tsx

### T265a ✅ 2026-06-06 -- Shared `<Photo>` component with lazy/async rendering

New `src/shared/components/Photo.tsx`: `memo`-wrapped component accepting `src: string | null | undefined`, `alt`, optional `fallback: ReactNode`, `className`, and any standard img attributes. Renders `<img loading="lazy" decoding="async" ...>` when src is provided; shows `fallback` (or null) when src is absent or an `onError` fires. Migrated the two existing user-photo render sites (`ProfilePage.tsx` avatar, `WelcomeProfile.tsx` avatar) from inline ternaries to `<Photo>` -- no behavior change. 8 unit tests in `Photo.test.tsx` covering: img present, lazy/async attrs, className forwarding, null src, undefined src, onError fallback, no-fallback (renders nothing), width/height forwarding. All 309 test files (2995 tests) green, all 3 builds pass.
- new: src/shared/components/Photo.tsx
- modified: src/features/profile/ProfilePage.tsx (import Photo; replace avatar ternary)
- modified: src/features/welcome/WelcomeProfile.tsx (import Photo; replace avatar ternary)
- new: tests/unit/Photo.test.tsx (8 tests)

### T264 ✅ 2026-06-06 -- Lazy-load heavy dependencies

Audit confirmed xlsx was already lazy via `await import('xlsx')` in `csv.ts` and `ApartmentsPage.tsx`; the named `xlsx` chunk in `manualChunks` gives it a predictable name for the bundle-size budget check without making it eager. Added loading states to both xlsx-triggered paths: `handleDownloadExcel` sets `isDownloadingXlsxTemplate` (spinner icon + `disabled` on the dropdown menu item in both the header and empty-state dropdowns), `handleExportApartmentsExcel` sets `isExportingXlsx` (passed as `loading` prop to the Export List button); both wrapped in try/finally so state always resets. Added `Loader2` from lucide-react for the dropdown spinner. Added `tests/unit/xlsxLazy.test.ts` (3 tests) documenting the lazy-load contract. Bundle check confirmed: xlsx chunk 419 kB (budget 450 kB), main entry 162 kB -- xlsx contributes 0 to initial load. All 308 test files (2987 tests) green, all 3 builds pass.
- modified: src/features/admin/ApartmentsPage.tsx (Loader2 import; isDownloadingXlsxTemplate + isExportingXlsx state; loading wrappers; spinner on dropdown items; loading prop on Export button)
- new: tests/unit/xlsxLazy.test.ts (3 tests)

### T263 ✅ 2026-06-06 -- Service worker / installable PWA

Installed `vite-plugin-pwa@1.3.0`. PROD and DEMO builds generate a full Workbox precache SW (221 entries, ~2.8 MB) via `generateSW` mode with `registerType: 'prompt'` and `injectRegister: null`. DEV (Pi) builds use `selfDestroying: true` -- the generated SW unregisters itself and clears all caches on activate, keeping rapid Pi iteration cache-free. The plugin is always present in the Vite config so `virtual:pwa-register/react` resolves in every build without conditional imports. `devOptions.enabled: false` keeps the Vite dev server fast. The `navigateFallback` (`/index.html`) is denied for `/platform/*` routes, `/.netlify/*` functions, and `*.map` files. CSP `worker-src 'self' blob:` already covered the SW. New `<UpdatePrompt>` component renders a floating pill (`update-prompt` CSS class) when `needRefresh` is true, using `useRegisterSW` hook; bilingual RO/EN copy; "Update now" calls `updateServiceWorker(true)`. Wired into `AppProviders`. 9 unit tests in `swRegistration.test.ts`. All 307 test files (2984 tests) green, all 3 builds pass.
- new: src/shared/components/UpdatePrompt.tsx
- new: tests/unit/swRegistration.test.ts (9 tests)
- modified: vite.config.ts (VitePWA import + plugin config)
- modified: src/vite-env.d.ts (pwa-register type reference)
- modified: src/app/providers.tsx (UpdatePrompt wired in)
- modified: src/styles/shell.css (.update-prompt CSS)
- modified: src/shared/locales/ro.json + en.json (pwa.* keys)
- devDep: vite-plugin-pwa@1.3.0

### T262 ✅ 2026-06-06 -- Realtime subscription lifecycle audit

Traced `useRealtimeSync` (src/app/useRealtimeSync.ts) + AppLayout.tsx. Implementation already correct: `useEffect([asociatieId])` creates channel `rt-{aid}` on mount, calls `supabase.removeChannel(channel)` in the cleanup on unmount and on every tenant switch. Closure-captured `aid` ensures late-arriving network frames write to the correct store partition with no cross-tenant bleed. Demo mode (isSupabaseConfigured === false) and Pi DEV stage (appStage === 'dev') both return early -- no channels opened. No impersonation mechanism exists. Added `tests/unit/realtimeSyncLifecycle.test.ts` (7 tests) with `vi.hoisted` Supabase mock asserting channel create/teardown on mount, unmount, tenant switch (A → B), and null transitions. All 306 test files (2975 tests) green, all 3 builds pass.
- new: tests/unit/realtimeSyncLifecycle.test.ts (7 lifecycle regression tests)

### T261 ✅ 2026-06-06 -- Health-probe alerting + ops runbook

Scheduled Netlify function `health-probe` (`*/5 * * * *`) probes the public health endpoint (5 s timeout) and does a Supabase `asociatii` round-trip; anomalies are inserted into `platform_error_reports` as `HealthProbeFailure` and emailed via Resend to `PLATFORM_ALERT_EMAIL` with a 30-minute in-memory de-dup window. Pure `healthProbeLogic.ts` exposes `evaluateProbeResult`, `shouldAlertProbe`, and `buildHealthAlertEmail` with 19 unit tests. Added `OPS_RUNBOOK.md` covering UptimeRobot/BetterUptime external monitor setup, internal probe env vars, alert thresholds, and escalation steps. Schedule wired in `netlify.toml`. No-op when Supabase is unconfigured. All 305 test files (2968 tests) green, all 3 builds pass.
- new: netlify/functions/health-probe.ts (scheduled function)
- new: netlify/functions/_shared/healthProbeLogic.ts (pure logic)
- new: tests/unit/healthProbeLogic.test.ts (19 tests)
- new: OPS_RUNBOOK.md
- modified: netlify.toml (schedule entry for health-probe)

### T260 ✅ 2026-06-06 -- Bundle-size budget + analyzer

Installed `rollup-plugin-visualizer@7.0.1`; configured it in `vite.config.ts` to emit `dist/stats.html` (gzip-annotated treemap) on every build. Wrote `scripts/check-bundle-size.mjs` with 7 pattern-matched budgets at the 2026-06-06 baseline (main 200 kB, react-vendor 230 kB, supabase 230 kB, xlsx 450 kB, legal 475 kB, i18n 70 kB, apartmentsStore 75 kB) -- exits 1 if any budget is blown. Added `bundle:check` and `build:analyze` npm scripts. Updated CI to run `bundle:check` after build and upload `dist/stats.html` as a `bundle-stats` artifact (30-day retention). All 304 test files (2945 tests) green, all 3 builds pass.
- modified: vite.config.ts (visualizer plugin)
- modified: package.json (rollup-plugin-visualizer devDep, bundle:check + build:analyze scripts)
- created: scripts/check-bundle-size.mjs
- modified: .github/workflows/ci.yml (bundle:check step + bundle-stats artifact upload)

### T259 ✅ 2026-06-06 -- Test-coverage tooling + threshold gate

Added `@vitest/coverage-v8@3.2.4` (+ `@testing-library/dom` peer dep that was missing) to devDependencies. Added `"test:coverage": "vitest run --coverage"` script. Configured `test.coverage` block in `vite.config.ts`: provider `v8`; reporters `text-summary`, `html`, `json-summary`; include `src/**/*.{ts,tsx}`; exclude `src/shared/demo/**`, `*.d.ts`, `vite-env.d.ts`, `main.tsx`, `platform/main.tsx`, `i18n.ts`; global thresholds seeded at the 2026-06-06 baseline (lines 30, branches 80, functions 68, statements 30) to ratchet upward only. CI (`.github/workflows/ci.yml`): replaced `npm test` with `npm run test:coverage` and added an `actions/upload-artifact@v4` step (always, 30-day retention) that uploads the `coverage/` HTML report as `coverage-report`. The HTML report gives per-feature drill-down; the terminal `text-summary` prints totals on every run. All 304 test files (2945 tests) green, all 3 builds pass.
- modified: package.json (new script + two devDependencies)
- modified: vite.config.ts (test.coverage block)
- modified: .github/workflows/ci.yml (coverage step + artifact upload)

### T258c ✅ 2026-06-06 -- New-error / spike alerting

Pure alert-trigger logic extracted to `netlify/functions/_shared/errorAlertLogic.ts` (`shouldAlertNewGroup`, `shouldAlertSpike`, `buildAlertEmail`) with 13 unit tests. `error-report.ts` fires a post-insert `checkAndAlert()` call (fire-and-forget within the Lambda) that queries the DB for total group count (new-group detection: count == 1) and recent-hour count (spike detection: count >= 10); de-duplicates per group key via an in-memory `_alertStore` Map (4 h de-dup window, same pattern as rate limiter); emails via `_shared/resend.ts` to `PLATFORM_ALERT_EMAIL` (fallback `RESEND_FROM_EMAIL`); no-op when keys absent. `platformOverviewLogic.ts` gains `newErrorGroupsLast24h` (groups whose `firstAt` is within the last 24 h; accepts optional `nowMs` for testing). Platform homepage ops section shows a `n new in 24 h` warning sub-label on the error-groups stat when > 0. Bilingual RO/EN. 5 new `newErrorGroupsLast24h` tests in `platformOverview.test.ts`. All 304 test files (2945 tests) green, all 3 builds pass.
- new: netlify/functions/_shared/errorAlertLogic.ts
- new: tests/unit/errorAlertLogic.test.ts
- modified: netlify/functions/error-report.ts
- modified: src/platform/platformOverviewLogic.ts
- modified: src/platform/PlatformHomePage.tsx
- modified: src/shared/locales/en.json + ro.json
- modified: tests/unit/platformOverview.test.ts

### T258b ✅ 2026-06-06 -- Source-map symbolication for error stacks

`vite.config.ts` refactored to function form using `loadEnv` so `VITE_APP_STAGE` from mode-specific `.env.*` files is available at config-evaluation time; `sourcemap: 'hidden'` emitted for PROD and DEV builds (maps emitted without `//# sourceMappingURL` in JS files), skipped for DEMO. `netlify.toml` gains a force-404 redirect rule for `/assets/*.js.map` to block public CDN access. `stack` column added to `platform_error_reports` via migration `20260606000012_error_reports_stack.sql`; `error-report.ts` body limit raised to 16 KB and `stack` stored. New pure helper `src/shared/lib/sourcemapUtils.ts` (`parseMinifiedFrame`, `extractFilename`, `formatResolvedFrame`, `extractFrameLines`) with 13 unit tests covering Chrome, Firefox, and edge cases. New `netlify/functions/symbolicate-stack.ts`: service-role, verifies `is_super_admin()`, fetches `.js.map` from private Supabase Storage bucket `source-maps/<release>/` using `source-map-js`, returns `ResolvedFrame[]`. `scripts/upload-sourcemaps.mjs` post-build upload script (silently skips when credentials absent). `platformErrorStore.ts`: `PlatformErrorReport` now includes `stack`; `ErrorGroup` gains `stack` and `latestRelease` fields; demo data seeds realistic minified stacks for two groups. `platformApi.ts` hydration includes `stack`. `PlatformErrorsPage.tsx`: expand/collapse raw stack per group, Symbolicate button (calls the function with session token, shows loading/error states), resolved frame display. Bilingual RO/EN. New dep: `source-map-js`. All 303 test files (2919 tests) green, all 3 builds pass.
- new: src/shared/lib/sourcemapUtils.ts
- new: tests/unit/sourcemapUtils.test.ts
- new: netlify/functions/symbolicate-stack.ts
- new: scripts/upload-sourcemaps.mjs
- new: supabase/migrations/20260606000012_error_reports_stack.sql
- modified: vite.config.ts (function form + loadEnv + sourcemap)
- modified: netlify.toml (404 redirect for *.js.map)
- modified: netlify/functions/error-report.ts (body limit 16 KB + stack field)
- modified: src/platform/platformErrorStore.ts (type + ErrorGroup + demo stacks)
- modified: src/platform/platformApi.ts (select stack + rowToErrorReport)
- modified: src/platform/PlatformErrorsPage.tsx (stack expand + symbolicate UI)
- modified: src/shared/locales/ro.json + en.json (symbolication keys)
- modified: package.json (upload-sourcemaps script + source-map-js dep)

### T258a ✅ 2026-06-06 -- Durable error persistence + release/stage tagging

New `src/shared/lib/errorOutbox.ts`: localStorage-backed outbox (max 20 items) with `enqueueOutbox`, `removeFromOutbox`, `getOutbox`, and `flushOutbox`. Reports are written to the outbox before the fetch and removed on 2xx; network failures leave them for the next session. `initErrorSink` drains any leftover outbox items before registering the new session sink. `ErrorReport` gains optional `release` (build git SHA, injected via `vite.config.ts` `define`) and `stage` (deployment stage) fields; `buildReport` accepts them as params; `reportError` reads them from `import.meta.env`. DB migration `20260606000011_error_reports_release_stage.sql` adds nullable `release`/`stage` columns to `platform_error_reports`. `netlify/functions/error-report.ts` accepts and persists both fields. Platform errors store/API: `ErrorGroup` gains `releases` and `stages` arrays (unique values per group); hydration selects the new columns; demo data seeds a few reports with tags. `/consola/erori` shows build/stage as a small monospace line on each group. Bilingual RO/EN keys added. `vite-env.d.ts` declares `VITE_APP_STAGE` and `VITE_APP_RELEASE`. New `tests/unit/errorOutbox.test.ts` (15 tests: enqueue/remove/flush/corruption). All 302 test files (2904 tests) green, all 3 builds pass.
- new: src/shared/lib/errorOutbox.ts
- new: tests/unit/errorOutbox.test.ts
- new: supabase/migrations/20260606000011_error_reports_release_stage.sql
- modified: src/shared/lib/errorReporting.ts (ErrorReport.release/stage; buildReport params; reportError reads env)
- modified: src/shared/lib/errorSink.ts (outbox integration; flush on init)
- modified: src/vite-env.d.ts (VITE_APP_STAGE + VITE_APP_RELEASE types)
- modified: vite.config.ts (VITE_APP_RELEASE define from git SHA or env)
- modified: netlify/functions/error-report.ts (accept + persist release/stage)
- modified: src/platform/platformErrorStore.ts (ErrorGroup releases/stages; groupReports collects them; demo data)
- modified: src/platform/platformApi.ts (select + map release/stage)
- modified: src/platform/PlatformErrorsPage.tsx (surface build/stage per group)
- modified: src/shared/locales/ro.json + en.json (release/stage keys)

### T257 ✅ 2026-06-06 -- User-facing performance / reduce-motion mode

New `src/shared/store/perfStore.ts` with `usePerfStore` (Zustand, persisted at `vecini.perf`) and a pure `resolvePerf()` helper. Resolution priority: `?perf=<tier>` URL param > stored user preference > `prefers-reduced-motion` media query > stage default (dev = lite, prod/demo = full). `src/main.tsx` now calls `usePerfStore.getState().apply()` instead of the hardcoded `isDev() ? 'lite' : 'full'` assignment. Added a segmented Auto/Lite/Full control in UserMenu (`.perfmode` / `.perfmode__btn` CSS) below the tint row. Bilingual RO/EN keys (`chrome.userMenu.perfMode/perfModeAuto/perfModeLite/perfModeFull`). New `tests/unit/perfStore.test.ts` (11 tests covering all resolution tiers). All 301 test files (2890 tests) green, all 3 builds pass. PROD/DEMO visually unchanged when preference is unset.
- new: src/shared/store/perfStore.ts
- new: tests/unit/perfStore.test.ts
- modified: src/main.tsx (use perfStore.apply() + remove isDev import)
- modified: src/shared/components/UserMenu.tsx (perf mode selector)
- modified: src/styles/shell.css (.perfmode segmented control)
- modified: src/shared/locales/ro.json + en.json (perf mode keys)

### T247 ✅ 2026-06-06 -- Shared frozen-empty-array helper

New `src/shared/lib/emptyArray.ts` exports `emptyArray<T>()` which always returns the same frozen `never[]` cast to `T[]` -- a single canonical stable reference replacing ~45 per-file `const EMPTY_* = []` / `Object.freeze([])` declarations across feature logic files and `auditStore.ts`. The const declarations in each file were updated from `const EMPTY_X: SomeType[] = []` or `Object.freeze([] as SomeType[]) as SomeType[]` to `const EMPTY_X = emptyArray<SomeType>()`. Referential identity is preserved (same object every call), so memoized selectors see no churn. New `tests/unit/emptyArray.test.ts` (4 tests: empty length, stable identity, cross-generic identity, frozen). All 300 test files (2879 tests) green, all 3 builds pass. No behavior change.
- new: src/shared/lib/emptyArray.ts
- new: tests/unit/emptyArray.test.ts
- modified: 45 feature/store logic files (import + const declaration)

### T246 ✅ 2026-06-06 -- Shared hydrate() abstraction for feature *Api.ts

New `src/shared/lib/runHydration.ts` provides a `runHydration<Row, T>(asociatieId, opts)` helper that encapsulates the repeated hydration shell: `isSupabaseConfigured` guard, try/catch, `reportError` on failure, `setFetchError('load')` on error, `setFetchError(null)` + `replaceForAsociatie` on success. The caller supplies only `query`, `transform`, `store`, and `source`. Migrated 4 representative single-table hydrators onto the helper: `bikesApi.ts` (standard row mapper), `accessApi.ts` (with `.limit(50)`), `barterApi.ts` (no `.order()`), and `alertsApi.ts` (identity transform). Multi-table join hydrators (alarm, events, projects, budget, polls, tickets) are explicitly left as-is per the task spec and documented in the helper's comment block. New `tests/unit/runHydration.test.ts` (7 tests covering guard/empty-id, success/empty-array/asociatieId-pass-through, error-with-object, error-with-null, exception). All 299 test files (2875 tests) green, all 3 builds pass.
- new: src/shared/lib/runHydration.ts
- new: tests/unit/runHydration.test.ts
- modified: src/features/bikes/bikesApi.ts
- modified: src/features/access/accessApi.ts
- modified: src/features/barter/barterApi.ts
- modified: src/features/alerts/alertsApi.ts

### T245 ✅ 2026-06-05 -- Shared role-permission helper (roleUtils)

Created `src/shared/lib/roleUtils.ts` with `GOVERNANCE_ROLES` (Set), `isGovernanceRole()`, `BOARD_ROLES` (Set), and `isBoardRole()`. Rewired all 10 `canManage*` functions (announcements, documents, ideas, petitions, priorities, pv, repairs, surveys, wiki) plus `canModerateDiscussion` to use `isGovernanceRole`, and `canViewAnyProfile` to use `isBoardRole`. Added 16 unit tests in `tests/unit/roleUtils.test.ts`. All 298 test files (2868 tests) green, all 3 builds pass.

### T244 ✅ 2026-06-05 -- Shared per-asociatie store factory

New `src/shared/store/createAsociatieStore.ts` provides `createAsociatieStore<TItem, TExtra>()` factory that encapsulates the boilerplate common to all per-tenant feature stores: `byAsociatie` map, `fetchError`, `replaceForAsociatie`, `setFetchError`, `persist` config (name, version, partialize, migrate). Callers supply only `seed`, `migrate`, `selector`, and optional `extraActions`. Returns a typed `[useStore, useAsociatieItems]` tuple. Migrated three representative stores onto the factory: `bikesStore.ts` (two extra per-row actions: `addBike`, `toggleAbandoned`), `accessStore.ts` (one extra action: `addCode`), and `parkingStore.ts` (one extra action: `addSpot`). All existing hook names and signatures unchanged. New `tests/unit/createAsociatieStore.test.ts` (13 tests covering base state, setFetchError, replaceForAsociatie, extraActions, multi-tenant isolation). All 2857 tests + 3 builds green.

### T256 ✅ 2026-06-06 -- Per-tenant feature-flag overrides

Platform operators can now force-enable or force-disable any feature for one asociatie, overriding its admin's settings. New `featureOverridesLogic.ts` provides pure set/clear/merge helpers (tested in isolation). New `featureOverridesStore.ts` (Zustand, persisted as `vecini.feature_overrides`) is shared between the platform console and the resident app; demo-mode toggling reflects immediately in the running app. `featureStore.useFeature()` now applies overrides on top of base flags (override wins). `hydrateFeatureOverrides()` added to `featureApi.ts` and wired into `FeaturesAdminPage`. New `feature-override.ts` service-role Netlify function handles upsert/delete with `is_super_admin()` re-check and appends to the asociatie's audit chain. Feature overrides section added to `PlatformAsociatieDetailPage` (grouped by category, Force on / Force off / Reset per feature, bilingual badges). Two new audit actions (`feature.override_enabled`, `feature.override_disabled`) added to `AUDIT_ACTIONS` and both audit tone maps. New `asociatie_feature_overrides` DB table (migration, RLS: members read own). Bilingual RO/EN translations. 21 unit tests (logic + store). All 2848 tests + 3 builds green.
- new: supabase/migrations/20260606000010_asociatie_feature_overrides.sql
- new: src/shared/features/featureOverridesLogic.ts
- new: src/shared/features/featureOverridesStore.ts
- new: netlify/functions/feature-override.ts
- new: tests/unit/featureOverridesLogic.test.ts
- new: tests/unit/platformFeatureOverrides.test.ts
- modified: src/shared/features/featureStore.ts (useFeature applies overrides)
- modified: src/shared/features/featureApi.ts (hydrateFeatureOverrides added)
- modified: src/features/audit/auditLogic.ts (2 new audit actions)
- modified: src/features/audit/AuditLogPage.tsx (tone map entries)
- modified: src/platform/PlatformAuditPage.tsx (tone map entries)
- modified: src/platform/PlatformAsociatieDetailPage.tsx (imports + overrides section + handlers)
- modified: src/features/admin/FeaturesAdminPage.tsx (hydrateFeatureOverrides call)
- modified: src/shared/locales/en.json (platform.detail.featureOverrides.* + audit action labels)
- modified: src/shared/locales/ro.json (platform.detail.featureOverrides.* + audit action labels)

### T255 ✅ 2026-06-05 -- Cross-tenant global search

Added a command-palette-style global search to the platform console topbar. Pure search helper `platformSearchLogic.ts` ranks asociatii (by name, city, CUI, address) and provisioned admins/invites (by name, email) using the shared `scoreMatch` function, capped at 6 results per kind. `PlatformCommandPalette.tsx` mirrors the main-app palette: portal overlay, keyboard navigation (ArrowUp/Down/Enter/Escape), two section groups (asociatii/admins), navigates to the T249 detail page or asociatii list. Search trigger button added to the platform topbar with `.platform-search-trigger` CSS. Bilingual RO/EN keys added under `platform.search.*`. Revoked admins excluded from results. 16 unit tests for the pure search logic. All 2827 tests + 3 builds green.
- new: src/platform/platformSearchLogic.ts
- new: src/platform/PlatformCommandPalette.tsx
- modified: src/platform/PlatformLayout.tsx (search trigger + palette mount)
- modified: src/styles/platform.css (.platform-search-trigger styles)
- modified: src/shared/locales/ro.json (platform.search.* keys)
- modified: src/shared/locales/en.json (platform.search.* keys)
- new: tests/unit/platformSearchLogic.test.ts (16 tests)

### T253 ✅ 2026-06-06 -- Platform-wide broadcast / maintenance notice

Added a `/consola/anunturi-platforma` section to the platform console for publishing platform-wide maintenance notices and incident alerts. New `platform_broadcasts` table (migration) with `severity` (info/warning/critical) and `target` (all/admin) columns. Writes go exclusively through a new `platform-broadcast.ts` service-role Netlify function (publish + expire actions, both audited via new `broadcast.published` and `broadcast.expired` audit actions). Platform-side `platformBroadcastStore.ts` (publish/expire/active/past selectors) seeded from two demo broadcasts. Platform console page with compose form (title, body, severity, target, optional ends_at) and active/past broadcast cards with expire action. Main-app `broadcastStore.ts` reads active broadcasts from Supabase (authenticated users); demo seeds one active info notice. Dismissible `BroadcastBanner` component added to `AppLayout` reads from `broadcastStore`, filters by target audience, persists dismissals in localStorage per broadcast id. Bilingual RO/EN keys added under `platform.broadcasts.*`. CSS: new `broadcast-banner` and `platform-broadcast-*` component styles. 14 unit tests + 2 E2E tests (broadcasts nav visible, publish-expire round-trip). All 2811 tests + 3 builds green.
- new: supabase/migrations/20260606000009_platform_broadcasts.sql
- new: netlify/functions/platform-broadcast.ts
- new: src/platform/platformBroadcastStore.ts
- new: src/platform/PlatformBroadcastsPage.tsx
- new: src/shared/store/broadcastStore.ts
- new: src/shared/components/BroadcastBanner.tsx
- new: tests/unit/platformBroadcast.test.ts
- modified: src/platform/demoPlatform.ts (PlatformBroadcast type + DEMO_PLATFORM_BROADCASTS)
- modified: src/platform/platformApi.ts (hydratePlatformBroadcasts)
- modified: src/platform/platformRouter.tsx (anunturi-platforma route)
- modified: src/platform/PlatformLayout.tsx (broadcasts sidebar entry)
- modified: src/platform/PlatformHomePage.tsx (broadcasts section card)
- modified: src/app/AppLayout.tsx (BroadcastBanner)
- modified: src/features/audit/auditLogic.ts (broadcast.published + broadcast.expired + broadcast entity)
- modified: src/features/audit/AuditLogPage.tsx (tone map for broadcast actions)
- modified: src/platform/PlatformAuditPage.tsx (tone map for broadcast actions)
- modified: src/shared/locales/en.json + ro.json (platform.broadcasts.*, audit actions, entity)
- modified: src/styles/shell.css (broadcast-banner styles)
- modified: src/styles/platform.css (platform-broadcast-* styles)
- modified: tests/e2e/platform.spec.ts (T253 E2E tests)

### T252 ✅ 2026-06-05 -- Live overview dashboard with real cross-tenant KPIs

Added `platformOverviewLogic.ts` with a pure `computeOverview()` function that aggregates 5 store inputs into a single `PlatformOverview` object. Rewired `PlatformHomePage` with three labelled KPI sections: (1) associations breakdown (total, active/moderate/dormant health, suspended lifecycle) + members + apartments, each linking to `/consola/asociatii` or `/consola/utilizare`; (2) 30-day activity rollup (announcements, tickets, votes) linking to `/consola/utilizare`; (3) operations row (MRR with overdue count, open support threads with awaiting-reply sub-label, error groups) linking to their respective pages. All 8 section cards now link to their live routes (no more "planned" badges). Added `.platform-stat--link`, `.platform-stat__sub`, and color-dot sub-item variants (`--active`, `--moderate`, `--dormant`, `--suspended`, `--warn`) to `platform.css`. Bilingual RO/EN new keys under `platform.home.overview`. 16 unit tests green (including demo dataset shape assertions). All 2797 tests + 3 builds green.
- new: src/platform/platformOverviewLogic.ts
- new: tests/unit/platformOverview.test.ts
- modified: src/platform/PlatformHomePage.tsx
- modified: src/shared/locales/en.json (platform.home.overview.*)
- modified: src/shared/locales/ro.json (platform.home.overview.*)
- modified: src/styles/platform.css (.platform-stat--link, .platform-stat__sub, sub-item color variants)

### T251 ✅ 2026-06-05 -- Platform team management (manage `platform_admins`)

Added `/consola/echipa` section to the platform console sidebar with full operator roster management. The page lists current platform superadmins (name, email, added date, last sign-in) and pending invitations seeded from `DEMO_PLATFORM_TEAM` (2 demo operators). Invite form sends a new operator's setup email via `auth.admin.inviteUserByEmail` + inserts into `platform_admins` via a new service-role Netlify function (`platform-team-invite.ts`). Revoke action removes from `platform_admins` via a second service-role function (`platform-team-revoke.ts`) with a hard guard: cannot remove the last operator. Two new audit actions (`platform.admin_invited`, `platform.admin_revoked`) added to `AUDIT_ACTIONS` with bilingual labels and tone maps in all 3 audit tone records. DB migration adds `name` + `email` columns to `platform_admins`. Live hydration via `platformApi.hydrateTeam()`. Demo drives all paths through the new persisted `platformTeamStore`. 13 unit tests green. RLS: existing super_admin SELECT policy already covers the roster; writes are service-role only.
- new: supabase/migrations/20260605000008_platform_team_management.sql
- new: src/platform/platformTeamStore.ts
- new: src/platform/PlatformTeamPage.tsx
- new: netlify/functions/platform-team-invite.ts
- new: netlify/functions/platform-team-revoke.ts
- new: tests/unit/platformTeam.test.ts
- modified: src/platform/demoPlatform.ts (PlatformTeamAdmin + PlatformTeamInvite types + DEMO_PLATFORM_TEAM)
- modified: src/platform/platformApi.ts (hydrateTeam)
- modified: src/platform/platformRouter.tsx (echipa route)
- modified: src/platform/PlatformLayout.tsx (echipa nav item + Users icon)
- modified: src/features/audit/auditLogic.ts (2 new actions)
- modified: src/features/audit/AuditLogPage.tsx + PlatformAuditPage.tsx (tone map entries)
- modified: src/shared/locales/ro.json + en.json (sections.team + platform.team + new audit action strings)

### T250 ✅ 2026-06-05 -- Pending-invite resend / revoke + per-tenant admin roster

Added resend and revoke actions to pending invite cards on the asociatii list page, and a full admin roster section on the asociatie detail page. The roster shows all provisioned admins (from `provisions` + new `additionalAdmins` store maps), with "Revoke invite" for pending (not yet redeemed) admins and "Revoke access" (with confirm) for active admins. A collapsible "Add additional administrator" form provisions a second admin for an existing asociatie. Two new audit actions (`admin.invite_revoked`, `admin.access_revoked`) added to `AUDIT_ACTIONS` with bilingual labels and tone maps. Three new service-role Netlify functions: `admin-invite-action.ts` (resend/revoke invite), `provision-additional-admin.ts` (add admin to existing tenant), `revoke-admin-access.ts` (soft-delete membership). Platform store bumped to v6 with migration and new actions. Demo drives all paths through persisted store. 14 unit tests + 3 E2E scenarios (revoke invite disappears, roster section visible, provision admin appears) all green.
- new: netlify/functions/admin-invite-action.ts
- new: netlify/functions/provision-additional-admin.ts
- new: netlify/functions/revoke-admin-access.ts
- new: tests/unit/platformAdminRoster.test.ts
- modified: src/features/audit/auditLogic.ts (2 new actions)
- modified: src/features/audit/AuditLogPage.tsx (tone map entries)
- modified: src/platform/PlatformAuditPage.tsx (tone map entries)
- modified: src/platform/platformAsociatiiStore.ts (v6, revokeInvite, resendInvite, provisionAdditionalAdmin, revokeAdminAccess, revokedInviteIds, additionalAdmins)
- modified: src/platform/PlatformAsociatiiPage.tsx (resend/revoke buttons on pending invite cards)
- modified: src/platform/PlatformAsociatieDetailPage.tsx (admin roster section + provision form)
- modified: src/shared/locales/ro.json + en.json (new audit + platform.detail + platform.asociatii strings)
- modified: tests/e2e/platform.spec.ts (T250 scenarios)

### T249 ✅ 2026-06-05 -- Asociație detail page + lifecycle (suspend / reactivate / archive)

Added full tenant detail page at `/consola/asociatii/:id` showing identity, stats, current status, and lifecycle controls. New `status` / `status_reason` / `status_changed_at` columns on `asociatii` (migration `20260605000007_asociatie_lifecycle.sql`) with a RESTRICTIVE membership-insert policy blocking new resident joins on suspended/archived tenants. New `netlify/functions/asociatie-lifecycle.ts` (POST, bearer auth, service-role super_admin re-verify) handles suspend/reactivate/archive and writes to the audit chain. Three new audit actions (`asociatie.suspended`, `asociatie.reactivated`, `asociatie.archived`) added to `AUDIT_ACTIONS` with bilingual labels and tone maps. Demo seeds the Timișoara asociatie as `suspended`. Platform store (v5) adds `updateLifecycle()` + `listFilter`/`setListFilter()`. List page gains status badges, filter tabs (all/active/suspended/archived), and card overlay links to the detail page. `platformApi.ts` now reads status fields in the live hydration query. Unit tests (8) + 3 E2E scenarios (suspended badge, card navigation, reactivate flow) all green.
- new: supabase/migrations/20260605000007_asociatie_lifecycle.sql
- new: netlify/functions/asociatie-lifecycle.ts
- new: src/platform/PlatformAsociatieDetailPage.tsx
- new: tests/unit/platformLifecycleLogic.test.ts
- modified: src/features/audit/auditLogic.ts (3 new actions + entity)
- modified: src/features/audit/AuditLogPage.tsx (tone map entries)
- modified: src/platform/PlatformAuditPage.tsx (tone map entries)
- modified: src/platform/demoPlatform.ts (AsociatieStatus type + status on demo data)
- modified: src/platform/platformAsociatiiStore.ts (v5, updateLifecycle, listFilter)
- modified: src/platform/platformApi.ts (status fields in hydrate query)
- modified: src/platform/PlatformAsociatiiPage.tsx (filter tabs + status badges + detail links)
- modified: src/platform/platformRouter.tsx (added :id detail route)
- modified: src/shared/locales/ro.json + en.json (filter/detail/lifecycle/audit strings)
- modified: tests/e2e/platform.spec.ts (T249 scenarios)

### T248 ✅ 2026-06-05 -- DEV role-selector removed + backlog cleanup + dedup audit

Interactive maintenance pass (not `make progress`). Three things: (1) `DevRoleSwitcher` now renders only in the offline DEMO build (`if (!isDemo())`), so the DEV stage is a true PROD replica with no one-tap persona switcher; the dead `signInAsDevUser` auth-store action and its `else` branch were removed (DEV personas are exercised through the real login form with `pi:seed` `{role}@dev.local` accounts). Updated `devRoleSwitcher.test.tsx`, `piSeed.test.ts` comments, `PI_DEPLOYMENT.md`, `.env.pi.example`, and recorded the decision in `DECISIONS.md`. (2) `BACKLOG.md` cleaned: every `✅` block in the Main queue (T15–T243) was a duplicate of an entry already in `COMPLETED.md`, so the redundant blocks were removed and the queue now holds only open work. (3) A dedup/cleanup audit surfaced four code-health refactor tasks now queued as T244 (per-asociatie store factory), T245 (roleUtils permission helper), T246 (hydrate() abstraction), T247 (frozen-empty-array helper).

### T20 ✅ 2026-06-05 -- Super-admin platform console (umbrella)

Umbrella task. All sub-tasks complete and individually archived: T93/T94 (platform shell + provisioning), T95 (cross-tenant audit viewer), T96 (error feed), T97 (usage/health metrics), T98 (audited impersonation), T99 (admin↔superadmin messenger), T119/T120/T121 (provisioning live wiring + E2E). The platform app lives at `src/platform/*` and deploys to its own subdomain, gated to `super_admin`. Archived here so the umbrella heading is not orphaned after the BACKLOG cleanup.

### T79 P3 ✅ 2026-06-05 -- Guard that every RLS-enabled table carries at least one policy

Created `tests/unit/rlsPolicyCoverage.test.ts` with 5 assertions. Parses all migration SQL to build two sets: `enabled` (RLS-on tables) and `hasPolicies` (tables with at least one `create policy ... on TABLE` or macro call). An `INTENTIONAL_DENY_ALL` map documents 4 service-role-only tables that legitimately carry zero client-facing policies (`mfa_otp_challenges`, `session_elevations`, `login_attempt_locks`, `mfa_recovery_attempt_counts`). Core assertion: every zero-policy table is in the map; two inverse assertions flag stale entries and entries that have since gained a policy, keeping the map self-maintaining. 288 files / 2748 tests / lint + typecheck + build + build:pi + build:demo all green.

### T87 P3 ✅ 2026-06-05 -- Stronger cryptographic tamper-evidence for the audit chain

Created `netlify/functions/audit-hmac.ts`: POST-only, bearer auth, per-IP 60 req/60s rate limit, validates 16-char hex `tail_hash`, re-checks caller is admin of the given asociație via `isAdminOfAsociatie`, signs `v1:{asociatieId}:{tailHash}` with HMAC-SHA256 keyed on `AUDIT_HMAC_SECRET`; returns `{ hmac, algorithm: 'hmac-sha256' }` when secret is set, `{ hmac: null, configured: false }` otherwise. Function documents activation steps (`openssl rand -hex 32`) and recommends external anchoring (periodic publication to an out-of-band store) as the follow-up. Added pure `hmacCanonical(asociatieId, tailHash): string` export to `auditLogic.ts` (versioned canonical form `v1:...`; mirrors the inline definition in the Netlify function so both share the same contract). Extended `auditStore.ts` with `chainHmacByAsociatie: Record<string, string | null>` (ephemeral, not persisted) and `fetchChainHmac(asociatieId)` action (reads session token via `supabase.auth.getSession`, calls `/.netlify/functions/audit-hmac`, stores the returned `hmac` field). Updated `AuditLogPage.tsx`: imports `useAuditStore` + `isSupabaseConfigured`; calls `fetchChainHmac` on mount via `useEffect`; shows a `Lock` + "Lanț semnat HMAC" / "HMAC-signed chain" badge when `chainHmac` is a non-null string. Added `audit.hmacSigned` locale key to ro.json and en.json. Created `tests/unit/auditHmac.test.ts` with 6 assertions covering determinism, v1 prefix, field inclusion, and divergence on differing inputs. 287 files / 2743 tests / lint + typecheck + build + build:pi + build:demo all green.

### T237 P3 ✅ 2026-06-05 -- Optional LLM-backed PhrasingEngine (constrained selection only)

Created `netlify/functions/assistant-phrase.ts`: POST-only, bearer auth, per-IP rate limit 20/60s, validates candidates array (1-8 items, max 200 chars each), optional query up to 500 chars, returns `{ choice_index }` always in [0, candidates.length-1]; stub returns index 0 with detailed follow-up notes documenting the prompt contract for future LLM wiring. Created `src/features/assistant/llmPhrasingEngine.ts` exporting `safeChoice(candidates, choiceIndex)` (validates server response: must be a finite number, truncated to integer, in-range; returns null otherwise) and `createLlmPhrasingEngine(getCachedChoice)` (PhrasingEngine factory that tries safeChoice, falls back to deterministicPhrasing). Created `tests/unit/assistant.llmPhrasingEngine.test.ts` with 13 assertions. 286 files / 2737 tests / lint + typecheck + build + build:pi + build:demo all green.

### T236 P2 ✅ 2026-06-05 -- Wire visible-first grounding into the assistant widget

Modified `src/features/assistant/AssistantWidget.tsx`: replaced `answerQuery` import with `useVisibleContext` (visibleState.ts) + `routeQuery`/`toMessage` (intentRouter.ts). Added `const snapshot = useVisibleContext()` hook inside the component. Updated `ask()` to: read `lastOffered` from the last bot message chips before the user message is added, call `routeQuery(trimmed, entries, snapshot(), t, seed, lastOffered)`, derive reply via `toMessage(result)`, and compute typing delay from `result.message.length`. Created `tests/unit/assistantWidget.visibleGrounding.test.tsx` with 2 assertions: a question about an on-screen heading yields the heading text (visible-prefix + value); a question about the F01 KB feature does not include the fixture heading and has a route. 285 files / 2724 tests / lint + typecheck + build + build:pi + build:demo all green.

### T235 P2 ✅ 2026-06-05 -- Visible-first intent router with structured schema + pluggable phrasing engine

Created `src/features/assistant/intentRouter.ts` with `RouterIntent` union, `RouterResult` interface, `PhrasingEngine` interface + `deterministicPhrasing` default (phrase=pickVariant, no select), `routeQuery` (7-step: greeting/capabilities→greeting, thanks/bye/identity→ask, affirm+single→confirm, affirm+multi→clarify, visible-first score merge, near-tie clarify, confident visible/KB answer), `fromReply`/`toMessage` adapters. Exported `variants` from `engine.ts` (no behavior change). Added `assistant.visiblePrefix` locale key to ro.json ("Din pagina aceasta:") and en.json ("From this page:"). Created `tests/unit/assistant.intentRouter.test.ts` with 19 assertions. 284 files / 2722 tests / lint + typecheck + build + build:pi + build:demo all green.

### T234 P2 ✅ 2026-06-05 -- Visible-state adapter for the assistant (DOM grounding foundation)

Created `src/features/assistant/visibleState.ts` with: `VisibleContext` interface (`route`, `headings`, `buttons`, `links`, `fields`, `options`, `paragraphs`); `extractVisibleContext(root, opts?)` — single TreeWalker pass with a `NodeFilter.FILTER_REJECT`-based filter that skips hidden (`el.hidden`, `aria-hidden="true"`, inline `display:none`/`visibility:hidden`) and excluded (`.assistant` default) subtrees, plus an additive `getComputedStyle` check (zero-rect check omitted: jsdom sets `window.innerWidth` non-zero but `getBoundingClientRect` always returns zeros, which would reject everything); accessible-name resolution (`aria-label` → single-level `aria-labelledby` → `textContent`; fields also fall back to `<label>` → `placeholder` → `name`); `visibleContextEntries(ctx)` mapping headings/fields/options/buttons to `kind:'data'` `audience:['all']` `KbEntry`s (id namespace `visible.*`, `data.terms` via `normalize`); `useVisibleContext()` returning a stable snapshot function that reads the live DOM + current route at call time. Created `tests/unit/assistant.visibleState.test.ts` with 5 assertions covering labelled-field extraction, visible heading/button capture, hidden/aria-hidden/display:none/visibility:hidden exclusion, and `.assistant` subtree exclusion. 284 files / 2703 tests / lint + typecheck + build + build:pi + build:demo all green.

### T243 P2 ✅ 2026-06-05 -- Memoize shared presentational primitives (Button/Card/Badge/Input/Select)

Wrapped all five primitives in `React.memo`. For `forwardRef` components (`Button`, `Input`, `Textarea`, `Select`), an intermediate `*Base` const holds the `forwardRef(...)` call and the named export is `memo(Base)` — this preserves the ref type, display name (from the inner function name), and all accessibility wiring (`aria-busy`, `aria-invalid`, `aria-describedby`, `htmlFor`). For plain function components (`Card`, `Badge`), the export is rewritten as `memo(function ComponentName(...) {...})` inline. 8 new assertions in `tests/unit/primitiveMemo.test.ts` verify both the memo wrap and the preserved a11y attributes. 282 files / 2698 tests / lint + typecheck + build + build:pi + build:demo all green.

- modified: src/shared/components/Button.tsx (memo import; ButtonBase intermediate; Button = memo(ButtonBase))
- modified: src/shared/components/Card.tsx (memo import; Card = memo(function Card(...)))
- modified: src/shared/components/Badge.tsx (memo import; Badge = memo(function Badge(...)))
- modified: src/shared/components/Input.tsx (memo import; InputBase/TextareaBase intermediates; Input/Textarea = memo(...))
- modified: src/shared/components/Select.tsx (memo import; SelectBase intermediate; Select = memo(SelectBase))
- new: tests/unit/primitiveMemo.test.ts (8 assertions)

### ✅ T242 — [P2] App-wide render & scroll smoothness pass (profiling-driven)

Done: Added `contain: layout style` to `.card` (primitives.css) bounding reflow to each card boundary; added `contain: content` to `.notif-row` (primitives.css) isolating notification list items; added `contain: layout style; content-visibility: auto; contain-intrinsic-size: 0 64px` to `.audit-row` (legal.css) skipping off-screen items in long audit trails. Extracted `AuditRow = memo(...)` in `AuditLogPage.tsx` (previously inline JSX in the filtered.map call). Wrapped `NotifRow` in `memo()` and stabilized `handleRead` via `useCallback([store.markRead])` in `NotificationsPage.tsx`. Added `useMemo` in `DirectoryPage.tsx` to memoize the neighbour map + search computation so it skips on unrelated re-renders. Store audit finding: `replaceForAsociatie` is correct for hydration (atomic snapshot); realtime apply helpers already do targeted row mutations; row-level `memo()` is the right defence. Virtualization deferred (demo data bounded, no list approaches 50+ items in demo; T243 covers primitive-level memo). 281 files / 2690 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T241 — [P2] Roll modal state-isolation across remaining feature pages (umbrella)

Done: Audited all feature pages. Polls/Events have no create-form modals; Tickets/Petitions/Discussions are complex multi-modal pages left for a follow-up. Extracted draft state from 5 pages into dedicated child modal components: `LocatorComposeModal` (title/body/category + submit, plus `PostCard = memo(...)` for list rows), `IdeaComposeModal` (title/body + submit), `MarketplaceComposeModal` (title/description/newCategory/price + submit, using hooks internally), `ProjectCreateModal` (title/description/contractor/budget + submit, plus `ProjectCard = memo(...)` replacing the `renderProject` inline function), `CrowdfundCreateModal` (title/description/target/deadline + submit) and `CrowdfundPledgeModal` (pledgeAmount + submit). Each page now holds only `open` boolean (plus `pledgeId` for Crowdfund). Added `tests/unit/modalStateIsolation.test.tsx` (4 assertions) proving 5 keystrokes in a compose modal do not re-render the memo list. 280 files / 2682 tests / lint + typecheck + build + build:pi + build:demo all green.

---

### ✅ T240 — [P2] Memoize AppLayout feature filtering + shell components

Done: Added `memo` and `useMemo` to React imports. Updated `useEnabledFeatures` to use `useMemo([flags, role])` and changed its role selector to `useAuthStore((s) => s.activeRole())` so Zustand correctly tracks role changes. In `Sidebar`, replaced the inline per-render `categories.map + enabled.filter` with a `useMemo([enabled])`-computed `groups` array precomputing category+items pairs. Wrapped `Sidebar`, `BottomNav`, and `Topbar` with `React.memo` to prevent parent-triggered re-renders. Added `tests/unit/appLayoutMemo.test.ts` (5 parse-based assertions). 279 files / 2678 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T233 — [P2] Touch-target sizing for in-table action buttons

Done: Added `.row-action-btn` class to `primitives.css` (30px base, flex centering, `border-radius: var(--radius)`, hover/active transforms) with a `@media (max-width: 600px)` override to 44x44px. Updated the same mobile touch-target block to bump `.btn--sm` from 38px to 44px, `.btn--icon.btn--sm` from 38px to 44px, and added `.iconbtn` at 44x44px. Applied `.row-action-btn` to the four inline-style action buttons in `ApartmentsPage.tsx` (desktop table 30px + mobile card 30px), removing the inline `width`/`height` that held them at 30/32px. Removed the `style={{ width: 32, height: 32 }}` inline overrides from the four `iconbtn` custom-field action buttons in `ProfilePage.tsx` (move up, move down, remove, drag handle) and from the `Modal.tsx` close button, so the CSS `@media` rule can take effect. 278 test files / 2673 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T232 — [P2] DatePicker bottom-sheet variant on phones

Done: Added `isMobile` state to `DatePicker.tsx`; `openPicker` checks `window.innerWidth <= 600` at open-time and skips position computation on mobile. Portal conditionally renders a `.dp-sheet-overlay` wrapper (fixed full-screen, backdrop `oklch(0% 0 0 / 0.4)`, `onMouseDown` closes on tap-outside) with a `.dp-popover .dp-popover--sheet` inner calendar (`stopPropagation` on the inner div prevents the overlay handler from firing). Added to `primitives.css`: `.dp-sheet-overlay` (fixed, flex column, bottom-aligned, fade-in/out), `.dp-popover--sheet` (relative, full-width, rounded top corners, `env(safe-area-inset-bottom)` padding, drag-handle `::before` pill), `iv-dp-sheet-in`/`iv-dp-sheet-out` keyframes mirroring the modal sheet animations, and `prefers-reduced-motion` overrides for both. Updated `handleAnimationEnd` to recognise `iv-dp-sheet-out` for teardown. 277 files / 2668 tests / lint + typecheck + build + build:pi + build:demo all green.

### T231 P2 ✅ 2026-06-04 -- Responsive data tables: stack to cards / horizontal scroll on phones
- modified: src/styles/legal.css (added `@media (max-width: 600px)`: `.gdpr-table { overflow-x: auto; -webkit-overflow-scrolling: touch }` + `.gdpr-table__row { min-width: 400px }`)
- modified: src/styles/primitives.css (added `@media (max-width: 600px)`: `.billing-invoices-table { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch }`)
- new: tests/unit/responsiveTables.test.ts (5 parse-based assertions verifying both media blocks and their key properties)
- note: ApartmentsPage table already had `hidden sm:block` / `sm:hidden` card fallback; no HTML changes needed for either affected table

### T230 P1 ✅ 2026-06-04 -- Tap-accessible status tooltips (hover-only info unreachable on touch)
- modified: src/features/admin/ApartmentsPage.tsx (`ApartmentStatusCell`: added `useState<boolean>` tipOpen + `useRef` wrapperRef; computed `hasButton`; wrapper div gets `tabIndex={0}` + click/keydown/blur handlers when no inner button; tooltip gains `group-focus-within/status:opacity-100` + tipOpen override; `aria-hidden="true"` on tooltip span; `cursor-help` on wrapper)
- new: src/shared/components/InfoTip.tsx (shared component: `<button aria-label aria-expanded>` wrapping `<Info>` icon; click/Esc/blur toggle a positioned tooltip span; `aria-hidden="true"` on tooltip; covers hover + keyboard focus + tap)
- modified: src/features/admin/ApartmentFormPage.tsx (replaced two hover-only `<span title aria-label><Info/></span>` info icons with `<InfoTip hint={...} />`; removed `Info` from lucide imports)
- new: tests/unit/statusTooltip.test.tsx (14 assertions: tabIndex present, tooltip hidden initially, click reveals, double-click hides, Esc closes, Enter/Space toggle, aria-label on wrapper; InfoTip button aria-label, no tooltip initially, click shows, double-click hides, Esc closes, aria-expanded syncs)
- note: WCAG 1.4.13 compliant -- tooltip content reachable on hover, keyboard focus-within, and tap. 275 test files / 2656 tests / lint + typecheck + build + build:pi + build:demo all green.

### T239 P1 ✅ 2026-06-04 -- Cut modal-open jank: optimize full-viewport backdrop blur
- modified: src/styles/primitives.css (`.modal-overlay`: reduced `backdrop-filter` from `blur(8px) saturate(1.1)` to `blur(5px)`; added `will-change: opacity` + `contain: layout paint`; added `prefers-reduced-motion` block that drops overlay to flat dim and suppresses all modal animations)
- note: blur-only animation was already `opacity`-only via `iv-fade-in`; the blur is now static and rasterized once per compositor layer. No behavior change. 274 test files / 2642 tests / lint + typecheck + build + build:pi + build:demo all green.

### T238 P1 ✅ 2026-06-04 -- Stop per-keystroke page re-renders in compose/create modals (state isolation reference fix)
- modified: src/features/announcements/AnnouncementsPage.tsx (extracted AnnouncementComposeModal child owning all draft state; extracted AnnouncementRow = memo(...) with useMemo for sanitizeHtml; stable useCallback handlers at page level; useMemo for visibleAnnouncements derivation)
- new: tests/unit/announcementsRenderIsolation.test.tsx (4 assertions: initial render count = 1, opening modal does not re-render list, typing 5 keystrokes does not re-render list, items remain in DOM throughout compose flow)
- modified: DECISIONS.md (T238 pattern documented for T241 roll-out)

### T108 P3 ✅ 2026-06-04 -- Rich per-card home widgets (live at-a-glance state on shortcut cards)
- new: src/features/home/homeWidgets.ts (pure builders: buildAnnouncementWidget/buildEventWidget/buildPollWidget/buildTicketWidget + widgetForFeature dispatcher; WidgetData discriminated union; no React, fully testable)
- new: tests/unit/homeWidgets.test.ts (25 assertions across all four builders + the dispatcher)
- modified: src/features/home/HomePage.tsx (WidgetContent renderer; expanded shortcut cards show latest announcement (F01), next event (F08), active polls (F09), my open tickets (F17), derived via useMemo from existing per-asociatie stores)
- modified: src/shared/locales/{en,ro}.json (home.widget.* bilingual keys, RO with _few plural form)
- modified: src/styles/globals.css (.home-widget-* card-footer styles)
- note: widgets render only when a card is sized `expanded`; content is pure/derived and null-safe (no widget when there is nothing to show). lint + typecheck + 2640 tests + build + build:pi + build:demo all green.

### T229 P3 ✅ 2026-06-04 -- Health-check Netlify function + uptime-monitoring docs
- new: netlify/functions/health.ts (GET-only, no auth, returns {"status":"ok","stage":"<stage>"}, rate-limited 120 req/60 s per IP)
- new: tests/unit/healthFunction.test.ts (3 assertions: 200 OK, correct JSON shape, 405 non-GET)
- modified: RUNBOOK-MVP.md (section 6 "Uptime monitoring" documenting /api/health as UptimeRobot/BetterUptime watch URL)

### T110 P2 ✅ 2026-06-04 -- Consumer pre-contractual info + withdrawal at checkout
- new: src/features/billing/CheckoutModal.tsx (pre-contractual summary table, withdrawal notice, express-consent checkbox, links to /protectia-consumatorului)
- modified: src/features/billing/billingLogic.ts (preContractualRows pure function + PreContractualRow interface)
- modified: src/features/billing/BillingPage.tsx (pendingPlanId state, handleConfirmUpgrade, CheckoutModal integration)
- modified: src/styles/primitives.css (billing page CSS + checkout-modal CSS)
- modified: src/shared/locales/ro.json + en.json (billing.checkout.* keys)
- new: tests/unit/checkoutModal.test.ts (9 assertions for preContractualRows)

### T19 P2 ✅ 2026-06-04 -- SaaS billing & plans

Added `BillingPlan`, `Subscription`, `Invoice`, `SubscriptionStatus`, `BillingInterval` types to `domain.ts`. Created `src/features/billing/billingLogic.ts`: `BILLING_PLANS` constant (3 plans: Gratuit/0 lei/30 ap, Standard/29 lei/100 ap, Premium/59 lei/unlimited); pure helpers `isSubscriptionActive`, `isDunning`, `isBlocked`, `statusTone`, `isOverApartmentLimit`, `isOverMemberLimit`, `daysUntil`, `formatPriceRon`, `isInvoicePaid`, `findPlanById`, `planName`, `usagePercent`, `summariseSubscriptions`. Created `src/features/billing/billingStore.ts`: Zustand persist store; DEMO_ASOCIATIE seeded on Standard/active with 2 paid demo invoices; actions `setPlans/setSubscription/setInvoices/setFetchError/upgradePlan/setStatus`; exported hooks `useAsociatieSubscription` + `useAsociatieInvoices`. Created `src/features/billing/billingApi.ts`: `hydrateBilling(asociatieId)` queries `subscriptions` + `invoices` in parallel via Supabase client; updates store on success. Created `src/features/billing/BillingPage.tsx` at `/app/admin/abonament`: dunning/blocked warning banners, current-subscription summary card with status badge + period + usage meters (apartments/members), plan cards grid (3 plans with upgrade CTAs), invoice history table with paid/unpaid badge. Created `src/platform/platformSubscriptionsStore.ts`: 3-asociatie demo subscriptions (active, trialing, past_due); `markPaid` action flips status to active; `useSubscriptionSummary` hook. Created `src/platform/PlatformSubscriptionsPage.tsx` at `/consola/abonamente`: summary badge bar (active/trialing/past_due/unpaid/canceled counts), name/city search + status filter, per-asociatie table with plan, status badge, period, and "Mark paid" action for past_due rows. Added `subscriptions` section (`CreditCard` icon, `ready: true`) to `PlatformLayout.tsx` SECTIONS. Added `abonamente` route + lazy `PlatformSubscriptionsPage` import to `platformRouter.tsx`. Added `BillingPage` lazy import + `/app/admin/abonament` route (under `RequireAdmin`) to `router.tsx`. Created `netlify/functions/billing-checkout.ts`: POST-only, verifyBearerToken, re-verifies caller is admin/presedinte of target asociatie, upserts `subscriptions` + inserts `invoices` via service-role (Stripe stub, replace mock block with real Stripe API when billing goes live). Created `supabase/migrations/20260604000006_billing.sql`: `billing_plans` (global lookup, authenticated-read RLS, seeded 3 canonical plans on conflict update), `subscriptions` (unique per asociatie_id, member-read + superadmin-read RLS, writes via service-role only), `invoices` (member-read + superadmin-read RLS). Added `billing.*` top-level locale keys and `platform.sections.subscriptions.*` + `platform.subscriptions.*` to RO + EN locales. Created `tests/unit/billingLogic.test.ts` with 32 assertions. 276 files / 2599 tests / lint + typecheck + build + build:pi + build:demo all green.

### T99 P2 ✅ 2026-06-04 -- Admin ↔ superadmin support messenger

Added `SupportSender`, `SupportMessage`, `SupportThread` types to `domain.ts`. Created migration `supabase/migrations/20260604000005_support_threads.sql`: `support_threads` + `support_messages` tables (uuid PKs, FK cascade, check constraints), RLS enabled on both; admin/presedinte/comitet read+write policies (select/insert/update); superadmin SELECT-only policies (read-only per platform RLS contract); superadmin writes go through service-role Netlify function. Created `netlify/functions/support-admin.ts`: POST-only, verifyBearerToken + re-check platform_admins; actions `reply` (insert superadmin message + reopen thread) and `toggle-status` (flip open/resolved) via service-role, bypassing RLS. Created `src/features/support/supportLogic.ts`: pure helpers `isValidSubject`, `isValidMessage`, `lastActivityAt`, `awaitingReply`, `unreadFor`, `sortThreads`. Created `src/features/support/supportStore.ts`: Zustand store for admin-side threads (seeded with 1 demo thread for DEMO_ASOCIATIE; persisted; `startThread`/`reply`/`markRead`/`toggleStatus`). Created `src/features/support/SupportPage.tsx` at `/app/admin/contact-platforma`: admin/presedinte/comitet access; thread list with unread badges and status badges; thread view with reply input; start-new-thread modal; bilingual RO+EN, premium-feel. Created `src/platform/platformMessengerStore.ts`: Zustand store seeded with 3 demo threads across all 3 demo asociații; `reply`/`toggleStatus` actions update the store immediately and call `support-admin` Netlify function in live mode; `hydrateAllSupportThreads()` added to `platformApi.ts` for cross-tenant SELECT. Created `src/platform/PlatformMessengerPage.tsx` at `/consola/mesaje`: cross-asociație inbox with name/subject filter; thread view with superadmin reply and status toggle; bilingual. Updated `PlatformLayout.tsx` (messenger ready: true), `platformRouter.tsx` (mesaje route), and `src/app/router.tsx` (admin/contact-platforma route). Added `support.*` and `platform.messenger.*` locale keys (RO + EN). 20 unit tests in `tests/unit/platformMessenger.test.ts`. 275 files / 2567 tests / lint + typecheck + build + build:pi + build:demo all green.

### T98 P2 ✅ 2026-06-04 -- Audited superadmin impersonation (read-only)

Added `impersonation.started` + `impersonation.ended` to `AUDIT_ACTIONS` and `impersonation` to `AUDIT_ENTITIES` in `auditLogic.ts`. Added `recordEntry(asociatieId, input)` action to `usePlatformAuditStore` (appends to in-memory demo chain). Created `netlify/functions/impersonate.ts`: POST-only, service-role; verifies bearer token, re-checks `platform_admins`, validates action ('start'|'end') + asociatie_id, fetches target asociație name, fetches last chain entry (prev_hash), inlines cyrb53 hash computation, inserts `impersonation.started`/`.ended` row into `audit_log`, returns `{ok, asociatie_id, asociatie_name, actor_id, actor_name}`. Created `src/platform/platformImpersonationStore.ts`: `ImpersonationSession` type, `startSession`/`endSession`/`clearError` actions; demo mode records directly to `usePlatformAuditStore`, live mode calls the Netlify function. Created `src/platform/ImpersonationBanner.tsx`: amber persistent banner with Eye icon, asociație name, and "Ieși" exit button. Created `src/platform/PlatformImpersonatePage.tsx` at `/consola/impersonare`: read-only notice, active session card, association list with start/stop buttons. Updated `PlatformLayout.tsx`: renders `ImpersonationBanner` inside main, marks `impersonation` ready: true. Added route in `platformRouter.tsx`. Added impersonation tone entries to both audit page action-tone maps. Added `audit.action.impersonation.*`, `audit.entity.impersonation`, `platform.impersonation.*` keys to RO + EN locales. 17 unit tests in `tests/unit/platformImpersonation.test.ts`. 268 files / 2547 tests / lint + typecheck + build + build:pi + build:demo all green.

### T97 P2 ✅ 2026-06-04 -- Platform usage/health metrics (superadmin app)

Created `supabase/migrations/20260604000004_usage_metrics_superadmin_rls.sql`: drop-if-exists + create super_admin SELECT policies on `announcements`, `tickets`, `votes`. Created `src/platform/platformUsageStore.ts`: `AssocUsageMetric` interface, `HealthStatus` union (`active`/`moderate`/`dormant`), pure `deriveHealthStatus(lastSignInAt, now)` (active < 14 days, moderate < 60, dormant otherwise or null), pure `computeRollup(metrics)` (status counts + member/apartment sums), Zustand store seeded from `DEMO_PLATFORM_ASOCIATII` with pre-computed 30-day activity counts. Added `hydrateUsageMetrics()` to `platformApi.ts`: 7 parallel queries (asociatii, memberships, apartments, auth_audit_events, announcements, tickets, votes with 30-day window); groups client-side with existing `groupCount`/`groupLatest`; derives `healthStatus` at hydration time. Created `src/platform/PlatformUsagePage.tsx` at `/consola/utilizare`: summary bar with active/moderate/dormant badge counts + total member count, name/city search, per-asociatie list rows with health badge, counts, 30-day activity, and last sign-in. Changed `usage` section to `ready: true` in `PlatformLayout.tsx`. Added `utilizare` route + lazy import in `platformRouter.tsx`. Added `platform.usage.*` locale keys (RO + EN, all plural forms). Created `tests/unit/platformUsage.test.ts` with 16 assertions. 267 files / 2530 tests / lint + typecheck + build + build:pi + build:demo all green.

### T96 P2 ✅ 2026-06-04 -- Platform error feed (superadmin app)

Created `supabase/migrations/20260604000003_platform_error_reports.sql`: `platform_error_reports` table (id, ref, name, message, source, extra jsonb, at bigint, created_at) with RLS enabled and a `super_admin_read_platform_error_reports` SELECT policy gated on `is_super_admin()`. No INSERT policy: only the service-role key may write rows. Updated `netlify/functions/error-report.ts` (T82): after logging structural metadata, when `isSupabaseAdminConfigured()` inserts the scrubbed report (ref/name/message/source/extra/at) into `platform_error_reports` via `supabaseAdmin()`. Added `getReportBuffer()` + 100-report ring buffer to `src/shared/lib/errorReporting.ts` (buffer is populated by every `reportError` call; used as the demo-mode source). Created `src/platform/platformErrorStore.ts`: `PlatformErrorReport` type (ErrorReport without stack), `ErrorGroup` type, pure `groupReports()` function (groups by name+source, sorts most-recent first, tracks count/firstAt/lastAt/refs), Zustand store seeded with 7 realistic demo reports across 4 error groups. Added `hydrateErrorReports()` to `platformApi.ts`: no-op in demo mode, otherwise queries `platform_error_reports` ordered by `at DESC LIMIT 500` and updates the store. Created `src/platform/PlatformErrorsPage.tsx` at `/consola/erori`: fetches on mount, summary bar (total count badge + group count badge), filters (text search across name/message/source, from/to date range), grouped list showing error name badge, occurrence count badge, source, representative message (latest), first/last seen timestamps, and up to 5 ref codes per group (with +N overflow). Changed `errors` section from `ready: false` to `ready: true` in `PlatformLayout.tsx`. Added `erori` route in `platformRouter.tsx`. Added `platform.errors.*` locale keys (RO + EN, including `_few` plural variants for both). New `tests/unit/platformErrors.test.ts` (14 assertions: store seeds demo reports, required fields, ref pattern match, setReports replaces, setReports clears error, setFetchError, groupReports groups by name+source, counts occurrences, uses latest message, tracks firstAt/lastAt, collects all refs, sorts most-recent first, empty input, hydrateErrorReports is a no-op in demo). 271 files / 2514 tests / lint + typecheck + build + build:pi + build:demo all green.

### T95 P2 ✅ 2026-06-04 -- Cross-asociatie audit viewer (platform app)

Created `src/platform/platformAuditStore.ts`: Zustand store seeding a `buildDemoAuditChain` for each of the 3 demo asociații (distinct actors per asociație), with `setChains`/`setFetchError` actions. Added `hydrateAllAuditLogs()` to `platformApi.ts`: cross-tenant `SELECT *` on `audit_log` ordered by seq (super_admin RLS grants all rows without asociatie_id filter), grouping rows by asociatie_id into chains, updating the store. Created `src/platform/PlatformAuditPage.tsx` at `/consola/audit`: fetches on mount, shows a compact integrity bar with `verifyChain` badges per asociație and a global summary badge, the full T09 filter set (action/entity/actor/text/from/to) plus an asociație selector, JSON/CSV export, entries list with asociație name shown when viewing all, bilingual RO/EN. Wired route in `platformRouter.tsx`; changed audit section from `ready: false` to `ready: true` in `PlatformLayout.tsx`. Added `platform.audit.*` locale keys (title/subtitle/filterAsociatie/allAsociatii/chainSummaryOk/chainSummaryBroken/loading/fetchError/retry) to ro.json + en.json. New `tests/unit/platformAudit.test.ts` (9 assertions: demo chains seeded for all 3 asociații, distinct references, each passes verifyChain, each entry scoped to its own asociatie_id, setChains replaces chains, setFetchError, setChains clears error, hydrateAllAuditLogs is a function, no-op in demo mode). 268 files / 2499 tests / lint + typecheck + build + build:pi + build:demo all green.

### T68 P2 ✅ 2026-06-04 -- In-app "Link Telegram" resident surface (mock path, live-ready)

Added `src/features/telegram/telegramDeepLink.ts` (pure `buildTelegramDeepLink(botUsername, code)` helper). Added `TelegramLinkPanel` component to `src/features/profile/NotificationsPage.tsx`: residents see a "Telegram account" card after the email preferences; when unlinked it shows a "Generate link code" button that calls `useTelegramLinkStore.issueLinkCode` (scoped to `userId + currentAsociatieId + activeRole`), then displays the 8-char code + a `t.me/<bot>?start=CODE` deep link ("Open in Telegram") + a copy button (copy shows toast) + "Generate new code"; when linked it shows the username/firstName handle, the linked-at date, and a "Disconnect" button. Bot username is read from `env.telegramBotUsername` (new `VITE_TELEGRAM_BOT_USERNAME` field in `env.ts`); when unset a warning message is shown instead of the deep link. Updated `src/features/auth/SecurityPage.tsx`: the "Link Telegram" hint in the MFA channels card now navigates to `/app/notificari` (was `/app/profil`). Added `VITE_TELEGRAM_BOT_USERNAME` to `.env.example`. Added 7 unit tests in `tests/unit/telegramLinkPanel.test.ts` covering deep-link construction, code format, scopefields, round-trip URL regex, unlink, and uniqueness. 267 files / 2490 tests / lint + typecheck + build + build:pi + build:demo all green.

---

### T58 P2 ✅ 2026-06-04 -- Live activation: Telegram webhook /start CODE resolver

Created `supabase/migrations/20260604000002_telegram_link_codes.sql`: `telegram_link_codes` table with `id, code (unique), user_id, asociatie_id, role, expires_at, consumed_at, consumed_by_telegram_id, created_at`; RLS policy `manage own telegram link codes` scoped by `user_id = auth.uid() AND is_member(asociatie_id)`. Created `netlify/functions/_shared/telegramStartLive.ts` with `resolveAndPersistStartCode(normalizedCode, user)`: (1) checks for an existing `telegram_users` row with matching `telegram_user_id` and non-null `user_id` -> 'already-linked'; (2) looks up `telegram_link_codes` by code -- validates `consumed_at`/`expires_at`, atomically updates with `IS NULL` guard to prevent double-spend, upserts `telegram_users` with `user_id` set -> 'linked'; (3) falls through to `invite_codes` lookup -- validates `revoked_at`/`consumed_at`/`single_use`/`expires_at`, upserts `telegram_users` with `user_id = null` + `session_state.pending_invite_id` so the user_id is resolved when the resident completes onboarding in-app -> 'linked'; (4) 'unknown' if neither code space matches. Added `StartCodeResolver` export type + optional `resolveStartCode?` field to `TelegramWebhookRequest`; threaded through `handleTelegramUpdate` and `handleMessage`; `handleMessage` calls the resolver (and uses `replyForStart` with name greeting) when both resolver and `msg.from` are present, falls back to the existing `replyChecking` placeholder otherwise. Updated `netlify/functions/telegram-webhook.ts` to import and inject `resolveAndPersistStartCode` when `isSupabaseAdminConfigured()`. Added 8 new unit tests in `telegramWebhook.test.ts` covering: linked (not checking placeholder), already-linked, expired, used, revoked, unknown outcomes via mock resolver, plus guard that resolver is not called when code format is invalid, and fallback to checking placeholder when `from` is absent. 265 files / 2483 tests / lint + typecheck + build + build:pi + build:demo all green.

---

### ✅ T76 — [P2] Live activation: deliver the breach resident notice + record breach events in the audit stream

Done: Added three new audit actions (`breach.authority_notified`, `breach.residents_notified`, `breach.closed`) to `AUDIT_ACTIONS` + `AuditLogPage` tone map + RO/EN locale keys. Added `'breach.resident_notice'` to `NotificationKind` with `buildBreachResidentNoticeNotification` builder (urgent priority, links to `/app/datele-mele`, carries `{ breachId, title }` in data). Updated `deriveConsentKind` in `notificationsApi.ts` to mark `'breach.resident_notice'` as `'essential'` (bypasses email consent gate). Added `emitBreachResidentNotice(breach, apartments, selfUserId)` to `notificationFanout.ts` -- fans out to all claimed apartment holders excluding self, store-first then `persistAndFanOut`. Updated `BreachAdminPage.tsx` to use `onNotifyAuthority` and `onNotifySubjects` handlers: authority button records `breach.authority_notified` audit; subjects button calls `emitBreachResidentNotice` (live only, via `isSupabaseConfigured`) then records `breach.residents_notified` audit and toasts confirmation; `onAdvance` records `breach.closed` when advancing to `inchis`. Also fixed pre-existing gap: added `aga.convoked` and `aga.voting_open` rendering cases in `NotificationsPage.tsx` (locale keys already existed from T228). Demo keeps offline download; fan-out is live-only. Added RO/EN locale keys: `notifications.breachResidentNotice`, `notifications.breachResidentNoticeBody`, `breach.subjectsNotified`. New `tests/unit/breachFanout.test.ts` with 14 assertions. 263 files / 2475 tests / lint + typecheck + build + build:pi + build:demo all green.

---

### ✅ T78 — [P2] Erasure/export must cover Storage photo objects (pets/bikes/lending/visitors)

Done: Created migration `supabase/migrations/20260604000001_photos_bucket.sql` adding the `photos` Storage bucket (private, `<asociatie_id>/<user_id>/<feature>/...` key convention) with member-read, member-write-own, and member-delete-own RLS policies. Added `extractPhotoPaths(rows)` pure helper to `gdprLogic.ts`. Extended `gdpr-erasure.ts` with Phase 0 (collect photo_paths from pets/bikes/lending_items/marketplace_listings/visitor_reports before any mutation), a `visitor_reports.photo_path = null` update in Phase 1 (image is personal data even on retained rows), and Phase 2.5 (best-effort `db.storage.from('photos').remove(photoPaths)` after row deletions; errors suppressed so a missing object never blocks erasure). New `tests/unit/gdprStorageErasure.test.ts` with 6 assertions. 262 files / 2461 tests / lint + typecheck + build + build:pi + build:demo all green.

---

### ✅ T228 — [P2] Notification fan-out for AGA lifecycle (meeting convoked + voting opened)

Done: Added `'aga.convoked'` and `'aga.voting_open'` variants to `NotificationKind` in `notificationLogic.ts`. Added `buildAgaConvokedNotification` (normal priority, data: title/date/location, link: /app/aga) and `buildAgaVotingOpenNotification` (urgent priority, data: title, link: /app/aga) builder functions. Added bilingual locale keys `agaConvoked`, `agaConvokedBody`, `agaVotingOpen`, `agaVotingOpenBody` to both `ro.json` and `en.json`. Added `emitAgaConvoked(meeting, apartments, selfUserId, now?)` and `emitAgaVotingOpen(meeting, apartments, selfUserId, now?)` to `notificationFanout.ts` — both collect unique `claimed_user_id` values from apartment persons, skip empty strings and `selfUserId` (self-notify guard), and are no-ops when there are no recipients; store-first with `persistAndFanOut` behind `isSupabaseConfigured`. Wired into `agaApi.ts`: `convokeMeeting` reads apartments and current user from `useApartmentsStore`/`useAuthStore`, finds the newly-added meeting, and calls `emitAgaConvoked`; `advanceStatus` calls `emitAgaVotingOpen` when the meeting transitions to `in_desfasurare`. Added 12 new unit tests to `notificationFanout.test.ts` (6 per helper: skip-no-apartments, skip-no-claimed-ids, skip-self-notify, emits-to-all-holders, correct-kind-and-data, offline-safe). 261 files / 2455 tests / lint + typecheck + build + build:pi + build:demo all green.

---

### ✅ T227 — [P2] PWA manifest + mobile installability

Done: Created `public/manifest.webmanifest` with all required fields (`name`, `short_name`, `start_url: "/app"`, `display: "standalone"`, `theme_color: "#3d6b4f"`, `background_color: "#1d2b25"`, `lang`, `scope`, `categories`) and three icon entries referencing the existing `favicon.svg` at 192x192, 512x512, and `any` size (SVG is resolution-independent). Added `<link rel="manifest" href="/manifest.webmanifest">` to `index.html` (`theme-color` meta was already present). Created `tests/unit/pwaManifest.test.ts` with 4 assertions: file exists, required fields present (name/short_name/display/theme_color/background_color), icons array non-empty, and start_url equals `/app`. 261 files / 2441 tests / lint + typecheck + build + build:pi + build:demo all green.

---

### ✅ T226 — [P2] Assistant widget Phase 2 — live open polls + my ticket status + upcoming events

Done: Added three new builder functions to `dataSources.ts`: `buildPollEntries` (filters to published, non-closed polls within their open window), `buildMyTicketEntries` (filters to non-terminal tickets reported by the current user), `buildEventEntries` (filters to events whose `starts_at` is in the future). Updated `useDataEntries()` to read from `useAsociatiePolls()`, `useAsociatieTickets()`, `useAsociatieEvents()`, and `useAuthStore` (for current user ID, falling back to `DEMO_CURRENT_USER_ID`); all three stores are seeded with demo data and hydrated live by their API layers. Updated `DATA_ENTRIES` static constant to include demo-backed poll/ticket/event entries. Fixed `assistant.data.test.ts` to disable all five data-backed features (F56, F36, F08, F09, F17) when testing the no-data-entries assertion. Added 16 new unit tests across three describe blocks in `assistant.engine.test.ts` covering open-poll filtering, closed-poll exclusion, my-ticket filtering, closed-status exclusion, upcoming-event filtering, past-event exclusion, empty-input, and term-keyword coverage. 260 files / 2437 tests / lint + typecheck + build + build:pi + build:demo all green.

---

### ✅ T225 — [P2] Realtime sync extended to governance + community tables

Done: Extended `realtimeLogic.ts` with four new pure apply helpers: `applyNotificationInsert` (dedup-prepend for the notifications inbox), `applyPetitionSignatureInsert` (increments signature count and auto-flips status to 'inaintata' at threshold), `applyVoteInsert` (increments running poll-option counts for all selected_option_ids in one vote), `applyRsvpChange` (updates own-RSVP map for cross-device sync; INSERT=true, DELETE-equivalent=false). Extended `useRealtimeSync` with five new channel subscriptions on the existing per-asociatie realtime channel: notifications INSERT (with `asociatie_id` filter; DB row mapped snake->camelCase before applying), petition_signatures INSERT (no column filter; RLS scopes via petitions join), votes INSERT (with `asociatie_id` filter; delegates to `mergeCounts`), event_rsvps INSERT and UPDATE (no column filter; "self rsvp" RLS limits to own rows enabling cross-device sync). Added 25 new unit tests across the four helpers. 260 files / 2420 tests / lint + typecheck + build + build:pi + build:demo all green.

---

### ✅ T224 — [P2] Scheduled-announcement server-side hold-back (RLS expression on published_at/scheduled_at)

Done: Created migration `supabase/migrations/20260603000012_announcement_scheduled_rls.sql` which drops the generic `announcements` "members read" policy (placed by `apply_standard_rls`) and replaces it with a scoped policy: `is_member(asociatie_id) AND (has_role(...manager roles...) OR NOT (published_at IS NULL AND scheduled_at > now()))`. Managers see all rows; non-managers are blocked from future-scheduled unpublished rows. Extended `tests/unit/rlsTenantIsolation.test.ts` with a parse-based assertion verifying both the `published_at is null and scheduled_at > now()` expression and the manager-role bypass are present. 260 files / 2395 unit tests / lint + typecheck + build + build:pi + build:demo all green.

---

### ✅ T223 — [P2] E2E for F06 Locator + F66 Profile + F67 Home customization

Done: Updated existing F06 test to also select category 'ofer' via `getByLabel('Categorie').selectOption('ofer')` and verify the "Ofer" badge appears on the posted card. Added F66 test: reads initial `aria-valuenow` from the progressbar, fills "Nume afișat" (one of 10 completeness checks), asserts `aria-valuenow` increased, then opens the "Adaugă câmp" modal, fills "Eticheta câmpului", confirms with "Creează", and asserts the custom field label is visible. Added F67 test: enters edit mode via "Personalizează", clicks the first "Ascunde cardul" button, verifies toggle flips to "Afișează cardul", exits via "Gata", asserts `.home-shortcut` count decreased by one, then reloads and navigates back to verify the Zustand-persist layout survives the reload. 260 files / 2394 unit tests / lint + typecheck + build + build:pi + build:demo all green.

---

### T222 P2 ✅ 2026-06-04 -- E2E batch for projects + safety + community-life (F41-F48, F50-F53, F57, F62-F63, F65)
- new: tests/e2e/community.spec.ts (12 happy-path tests)
- F41: advance "Termoizolație fațadă" phase (in_curs -> finalizat), button disappears
- F44: verify "Țintă atinsă" badge on funded project + pledge 200 lei to open project
- F47: add energy reading (450 kWh, 318 lei), verify toast
- F48: verify "expirată" badge on wr-3 (2024) + "în garanție" badge on wr-1 (2027)
- F50: view evacuation plan — "Scara A" heading, equipment section, "Stingător" entry
- F51: verify "depășit" badge on overdue psi-1 + mark checked, verify rescheduling toast
- F52: verify "expiră curând" badge on 18-day expiry policy + renewal banner
- F53: add key record "Sala de fitness" / "Ionescu Mihai", verify toast + entry
- F57: post marketplace listing "Bicicletă copii 20"" at 150 lei, verify in feed
- F62: tick "Citește regulamentul" welcome step, verify "Parcurs" badge
- F63: edit birthday to June 4 (today), verify "Aniversări azi" section appears
- F65: submit feedback message, verify "Mulțumim pentru feedback!" toast
- 260 files / 2394 unit tests / lint + typecheck + build + build:pi + build:demo all green

### T221 P2 ✅ 2026-06-04 -- E2E batch for shared spaces + information + community registry (F28-F34, F37-F39)
- new: tests/e2e/registry.spec.ts (9 happy-path tests)
- F28: add parking spot "P5" + plate "B 100 NEW", search by plate
- F29: register bike "Trek Marlin albastru", verify list entry
- F30: verify seeded assigned ("Ap. 1" badge) and unassigned ("Neatribuită") storage rooms
- F31: sign up for "Tuns gazonul din față" free green task, "Renunț" replaces "Mă înscriu"
- F32: generate courier code, verify "Activ · 30 min" badge
- F34: add "EnergoMax SRL" with past contract end, verify "Expirat" badge + alert banner
- F37: register pet "Lola", mark lost, verify "Pierdut" badge
- F38: post thank-you to Ap. 7, verify message in feed
- F39: add wiki page "Reguli de zgomot", search returns it
- 260 files / 2394 unit tests / lint + typecheck + build + build:pi + build:demo all green

### T220 P2 ✅ 2026-06-04 -- E2E batch for maintenance + issues features (F18-F24)
- new: tests/e2e/maintenance.spec.ts -- 7 happy-path tests covering F18 (add repair + warranty badge), F19 (add scheduled maintenance + mark done), F20 (high meter reading + anomaly flag), F21 (recurring banner + lift pattern heading), F22 (post RFP + add quote + cheapest badge), F23 (sign up duty + covered badge), F24 (add lending item + mark borrowed)
- all tests run on Chromium + Pixel 7 mobile via existing playwright.config.ts projects
- 260 files / 2394 unit tests / lint + typecheck + build + build:pi + build:demo all green

### T15 P1 ✅ 2026-06-04 -- Telegram bot go-live: complete all command/callback handlers + integration tests
- extended: src/shared/server/telegramWebhook.ts -- added `PRIMARY_COMMANDS` dict (8 primary BotFather-menu commands: /anunturi, /voturi, /sesizare, /sesizarile_mele, /rezervari, /evenimente, /urgenta, /setari); added `MENU_CALLBACK_REPLIES` router (menu:anunturi/voturi/sesizare/rezervari callbacks now send meaningful informational replies instead of stub "Ai ales:" string); fixed @botname suffix stripping in command dispatch; restructured handleMessage to check /menu|/help before PRIMARY_COMMANDS before FEATURE_COMMANDS
- extended: tests/unit/telegramWebhook.test.ts -- expanded from 5 to 29 integration tests covering all primary commands, all menu callbacks, unknown callback fallback, /start with/without payload, @botname suffix, feature commands, no-op updates; exported PRIMARY_COMMANDS for assertion in test
- no changes needed: validateInitData + verifyWebhookSecret already tested end-to-end in telegramAuth.test.ts (8 assertions); BOT_SETUP.md is complete and non-developer-friendly; Netlify function adapter unchanged (thin; wires correctly)
- 260 files / 2394 tests / lint + typecheck + build + build:pi + build:demo all green

### T219 P2 ✅ 2026-06-03 -- Live-activate F57 Marketplace + F58 Carpool + F59 Babysitting + F60 Barter + F61 Cumpărături comune + F62 Welcome kit + F63 Aniversări + F64 Copii + F65 Feedback
- new: src/features/marketplace/marketplaceApi.ts (hydrateListings, addListingLive)
- new: src/features/carpool/carpoolApi.ts (hydrateCarpool, saveCarpoolProfile, leaveCarpoolProfile)
- new: src/features/sitters/sitterApi.ts (hydrateSitters, saveSitterProfile, leaveSitterProfile)
- new: src/features/barter/barterApi.ts (hydrateBarter, saveOffering, leaveOffering)
- new: src/features/groupbuys/groupBuyApi.ts (hydrateGroupBuys, addGroupBuyLive, joinGroupBuyLive)
- new: src/features/welcomekit/welcomeKitApi.ts (hydrateWelcomeKit, addWelcomeKitItemLive, removeWelcomeKitItemLive)
- new: src/features/birthdays/birthdaysApi.ts (hydrateBirthdays, saveBirthdayConsent, leaveBirthdayConsent)
- new: src/features/kids/kidsApi.ts (hydrateKids, registerKidsLive, addKidsEventLive)
- new: src/features/feedback/feedbackApi.ts (hydrateFeedback, addFeedbackLive)
- rebuilt: marketplaceStore/carpoolStore/sitterStore/barterStore/groupBuyStore/welcomeKitStore/birthdaysStore/kidsStore/feedbackStore (all per-asociație persisted with byAsociatie + fetchError + useAsociatieXxx hooks)
- extended logic: marketplaceLogic/carpoolLogic/sitterLogic/barterLogic/groupBuyLogic/welcomeKitLogic/birthdaysLogic/kidsLogic/feedbackLogic (MarketplacesByAsociatie, CarpoolsByAsociatie, SittersByAsociatie, BarterByAsociatie, GroupBuysByAsociatie, WelcomeKitsByAsociatie, BirthdaysByAsociatie, KidsByAsociatie, FeedbackByAsociatie + seed/for/add/migrate helpers)
- updated pages: MarketplacePage/CarpoolPage/SittersPage/BarterPage/GroupBuysPage/WelcomeKitPage/BirthdaysPage/KidsPage/FeedbackPage (useEffect hydration + ErrorState retry + authStore userId/profileGet for seller/organizer names)
- migration: supabase/migrations/20260603000011_f57_f65_columns.sql (seller_name/category on marketplace_listings; user_name on carpool/sitter/skill/birthday; organizer_name on group_buys; order_num/title/body on welcome_kit_templates; bucket/count_num on kids_age_ranges; date/time/location/bucket/note/interested/organizer cols on kids_events; member-insert policies; unique constraints)
- fixed: MyDataPage migrated from flat store shapes to per-asociație byAsociatie selectors for marketplace/birthdays/carpool/sitters/barter/feedback/kidsRanges/kidsEvents
- fixed: minorsGuard.test.ts updated to new kidsStore API (registerKids/addEvent signatures + byAsociatie access)
- new: tests/unit/marketplaceApi.test.ts (3), carpoolApi.test.ts (4), sitterApi.test.ts (4), barterApi.test.ts (4), groupBuyApi.test.ts (5), welcomeKitApi.test.ts (3), birthdaysApi.test.ts (4), kidsApi.test.ts (3), feedbackApi.test.ts (4) = 34 assertions

### ✅ T218 — [P2] Live-activate F49 Cod portari + F50 Evacuare + F51 PSI + F52 Asigurare + F53 Chei + F54 Vizitatori + F55 Alarmă
Done: Seven Category-7 safety/compliance stores rebuilt as per-asociatie persisted stores (per-user for F49) and seven API files created. F49 -- `safetyStore` (byUser keyed), `safetyApi.ts` (AES-GCM PBKDF2 encryption: ciphertext-only in DB, never plaintext server-side); F50 -- `evacuationStore` (byAsociatie with {plans,markers}), `evacuationApi.ts` (hydrateEvacuation + persistPetMarker + removePetMarker), migration adds route/equipment jsonb + apartment_label/user_id + owner-manage policy; F51 -- `psiStore`, `psiApi.ts` (hydratePsiAssets + addPsiAssetLive + markPsiCheckedLive); F52 -- `insuranceStore`, `insuranceApi.ts` (hydrateInsurance + addInsurancePolicyLive); F53 -- `keysStore`, `keysApi.ts` (hydrateKeys + addKeyLive + handoverKeyLive), migration adds holder_name column; F54 -- `visitorsStore`, `visitorsApi.ts` (hydrateVisitors + addVisitorReportLive + cycleVisitorStatusLive), migration adds reporter_name + member-insert policy; F55 -- `alarmStore`, `alarmApi.ts` (hydrateAlarm + addAlarmSystemLive + logAlarmTestLive + reportAlarmFaultLive). All 7 pages updated with useEffect hydration + ErrorState retry. MyDataPage migrated to useAsociatieVisitors() hook. Migration `20260603000010_f49_f55_columns.sql`. 7 new API test files (27 assertions). 251 files / 2337 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T217 — [P2] Live-activate F41 Project tracker + F42 Photo journal + F43 Contractori + F44 Crowdfunding + F45 Plan multianual + F47 Energie + F48 Garanții
Done: Seven per-asociatie stores rebuilt with `zustand/persist` (vecini.projects/photojournal/contractors/crowdfund/multiyear/energy/warranties), each with `byAsociatie` catalog + `useAsociatieXxx()` hook. Logic files extended with per-asociatie types (ProjectsByAsociatie, PhotosByAsociatie, ContractorsByAsociatie, CrowdfundsByAsociatie, MultiyearByAsociatie, EnergyByAsociatie, WarrantiesByAsociatie) and seed/for/add/migrate helpers. Seven API files: `projectsApi` (hydrateProjects + addProjectLive + setProjectStatusLive), `photoJournalApi` (hydratePhotos + addPhotoLive), `contractorsApi` (hydrateContractors + addContractorLive + rateContractorLive + toggleContractorAvailableLive), `crowdfundApi` (hydrateCrowdfunds + createCrowdfundLive + pledgeLive -- pledges aggregated in JS), `multiyearApi` (hydrateMultiyear + addMultiyearItemLive), `energyApi` (hydrateEnergy + addEnergyRecordLive), `warrantiesApi` (hydrateWarranties + addWarrantyLive). All seven pages hydrate on mount with ErrorState retry. F42 PhotoJournalPage migrated to `useAsociatieProjects` hook. No new migrations needed. 7 new API test files (30 assertions). 244 files / 2310 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T216 — [P2] Live-activate F34 Furnizori + F35 Apartament info + F36 Directory + F37 Animale + F38 Mulțumiri + F39 Wiki + F40 Glosar
Done: Six per-asociatie stores rebuilt with `zustand/persist` (vecini.suppliers/directory/pets/thankyous/wiki/glossary), each with a `byAsociatie` catalog + `useAsociatieXxx()` hook. Logic files extended with per-asociatie types (SuppliersByAsociatie, DirectoryByAsociatie, PetsByAsociatie, ThankYousByAsociatie, WikiByAsociatie, GlossaryByAsociatie) and seed/for/add/migrate helpers. Six API files: `suppliersApi` (hydrateSuppliers + addSupplierLive), `directoryApi` (hydrateDirectory + syncDirectoryConsent), `petsApi` (hydratePets + addPetLive + togglePetLostLive), `thankYousApi` (hydrateThankYous + postThankYouLive), `wikiApi` (hydrateWiki + addWikiPageLive + updateWikiPageLive), `glossaryApi` (hydrateGlossary). Migration `20260603000009_f34_f40_member_policies.sql`: owner_name on pets, from_name on thank_yous, member-insert policy on thank_yous, denormalized profile columns (name/apartment/phone/email) on resident_directory_consent. `canManageWiki` added to wikiLogic (comitet+ gates add/edit). All six pages hydrate on mount with ErrorState retry. F35 is computed from already-live stores (no dedicated write path). `MyDataPage` + `dataSources.ts` updated to per-asociatie hooks. New `glossaryStore.ts`. 6 new API test files (24 assertions). 237 files / 2280 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T215 — [P2] Live-activate F28 Parcare + F29 Bicicletăria + F30 Boxa + F31 Plante + F32 Acces curierat
Done: Five per-asociatie stores rebuilt with `zustand/persist` (vecini.parking/bikes/storage/green/access), each with a `byAsociatie` catalog + `useAsociatieXxx()` hook. Logic files extended with per-asociatie types (ParkingByAsociatie, BikesByAsociatie, StorageByAsociatie, GreenByAsociatie, AccessByAsociatie) and seed/for/add/migrate helpers. Five API files: `parkingApi` (hydrateParking/addParkingSpot), `bikesApi` (hydrateBikes/addBike/toggleBikeAbandoned), `storageApi` (hydrateStorageUnits/addStorageUnit), `greenApi` (hydrateGreenTasks/addGreenTask/signUpForTask/releaseTask), `accessApi` (hydrateAccessCodes/persistAccessCode -- server-stamped expires_at authoritative for active/expired state). Migration `20260603000008_f28_f32_columns.sql`: denormalized `apartment_label`/`license_plate` on `parking_spots`, `owner_name`/`created_at` on `bikes`, `apartment_label` on `storage_units`, `volunteer_user_id`/`volunteer_name` on `green_space_tasks`; member insert/update policies for all five tables. All five pages hydrate on mount with `useEffect` + `ErrorState` retry. `MyDataPage` migrated to `useAsociatieBikes()`. 5 new test files (24 assertions total). 231 files / 2256 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T214 — [P2] Live-activate F21 Sesizări recurente + F22 Solicitare oferte + F23 Vecin de gardă + F24 Împrumutabile
Done: F21 — `recurringLogic.ts` extended with `AcknowledgedByAsociatie`, `toggleAckIn`, `isAcknowledgedIn`, `seedAcknowledged`, `migrateAcknowledgedState`; `recurringStore.ts` rebuilt as persisted per-asociatie store; `RecurringPage` scopes acks by `currentAsociatieId` (no API needed — computed over tickets). F22 — `rfpLogic.ts` extended with `RfpsByAsociatie`, `addRfpIn`, `addQuoteIn`, `decideRfpIn`, `migrateRfpsState`; `rfpStore.ts` rebuilt per-asociatie persisted with `useAsociatieRfps` hook; new `rfpApi.ts` (`hydrateRfps` reads rfps + rfp_quotes in parallel, `addRfpItem`, `addRfpQuote`, `decideRfpItem`); `RfpPage` hydrates on mount + `ErrorState` retry. F23 — `dutyLogic.ts` extended with `DutyByAsociatie`, `signUpIn`, `releaseIn`, `migrateDutyState`; `dutyStore.ts` rebuilt per-asociatie persisted with `useAsociatieDuty` hook; new `dutyApi.ts` (`hydrateDutySlots`, `signUpForDuty`, `releaseFromDuty`); `DutyPage` uses authStore user (not hardcoded DEMO_USER), hydrates on mount + `ErrorState` retry. F24 — `lendingLogic.ts` extended with `LendingByAsociatie`, `addLendingIn`, `toggleAvailableIn`, `migrateLendingState`; `lendingStore.ts` rebuilt per-asociatie persisted with `useAsociatieLending` hook; new `lendingApi.ts` (`hydrateLendingItems`, `addLendingItem`, `toggleLendingAvailable`); `LendingPage` uses authStore owner + hydrates on mount + `ErrorState` retry. `MyDataPage` migrated to `useAsociatieLending()`. New migration `20260603000007_duty_lending_rfp_member_policies.sql` (rfp_quotes.selected column, duty_schedule volunteer_user_id+volunteer_name+member-update policy, lending_items owner_name+member-update policy, rfp_quotes member-insert policy). 3 new test files: `rfpApi.test.ts` (6 assertions) + `dutyApi.test.ts` (6 assertions) + `lendingApi.test.ts` (6 assertions). 226 files / 2233 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T213 — [P2] Live-activate F18 Istoric reparații + F19 Calendar service-uri + F20 Citire contoare
Done: F18 — `repairLogic.ts` extended with per-asociatie types + `canManageRepairs`; new `repairRecordsStore.ts` (per-asociatie persisted, `useAsociatieRepairs` hook); new `repairRecordsApi.ts` (`hydrateRepairs` + `addRepair`); `RepairsPage` uses store, hydrates on mount, `ErrorState` retry, admin-only compose form (8 new EN+RO i18n keys). F19 — `maintenanceLogic.ts` extended with per-asociatie types; `maintenanceStore.ts` rebuilt as per-asociatie persisted (`useAsociatieMaintenance` hook); new `scheduledMaintenanceApi.ts` (`hydrateMaintenance` + `addMaintenanceItem` + `markMaintenanceDone`); `MaintenancePage` hydrates + `ErrorState` retry. F20 — `meterLogic.ts` extended (`MeterCatalog`/`MetersByAsociatie`/`seedMeters`/`metersForAsociatie`/`applyReadingToCatalog`); `metersStore.ts` rebuilt as per-asociatie persisted (`useAsociatieMeters` hook); new `metersApi.ts` (`hydrateMeters` derives `last_value` from most-recent reading, `submitMeterReading`); `MetersPage` hydrates + `ErrorState` retry; `ApartmentInfoPage` migrated to `useAsociatieMeters()`. Migration `20260603000006_meter_readings_member_insert.sql` (member insert policy). 3 new test files: `repairRecordsApi.test.ts` (3 assertions) + `scheduledMaintenanceApi.test.ts` (7 assertions) + `metersApi.test.ts` (4 assertions). 224 files / 2214 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T121 — [P2] E2E for the asociații provisioning console (platform app)
Done: Two Playwright tests added to `tests/e2e/platform.spec.ts` against `platform.html` in demo mode: (1) T121-1 — empty form submit triggers "Required field / Câmp obligatoriu" validation errors; (2) T121-2 — fill admin name + email, submit → success banner contains the email + demo-mode note → navigate back to the list → pending invite appears in the "Pending invitations" section with a "Setup pending" badge. 4/4 tests green on chromium + mobile (2 live-only tests correctly skipped). 221 files / 2196 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T120 — [P2] Live activation: cross-tenant asociații list read + server-mediated provisioning
Done: New `src/platform/platformApi.ts` — `hydrateAsociatiiList()` reads 4 tables in parallel (`asociatii`, `memberships`, `apartments`, `auth_audit_events`) using the T91 super_admin cross-tenant RLS policies; groups member + apartment counts in JS; derives the last sign-in per asociatie from sign_in events; calls `replaceAsociatii` on success, `setFetchError('load')` on failure, behind `isSupabaseConfigured`. New migration `20260603000005_platform_superadmin_auth_audit.sql` adds the missing super_admin SELECT policy on `auth_audit_events` (needed for the dormant signal). `platformAsociatiiStore` extended with `fetchError / setFetchError / replaceAsociatii` (not persisted — live data is always refetched on mount). `PlatformAsociatiiPage` wires a `useEffect` that calls `hydrateAsociatiiList()` on mount, shows `ErrorState` with retry on failure, and hides the list while hydrating an empty result. Provisioning was already server-mediated via the T152 `provision-asociatie` Netlify function (no change needed there). 6 new assertions in `tests/unit/platformApi.test.ts` (offline no-op, replaceAsociatii updates list, setFetchError sets/clears). 221 files / 2196 tests / lint + typecheck + build + build:pi + build:demo all green.

### T119 P2 ✅ 2026-06-03 -- Platform-shell access E2E
- new: tests/e2e/platform.spec.ts (4 tests: login page gate, demo smoke round-trip, asociatii navigation, live-path guard skip)
- demo smoke: enter demo console → /consola overview (welcome h1, .platform-demobadge, stats region) → sign out → back at login
- navigation: section card link click to /consola/asociatii (uses link not sidebar button, works on mobile viewports)
- live guard: skips in demo builds; verifies email form shown and heading present in live mode
- result: 220 files / 2190 tests / 6 passing + 2 skipped on chromium + mobile / lint + typecheck + build + build:pi + build:demo all green

### T75 P2 ✅ 2026-06-03 -- Live activation: persist ROPA snapshot + DPA adoption record
- new: supabase/migrations/20260603000004_ropa_dpa.sql (ropa_snapshots + dpa_adoptions tables, RLS: admin/presedinte insert, members select)
- new: src/features/legal/ropaApi.ts (saveRopaSnapshot, loadRopaSnapshots, adoptDpa, loadDpaAdoptions; all no-ops offline)
- updated: src/features/legal/ProcessingRecordsPage.tsx (Save snapshot button + Adopt DPA button; loads history on mount; shows last saved/adopted by+date; all behind isSupabaseConfigured)
- updated: src/shared/locales/en.json + ro.json (6 new keys: adoptDpa, dpaAdopted, lastAdoption, saveSnapshot, snapshotSaved, lastSnapshot)
- new: tests/unit/ropaApi.test.ts (9 assertions: offline-path no-ops for all four API functions)
- result: 219 files / 2190 tests / lint + typecheck + build + build:pi + build:demo all green

### T72 P2 ✅ 2026-06-03 -- Live activation: server-side erasure execution + retention cleanup
- new: netlify/functions/gdpr-erasure.ts (POST, bearer auth, ERASURE_PLAN phases 1+2, membership removal, auth.admin.deleteUser when no remaining memberships, rate-limit 10/hr/uid)
- new: netlify/functions/gdpr-retention-purge.ts (monthly scheduled + manual POST, purges auth_audit_events >12 months + resolved tickets >1 year, rate-limit 5/hr/IP)
- new: src/features/gdpr/gdprErasureApi.ts (triggerErasure + triggerRetentionPurge, no-ops offline)
- updated: src/shared/store/gdprStore.ts (fires triggerErasure on completed erasure action)
- updated: DATA_RETENTION.md (live-activation apply steps documented)
- new: tests/unit/gdprErasureApi.test.ts (7 assertions: offline-path no-ops, erasedUserIds flow)
- result: 218 files / 2181 tests / lint + typecheck + build + build:pi + build:demo all green

### ✅ T106 — [P2] Live activation: persist the per-resident home layout (`home_layouts`)
Done: New `src/features/home/homeLayoutApi.ts` -- `hydrateHomeLayout(residentId, asociatieId)` reads the resident's row from `home_layouts` under owner RLS (unique on resident+asociatie), writes raw cards to the local `homeLayoutStore` (the component reconciles against current feature flags via `reconcileLayout` exactly as it does offline); `persistHomeLayout(residentId, asociatieId, cards)` upserts on the unique constraint so the personalized layout follows the resident across devices; `deleteHomeLayout(residentId, asociatieId)` removes the row when the resident resets to the default. All functions guard on `isSupabaseConfigured` with offline fallback. `HomePage.tsx` wired: `useEffect` hydrates on mount when both ids are available; `apply()` calls `persistHomeLayout` fire-and-forget alongside the synchronous store write; the reset button also calls `deleteHomeLayout` fire-and-forget. No new migration needed -- `home_layouts` table + owner-RLS policy already shipped in `20260524000001_home_layouts.sql`. New `tests/unit/homeLayoutApi.test.ts` (5 assertions: offline-path no-ops for hydrate/empty-ids/persist/delete). 217 files / 2174 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T103 — [P2] Live activation: persist profile + custom fields (`users`/`profile_custom_fields`) + Storage avatar
Done: New `src/features/profile/profileApi.ts` -- `hydrateProfile(userId)` reads `users` standard fields + `profile_custom_fields` under owner RLS, generates a signed URL for the stored `avatar_url` path, and calls `profileStore.save()` to merge live data; `persistProfile(userId, profile)` updates standard `users` columns (full_name, display_name, phone, scara, etaj, car_plate, address, emergency_contact jsonb, date_of_birth, locale) and syncs `profile_custom_fields` (upsert by id + delete stale rows) -- does NOT touch `avatar_url`; `uploadProfileAvatar(userId, dataUrl)` converts the JPEG data URL to a blob, uploads to the existing `avatars` Storage bucket at `<userId>/avatar.jpg` (upsert: true), updates `users.avatar_url` with the storage path, and returns a 1-hour signed URL; `clearProfileAvatar(userId)` removes the Storage object and nulls `users.avatar_url`; `getAvatarSignedUrl(path)` returns a 1-hour signed URL. All functions guard on `isSupabaseConfigured` with offline fallback. `ProfilePage.tsx` wired: `useEffect` hydrates from DB on mount behind `isSupabaseConfigured`; `update()` debounces a `persistProfile` call (2 s) in addition to local store save; `onPickPhoto` calls `uploadProfileAvatar` after `fileToAvatar` and swaps in the signed URL; `onRemovePhoto` calls `clearProfileAvatar` in the live path. No migration needed -- the `avatars` bucket with owner-manage RLS policy already exists (20260121000003_storage.sql). New `tests/unit/profileApi.test.ts` (11 assertions: offline-path no-ops for hydrate/persist/upload/clear/signedUrl). 216 files / 2169 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T61 — [P2] Wire (or remove) the ApartmentsPage "generate codes" button
Done: The "Generează invitații" bulk-invite button now sends real per-apartment invites. Added `isBulkSending` state + `onBulkInviteConfirm` async handler that iterates over `eligibleApartments` (apartments with a recorded email, not yet joined), issues a single-use `proprietar` invite via `inviteStore.issue()` with `onboardingExpiry()`, writes to live via `writeInviteToLive` behind `isSupabaseConfigured`, delivers via `sendInviteEmail`, marks sent, and records audit events. Modal cancel is blocked while sending. Summary toasts show sent/failed counts using new `generateInvitesSent_one/other` and `generateInvitesFailed_one/other` locale keys (EN + RO with real diacritics). 215 files / 2158 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T63 — [P2] Show the active asociație on FeaturesAdminPage + empty-state when none
Done: `useCurrentAsociatie()` added to `FeaturesAdminPage`. When `currentAsociatieId` is null the entire feature list is replaced by a bilingual `EmptyState` (title + body). When an asociație is active a muted `managingFor` line appears above the triage/category list showing the resolved name. Three new i18n keys in en.json + ro.json (with real diacritics): `features.managingFor`, `features.noAsociatieTitle`, `features.noAsociatieBody`. 215 files / 2158 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T212 — [P1] Privileged-role absolute session expiry (force re-auth after 8 h for admin/comitet)
Done: `src/features/auth/sessionExpiry.ts` -- pure helper: `PRIVILEGED_SESSION_MAX_MS` (8 h), `isPrivilegedRole` (admin/presedinte/comitet/cenzor), `stampPrivilegedSignin`/`clearPrivilegedSigninStamp`/`getPrivilegedSigninAgeMs`/`isPrivilegedSessionExpired` (localStorage), `markForcedSignout`/`consumeForcedSignoutReason` (sessionStorage). `authStore.signIn()` stamps after a successful live sign-in; `authStore.hydrate()` checks expiry after state is applied, forces inline sign-out + `markForcedSignout()` when the privileged session age exceeds 8 h; `signOut()`/`signOutEverywhere()` clear the stamp. `LoginPage` reads `consumeForcedSignoutReason()` on mount and fires a bilingual toast (`auth.privilegedSessionExpired`). New locale keys in en.json + ro.json (real diacritics). `tests/unit/sessionExpiry.test.ts` (13 assertions: isPrivilegedRole matrix, stamp/clear/age, expiry at threshold, non-privileged/null unaffected, forced-signout consume). 215 files / 2158 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T211 — [P1] Rework stale E2E harness (auth / consent / isolation / smoke specs)
Done: Foundation (T211 progress 2026-06-03) + all four leaf tasks (T230–T233) complete. auth/consent/isolation/batch fully reworked and green. smoke.spec.ts: T42/T126 heading strict-mode fix (T230); T09/T54 were already passing (T231); T140 demo-build detection moved before sign-out to prevent page-context crash on both chromium + mobile (T232); F04/F10/F13 proprietar-gated pages were already passing on mobile (T233). T16 blocker cleared. 214 files / 2141 tests / build + build:pi + build:demo all green.

### ✅ T230 — [P1] E2E: invite-redeem welcome redirect (smoke T42 + T126)
Done: T42 was already welcome-aware (`/(app|bun-venit)/`). T126 failed due to a strict-mode violation: `/app/notificari` renders both `<h1>Notificări</h1>` and `<h3>Preferințe notificări</h3>`, so the regex matched 2 elements. Fixed by using `{ name: 'Notificări', level: 1 }` to target only the page `<h1>`. All 6 T42 + T126 tests pass on chromium + mobile. 214 files / 2141 tests / build + build:pi + build:demo all green.

### ✅ T210 — [P3] E2E coverage for F33 Document archive (admin upload + download + delete)
Done: Two happy paths added to `tests/e2e/features.spec.ts`, green on chromium + mobile (4/4) -- (1) admin uploads a synthetic PDF-backed document ("Contract ascensor 2026"), download button appears on the card, delete with confirm dialog removes it and the toast confirms; (2) admin uploads a second doc, switches to resident role (proprietar) mid-test via localStorage + reload (also marks welcome as seen to bypass RequireWelcome), resident sees the uploaded card with its download button but "Adaugă document" is absent and no delete control appears. 215 files / 2138 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T209 — [P3] Assistant widget live data sources (F56 contacts + F36 directory from real stores)
Done: `dataSources.ts` refactored -- `buildEmergencyEntries(contacts: EmergencyContact[])` and `buildDirectoryEntries(entries: DirectoryEntry[])` promoted to exported pure functions (parameterized, testable). New `useAsociatieEmergencyContacts()` hook: returns `DEMO_EMERGENCY` in demo mode; when `isSupabaseConfigured && currentAsociatieId`, queries `emergency_contacts` under RLS (ordered by `sort_order`) and updates React state with the live data. New `useDataEntries()` hook: calls `useAsociatieEmergencyContacts()` + reads `useDirectoryStore((s) => s.entries)` (reactive -- reflects live or demo data depending on store hydration), memoizes the assembled `KbEntry[]`. `AssistantWidget.tsx` updated: `DATA_ENTRIES` static import replaced with `useDataEntries()` hook call; `dataEntries` added to `useMemo` deps so the visible entries list stays in sync with store changes. Static `DATA_ENTRIES` export retained for backward compat. `assistant.engine.test.ts` extended (+4 assertions in new `live-path data sources` block: `buildEmergencyEntries` with a custom contact, `buildDirectoryEntries` with `show_phone=true`, consent-mask: `show_name=false` skips entry, consent-mask: `show_phone=false` omits phone entry but keeps email). 215 files / 2138 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T208 — [P3] E2E coverage for shared-resource booking features (F25 spălătorie / F26 lift / F27 sală)
Done: new `tests/e2e/bookings.spec.ts` with three happy paths -- F25 (book Mașină 1 on a far-future date, mine badge appears, cancel and card gone), F26 (book elevator with floor=5 as unique identifier, mine badge, cancel), F27 (book Sală comună with unique purpose "Ședință bloc", mine badge, cancel). All three pass on chromium + mobile (6/6 green). 215 files / 2134 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T207 — [P2] Recovery codes view + regenerate in SecurityPage
Done: `recoveryCodesRemaining: number | null` state field added to `mfaStore` (null = not loaded; kept in sync by `loadRecoveryCodesCount`, `confirmEnroll`, `regenerateRecoveryCodes`, `disable`, and the demo `verifyChallenge` recovery-code consumption path). New `loadRecoveryCodesCount()` action: demo derives count from `demoRecoveryHashes.length`; live counts `mfa_recovery_codes` rows under owner-RLS. New "Coduri de recuperare" card in `SecurityPage` (shown only when `enrolled && !draft && !recoveryCodes`): displays remaining count with i18n plural (`codesRemaining_zero/one/few/other`), shows a step-up hint when `needsStepUp` is true in live mode, and gates the "Regenerează" button on `!needsStepUp`. Regenerate flows through a new confirmation modal (`confirmRegen`) with `AlertTriangle` warning (`regenConfirmTitle/Body/Confirm` keys). Existing inline "Regenerate" button removed from the TOTP status card (now lives in the dedicated card). `securityPageStepUp.test.tsx` supabase stub updated to support the `.eq` chained call in `loadRecoveryCodesCount`. New `tests/unit/recoveryCodesView.test.ts` (5 assertions: count from hashes, zero count, regenerate resets to 10, consumption decrements, not-enrolled guard). 11 new i18n keys in en.json + ro.json (with real diacritics). 214 files / 2134 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T206 — [P2] F17 Sesizări: photo attachments live wiring
Done: `TicketAttachment` domain type added (`id`, `ticket_id`, `file_name`, `file_size`, `mime_type`, `storage_path`, `file_data_url`, `created_at`); `Ticket` type extended with optional `attachments?: TicketAttachment[]`. `ticketLogic.ts` gains `TICKET_ATTACHMENT_MAX_BYTES` (5 MB), `TICKET_ATTACHMENT_MAX_FILES` (5), `TICKET_ATTACHMENT_ACCEPT`, `TICKET_ATTACHMENT_TYPES`, and `validateTicketFile` (wraps `validateFile` from shared lib). `ticketsApi.ts` fully rewritten: `hydrateTickets` now joins `ticket_attachments` in the PostgREST select and maps them onto each ticket; new `uploadTicketAttachments(asociatieId, ticketId, files)` uploads each file to the `attachments` Storage bucket at `{asociatieId}/tickets/{ticketId}/{filename}`, inserts a `ticket_attachments` row per file, returns the resolved `TicketAttachment[]`; new `getTicketAttachmentUrl(storagePath)` returns a 1-hour signed URL; `submitTicket` now accepts `offlineAttachments: TicketAttachment[]` + `liveFiles: File[]`, stores the ticket with offline data-URL attachments immediately and uploads live files in a fire-and-forget async block that updates the store after upload. `TicketsPage.tsx` updated: file input (`sr-only`, multi, accept restricted types), `handleFileChange` validates each file and enforces the 5-file cap, `submit` made async and reads data URLs offline before calling `submitTicket`, pending-files list in the compose modal with per-file remove buttons, download buttons on card for each attachment with signed-URL (live) or data-URL (offline) download. New migration `20260603000003_ticket_attachments_insert.sql` adds `file_name` + `file_size` columns and a reporter insert RLS policy. EN + RO locale keys: `attachPhoto`, `attachments`, `fileTooLarge`, `fileBadType`, `tooManyFiles`, `removeFile`, `download`, `downloadFailed`, `uploadFailed`, `attachmentsHint`. Unit tests: `ticketAttachments.test.ts` (8 assertions: null for valid types/sizes, too_large, bad_type, boundary, constants). E2E: new F17 happy path -- submit with a synthetic JPEG, attachment button appears on the card. 214 files / 2128 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T205 — [P2] Petition comitet-response surface (public reply after auto-forward)
Done: `Petition` domain type extended with optional `response`, `responded_at`, `responded_by_name` fields. Three new helpers in `petitionLogic.ts`: `petitionHasResponse`, `isValidPetitionResponse` (min 20 chars), `addPetitionResponse` (immutable catalog update). `petitionStore.ts` gains `addResponse` action. `petitionApi.ts` updated: `PetitionRow` + `rowToPetition` + `hydratePetitions` select extended with the three new columns; new `savePetitionResponse` (store-first + live `update` behind `isSupabaseConfigured`). New migration `20260603000002_petition_response_columns.sql` (adds `responded_at` and `responded_by_name`; `response` already existed). `PetitionsPage.tsx` updated: `activeRole` + `canManagePetitions` gating; forwarded petitions show (a) the response block with author/date stamp if responded, (b) an inline "Adaugă răspuns" form (textarea, min 20 chars, cancel/submit buttons) for managers, or (c) "Awaiting official response" label for residents. `DEMO_PETITIONS` gains a second seeded petition (`pt-2` with `status: 'inaintata'`) for E2E. EN + RO locale keys: `petition.response/respond/responded/awaitingResponse/responseBy`. Unit tests: `petitionLogic.test.ts` extended (+9 assertions: `petitionHasResponse`, `isValidPetitionResponse`, `addPetitionResponse`); `petitionsApi.test.ts` extended (+2 assertions: `savePetitionResponse` offline path). E2E: comitet posts response on forwarded petition, toast visible, response text visible, resident sees response after role switch. 213 files / 2128 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T204 — [P2] In-app notification fan-out for ticket.status_changed and discussion.reply
Done: `NotificationKind` extended with `'ticket.status_changed'` and `'discussion.reply'`. Two typed notification factories added to `notificationLogic.ts` (`buildTicketStatusChangedNotification`, `buildDiscussionReplyNotification`). New `notificationFanout.ts` module exports `emitTicketStatusChanged(ticket, newStatus)` (notifies the ticket's `reporter_user_id`) and `emitDiscussionReply(thread, replyAuthorId, replyAuthorName)` (notifies the first-message author, skips self-reply and empty threads); both are store-first (offline in-app notification lands immediately) + best-effort email via `persistAndFanOut` in live mode. `TicketsPage` wired in both `handleAdvanceDirect` and `confirmAdvance` (ticket found from `items` before the store update). `DiscussionsPage.send()` looks up the thread before posting and emits the reply notification. `NotificationsPage.NotifRow` renders both new kinds via i18n. EN + RO locale keys added (`ticketStatusChanged/Body`, `discussionReply/Body`). New `tests/unit/notificationFanout.test.ts` (11 assertions: correct kind/userId/data, self-notify skip, no-messages skip, empty-reporter skip, link target, offline-safe). 212 files / 2112 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T203 — [P2] E2E happy path for F01 Anunțuri (compose + scheduled badge + attachment)
Done: Three happy paths added to `tests/e2e/features.spec.ts` -- (1) admin publishes immediately: title input + body input + Publică click, asserts new heading visible, "Informativ" category badge visible, "Marchează ca citit" unread button visible; (2) manager sees "Programat" badge on seeded `an-0` (scheduled_at 2026-06-15, no published_at), then switches demo persona to `proprietar` via `page.evaluate` + welcome-state bypass and asserts the scheduled heading is NOT visible while an already-published announcement IS visible; (3) admin attaches a synthetic PNG (`Buffer.alloc(64, 0xff)`, `image/png`) via `page.locator('input[type="file"]').setInputFiles`, publishes, asserts download button with `aria-label` "Descarcă: evacuare.png" visible on the card. All 6 runs (chromium + mobile) green. 210 files / 2101 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T202 — [P2] Fix locale plural-form asymmetry (EN plural keys missing from en.json)
Done: Added 16 missing `_few` plural variants to `en.json` across 5 sections (apartments: 8 keys -- created/deleteSelectedTitle/deleteSelectedConfirm/deletedSelected/importSuccessApts/importSuccessInvites/importErrorsTitle/importWarningsTitle; breach: awaitingBanner; recurring: banner + timesInWindow; platform.asociatii: count/members/apartments/expiresInHours/expiresInDays). English `_few` = `_other` (English has no grammatical few form). New `tests/unit/localeKeys.test.ts` (4 assertions): recursively flattens both files, then fails if en.json is missing any ro.json key or vice versa -- prevents silent future divergence. 210 files / 2101 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T201 — [P2] Fix the five failing E2E tests (F07 FAQ search / F18 repair history / F35 apartment info / F36 directory / F40 glossary)
Done: All five tests fixed in `tests/e2e/features.spec.ts`. Root causes: (1) F07/F18/F36/F40 used `getByLabel(/caută/i)` which matched the topbar search button (a `<button aria-label="Caută">`) instead of the page's `<input aria-label="Caută">` after the T183 command-palette rewrite -- fixed by switching to `getByRole('textbox', { name: /caută/i })` which targets only the input element. (2) F35 used the default demo role (`admin`) but F35's audience is `['proprietar']` only, so `RequireWelcome` redirected to `/bun-venit` -- fixed by setting `iv.demo.role` to `'proprietar'` and pre-marking the welcome flow as seen (`vecini.welcome` localStorage) in an `addInitScript`, matching the T174 pattern used in the F10 test. (3) F40's `getByText('Cenzor')` matched both the glossary term `<dt>` and the demo role-switcher `<button>Cenzor</button>` -- fixed by scoping both assertions to `page.locator('#main-content')`. 209 files / 2097 tests / 10/10 E2E green (chromium + mobile) / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T200 — [P2] Live hydration + write for asociație identity (BuildingSettingsPage)
Done: `asociatieApi.ts` -- `hydrateAsociatie(asociatieId)` reads the `asociatii` row under RLS (name/address/cui/registration_number/iban/contact_phone/contact_email/settings) and calls `hydrateFromRemote` on the store (no audit entry, no double-write); `saveAsociatie(asociatieId, patch)` applies the patch to the local store synchronously (triggering the audit entry) then, behind `isSupabaseConfigured`, validates with `validateBuildingIdentity` and does the DB `update` returning `'conflict'` on `23505` (CUI unique constraint). `asociatieStore.ts` refactored: Supabase write removed from `update` (responsibility moved to `saveAsociatie`); new `hydrateFromRemote` action added (local state only). `BuildingSettingsPage.tsx` wired: `useEffect` hydrates from DB on mount; `dirty` state prevents hydration from overwriting mid-edit form values and resets after a successful save; `save()` made async and routes through `saveAsociatie`, shows `building.err.cuiConflict` toast on conflict, `loading` prop on Save button. `building.err.cuiConflict` key added to en.json and ro.json (with real diacritics). `tests/unit/asociatieApi.test.ts` (4 assertions: hydrate no-op when unconfigured/empty, save updates store synchronously, merges patches, persists null optional fields). 209 files / 2097 tests / lint + typecheck + build + build:pi + build:demo all green.
### ✅ T199 — [P1] E2E happy path for F17 Sesizări (resident submit + admin lifecycle + resolution rating)
Done: two happy paths added to `tests/e2e/features.spec.ts` -- (1) resident submits a new ticket ("Umiditate pe peretele casei scării", fills title/description/location, clicks Creează) → "Primit" badge visible on the card; (2) admin advances demo ticket t-2 "Infiltrație în garaj" from primit → asignat → in_lucru → rezolvat with notes modal ("Fisura a fost etanșată și peretele impermeabilizat") → "Rezolvat" badge + resolution notes visible → reporter rates 4 stele via the rating modal → "Mulțumim pentru evaluare" toast appears + "Evaluează rezolvarea" button gone. 4/4 tests pass (chromium + mobile). 208 files / 2091 unit tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T198 — [P1] Password-reset request cooldown (anti-spam)
Done: `src/features/auth/passwordResetCooldown.ts` -- pure helpers (`COOLDOWN_MS = 60 s`, `remainingCooldownMs`, `isOnCooldown`, `recordResetRequest`, `clearResetCooldown`) backed by `sessionStorage` keyed on normalised email, so a hard refresh does not bypass the window. `LoginPage.tsx`: `resetCooldownSecs` state + `startResetTimer` callback (mirrors the existing OTP `startResendTimer`); `useEffect` initialises countdown from sessionStorage when entering forgot mode with a known email; submit handler checks `isOnCooldown` early (blocks + starts timer if still cooling) and calls `recordResetRequest` + `startResetTimer(COOLDOWN_MS)` after a successful send; submit button disabled while cooling; forgot-mode hint text replaced with "Poți retrimite în {{seconds}}s" countdown when cooling; `resendReset` handler added; sent='reset' confirmation panel gains a "Retrimite linkul de resetare" ghost button with countdown (matching the existing verify-panel resend pattern). New locale keys `auth.resetResend`, `auth.resetResendIn`, `auth.resetCooldownHint` in EN + RO with diacritics. New `tests/unit/passwordResetCooldown.test.ts` (8 assertions: 0 before request, full window immediately after, decrements, expires, blocks second request, allows after window, normalisation, sessionStorage persistence + clearance). 208 files / 2091 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T197 — [P1] Rate-limit the remaining unprotected Netlify functions
Done: `netlify/functions/_shared/rateLimiter.ts` extended with four named helpers: `checkCspReportRateLimit` (50 reports/60 s per IP, `_cspStore`), `checkNotifyEmailRateLimit` (30 emails/10 min per authenticated uid, `_notifyEmailStore`), `checkPvPdfRateLimit` (5 PDFs/60 s per authenticated uid, `_pvPdfStore`), `checkProvisionRateLimit` (20 requests/60 min per IP, `_provisionStore`) -- all built on the existing `checkSlidingWindow` primitive. Wired into the four previously unprotected functions: `csp-report.ts` (IP limit before `req.text()`, 429 + `Retry-After: 60`); `notify-email.ts` (uid limit after bearer auth, before DB user lookup, 429 + `Retry-After: 600`); `generate-pv-pdf.ts` (uid limit after bearer auth, before DB meeting lookup, 429 + `Retry-After: 60`); `provision-asociatie.ts` (IP limit before backend check and auth, 429 + `Retry-After: 3600`). New `tests/unit/netlifyRateLimits.test.ts` (15 assertions): 12 pure helper tests (allow-up-to, block-N+1, recover-after-window for each helper) + 3 static wiring guards per function (import present, rate-limit positioned before expensive work, 429+Retry-After in source). 207 files / 2082 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T37 — [P2] Server-rendered proces-verbal PDF (F10 AGA)
Done: `generateProcesVerbal` and its pure tally helpers (`presentApartments`, `quorumPercent`, `isQuorumMet`, `itemTally`, `itemPercentages`, `itemOutcome`) extracted from `agaLogic.ts` into `src/shared/lib/pvGenerator.ts` (no `@/` aliases -- importable by Netlify function esbuild). `agaLogic.ts` re-exports all the same names so existing imports are unchanged. New `netlify/functions/_shared/pdfDoc.ts` -- zero-dependency PDF 1.7 builder: pre-allocates object IDs, serializes xref + trailer; body uses two unembedded Type0/Identity-H composite fonts (`/Arial` + `/Arial-Bold`) with a full-range identity ToUnicode CMap so all Unicode characters including Romanian diacritics render in modern PDF viewers via font substitution. A4 portrait layout: header band (asociație name bold centered, separator line), 48 body lines per page at 10pt with soft wrap at 90 chars, page N/M footer. New `netlify/functions/generate-pv-pdf.ts` -- POST: verifies bearer token, fetches meeting + agenda + votes + apartments + asociatie in parallel, verifies membership, calls `generateProcesVerbal` + `buildPvPdf`, returns `application/pdf`. New `src/features/aga/pvPdfApi.ts` -- client helper: live PDF download when backend is available; `.txt` fallback in demo/offline. `AgaPage.tsx` button async with loading spinner. Tests: `pvGenerator.test.ts` (7 assertions) + `pdfDoc.test.ts` (6 assertions). 206 files / 2058 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T196 — [P2] F16 Petiții interne: live activation + auto-forward at threshold + E2E
Done: `petitionLogic.ts` extended with `canManagePetitions` (admin/presedinte/comitet), and the per-asociație catalog model (`PetitionCatalog`/`PetitionsByAsociatie`, `seedPetitions`, `petitionsForAsociatie`, `migratePetitionsState`, `newPetition`, `addPetitionIn`). `petitionStore.ts` rebuilt as per-asociație persisted Zustand store (version 1, reseeds demo on migrate; `addPetition`/`signPetition`/`replaceForAsociatie`/`setFetchError` actions; `mySigned: Record<string,boolean>` persisted so a signature survives reload and is idempotent; `useAsociatiePetitions` hook). New `petitionApi.ts` -- `hydratePetitions(asociatieId, totalApartments)` reads `petitions` under RLS (newest-first) + counts `petition_signatures` per petition in JS so no per-signer identity is projected; `createPetition` applies to store + live insert behind `isSupabaseConfigured`; `signPetition` applies optimistic store sign + inserts into `petition_signatures` (keyed `petition_id`+`apartment_id`) and, when the signing pushes the petition over its 25% threshold, updates the petition `status` to `'inaintata'` in the DB + records a `petition.forwarded` audit event + emits a demo notification (offline) / calls `persistAndFanOut` (live). `petition.forwarded` added to `AUDIT_ACTIONS` in `auditLogic.ts`, ACTION_TONE `'success'` in `AuditLogPage.tsx`, and bilingual locale keys in `en.json`/`ro.json`. `MyDataPage.tsx` migrated from the removed global `s.petitions` to `Object.values(s.byAsociatie).flatMap(...)`. `PetitionsPage.tsx` rebuilt: hydrates on mount via `hydratePetitions` + apartments count; `ErrorState` with retry; reads `mySigned` from store; resolves `apartmentId` via `findVoterApartmentId`; `role="progressbar"` with `aria-valuenow/min/max` on the progress bar. `petitionLogic.test.ts` extended (+12 new assertions: `canManagePetitions`, `seedPetitions`, `petitionsForAsociatie`, `migratePetitionsState`, `newPetition`, `addPetitionIn`). New `petitionsApi.test.ts` (offline path: `hydratePetitions` no-op when unconfigured/empty id; `createPetition` prepends + marks signed; `signPetition` increments + idempotent + flips status to `'inaintata'` when threshold reached). F16 E2E happy path added (navigate to `/app/petitii`, sign the seeded petition, assert progress bar advances, assert sign button disabled). 204 files / 2041 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T195 — [P2] F15 Sondaje de opinie: live activation + E2E
Done: `surveyLogic.ts` extended with `canManageSurveys` (admin/presedinte/comitet) and the per-asociație catalog model (`SurveyCatalog`/`SurveysByAsociatie`, `seedSurveys`, `surveysForAsociatie`, `migrateSurveysState`). `surveysStore.ts` rebuilt as per-asociație persisted Zustand store (version 1, reseeds demo on migrate; `respond`/`replaceForAsociatie`/`setFetchError` actions; `answered: Record<string,boolean>` persisted so a recorded vote survives reload and is idempotent; `useAsociatieSurveys` hook). New `surveysApi.ts` -- `hydrateSurveys` reads `surveys` under RLS (newest-first) then fetches each survey's tally via the T80 `fetchSurveyTally` attribution-free RPC so no individual response row is ever read by a member; `recordSurveyResponse` applies optimistically to the store + inserts into `survey_responses` under member-insert RLS behind `isSupabaseConfigured`, preserving full anonymity on the live path. `SurveysPage.tsx` updated: hydrates on mount via `useEffect`; reads `answered` from the store so vote buttons disappear after responding; `ErrorState` with retry on fetch failure; `role="progressbar"` + `aria-valuenow/min/max` on the result bars for accessibility. `surveyLogic.test.ts` extended (+14 assertions: `canManageSurveys` 9 cases, `seedSurveys` reference isolation, `surveysForAsociatie` 3 cases, `migrateSurveysState` 3 cases). New `surveysApi.test.ts` (offline path: `hydrateSurveys` no-op when unconfigured/empty id; `recordSurveyResponse` increments tally + marks answered; idempotent second response; multi-survey independence). F15 E2E happy path added (navigate to `/app/sondaje`, click a vote button, assert progressbars appear and vote button disappears), green on chromium + mobile. 203 files / 2026 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T194 — [P2] F14 Cutie de idei: live activation + auto top-N promotion + E2E coverage
Done: `ideaLogic.ts` extended with `isPromoted` (true when an in-discutie idea is in the top-N by votes), `canManageIdeas` (admin/presedinte/comitet), and the per-asociație catalog model (`IdeaCatalog`/`IdeasByAsociatie`, `seedIdeas`, `ideasForAsociatie`, `migrateIdeasState`, `newIdea`, `addIdeaIn`). `ideasStore.ts` rebuilt as per-asociație persisted Zustand store (version 1, reseeds demo on migrate; `addIdea`/`toggleVote`/`replaceForAsociatie`/`setFetchError` actions; `myVotes: Record<string,boolean>` persisted so upvotes survive reload; `useAsociatieIdeas` hook). New `ideasApi.ts` -- `hydrateIdeas` reads `ideas` under RLS + tallies vote counts from `idea_votes` in JS; `submitIdea` applies to store + live insert behind `isSupabaseConfigured`; `castIdeaVote` applies optimistic toggle to store + inserts into `idea_votes` on first vote (votes are immutable in the DB per T34 guard, retract is offline-only). New migration `20260603000001_idea_votes_rls.sql` enables RLS on `idea_votes` with member-scoped SELECT + INSERT (no DELETE/UPDATE -- votes are immutable, matching the T34 voteSignatureRls guard). `IdeasPage.tsx` updated: hydrates on mount via `hydrateIdeas`, `ErrorState` with retry on fetch failure, uses per-asociație catalog, shows a "Pe agendă" badge on top-N open ideas via `isPromoted`, resolves `apartmentId` via `findVoterApartmentId`. `MyDataPage.tsx` GDPR export fixed to flatten all-asociatii ideas instead of the removed global `s.items`. New locale key `ideas.promoted` in EN ("On agenda") + RO ("Pe agendă"). `ideaLogic.test.ts` extended (+16 assertions: `isPromoted` 4 cases, `canManageIdeas`, `newIdea`, `addIdeaIn`, per-asociație model 5 cases). New `ideasApi.test.ts` (offline path: `hydrateIdeas` no-op when unconfigured/empty id; `submitIdea` prepends synchronously + marks voted; `castIdeaVote` increments + idempotent toggle). F14 E2E extended (upvote on first card, assert count changes, assert "Pe agendă" badge visible), green on chromium + mobile. 202 files / 2012 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T193 — [P2] F13 Prioritizare proiecte: live activation + drag-and-drop reordering + E2E
Done: `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` installed. `priorityLogic.ts` extended with `applyReorder` (drag-and-drop splice-to-position, renumbers 1..n), `canManagePriorities` (admin/presedinte/comitet), and the per-asociație catalog model (`PriorityCatalog`/`PrioritiesByAsociatie`, `seedPriorities`, `prioritiesForAsociatie`, `migratePrioritiesState`). `priorityStore.ts` rebuilt as per-asociație persisted Zustand store (version 1, reseeds demo on migrate; `addProject`/`reorderProjects`/`replaceForAsociatie`/`setFetchError` actions; `useAsociatiePriorities` hook). New `priorityApi.ts` -- `hydratePriorities` reads `project_priorities` ordered by rank under RLS; `addPriorityProject` applies to store + live insert; `saveRanking` applies to store + batch-updates ranks in `project_priorities` + inserts a ranking row into `priority_rankings`; re-exports `fetchPriorityTurnout` (T80). New migration `20260602000007_priority_rank.sql` adds `rank integer` to `project_priorities` (back-filled from `created_at` order per asociație) and a member-insert policy on `priority_rankings` so any member can submit their personal ranking. `PrioritiesPage.tsx` rebuilt: `DndContext`/`SortableContext`/`useSortable` per-item `GripVertical` drag handle (pointer drag) + `KeyboardSensor` + existing up/down arrow buttons retained for full keyboard access; `canManagePriorities` gates the Add button; turnout from `fetchPriorityTurnout` appended to subtitle; `ErrorState` with retry on fetch failure; hydrates on mount. Locale keys added: `priorities.drag` / `priorities.rankingSaved` / `priorities.turnout` / `priorities.turnout_other` in EN + RO. `priorityLogic.test.ts` extended (+14 new assertions: `applyReorder` 5 cases, `canManagePriorities`, per-asociație model 4 cases). New `priorityApi.test.ts` (offline path: `hydratePriorities` no-op when unconfigured/empty id; `addPriorityProject` appends synchronously; `saveRanking` applies new order). F13 E2E happy path added to `features.spec.ts` (navigate to `/app/prioritati`, use moveUp keyboard button, verify rank badges). 201 files / 1993 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T192 — [P2] F12 Buget participativ: live activation + E2E
Done: `budgetLogic.ts` extended with `BudgetCatalog`/`BudgetsByAsociatie` per-asociație model (`seedBudget`, `budgetForAsociatie`, `migrateBudgetState`, `activeCycle`). `budgetStore.ts` rebuilt as per-asociație persisted store (version 1, reseeds demo on migrate; `addProposal`/`toggleVote`/`replaceForAsociatie`/`setFetchError` actions; `useAsociatieBudget`/`useActiveBudgetCycle` hooks). New `budgetApi.ts` -- `hydrateBudget` reads `budget_cycles`/`budget_proposals`/`budget_votes` under RLS and tallies vote counts in JS (votes are not secret in participatory budgeting); `proposeItem` and `castBudgetVote` both apply to the store first then mirror to Supabase behind `isSupabaseConfigured`. `BudgetPage` updated: hydrates on mount, `ErrorState` with retry on fetch failure, author_name from `profile.full_name`, apartment resolved via `findVoterApartmentId`. `budgetLogic.test.ts` extended (+7 per-asociație model assertions). New `budgetApi.test.ts` (offline path: hydrate no-op, proposeItem appends synchronously, castBudgetVote increments + idempotent toggle). F12 E2E happy path added (propose + vote + funded badge), green on chromium + mobile. 200 files / 1976 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T191 — [P2] F11 Procese verbale: live activation + admin upload surface + E2E
Done: `pvLogic.ts` extended with `PvsByAsociatie`, `seedPvs`, `pvForAsociatie`, `newPvDocument`, `addPvIn`, `migratePvsState`, and `canManagePv` (admin/presedinte/comitet). `pvStore.ts` rebuilt as a per-asociație persisted store (version 1, reseeds the demo asociație on migrate; `replaceForAsociatie`/`setFetchError` actions; `useAsociatiePvDocs()` hook). New `pvApi.ts` -- `hydratePvDocuments` reads `pv_documents` under RLS newest-date-first, defaults null `category` to 'Altele'; `addPvDocument` applies to store synchronously then mirrors insert + optional Storage upload to the `attachments` bucket (path `{asociatieId}/pv/{docId}/{filename}`) behind `isSupabaseConfigured`; `getPvSignedUrl` returns a 1-hour signed URL for download. New migration `20260602000005_pv_category.sql` adds the missing `category` column. `PvDocumentsPage` hydrates on mount, role-gates the "Add" button and upload form to comitet/admin, adds a file input (PDF/image, max 10 MB) with client-side validation, shows a download button on cards with `storage_path`, and surfaces `ErrorState` with retry. New locale keys `pv.file/fileHint/fileTooLarge/fileBadType/download` in EN + RO. Tests: `pvLogic.test.ts` extended (+15 assertions: canManagePv, per-asociație model, newPvDocument, addPvIn, migratePvsState); new `pvApi.test.ts` (offline path: hydrate no-op when unconfigured/empty id, addPvDocument prepends synchronously, idempotent, defaults category). F11 E2E happy path added (search "Comitet" narrows results, clear restores all). 199 files / 1963 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T190 — [P2] F10 AGA: live activation + procură (proxy-vote) upload/verify flow + E2E
Done: `agaLogic.ts` extended with the per-asociație model (`AgasByAsociatie`, `cloneAgas`, `seedAgas`, `agasForAsociatie`, `migrateAgasState`, `isValidProxy`). `agaStore.ts` rebuilt as a per-asociație persisted store (version 1, reseeds the demo asociație on migrate; `addProxy`/`castProxyVote` added). New `agaApi.ts` -- `hydrateAgas` reads `agas`/`aga_agenda_items`/`aga_attendees`/`aga_votes` under RLS and assembles the client model; `convokeMeeting`/`addAgendaItem`/`setRsvp`/`castVote`/`castProxyVote`/`advanceStatus`/`recordProxy` all apply to the store first then mirror to Supabase behind `isSupabaseConfigured`. `AgaPage` hydrates on mount, exposes the full procură surface (grantor apartment, proxy holder, optional PDF/image upload), renders the proxy list with document download links, casts proxy votes per item, and surfaces `ErrorState` with retry. New locale keys for the proxy UI in EN + RO. Tests: `agaLogic.test.ts` extended (+10 assertions: isValidProxy, per-asociație model, migration); new `agaApi.test.ts` (offline path: hydrate no-op, all writes offline-safe); F10 E2E happy path added (designate a procură holder, verify it appears in the list). 198 files / 1951 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T189 — [P2] F09 Voturi: wire the live hydrate/recordVote path + E2E
Done: `PollsPage` previously read the global demo `polls`/`pollOptions` exports, tallied client-side with a hardcoded `totalApartments: 24`, and had no live read/write path or E2E. **Logic** -- `src/features/polls/pollLogic.ts` extended (keeping `tallyYesNo`) with the per-asociație catalog model: `PollCatalog`/`PollsByAsociatie`, `seedPolls`/`seedVoteCounts`, `catalogForAsociatie` (stable frozen empty for unknown/null), `optionsForPoll` (filter + sort_order sort), `quorumApartmentCount` (active apartments -- replaces the hardcoded 24), `findVoterApartmentId` (resolves the active apartment a voter is claimed on, for the per-apartment `votes` key), `applyVote` (pure counts increment), and `migratePollsState` (preserve non-demo asociații, reseed the demo one). **Store** -- `pollsStore.ts` rebuilt as a per-asociație persisted store (`byAsociatie` catalog + running `counts` + this-device `myVotes` + `fetchError`; `persist` version 1 with a `migrate` that reseeds the demo asociație); the old global `polls`/`pollOptions` exports are replaced by a `useAsociatiePolls()` hook, and the two other consumers (`HomePage`, `ApartmentInfoPage`) were migrated to it. **API** -- new `src/features/polls/pollsApi.ts`: `hydratePolls(asociatieId)` reads `polls` + `poll_options` under RLS and merges per-option counts from the T80 `poll_tally` RPC per poll (so a member sees the tally without reading another member's ballot row), setting `fetchError` on failure; `recordVote(...)` applies an optimistic ballot to the store (idempotent per poll) and, behind `isSupabaseConfigured` when the voter is linked to an apartment, mirrors an insert into `votes` (`selected_option_ids: [optionId]`, `weight: 1`). The offline store stays the default when Supabase is absent. **Page** -- `PollsPage` hydrates on mount, derives the quorum denominator from `useAsociatieApartments()`, surfaces a live-fetch `ErrorState` with retry, and casts via `recordVote`. Tests: `tests/unit/pollLogic.test.ts` extended (+12 catalog-model assertions incl. zero-apartment quorum guard, stable empty ref, purity, migration) + new `tests/unit/pollsApi.test.ts` (offline path: hydrate no-op when unconfigured/empty id, optimistic + idempotent `recordVote`); new F09 happy-path E2E in `tests/e2e/features.spec.ts` (cast "Pentru" -> confirm -> result progressbar visible), green on chromium + mobile. The `polls`/`poll_options`/`votes` tables + RLS already existed (features migration), so no new migration was needed. 197 files / 1935 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T80 — [P2] Live activation: wire the attribution-free tally functions for F09/F15/F13 results
Done: T38 (`20260522000020_response_privacy.sql`) created the SECURITY DEFINER aggregates `survey_tally`/`poll_tally`/`priority_ranking_turnout` so a member can see poll/survey/ranking results without reading another member's individual row, but it never granted `EXECUTE` to the `authenticated` role (so the live read path could not call them) and ranked polls had no attribution-free aggregate at all (`poll_tally` covers only the `selected_option_ids` types; ranked ballots live in the `ranked_options` jsonb, which under the T38 ballot-secrecy RLS the client can no longer read to aggregate itself). New migration `supabase/migrations/20260602000004_tally_grants_ranked.sql` closes both: it `grant execute ... to authenticated` on all three T38 aggregates (matching the `faq_tally` precedent) and adds `poll_ranked_tally(p_poll_id)` -- aggregating the `ranked_options` jsonb via `jsonb_each_text` into per-option `(votes, rank_total, weight_total)` (lower `rank_total` at equal votes = a higher collective preference), `security definer` with a fixed `search_path = public`, gated on `is_member(p.asociatie_id)`, and never projecting a voter identity -- then grants it too. New client RPC helper layer `src/shared/lib/tallyApi.ts` -- the read path the F09/F15/F13 live wiring (T189/T193/T195) will call: `fetchSurveyTally` (choice -> count), `fetchPollTally` (option -> {votes, weightTotal}), `fetchPollRankedTally` (option -> {votes, rankTotal, weightTotal}), `fetchPriorityTurnout` (apartment count). Each short-circuits to `null` when `!isSupabaseConfigured` or the id is empty, calls the RPC otherwise, and returns `null` on error (reported via `reportError`), so the caller keeps its offline client-side tally and demo mode stays fully working. Tests: `tests/unit/tallyApi.test.ts` (offline path: every helper returns `null` when Supabase is unconfigured and for an empty id, issuing no RPC) + `tests/unit/tallyGrants.test.ts` (backend-free migration guard: the four `grant execute ... to authenticated` lines exist, `poll_ranked_tally` is `security definer` with a fixed search_path, aggregates the `ranked_options` jsonb and gates on `is_member`, and its RETURNS signature exposes no `user_id`/`voter_user_id`/`apartment_id`). 200 files / 1921 tests / lint + typecheck + build + build:pi + build:demo all green. Page wiring to render results via these RPCs folds into T189 (F09), T193 (F13) and T195 (F15); the live execution still needs a provisioned backend.

### ✅ T188 — [P3] F01 Anunțuri: scheduling + attachments (deferred spec items)
Done: F01's two deferred spec items are now implemented offline-first and live-ready behind `isSupabaseConfigured`. **Scheduling** -- `newAnnouncement` takes an optional `scheduled_at`; a future timestamp holds the row back (`published_at` stays null), while an absent or past timestamp publishes immediately (the existing immediate-publish contract is preserved). Pure visibility helpers `isAnnouncementDue`/`isScheduledPending`/`visibleAnnouncements` let residents see only due announcements while the comitet additionally sees scheduled-pending ones tagged with a "Programat" badge + a "Programat pentru {{date}}" line. **Attachments** -- PDF/image uploads (`ATTACHMENT_MAX_BYTES` 10 MB, `ATTACHMENT_ALLOWED_TYPES` pdf/jpeg/png/gif/webp, `validateAttachmentFile`) stored as base64 data URLs offline and uploaded to the existing `attachments` Storage bucket live (path `<asociatie_id>/announcements/<attachment_id>/<filename>`), with attachment rows mirrored to the `attachments` table (`related_type='announcement'`) and download via short-lived signed URL; `uploadAnnouncementAttachments` rolls back already-uploaded objects if any file fails. `hydrateAnnouncements` now also loads + groups attachments. Compose is gated to managers via the new `canManageAnnouncements` (admin/presedinte/comitet); the demo persona is `admin` so demo/E2E are unaffected. Shared `src/shared/lib/file.ts` (`readFileAsDataUrl`/`formatFileSize`/`validateFile`) extracted and `documentLogic` delegates to it, removing the duplicated helpers. `AnnouncementAttachment` added to the domain (optional `Announcement.attachments`). Store version 1->2 reseeds the demo asociație, which gains a future-scheduled `an-0` to showcase the Programat state. New bilingual `announcements.*` keys (schedule/scheduled/scheduledBadge/scheduledFor/attachments*/upload*/download*/file errors) with RO diacritics. Tests: `announcementsLogic.test.ts` extended (role gate, attachment validation, scheduling immediate/future/past, attachments carried, due/pending/visible helpers); `announcementsApi.test.ts` extended (future-schedule held back offline, offline attachment carried onto the stored row). 197 files / 1909 tests / lint + typecheck + build + build:pi + build:demo all green. Note: the scheduled-row hide is client-gated (`visibleAnnouncements`); true server-side hold-back (a cron flipping `published_at`, or RLS on `scheduled_at`) remains a live-activation follow-up.

### ✅ T187 — [P2] E2E happy-path coverage for F02 (discuții), F04 (mesaje-admin), F05 (anonim)
Done: Three happy-path E2E added to `tests/e2e/features.spec.ts`, all green on both the `chromium` and `mobile` Playwright projects. **F02** -- create a discussion thread ("Subiect nou" -> title + tag -> save), expand it, post a message, then pin it and assert the "Fixat" badge. **F04** (demo persona is `admin`, so the inbox view renders) -- open the seeded unread thread from Ionescu Maria (Ap. 1), assert its unread badge ("1") is present, open it so the badge clears, reply, then start a fresh admin->resident thread (pick apartment, subject, message) and land in the conversation. **F05** -- submit an anonymous message and assert it lands in the comitet queue as "Nou" with the resolve action available. While wiring these up, the e2e harness was found to be stale (it predates the app's auto-demo-entry, and Playwright browsers were never installed -- T16): (1) installed Chromium; (2) `enterDemo` in `features.spec.ts` made build-agnostic (clicks the login "modul demonstrativ" button when present, else accepts the demo build's auto-redirect to `/app`); (3) **product fix** -- a hard refresh on a deep link (e.g. `/app/discutii`) dropped the in-memory demo session and bounced to `/app`, defeating every `goto`-based feature test; `RequireAuth` now re-enters the persisted demo persona in place (aligned with the T174 "hard refresh re-enters the same persona" intent) so the requested route survives a reload -- this took `features.spec.ts` from fully broken to 22/32 passing; (4) extracted `readLastDemoRole`/`DEMO_ROLES` into `src/shared/lib/demoRole.ts` (re-exported from `@/app/router` so existing importers + `demoEntry.test.ts` are unchanged) to avoid a router<->RequireAuth import cycle; (5) **CSS** -- the floating dev/demo role switcher overlapped page content on the mobile layout and intercepted clicks, so it is now hidden at mobile widths (mirroring how the sidebar is dropped; the login-screen inline switcher stays). No source-of-truth product behaviour changed for live/prod. 196 files / 1896 unit tests / lint + typecheck + build + build:pi + build:demo all green. Note: five pre-existing feature E2E (F07/F18/F35/F36/F40) still fail on stale search-input selectors -- untouched here (out of scope for T187; belongs to T16 e2e enablement).

### ✅ T186 — [P2] F06 Locator + F07 FAQ: explicitly wire live hydration; add FAQ admin manage UI
Done: New migration `supabase/migrations/20260602000003_faq_archive_tally.sql` -- adds `archived boolean not null default false` to `faq_entries` (retire-without-delete; vote history preserved) and a `faq_tally(p_asociatie_id)` SECURITY DEFINER function (the survey_tally/poll_tally precedent: reads past the self-only `faq_votes` RLS to count helpful/not-helpful per entry, returns counts only, gates on `is_member`), granted to `authenticated`. `FaqEntry` domain type gains `archived`; `DEMO_FAQ` seeded with `archived: false`. `faqLogic.ts` extended: `visibleFaq` (hide archived, order by sort_order), `nextSortOrder`, `isSavableFaq`, `newFaqEntry`, `FaqEntryInput`. `faqStore` gains `fetchError`, `replace` (hydration), `setFetchError`, and comitet manage actions `addEntry`/`updateEntry`/`archiveEntry`. New `faqApi.ts` -- `hydrateFaq` reads `faq_entries` (ordered) + the `faq_tally` RPC in parallel, merges counts (tally failure non-fatal, counts default 0), sets `fetchError` on failure; `createFaqEntry`/`updateFaqEntry`/`archiveFaqEntry` write the store and mirror to `faq_entries` behind `isSupabaseConfigured`. `FaqPage` hydrates on mount, surfaces an `ErrorState` with retry, and shows a comitet/admin-only manage surface (gated via `roleMatchesAudience(['admin','comitet'], role)` per T64): an "add question" header action, per-card edit/archive buttons, and a create/edit modal. `locatorStore` gains `fetchError`, `replace`, `setFetchError`, and `add` now takes `(asociatieId, author, input)`. New `locatorApi.ts` -- `hydrateLocator` reads `resident_posts` (joining `users(full_name)` for the author name) newest-first under RLS; `createPost` writes the store and mirrors an insert, with the offline store as the fallback. `LocatorPage` hydrates on mount, resolves the author from the auth profile (demo fallback), and surfaces a live-fetch `ErrorState`. New `faq.*` i18n keys (add/edit/archive/category/question/answer/created/saved/archived) EN + RO with diacritics. Extended `faqLogic.test.ts` (6 assertions across the new helpers) + new `faqApi.test.ts` (7) and `locatorApi.test.ts` (5) offline-path suites. 196 files / 1896 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T185 — [P2] F08 Calendar de evenimente: store + API + agenda/month view + ICS export
Done: `src/features/events/eventsLogic.ts` -- pure model (`seedEvents`/`seedAttendees`/`eventsForAsociatie`/`migrateEventsState`), chronological helpers (`sortByStart`, `isUpcoming`, `splitEvents` -> ascending upcoming + recent-first past, `groupByMonth` -> ascending `YYYY-MM` buckets with a `monthStart` for header formatting), RSVP helpers (`toggleRsvp`/`isAttending`/`attendeeCount(base, attending)`), and RFC 5545 ICS serialization (`toIcsDate` UTC stamp, `escapeIcsText`, `buildEventIcs` single-VEVENT calendar with CRLF lines, `icsFileName`). `src/features/events/eventsStore.ts` -- per-asociație seeded + persisted store (version 1; `migrate` reseeds the demo asociație) holding `byAsociatie`, the resident's `rsvps` map (keyed by globally-unique event id, like `announcements.reads`), seeded `attendees` base counts, and `fetchError`. `src/features/events/eventsApi.ts` -- dual-mode repo: `hydrateEvents` reads `events` (ascending) + the user's `event_rsvps` under RLS behind `isSupabaseConfigured` and sets `fetchError` on failure; `rsvpEvent` toggles the store synchronously and mirrors an upsert/delete to `event_rsvps`, with the offline store as the fallback. `EventsPage` rewritten: agenda/month view toggle (accessible `aria-pressed` segmented group), agenda splits upcoming/past, month view groups by calendar month with a `formatMonthYear` header, each `EventCard` wires RSVP (count goes 7 -> 8 for the demo AGA) and per-event `.ics` download. `DEMO_EVENT_ATTENDEES` seed added to `demoData.ts`; new `formatMonthYear` helper in `format.ts`. New `events.*` i18n keys (viewToggle/viewAgenda/viewMonth/upcoming/noUpcoming/past/exportIcs) EN + RO with diacritics. 21 assertions in `tests/unit/eventsLogic.test.ts` + 6 in `tests/unit/eventsApi.test.ts`; F08 happy-path E2E (view upcoming, RSVP, switch to month view) added to `tests/e2e/features.spec.ts`. The `events` + `event_rsvps` tables and RLS already existed (features migration), so no new migration was needed. 194 files / 1884 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T184 — [P2] F03 Alerte: live activation + quiet-hours bypass + real recipient count
Done: `src/features/alerts/alertsLogic.ts` -- pure model (`seedAlerts`, `alertsForAsociatie`, `newAlert`, `addAlertIn`, `migrateAlertsState`), `isSendableAlert` (title + body required), `recipientCount(apartments)` summing every listed person across active apartments (replaces the old hardcoded 24), and `shouldDeliverAlert(prefs, nowMs)` -- an explicitly-named wrapper over `shouldSendEmailNotif(prefs, ALERT_PRIORITY='urgent', ...)` that expresses the documented quiet-hours bypass: an emergency alert reaches a recipient even inside their quiet-hours window and even when they have opted out of email (essential security communication). `src/features/alerts/alertsStore.ts` -- per-asociație seeded + persisted store mirroring `announcementsStore` (version 1; `migrate` reseeds the demo asociație so stale demo content refreshes). `src/features/alerts/alertsApi.ts` -- dual-mode repo: `hydrateAlerts` reads `alerts` under RLS newest-first and sets `fetchError` on failure; `sendAlert` writes the store synchronously and mirrors an insert to `alerts` behind `isSupabaseConfigured`, with the offline store as the fallback. `AlertsPage` now reads `useAsociatieAlerts()`, hydrates on mount, derives the recipient count from `useAsociatieApartments()` (shown live in the compose modal), and surfaces an `ErrorState` with retry on a live-fetch failure. `DEMO_ALERTS` seeded with one past emergency alert (9 recipients, matching the demo building). New `alerts.recipients` i18n key (EN + RO with diacritics). 20 assertions in `tests/unit/alertsLogic.test.ts` + 7 in `tests/unit/alertsApi.test.ts`; F03 happy-path E2E added to `tests/e2e/features.spec.ts`. The `alerts` + `alert_acknowledgments` tables and RLS already existed (F03 in the features migration), so no new migration was needed. 190 files / 1863 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T130 — [P2] Link admin-initiated F04 threads to the resident's account
Done: Added `pickAdminThreadResident(apartment)` + `apartmentHasLinkedResident(apartment)` to `apartmentsLogic.ts`. Resolution order: primary person's `claimed_user_id` first, then first other person with a claim, else the primary person's id with `pending: true`. `AdminChatPage.submitThread` (admin branch) now uses the resolved `userId`/`name`; live writes are refused (toast + invalid submit) when `isSupabaseConfigured && pending` so a `pe-` person id never hits `private_threads.resident_user_id` (uuid) and miss the party-or-admin RLS. The apartment picker tags unlinked apartments with a "fără cont încă" / "no account yet" suffix; an inline warning surfaces below the picker the moment an unlinked apartment is selected. New i18n keys `adminChat.noLinkedResident` + `adminChat.apartmentUnlinked` (EN + RO, with diacritics). 11 assertions in `adminThreadResident.test.ts`. 189 files / 1844 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T127 — [P2] Live activation: notifications fan-out (`notifications` under RLS + channels)
Done: `supabase/migrations/20260602000002_notifications.sql` -- `notifications` table (text PK matching client IDs, owner-scoped select/update, any asociatie member may insert enabling member-to-admin events). `notificationsApi.ts` -- `rowToNotif`/`notifToRow` mappers, `hydrateNotifications` (reads up to 100 rows newest-first, calls `replaceForUser`), `persistNotification`, `syncMarkRead`, `syncMarkAllRead`, `hydrateNotifPrefs` (loads `notification_preferences`, updates `notifPrefsStore`), `persistNotifPrefs` (upserts), `fanOutEmail` (calls `notify-email` Netlify function with bearer token), `persistAndFanOut` (persist + fan-out in one step). `notificationStore` gains `replaceForUser` + `emitMembershipJoined` now returns the emitted notification. `NotificationsPage` hydrates on mount and syncs read/pref changes to DB. `authStore.redeemInvite` calls `persistAndFanOut` after emitting membership.joined. 8 assertions in `notificationsApi.test.ts`. 187 files / 1834 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T183 — [P2] Implement the topbar search bar functionality
Done: Added `src/shared/search/searchLogic.ts` with `normalize()`, `scoreMatch()`, and `searchResults()` -- pure, unit-tested functions that perform diacritic-insensitive fuzzy matching across nav items, announcements, discussions, and tickets (max 5 results per kind, grouped nav-first). Added `src/shared/search/CommandPalette.tsx` -- a portal-rendered, fully accessible dialog opened by `Ctrl+K` / `⌘K` or clicking the topbar search button. Features: auto-focused input, arrow-key navigation, Enter to navigate, Escape to close, focus restored to trigger on dismiss, `role="dialog" aria-modal`, `role="listbox"`, `aria-activedescendant`, `aria-haspopup="dialog"`, motion reduced via `@media (prefers-reduced-motion)`. Topbar search bar converted from a dead `<input>` to a trigger `<button>` with `⌘K` / `Ctrl+K` badge (auto-detected from `navigator.platform`). Content gated by F01/F02/F17 feature flags so disabled modules never appear in results. Bilingual RO/EN -- `chrome.palette.*` keys in both locales. Premium-feel animations (`iv-palette-in` / `iv-palette-out`). 18 new assertions in `tests/unit/searchLogic.test.ts`. 186 files / 1827 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T62 — [P2] Record/resolve the joined asociație's name (replace fallback after T42)
Done: Added optional `asociatieName: string | null` field to `InviteCode` and `CreateInviteInput` in `inviteLogic.ts` (and updated `createInvite` to embed it). All three admin invite-issue call sites (`ApartmentsPage.tsx` x2, `ApartmentFormPage.tsx`, `InvitesAdminPage.tsx`) now read `localAsociatii` via `useAuthStore` and pass `asociatieName` when minting a code. `authStore.joinByInvite` and `authStore.redeemInvite` both resolve the name after consuming -- from `consumed.invite.asociatieName`, falling back to any existing `localAsociatii` entry -- and add/update the `localAsociatii` entry so `useCurrentAsociatie()` shows the correct name without a live read. `DEMO_INVITES` updated with the demo asociație name. 4 new assertions in `joinByInvite.test.ts`, 1 in `accountRedemption.test.ts`; `inviteLogic.test.ts` and `inviteDeliveryWebhook.test.ts` updated for the new required field. 185 files / 1809 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T59 — [P2] Surface the active asociație's name/branding (replace hardcoded DEMO_ASOCIATIE)
Done: `HomePage` now calls `useCurrentAsociatie()` and passes `asociatie?.name` as the `PageHeader` subtitle (replacing the hardcoded `DEMO_ASOCIATIE.name`). `ProfilePage` likewise calls `useCurrentAsociatie()` and renders the name/address conditionally (name shown if non-empty, address shown only if the field is populated -- correct for demo and for locally-created asociatii whose address is blank). `DEMO_ASOCIATIE` import removed from both pages; `useCurrentAsociatie` already handles the demo/local/live cases correctly via `baseAsociatie` + the `asociatieStore` edits. 185 files / 1805 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T64 — [P2] Enforce feature `audience`/role in the route guard + nav
Done: Added `roleMatchesAudience(audience, role)` to `featureRouteLogic.ts` with a `ROLE_AUDIENCE` map (`super_admin`/`admin`/`presedinte` → `admin`; `comitet`/`cenzor` → `comitet`; `proprietar` → `proprietar`; `locatar` → `locatar`; `all` short-circuits to true). `FeatureRouteGuard` now checks both the flag (shows `reason="disabled"` notice) and audience (shows `reason="unauthorized"` notice). `LockedFeatureNotice` gains a `reason` prop: `disabled` preserves the existing enable/request CTA; `unauthorized` shows only the bilingual "not available for your role" message and a home link. `useEnabledFeatures` in `AppLayout` and `FeatureHubPage` both filter by audience so audience-gated features disappear from the sidebar and hub for roles that lack access. New `common.featureUnauthorized` i18n key in EN + RO. 6 new assertions in `featureRouteLogic.test.ts`. 185 files / 1805 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T51 — [P2] Migrate role-gated UI + scoped reads to `activeRole()` / `currentAsociatieId`
Done: Migrated all four stale `memberships[0]?.role` / `memberships[0]?.asociatie_id` reads to the T28 selectors. `useMfaEnforcement.ts`, `SecurityPage.tsx`, and `AssistantWidget.tsx` now use `useAuthStore((s) => s.activeRole)()`. `securityStore.ts` `mirrorLive` now destructures `currentAsociatieId` from `useAuthStore.getState()`. Updated `seedRole` in `mfaEnforcement.test.tsx` to also set `currentAsociatieId` to match the seeded membership so `roleFor` resolves against the active asociație. 185 files / 1799 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T67 — [P2] Comitet/admin ticket status-lifecycle surface (offline)
Done: Added pure status-lifecycle helpers to `ticketLogic.ts` — `STATUS_TRANSITIONS` (the F17 graph: primit→asignat→in_lucru→rezolvat→verificat/respins→inchis), `allowedTransitions(status, role)` (manager roles admin/presedinte/comitet only), `applyStatusTransition(ticket, newStatus, actorUserId, resolutionNotes?, now?)` (stamps `assigned_to_user_id` on asignat, `resolved_at` on rezolvat, `verified_at` on verificat), `canRateTicket(ticket, userId)` (reporter only, after resolution, once), `applyRating(ticket, rating, now?)`, and `updateTicketIn(byAsociatie, asociatieId, ticketId, updater)` (referentially stable when not found). Added `updateTicket` action to `ticketsStore.ts`. `TicketsPage.tsx` gains an admin/comitet/presedinte action bar on each ticket (direct buttons for asignat/in_lucru/verificat/inchis; a resolution-notes modal for rezolvat/respins) plus a reporter 1-5 star rating modal after resolution; resolution notes and the star rating render inline on the card. Each advance records a `ticket.advanced` audit entry (submit already recorded `ticket.submitted`); `ticket.advanced` added to `AUDIT_ACTIONS` + `ACTION_TONE` + both locales. New bilingual `tickets.advance_*` / `advanceTitle` / `resolutionNotes` / `rate*` keys. 16 new assertions in `ticketLogic.test.ts` (allowedTransitions, applyStatusTransition, canRateTicket, applyRating, updateTicketIn); E2E in `features.spec.ts` (admin assigns → in_lucru → resolves with notes). F17 row updated in `FEATURES.md`. Ported onto current main from a stale phone-session branch (`claude/mvp-QKqHQ`) after the 4.8 refactor; the branch's six other commits (T129, T174-T178) were already present on main and discarded. 185 files / 1799 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T66 — [P2] Enforce the discussion post rate limit (anti-spam)
Done: Added `POST_RATE_WINDOW_MS`, `prunePostTimestamps(ts, now)`, and `isVettedRole(role)` to `discussionLogic.ts` (admin/presedinte/comitet/cenzor/super_admin are vetted; proprietar/chirias/null are unvetted). Added `postTimestamps: Record<string, number[]>` state (keyed `${asociatieId}:${userId}`, not persisted -- excluded by `partialize`) and `recordPost(asociatieId, userId, now?)` action to `discussionStore.ts`; `recordPost` prunes expired entries before appending. Wired enforcement in `DiscussionsPage.tsx`: both `send` (reply) and `submitThread` (new thread) compute `prunePostTimestamps(postTimestamps[key] ?? [], now).length`, call `canPost(count, vetted)`, and on failure show a bilingual `discussions.rateLimited` toast (with `{{limit}}` interpolation) and return early; on success they call `recordPost`. Bilingual `discussions.rateLimited` keys added to `en.json` / `ro.json`. New `tests/unit/discussionRateLimit.test.ts` (9 assertions): `isVettedRole` vetted/unvetted roles; `prunePostTimestamps` window/empty; `canPost` integration; `recordPost` accumulation, pruning, isolation. 185 files / 1783 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T65 — [P2] Persist the content stores offline (publish survives reload)
Done: Added `migrateAnnouncementsState` to `announcementsLogic.ts`, `migrateTicketsState` to `ticketLogic.ts`, and `migrateThreadsState` to `discussionLogic.ts` — each preserves non-demo asociații's user-created content and always reseeds the demo asociație from `DEMO_*` constants on version bump. Wrapped `useAnnouncementsStore`, `useTicketsStore`, and `useDiscussionStore` in `zustand/middleware` `persist`: `name` keys `vecini.announcements` / `vecini.tickets` / `vecini.discussions`, `version: 1`, `partialize` excludes the runtime-only `fetchError` field. New `tests/unit/contentStorePersist.test.ts` (9 assertions): null/undefined/empty persisted state returns seed; non-demo asociații preserved; demo asociație reseeded; demo copy is a fresh array. 187 files / 1774 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T86 — [P2] Live activation: audit_log read + server-authoritative chain
Done: New migration `20260530000001_audit_log_chain_trigger.sql`: adds `actor_name TEXT` column to `audit_log` so the live read path surfaces the actor's display name without a join; creates `audit_log_stamp_seq()` PL/pgSQL trigger function (SECURITY DEFINER, reads `MAX(seq)` from the tail for each asociatie, sets `NEW.seq = tail + 1` and `NEW.prev_hash = tail.hash`; the unique constraint on `(asociatie_id, seq)` handles concurrent conflicts via retry semantics); creates `BEFORE INSERT` trigger `audit_log_chain_stamp`. Updated `auditStore.ts`: added `liveByAsociatie: Record<string, AuditEntry[]>` state (not persisted — added `partialize` to persist only `byAsociatie`); added `DbAuditRow` interface and `rowToEntry()` converter (maps DB column names including `before_value`/`after_value` to `AuditEntry`, falls back to `GENESIS_HASH` for null hashes); added `hydrateForAsociatie(id)` action (gated on `isSupabaseConfigured`, fetches `audit_log` ordered by seq ASC, catches and reports errors without throwing); updated `forAsociatie()` to prefer `liveByAsociatie` when present; updated `mirrorLive()` to insert `actor_name`; updated `useAsociatieAudit()` hook with `useEffect` to trigger hydration on asociatieId change. Security design: seq is DB-authoritative (trigger prevents duplicates); hash is client-computed over the client's original seq/prev_hash — not re-verified for live data; the RLS append-only policy is the real tamper-evidence control. New `tests/unit/auditStore.test.ts` (7 assertions): maps rows, handles null hashes, leaves state on error, prefers live over offline, empty chain for null id, offline guard. 186 files / 1765 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T82 — [P2] Wire a live error sink (Sentry-ready) + CSP report endpoint
Done: self-hosted error collection is now live end-to-end. New `netlify/functions/error-report.ts`: accepts POST of `ErrorReport` JSON, rate-limited 20/10 min per IP via `checkSlidingWindow`, body capped at 4 KB, logs only structural metadata (ref, name, source, at) and never the scrubbed text. New `src/shared/lib/errorSink.ts`: exports `buildFetchSink(endpoint)` (fresh per-closure session counter of 10, `keepalive: true` fetch, `.catch(() => {})` on failure) and `initErrorSink()` (no-op in `import.meta.env.DEV`; calls `setErrorSink(buildFetchSink(ERROR_REPORT_URL))` otherwise). `src/main.tsx`: `initErrorSink()` called after `installGlobalErrorHandlers()`. Both `netlify.toml` and `netlify-platform.toml` updated: `report-to csp-endpoint; report-uri /.netlify/functions/csp-report` appended to CSP; `Report-To` and `Reporting-Endpoints` headers added so browsers deliver CSP violations to the same path. No `connect-src` changes needed (function is same-origin). New `tests/unit/errorSink.test.ts` (5 assertions): POSTs report as JSON, stops at session limit of 10, each `buildFetchSink` call resets the counter, swallowed fetch rejection, end-to-end integration via `setErrorSink`+`reportError`. `tests/unit/securityHeaders.test.ts` extended (2 assertions): static CSP in `netlify.toml` includes `report-to`/`report-uri`; `Report-To`/`Reporting-Endpoints` headers present. 184 files / 1758 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T84 — [P2] Route async store-action failures through the error-reporting hook
Done: `reportError` from T07 wired into all async Supabase catch blocks across 7 files. `authStore.ts`: added `catch (error)` between the `try` block and `finally` so network/RPC failures are reported instead of silently swallowed. `announcementsApi.ts`, `ticketsApi.ts`, `discussionApi.ts`: hydrate catch blocks now call `reportError(err, { source: 'X.hydrate' })` before `setFetchError('load')`; Supabase soft-error path in `if (error || !data)` branches also wired; best-effort write catches in `publish`, `submit`, `addThread`, `postMessage`, `togglePin`, `deleteMessage` similarly wired. `securityStore.ts`: `mirrorLive`, `checkServerLock`, `recordServerFailure`, `clearServerLock` catch blocks wired (fail-open behavior preserved). `auditStore.ts`: `mirrorLive` catch wired. `adminChatApi.ts`: `hydrateThreads`, `startThread`, `reply`, `markRead`, `toggleStatus` catch blocks wired. All functions remain behind `isSupabaseConfigured`, so demo mode stays silent. New unit test `storeErrorReporting.test.ts` (9 assertions): verifies `reportError` is called with the correct `source` for each hydrate function + `authStore.hydrate`, verifies `fetchError` state is still set, verifies the guard prevents calls for empty asociatieId, and confirms `hydrating` is reset on auth store failure. 181 files / 1751 tests / lint + typecheck + build + build:pi + build:demo all green.

### ✅ T83 — [P2] Adopt the standardized loading/empty/error states across all feature pages
Done: Audit found 77/96 pages already using `EmptyState` correctly. `MetersPage` now shows `EmptyState` for empty meter list. Live-fetch error surface: `fetchError: string | null` + `setFetchError` added to all three content stores (announcements, tickets, discussions). Hydrate functions set the error on failure and clear on success. `AnnouncementsPage`, `TicketsPage`, `DiscussionsPage` render `ErrorState` + retry button when `fetchError` is non-null. New `common.loadError` i18n key (EN + RO). Unit test `fetchErrorState.test.ts` (9 assertions). 180 files / 1742 tests / all three builds green.

### ✅ T18 — [P2] Performance & Lighthouse
Done: xlsx lazy-loaded via dynamic `import('xlsx')` in `csv.ts` -- `generateApartmentsXlsxTemplate` + `parseApartmentsXlsx` made async; `xlsx: ['xlsx']` added to vite.config `manualChunks`. ApartmentsPage bundle shrank from 451 kB to 27 kB (gzip 7.8 kB), xlsx becomes a 429 kB chunk fetched only on first use. SEO: `public/robots.txt` (Allow: /, Disallow: /app/, Sitemap pointer) + `public/sitemap.xml` (6 public routes with priority + changefreq). `index.html` extended with OG meta tags (`og:type/url/title/description/locale`), Twitter card meta, canonical link, and robots meta. 3 xlsx csv tests updated to async. New `seo.test.ts` (4 assertions). 179 files / 1733 tests / all three builds green.

### ✅ T25 — [P2] Accessibility statement (Declarație de accesibilitate)
Done: `src/features/legal/accessibilityContent.ts` -- bilingual `accessibilityStatement(lang)` returning `LegalDoc` with 6 sections (conformance target WCAG 2.1 AA / EN 301 549, measures taken, known limitations, feedback/contact, enforcement, technical info). `AccessibilityStatementPage.tsx` renders via existing `LegalDocPage` chrome. Route `/accesibilitate` added to `router.tsx`. Footer link added to `AppLayout.tsx` using new `consent.accessibilityLink` i18n key (EN + RO). Unit test `accessibilityContent.test.ts` (4 assertions: EN structure, RO structure, no em-dashes, RO diacritics). 178 files / 1729 tests / all three builds green.

### ✅ T17 — [P1] Accessibility audit (WCAG 2.1 AA)
Done: Modal — proper focus trap (Tab/Shift+Tab cycles within dialog), focus restore to trigger on close, `aria-labelledby` pointing to the `<h2>` title, initial focus on first interactive element. Select — `aria-invalid` + `aria-describedby` wired to error element with id. Input/Textarea — `aria-describedby` extended to cover hint text. EmptyState title `<div>` promoted to `<p>`. Button — `aria-busy` when loading. AppLayout — skip-link as first DOM element, `<main id="main-content">`, workspace button `aria-label`, search `aria-label`. RO/EN i18n keys added. New tests: `Select.test.tsx` (3 cases), expanded `Input.test.tsx` (+3 cases). 177 files / 1725 tests / all three builds green.

### ✅ T85 — [P1] Wire the remaining state-changing features into the audit trail
Done: Extended `AUDIT_ACTIONS` with 6 new actions (`ticket.submitted`, `aga.scheduled`, `aga.opened`, `aga.closed`, `budget.proposed`, `petition.created`) and `AUDIT_ENTITIES` with 4 new entities (`ticket`, `aga`, `budget`, `petition`). Added matching RO/EN locale keys. Wired `recordAudit` calls in `TicketsPage.tsx` (ticket submit), `BudgetPage.tsx` (proposal add), `PetitionsPage.tsx` (petition create), and `AgaPage.tsx` (meeting schedule + open/close status advance). Added `ACTION_TONE` entries for all 6 new actions in `AuditLogPage.tsx`. 176 files / 1719 tests / all three builds green.

### ✅ T182 — [P1] Dev-gate console logging so PROD never logs state/PII to the browser console
Done: `src/shared/lib/devLog.ts` added -- `devLog.{log,info,warn,debug}` are live console bindings when `import.meta.env.DEV || VITE_APP_STAGE !== 'prod'`, no-ops otherwise; Vite tree-shakes the no-op branches in the PROD build. Audit found zero raw `console.*` calls in `src/` outside the two allowlisted files (`errorReporting.ts` already DEV-guarded, `telegramWebhook.ts` server-side only). Guard test `devLog.test.ts` (4 assertions): scans all `src/*.ts{,x}` for raw console calls, skips the allowlist, fails the suite if any new violation is introduced. 176 files / 1719 tests / build / build:pi / build:demo all green.

### ✅ T181 — [P1] Rate-limit the `invite-email` Netlify function
Done: `checkIpRateLimit(ip, now)` added to `_shared/rateLimiter.ts` (5 sends per 60 s per IP, using the existing `checkSlidingWindow` primitive). `extractClientIp(req)` helper exported from `invite-email.ts` (reads `x-forwarded-for` then `x-real-ip`). Per-IP check added early in the handler before any DB queries; existing per-caller+asociatie limit (20/10 min) retained. Security model comment updated. 15 new assertions across 3 test blocks in `inviteEmailAuth.test.ts` (per-IP logic, extractClientIp, wiring guard). 175 files / 1715 tests / build / build:pi / build:demo all green.

### T107 P3 ✅ -- Touch-friendly pointer drag for the customizable home cards
- new: `src/features/home/useHomeReorder.ts` -- `useHomeReorder(onReorder)` hook; unified Pointer Events gesture (mouse/touch/pen); mouse activates on movement past 6px threshold; touch activates on press-and-hold (180ms) with haptic tick and scroll-intent cancel (12px scroll = hand off to page scroll); `touchmove` guarded non-passive once a drag is live to veto browser scroll; pointer capture on the dragging element; `insertionFromPoint` called live on every move to resolve the drop slot
- new: `src/features/home/reorderGeometry.ts` -- pure `insertionFromPoint(items, x, y)` geometry; resolves the insertion slot in a wrapping grid by row-band intersection + horizontal half-point; falls back to nearest-centre when the pointer is outside every row; DOM-free so unit-testable
- new: `tests/unit/reorderGeometry.test.ts` -- 5 cases: empty grid, before/after from pointer side, gutter resolves to slot between cards, row-constrained pick, below-all-rows fallback
- updated: `src/features/home/homeLayoutLogic.ts` -- added `moveCardToInsertion(layout, key, insertAt)` for the gap-aware drop commit; added `moveCardTo(layout, key, toIndex)` for direct index moves
- updated: `tests/unit/homeLayoutLogic.test.ts` -- added `moveCardTo` and `moveCardToInsertion` test cases
- updated: `src/features/home/HomePage.tsx` -- HTML5 drag-and-drop removed; `useHomeReorder` wired; `EditableCard` gets all four pointer handlers + `dragging`/`dropBefore`/`dropAfter` props; drop carets inserted as `home-drop-caret--before/--after` spans; caret suppressed when drop would be a no-op
- updated: `src/styles/globals.css` -- `.home-card-drag` (grab cursor, touch-action, user-select), `.home-card-drag[data-dragging]` (opacity 0.45, scale 0.97, dashed outline), `.home-drop-caret` spring-in animation (200ms `var(--ease-spring)`), `@media (prefers-reduced-motion)` removes animation + transform
- result: 175 files / 1704 tests / build+pi+demo green

### T105 P3 ✅ -- Drag-and-drop reorder for profile custom fields
- new: `reorderCustomField(fields, id, toIndex)` pure function in `profileLogic.ts` -- moves a field to an arbitrary target index, reassigning sortOrders for the whole sequence; returns original reference on no-op
- updated: `profileLogic.test.ts` -- added import + 1 test with 6 cases (first-to-last, last-to-first, middle, no-op, unknown-id, out-of-bounds)
- updated: `ProfilePage.tsx` -- added `useMemo`, `GripVertical` imports; drag state (`dragId`, `dropIdx`); `rowRefs`/`initialRects` refs; `displayFields` memoized from fields + drag state; `dragStart`/`dragMove`/`dragEnd` handlers using initial-rect hit-testing (stable, no oscillation); `CustomFieldRow` extended with `isDragging`, `onRowRef`, `onDragStart`/`onDragMove`/`onDragEnd` props; `GripVertical` drag handle with `touch-action: none` + pointer capture; lifted visual (`opacity-50 shadow-lg`) on dragged row
- updated: `ro.json` + `en.json` -- added `profile.dragReorder` ("Reordonează câmpul" / "Reorder field")
- result: 175 files / 1704 tests / build+pi+demo green

### T39 P2 ✅ -- CSP hardening: exact Supabase origin + violation reporting
- new: `scripts/cspHeaders.ts` -- pure `buildCsp(supabaseUrl)` and `buildHeadersFileContent(supabaseUrl)` functions; generates `dist/_headers` at build time with exact Supabase project origin replacing the `*.supabase.co` wildcard; adds `report-to csp-endpoint` + `report-uri` directives; includes `Report-To` + `Reporting-Endpoints` headers
- updated: `vite.config.ts` -- added `cspHeadersPlugin()` Vite plugin that calls `buildHeadersFileContent` in `closeBundle` and writes `dist/_headers`; demo build uses `connect-src 'self'` only (no Supabase connections)
- new: `netlify/functions/csp-report.ts` -- Netlify function accepting both legacy `application/csp-report` and modern `application/reports+json` violation payloads; logs non-PII directive/blocked-URI/source-file to function log; returns 204
- updated: `tsconfig.node.json` + `tsconfig.app.json` -- added `scripts/` to include so `cspHeaders.ts` is type-checked by both node and app builds
- updated: `tests/unit/securityHeaders.test.ts` -- 6 new `buildCsp (T39)` tests: exact origin, no wildcard, demo connect-src self-only, report-to/report-uri present, core directives invariant, headers file structure
- result: 175 files / 1703 tests / build+pi+demo green

### T104 P2 ✅ -- Wire F66 profile into F28 Parcare + F36 directory + admin profile view
- updated: `src/features/parking/parkingLogic.ts` -- added `residentPlateSuggestion(carPlate)` pure helper (returns trimmed plate or null); unit-tested
- updated: `src/features/parking/ParkingPage.tsx` -- imports `useMyIdentity` + `useProfileStore`; `openModal()` pre-fills `licensePlate` from `residentPlateSuggestion(profile.carPlate)`; hint label rendered when plate matches the profile value
- updated: `src/features/directory/directoryLogic.ts` -- new `DirectoryCustomField` interface; `VisibleEntry` gains `customFields: DirectoryCustomField[]`; `visibleEntry` accepts optional `neighbourFields` param; `searchDirectory` accepts optional `neighbourFieldsMap` (keyed by entry.id)
- updated: `src/features/directory/DirectoryPage.tsx` -- builds `neighbourFieldsMap` by calling `profileGet(entry.user_id, entry.email)` + `neighbourVisibleFields` for each entry; renders custom fields in each card; admin/comitet see a `ChevronRight` button that opens `ResidentProfileModal` (all fields incl. private, using `canViewAnyProfile`)
- updated: `src/features/profile/profileLogic.ts` -- added `canViewAnyProfile(role)`: true for admin/presedinte/comitet/cenzor/super_admin; imports `Role`
- updated: `src/features/profile/profileStore.ts` -- `DEMO_PROFILE_FALLBACKS` for u-res2 (Elena, 2 neighbour-visible custom fields) and u-res3 (Gabriela, 1 field); `get()` falls back to DEMO_PROFILE_FALLBACKS before emptyProfile; `demoProfile()` gains `carPlate: 'B 12 ABC'`
- updated: `src/shared/locales/ro.json` + `en.json` -- `directory.viewProfile`, `directory.residentProfile`, `parking.plateFromProfile`
- tests: `parkingLogic.test.ts` (+2), `directoryLogic.test.ts` (+2), `profileLogic.test.ts` (+1 describe / 2 assertions) -- 6 new test cases covering all new pure helpers

### T89 P2 ✅ -- Live activation: Supabase Storage for F33 documents
- new: `src/features/documents/documentsApi.ts` -- `hydrateDocuments` (SELECT from `documents` table, `replaceForAsociatie` in store); `addDocumentLive` (Storage upload to `<asociatie_id>/<doc_id>/<filename>`, then INSERT row; removes orphan on DB failure); `addDocumentMetadataLive` (INSERT row without file); `removeDocumentLive` (Storage remove + DELETE row); `getDocumentSignedUrl` (1-hour signed URL from `documents` bucket). All gated behind `isSupabaseConfigured`. Bucket + RLS already created by `supabase/migrations/20260121000003_storage.sql`.
- updated: `src/features/documents/documentsStore.ts` -- added `addRecord(record)` (prepend a pre-built record) and `replaceForAsociatie(asociatieId, records)` (replace all rows for one tenant, keep others) actions
- updated: `src/features/documents/DocumentsPage.tsx` -- `useEffect` hydrates on mount; `PendingFile` keeps the raw `File` reference; in live mode skips data-URL conversion (large files not base64-encoded); `submit()` is async: with-file path calls `addDocumentLive`, no-file path does optimistic `addRecord` + `addDocumentMetadataLive` (rollback on failure); `handleDownload` calls `getDocumentSignedUrl` when `storage_path` is set; `confirmDelete` calls `removeDocumentLive` when live; demo offline path unchanged. Download button shows for either `file_data_url` (demo) or `storage_path` (live).
- updated: `src/shared/locales/ro.json` + `en.json` -- added `documents.uploading`, `documents.uploadFailed`, `documents.downloadFailed`
- result: 179 files / 1690 tests / build+pi+demo green

### T113 P3 ✅ -- Carry a return-to through the AAL2 step-up
- updated: `src/app/useMfaEnforcement.ts` -- destructure `search` alongside `pathname` from `useLocation()`; pass `state: { from: pathname + search }` when navigating to the security page; add `search` to the effect deps
- updated: `src/features/auth/SecurityPage.tsx` -- import `useLocation`; read `returnTo` from `location.state.from` (fallback `/app`); navigate to `returnTo` after a successful step-up instead of the hardcoded `/app`
- result: 178 files / 1690 tests / build+pi+demo green

### T26 P1 ✅ -- Consent-gate enforcement in the notification fan-out
- updated: `netlify/functions/notify-email.ts` -- replaced the local `isConsentAllowed()` duplicate with the shared `mayNotify()` from `consentGate.ts`; constructs a `ConsentRecord` from the DB choices row; removed the local helper; updated header comment
- updated: `src/shared/store/notificationStore.ts` -- added `emitGated(n, consentKind, record)` method: calls `mayNotify(record, consentKind)` and only appends the notification when the gate passes; imports `mayNotify` + `ConsentGateKind` from `consentGate.ts` and `ConsentRecord` from `consentLogic.ts`
- updated: `tsconfig.node.json` -- added `baseUrl` + `paths` (`@/*` -> `src/*`) so netlify functions can import shared modules that use `@/` aliases without type errors
- new: `tests/unit/consentGateFanout.test.ts` (+8 tests) -- proves `emitGated` blocks community notifications when preferences consent is refused, blocks marketing when marketing consent is refused, does not emit when no consent decision exists, always emits essential regardless of consent state, does not disturb already-stored notifications when a subsequent emit is blocked
- result: 178 files / 1698 tests / lint+typecheck+build+pi+demo green

### T16 P1 ✅ — Realtime updates (announcements, tickets, private messaging)
- new: `src/app/realtimeLogic.ts` -- pure event-apply helpers: `applyAnnouncementChange` (INSERT dedup by id + UPDATE replace), `applyAnnouncementDelete`, `applyTicketChange`, `applyTicketDelete`, `applyThreadInsert` (dedup), `applyThreadStatusUpdate` (patches status, preserves messages), `applyThreadDelete`, `applyMessageInsert` (appends to parent thread, dedup by id)
- new: `src/app/useRealtimeSync.ts` -- React hook; subscribes to `announcements`, `tickets`, `private_threads`, `private_messages` postgres_changes on a single channel per asociatieId (each table filtered by `asociatie_id=eq.${aid}`); Supabase Realtime handles reconnection automatically; no-op when `!isSupabaseConfigured` or `asociatieId` is null (demo/offline falls back cleanly); votes surfaces deferred to T80 (live read path not yet built)
- updated: `AppLayout.tsx` -- calls `useRealtimeSync(currentAsociatieId)` so the subscription is active for the full app session; reads `currentAsociatieId` from `authStore` (already available in the component)
- tests: `tests/unit/realtimeSync.test.ts` (+25 tests) -- INSERT prepend + dedup, UPDATE replace + no-op-when-absent, DELETE remove + no-op-when-absent for announcements and tickets; thread INSERT dedup, status UPDATE (preserves messages, isolates other threads), thread DELETE; message INSERT (appends, dedup, multi-thread isolation, unknown-thread no-op)
- result: 177 files / 1682 tests / lint+typecheck+build+pi+demo green

### T14 P1 ✅ — Email notification channel (live)
- new: `src/shared/lib/notifPrefsLogic.ts` -- pure `NotifEmailPrefs` model, `hourInTimezone`, `isInQuietHours`, `shouldSendEmailNotif` (urgent always bypasses; quiet-hours suppresses non-urgent; email disabled suppresses); `isValidQuietHour` validator
- new: `src/shared/lib/notificationEmail.ts` -- bilingual (RO+EN) email builders for `membership.joined`, `announcement.published`, `generic` notification kinds; footer with preferences link + one-click `?action=unsubscribe-email` unsubscribe link; follows `inviteEmail.ts` pattern (pure, dep-free, importable by Netlify functions)
- new: `src/shared/store/notifPrefsStore.ts` -- persisted Zustand store (`vecini.notif-prefs`) keyed by userId; `getPrefs`, `setEmailEnabled`, `setQuietHours`
- new: `netlify/functions/notify-email.ts` -- service-role Netlify function; bearer-auth caller; resolves recipient email + locale from DB (never from request body); reads `notification_preferences`; checks `shouldSendEmailNotif`; consent gate (essential/urgent bypass; community checks `consent_records.choices.preferences`); renders bilingual template; MAIL_MODE tri-modal (`resend`/`log`/`disabled`)
- new: `supabase/migrations/20260529000004_notification_preferences.sql` -- `notification_preferences` table (user_id PK, email_enabled, quiet_hours_start/end 0-23, timezone, updated_at); owner-scoped RLS; constraints on hour range
- new: `src/shared/lib/notifPrefsLogic.test.ts` (+26 tests) -- `hourInTimezone`, `isInQuietHours` (non-wrapping/wrapping/all-day), `shouldSendEmailNotif` (urgent bypass, email off, quiet hours, combinations), `isValidQuietHour`
- new: `src/shared/lib/notificationEmail.test.ts` (+16 tests) -- all three kinds x RO+EN; fallbacks; CTA links; unsubscribe footer; HTML doctype; locale resolution
- updated: `NotificationsPage.tsx` -- added `NotifPrefsPanel` (email toggle + quiet-hours form with save/clear); one-click unsubscribe on `?action=unsubscribe-email` param; uses `Card`, `Moon`, `Mail`, `MailX` icons
- updated: RO+EN locales -- `notifications.pref*` strings for preference panel + unsubscribe banner
- result: 173 files / 1657 tests / build+pi+demo green

### T144 P2 ✅ — Live activation: server-side OTP attempt-limit parity
- new: `tests/unit/mfaOtpServerLockReconcile.test.ts` (+5 tests) -- live-branch `verifyOtp` reconciliation: `challenge-locked` from server returns `channel-locked` with `lockedMs > 0`; `otpThrottles` NOT updated on server lock (server is authoritative); clearing `otpThrottles` (simulated localStorage wipe) still hits the server lock; `invalid-code` increments client throttle; success resets client throttle
- confirmed: `mfa-otp-verify.ts` attempt counter is per-challenge DB row (not resetable from browser); resend cooldown + hourly ceiling in `mfa-otp-request.ts` prevent farming new challenges; all three second-factor brute-force budgets (login/T33, recovery/T81, OTP/T144) are server-held
- result: 176 files / 1630 tests / build+pi+demo green

### T143 P2 ✅ — Live activation: wire mfaStore to the OTP functions + claim-aware enforcement
- new: `src/features/auth/otpChannelApi.ts` -- `requestOtpLive` / `verifyOtpLive` fetch wrappers for the T142 Netlify functions; `hasAppElevation(token)` decodes `app_2fa_at` from a Supabase JWT for the client-side 2FA gate
- store: `mfaStore` -- `loadChannels()` reads `mfa_channels` in live mode; `enableChannel()` upserts and `disableChannel()` deletes from `mfa_channels` (email only; Telegram deferred to T15); `requestOtp()` calls `mfa-otp-request`, `verifyOtp()` calls `mfa-otp-verify` + `refreshSession()` to pick up the `app_2fa_at` claim; `verifyConfirmToken()` calls `mfa-otp-verify` with token path; `challengeRequired()` checks `app_2fa_at` before native AAL; `enabledChannels()` reads `liveEnabledChannels` in live mode; both `enableChannel`/`disableChannel` return `Promise<{error}>` now
- hook: `useMfaEnforcement` -- decodes `app_2fa_at` from `getSession()` to compute `app2faSatisfied`; passes both `aalSatisfied` and `app2faSatisfied` to `mfaEnforcementRedirect`
- ui: `SecurityPage` -- calls `loadChannels()` on mount; `stepUpAvailableChannels()` + `emailEnabled`/`telegramEnabled` read from `liveEnabledChannels` in live mode; channel handlers are async (error-tolerant)
- tests: +16 in `otpChannelApi.test.ts` (hasAppElevation + requestOtpLive + verifyOtpLive); updated `mfaEnforcement.test.tsx` (getSession in mock) + `securityPageStepUp.test.tsx` (liveEnabledChannels seed + loadChannels stub + requestOtp/verifyOtp stubs)
- result: 175 files / 1625 tests / build+pi+demo green

### T81 P2 ✅ — Server-side MFA challenge attempt limiting (parity)
- mig: `20260529000003_mfa_recovery_attempt_counts.sql` -- `mfa_recovery_attempt_counts` table (user_id + session_id PK, attempts int); RLS on, service-role-only; `increment_recovery_attempts(uuid, text)` SECURITY DEFINER function for atomic upsert-increment (insert 1 on first attempt, increment existing on conflict), revoked from PUBLIC
- fn: `mfa-recovery-verify.ts` -- replaced per-Lambda-instance in-memory `_attemptStore` (Map + checkSlidingWindow) with DB-backed read+RPC pattern; reads `mfa_recovery_attempt_counts` for current count before comparison, returns 429 `attempt-limit-exceeded` if >= MAX_ATTEMPTS (5), calls `increment_recovery_attempts` RPC on a wrong code (atomic, instance-independent)
- store: `mfaStore.verifyChallenge` -- when server returns `attempt-limit-exceeded` (DB counter exhausted), logs `mfaChallengeLocked` and returns `lockedMs = RECOVERY_SERVER_LOCK_DISPLAY_MS` (15 min) so the UI shows the locked state; `challengeThrottle` intentionally not updated (only wrong-credential guesses count locally; TOTP budget must not be blocked by a recovery lock)
- fix: `env.ts` -- `window.location.origin` guard (`typeof window !== 'undefined'`) so node-environment tests do not crash at module load time (pre-existing failures in `mfaChallengeThrottle`, `otpChannelStore` test suites)
- tests: updated `mfaRecoveryVerify.test.ts` (clarified checkSlidingWindow as general rateLimiter utility, no longer specific to recovery-verify); new `mfaServerLockReconcile.test.ts` (+4 tests) -- server-locked response yields lockedMs > 0, challengeThrottle not updated, invalid-code without lock yields lockedMs = 0, success clears throttle
- result: 173 files / 1607 tests / lint+typecheck+build+pi+demo green

### T29 P1 ✅ — Live recovery-code login (server routine)
- new files: `netlify/functions/mfa-recovery-verify.ts` -- Bearer-auth caller via service-role `getUser`, extract `session_id` from JWT payload, per-session in-memory rate limit (5 attempts per 15 min window via `checkSlidingWindow`), SHA-256 hash of normalised submitted code, constant-time comparison (`timingSafeEqualHex`) against each stored `mfa_recovery_codes` row, on match delete the row (single-use) + upsert `session_elevations` with `channel='recovery'` (24 h TTL) so the T141 Custom Access Token Hook injects `app_2fa_at`/`app_2fa_channel` on JWT refresh; hash logic inlined to avoid pulling `mfaLogic.ts` (which has `@/` alias imports) into the node tsconfig
- new file: `src/features/auth/recoveryVerifyApi.ts` -- client-side API module that gets the current session access token and POSTs to `/.netlify/functions/mfa-recovery-verify`; offline path returns ok immediately (demo verifies codes locally in mfaStore)
- wire: `mfaStore.verifyChallenge` live branch now calls `verifyRecoveryCodeLive` for non-TOTP input (was `recovery-live-unavailable` placeholder) and refreshes the session on success to pick up the new JWT claims; updated comment to reflect server-held attempt limits
- cleanup: removed dead `recoveryLiveUnavailable` error key from `MfaErrorKey` union + `mfaErrorKey` mapping + locale strings (en + ro) + test case -- the error is no longer returned now that the feature is implemented
- live activation: requires `SUPABASE_SERVICE_ROLE_KEY` + `VITE_SUPABASE_URL`; Custom Access Token Hook (T141) must be enabled in Supabase dashboard
- tests: +10 in `tests/unit/mfaRecoveryVerify.test.ts` -- `extractBearerToken` (well-formed/case-insensitive/whitespace/null/wrong-scheme/bare-token), `checkSlidingWindow` as recovery budget (max-5/reject-+1/reset-after-window/independent-sessions)
- result: 172 files / 1572 tests / lint+typecheck+build+pi+demo green

### T142 P2 ✅ — Live activation: service-role functions for email OTP (request + verify, elevate session)
- new files: `src/shared/lib/otpEmail.ts` -- bilingual (RO+EN) OTP email template builder (pure, dep-free, importable by browser + Netlify); `netlify/functions/mfa-otp-request.ts` -- issues a hashed `mfa_otp_challenges` row + delivers the code + confirm link via Resend (MAIL_MODE=resend/log/disabled; only email channel, Telegram deferred); `netlify/functions/mfa-otp-verify.ts` -- constant-time hash compare (code or confirm-token), increments per-challenge attempt counter, locks at 5 wrong attempts, on success marks `consumed_at` + upserts `session_elevations` row (24 h TTL) so the T141 Custom Access Token Hook injects `app_2fa_at`/`app_2fa_channel` into the JWT
- shared infra reused: `_shared/supabaseAdmin.ts` (verifyBearerToken + service-role client), `_shared/resend.ts` (sendEmail), `src/features/auth/otpChannelLogic.ts` (hashOtp/verifyOtpHash/generateNumericOtp/timingSafeEqualHex/etc.); session_id decoded from JWT payload (not trusted from client body)
- fix: removed explicit `: Crypto` return type from `webcrypto()` in `otpChannelLogic.ts` -- pre-existing typecheck error under tsconfig.node.json (Crypto DOM type absent from `lib: ES2023`)
- live activation: requires `SUPABASE_SERVICE_ROLE_KEY` + `RESEND_API_KEY` + `RESEND_FROM_EMAIL` + `APP_URL` in Netlify env; Custom Access Token Hook (T141) must be enabled in Supabase dashboard; documented in `SECURITY.md` Known gaps
- tests: +27 in `tests/unit/mfaOtpFunctions.test.ts` -- extractSessionId (valid/absent/non-string/malformed/empty/base64url), resolveOtpEmailLocale (9 locale inputs), buildOtpEmail (subject/text/html/code/link/expiry/defaults/HTML-escaping)
- result: 169 files / 1562 tests / lint+typecheck+build+pi+demo green

### T33 P2 ✅ — Server-backed login lockout
- mig: `20260529000002_login_attempt_locks.sql` -- `login_attempt_locks` table (email_hash PK, failure_count, window_start, locked_until, lockout_count); RLS enabled, direct access revoked from anon/authenticated; three SECURITY DEFINER RPCs: `check_login_lock`, `record_login_failure` (escalating lock: 5 failures in 15min window triggers lockout mirroring client constants, doubles per round, capped 30min), `clear_login_lock`; GRANT EXECUTE to anon+authenticated
- api/code: `serverLockout.ts` (new) -- `hashEmail(email): Promise<string>` (SHA-256 hex of normalized email, no PII to server), `reconcileLockMs(clientMs, serverMs): number` (max of both, floored 0); `securityStore.ts` gains `checkServerLock`, `recordServerFailure`, `clearServerLock` async methods (each guard-gated on `isSupabaseConfigured`, fail open returning 0); `authStore.signIn` reconciles client + server pre-lock check and post-failure counters via `reconcileLockMs`, fires `clearServerLock` best-effort on success
- tests: +10 in `serverLockout.test.ts` -- reconcileLockMs (zero/client-only/server-only/server-larger/client-larger/negative-floor), hashEmail (64-char hex, case normalization, whitespace trim, different emails)
- result: 166 files / 1535 tests / lint+typecheck+build+pi+demo green

### T109 P3 ✅ — Semantic ROPA guards: catch features that misstate their processing profile
- api/code: `ropaLogic.ts` gains two new exported pure functions -- `financialBasisViolations(features)` returns a violation message for each implemented feature whose resolved profile includes `financial` data but resolves a basis other than `legal`/`contract` (legitimate interest and consent are too weak for financial records); `consentOptionalViolations(features)` returns a violation message for each consent-basis feature that lacks `optional` in its data categories (consent requires opt-in data flagged with `optional`)
- tests: +6 in `ropaLogic.test.ts` within a new `semantic ROPA guards (T109)` block -- zero violations on current FEATURES for both rules; detection of synthetic violating features (financial+legitimate, consent without optional); acceptance of well-formed equivalents (financial+legal, community default inherits optional); both guards ignore non-implemented features

### T88 P2 ✅ — F33 real file upload, role-gated (offline data-URL)
- api/code: `DocumentRecord` gains `file_name/file_size/file_type/file_data_url` optional fields (null in live path until T89); `documentLogic.ts` adds `DOCUMENT_MAX_BYTES` (10 MB), `DOCUMENT_ALLOWED_TYPES`/`DOCUMENT_ACCEPT`, `validateDocumentFile`, `canManageDocuments`, `formatFileSize`, `readFileAsDataUrl`; `documentsStore` converted to `persist('vecini.documents', v1)` with `remove(id)` + updated `add(asociatieId, input)` accepting file fields; `DocumentsPage` reads `activeRole()` + role-gates upload (admin/presedinte/comitet) via hidden `<input type="file">`, shows per-card download button (all users, only when `file_data_url` set) + delete-with-confirm-modal (managers only); emits `document.uploaded`/`document.deleted` audit events; `auditLogic` gains 2 actions + `'document'` entity; `AuditLogPage.ACTION_TONE` updated; DEMO_DOCUMENTS updated with null file fields
- locales: 13 new `documents.*` keys + `audit.action.document.uploaded/deleted` + `audit.entity.document` RO+EN
- tests: +7 in `documentLogic.test.ts` (validateDocumentFile x4, canManageDocuments x2, formatFileSize x1); E2E T88 happy path (upload with Buffer, download visible, delete)
- result: 165 files / 1525 tests / build+pi+demo green

### T101 P3 ✅ — Label each export section's asociație for a multi-asociație resident
- api/code: `CollectInput.apartment` renamed to `apartments: Record<string, string | null>` (per-asociatie_id map); `CollectInput.asociatieName` renamed to `asociatiiNames: Record<string, string>`. `DataSubjectExport.subject.asociatie: string` changed to `asociatii: string[]`. Profile section emits one row per asociatie (apartment + name from their respective records). Tickets/discussions/adminchat rows gain an `asociatie` column resolved from `asociatiiNames[row.asociatie_id]`. `toExportCsv` header joins all asociatii names. `MyDataPage.buildExport` builds both maps: `asociatiiNames` from `subjectAsociatieIds`+`localAsociatii`, `apartments` from demo data (live to follow with T103). Decision recorded in `DECISIONS.md`.
- tests: emptyInput updated; 4 new T101 tests (ticket labeling, discussion labeling, multi-row profile, subject.asociatii); existing assertions updated to `asociatii: []` array and multi-column profile row
- result: 165 files / 1542 tests / lint+typecheck+build+pi+demo green

### T32 P1 ✅ — Server-side auth-policy parity
- docs: `.env.example` expanded with exact Supabase Auth dashboard settings: minimum password length 10 (`MIN_POLICY_LENGTH`), "Medium" strength, HIBP leaked-password check enabled, sign-in rate limit 30/hr, email rate limit 5/hr
- `SECURITY.md` Authentication section rewritten to cover both client and server policy layers with exact dashboard paths; Known gaps updated (T32 is now "settings documented, apply on provisioned project" rather than a silent gap)
- no code changes; verification pipeline unchanged (165 files / 1538 tests / build+pi+demo green)

### T180 P0 ✅ — Gate /onboarding to provisioned admins only in PROD
- api/code: `onboardingGateLogic.ts` (`PROVISIONAL_ASOCIATIE_NAME` + `findProvisionalAdminMembership(memberships, localAsociatii)` pure); `RequireOnboardingEntry` component wraps `/onboarding` route (DEMO/DEV pass through; PROD requires provisional admin membership, else redirect to / + toast); `RequireAsociatie` member-less users sent to / (+ toast) in PROD instead of /onboarding; defensive `useEffect` guard inside `OnboardingWizard` redirects to /app if wizard already completed this session
- router: `/onboarding` now wrapped in `RequireAuth` + `RequireOnboardingEntry`
- locales: `auth.noValidInvite` EN+RO
- tests: `onboardingGateLogic.test.ts` 8 cases covering offline provisional, live provisional, established admin, multi-membership
- result: 165 files / 1538 tests / build+pi+demo green

### T179 P0 ✅ — Hide signup form + remove create-asoc CTA for invalid invite tokens
- api/code: `isInvalidTokenState(resolved, resolving, isLive)` pure helper in `accountSetupLogic.ts`; `AccountSetupPage` renders error-only state (AlertCircle icon + `setup.invalidTitle` + status-specific `setup.err_<status>` body + `setup.contactAdmin` + login link) when token is invalid/expired/used/revoked/unknown after resolution, with no form inputs visible; `setup.createPrompt` / `setup.createLink` (the `/onboarding` self-service CTA) removed unconditionally
- locales: `setup.invalidTitle` + `setup.contactAdmin` in RO + EN
- tests: +7 `isInvalidTokenState` cases added to existing `accountSetupLogic.test.ts`
- result: 165 files / 1536 tests / build+pi+demo green

### T129 P2 ✅ — F04 private messaging Supabase live activation
- api/code: `adminChatApi.ts` `startThread`/`reply`/`toggleStatus` accept `onError?`, microtask callback on write fail; `markRead` silent. `AdminChatPage.tsx` passes `toast.error(t('adminChat.writeFailed'))`
- locales: `adminChat.writeFailed` EN+RO
- tests: `privateThreadPrivacyRls.test.ts` (drop members-read/comitet-write, party-or-admin policies), `adminChatApi.test.ts` (20 offline tests)
- mig: `20260525000002` schema+RLS (apply requires provisioned project)
- result: 165 files / 1523 tests / build+pi+demo green

### T178 P2 ✅ — Three-stage model documentation pass
- docs: `DECISIONS.md` "Three-stage deployment model" entry; `PI_DEPLOYMENT.md` intro callout + "DEV email workflow (MAIL_MODE=log)" section + env rows for `VITE_APP_STAGE`/`MAIL_MODE`/`VITE_DEV_PASSWORD`; `.env.pi.example` adds `VITE_DEV_PASSWORD=dev-password`; `RESUME.md` §0 updated
- result: 163 files / 1500 tests / build+pi+demo green

### T177 P2 ✅ — Visible stage banner in app shell (DEV/DEMO only)
- api/code: `StageBanner.tsx` (`src/shared/components/`); null in PROD, fixed bottom-left pill — DEV `--warning-soft`, DEMO `--bg-inverse`/warm-graphite. Mounted in `AppLayout.tsx`
- css: block in `shell.css` with `iv-fade-in` + `prefers-reduced-motion` guard
- locales: `auth.stageBanner.dev`/`demo`
- tests: 5 new
- result: 163 files / 1500 tests / build+pi+demo green

### T176 P1 ✅ — `npm run pi:seed` one Supabase user per role
- api/code: `scripts/pi-seed.mjs` reads `.env`, guards non-dev/cloud-URL, creates/skips auth users (`{role}@dev.local` for 6 tenant roles + `super.admin@dev.local`), upserts `users`+`memberships`, `platform_admins` for super_admin. `--password` flag + `VITE_DEV_PASSWORD` env. Idempotent. `seed` subcommand in `scripts/pi.sh`; `pi:seed` in `package.json`
- docs: `## DEV users (pi:seed)` section in `PI_DEPLOYMENT.md`
- tests: 10 in `piSeed.test.ts`
- result: 161 files / 1495 tests / build+pi+demo green

### T175 P1 ✅ — `MAIL_MODE=resend|log|disabled` for invite-email
- api/code: `getMailMode()` in `resend.ts` (default `'resend'`); `invite-email.ts` branches — `disabled`→200 `{delivered:false, reason:'mail_disabled'}`, `log`→inserts `email_outbox`+`console.info`+200, `resend`→existing path. `InvitesAdminPage` "Outbox (DEV)" collapsible when `!isProd()` showing last 20
- mig: `20260529000001_email_outbox.sql` (RLS scoped admin/presedinte)
- env: `MAIL_MODE=log` in `.env.pi.example`, `MAIL_MODE=resend` in `.env.example`
- tests: 5 in `mailMode.test.ts`
- result: 160 files / 1485 tests / build+pi+demo green

### T174 P1 ✅ — Auto-bypass login in DEMO + remember last role
- api/code: `DemoEntry` in `router.tsx`; `/` is `isDemo() ? <DemoEntry /> : <S><LoginPage /></S>`. `DemoEntry` reads `localStorage['iv.demo.role']` via `readLastDemoRole()` (validates 7 roles, falls back `'admin'`), calls `enterDemo(role)`, navigates `/app` replace. `enterDemo` in `authStore.ts` writes `localStorage.setItem('iv.demo.role', role)`
- tests: 13 in `demoEntry.test.ts`
- result: 159 files / 1480 tests / build+pi+demo green

### T173 P1 ✅ — Floating dev role switcher (DEV+DEMO, hidden PROD)
- api/code: `DevRoleSwitcher.tsx` `floating` (top-right chip-bar) + `inline` (LoginPage). 7 roles, `aria-pressed`+`data-active`. DEMO→`enterDemo(role)`; DEV→`signInAsDevUser(role)` (signs in `{role}@dev.local` using `VITE_DEV_PASSWORD`; super uses `super.admin@dev.local`). New `AuthState.signInAsDevUser`. Mounted in `AppLayout.tsx`. LoginPage uses inline variant
- locales: 5 new keys per language
- tests: 9 new
- result: 158 files / 1467 tests / build+pi+demo green

### T172 P1 ✅ — Stage-specific build/dev scripts
- api/code: `build:prod`/`build:pi`/`build:demo`/`dev:pi`/`dev:demo` in `package.json` (same typecheck pattern as `build`)
- env: `.env.pi` + `.env.demo` committed with safe placeholders; `.gitignore` adds `!.env.pi`+`!.env.demo` exceptions
- result: 1458 tests / build+pi+demo green

### T171 P1 ✅ — `VITE_APP_STAGE` + `getStage()` three-stage protocol gate
- api/code: `AppStage = 'prod'|'dev'|'demo'` on `ClientEnv`; `resolveAppStage(rawStage, supabaseConfigured)` helper; `getStage()`/`isProd()`/`isDev()`/`isDemo()`
- env: `VITE_APP_STAGE=prod` in `.env.example`; `VITE_APP_STAGE=dev` in `.env.pi.example`; new `.env.demo.example`
- docs: BACKLOG protocol step 4 includes `build:pi`+`build:demo`; CLAUDE.md non-negotiable; RESUME.md §0
- tests: 8 in `tests/unit/env.test.ts`
- result: 157 files / 1458 tests / build green

### T128 P0/MVP ✅ — Token-security hardening: hash + rate-limit + audit
- mig: `20260528000003_token_security_hardening.sql` enables `pgcrypto`; overwrites plaintext `invite_codes.token` with sha256 hex; creates `token_redemption_attempts` (RLS, no public policy, SECURITY DEFINER only); `CREATE OR REPLACE` `resolve_onboarding_token` (hashes p_token) + `redeem_onboarding_token` (hashes, rate-limits 10/15min per hash, records attempts only for known hashes, on success inserts `invite.redeemed` event with seq/hash NULL — client Zustand chain is tamper-evident layer)
- api/code: `inviteWriteApi.ts` adds `sha256Hex` (Web Crypto), stores hash. `RedeemRpcResult.status` adds `'rate_limited'`. `AUDIT_ACTIONS`+`ACTION_TONE` add `'invite.redeemed'`
- locales: `audit.action.invite.redeemed` + `setup.err_rate_limited` RO+EN
- tests: 11 in `tokenSecurityHardening.test.ts`
- notes: pre-T128 tokens invalidated, documented in RUNBOOK-MVP.md
- result: 156 files / 1452 tests / build green

### T111 P2 ✅ — Drop `super_admin` from per-asociație memberships role check
- mig: `20260528000002_drop_super_admin_from_memberships_role.sql` recreates `memberships_role_check` with exactly 6 tenant roles (admin/presedinte/comitet/cenzor/proprietar/chirias)
- tests: 4 in `tests/unit/membershipRoleConstraint.test.ts`
- result: 154 files / 1430 tests / build green

### T08 P1 ✅ — E2E suite green + CI
- ci: `.github/workflows/ci.yml` with `check` job (lint+typecheck+unit+build) + `e2e` job (chromium-only Playwright, `--with-deps chromium`, uploads `playwright-report` on failure)
- e2e: `tests/e2e/isolation.spec.ts` — 3 tests (`/app` redirects, `/app/anunturi` redirects, sign-out via UserMenu)
- result: 153 files / 1426 tests / build green

### T170 P0/MVP ✅ — Fix live invite email: strip `inv-` prefix
- api/code: `startsWith('inv-') ? id.slice(4) : id` in `sendInviteEmail` body (`src/features/invites/inviteEmailApi.ts`), mirrors `writeInviteToLive`
- tests: 3 in `tests/unit/inviteEmailApi.test.ts`
- result: 1298 tests / build green

### T100 P1 ✅ — Mandatory hardened MFA for super_admin
- api/code: `platformAuthLogic.ts` adds `mfa-enrollment-required` 6th `PlatformAccess` + 3 inputs (`supabaseConfigured`/`mfaLoaded`/`mfaEnrolled`). `RequirePlatformAdmin` renders mandatory TOTP enrollment (begin/confirm/cancel/recovery via existing `useMfaStore`). `PlatformLoginPage` adds `pendingMfa` state; TOTP challenge before navigating
- locales: `backToSignIn`, `platform.mfa.enrollTitle`/`enrollBody`/`enrolledNotice` RO+EN
- tests: 6 in `platformAuthLogic.test.ts` (enrollment-required, no-flash-before-loaded, demo exemption, offline exemption)
- result: 153 files / 1426 tests / build green

### T57 P2 ✅ — Content slices Supabase live (Anunturi/Discutii/Sesizari)
- mig: `20260528000001` adds `title text` to `discussion_threads`, `author_name text` to `discussion_messages`
- api/code: `announcementsApi.ts` (`hydrate`+`publish`), `discussionApi.ts` (`hydrate`+`addThread`+`postMessage`+`togglePin`+`deleteMessage`), `ticketsApi.ts` (`hydrate`+`submit`); apply store change sync then best-effort mirror when `isSupabaseConfigured`. All 3 stores gain `replaceForAsociatie`. Pages wired with `useEffect` hydrate
- tests: 32 new across 3 files
- result: 153 files / 1420 tests / build green

### T56 P2 ✅ — Per-asociație feature flags live (`asociatie_features`)
- api/code: `src/shared/features/featureApi.ts` — `hydrateFeatureFlags` (reads all rows, calls `setAll`, no-op offline) + `setFeatureFlagLive` (sync `setFlag` + best-effort upsert on `(asociatie_id, feature_key)`). `FeaturesAdminPage` hydrates on mount; `setFlag` calls replaced
- tests: 7 in `featureApi.test.ts`
- result: 150 files / 1388 tests / build green

### T145 P3 ✅ — Remove unused `join.*` locale keys
- locales: 13-key `join.*` block removed from `ro.json`+`en.json`
- result: 149 files / 1381 tests / build green

### T158 P3 ✅ — Remove orphaned `onboarding.import/invite/csv*` locale keys
- locales: 6 dead keys (`import`/`invite`/`csvHelp`/`csvParsed`/`csvError`/`inviteEmails`) removed
- result: 149 files / 1381 tests / build green

### T164 P3 ✅ — Seed invitee profile locale from active UI language
- api/code: `seedProfile` adds optional `locale?: Locale`; `AccountSetupPage` offline narrows `i18n.language` to `Locale` and passes it
- tests: 2 new in `profileLogic.test.ts`
- result: 149 files / 1381 tests / build green

### T167 P3 ✅ — Triage-row actions usable on narrow viewport
- ui: icon+meta wrapped `flex min-w-0 flex-1 items-center gap-3`; outer row `flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-3`; title row `flex-wrap`
- tests: 4 in `featuresAdminTriageResponsive.test.tsx`
- result: 149 files / 1379 tests / build green

### T138 P2 ✅ — Live-wire F05 comitet inbox through privacy functions
- api/code: `AnonymousMessage.sender_user_id` optional. `anonymousStore` gains `replaceAll`+`setStatus`. `anonymousApi.ts` — `hydrate` (RPC for privileged, owner-RLS table for residents, no-op offline), `submit` (prepend store + best-effort insert), `setStatus` (store + `set_anonymous_message_status` RPC). `AnonymousPage` wired role-aware (`isPrivileged`)
- tests: 14 in `anonymousApi.test.ts`
- result: 148 files / 1375 tests / build green

### T135 P2 ✅ — Cross-origin redirect: superadmin off resident origin to platform subdomain
- api/code: `hydrationLogic.ts` `AsociatieRoute` adds `'platform-redirect'`; `AsociatieRouteInput` adds `platformUrl?: string|null`; returns `'platform-redirect'` when `isPlatformSuperAdmin && platformUrl`. `RequireAsociatie.tsx` computes route before early return, `useEffect` fires `window.location.href = env.platformUrl`, returns null. `AppHome.tsx` same defense-in-depth, falls back to `<Navigate to={SUPERADMIN_HOME_PATH}>`. `env.ts` adds `platformUrl: string|null` reading `VITE_PLATFORM_URL` (trims, empty→null)
- env: `VITE_PLATFORM_URL` in `.env.example`
- tests: 19 in `platformRedirect.test.ts`
- result: 147 files / 1363 tests / build green

### T117 P2 ✅ — Reconcile embedded `persons` with `apartment_residents`
- api/code: `ApartmentPerson` gains `claimed_user_id?: string|null` (jsonb, no DDL). `apartmentsLogic.ts` adds `isPersonClaimed`/`claimPersonInList`. `ApartmentFormPage.tsx` shows "Account linked" badge + name input disabled on claimed entries
- mig: `20260527000006` `CREATE OR REPLACE` `redeem_onboarding_token` sets `claimed_user_id` via `jsonb_set` — matches first unclaimed by name CI, else by role
- locales: `apartments.personLinked` EN+RO
- tests: 21 in `personsReconcile.test.ts`
- result: 146 files / 1344 tests / build green

### T149 P2 ✅ — Resend delivery webhook stamps `invite_email_delivered_at`
- mig: `20260527000005` adds `resend_message_id text` to `invite_codes`
- api/code: `resend.ts` `SendEmailResult` gains `messageId`. `invite-email.ts` stamps `invite_email_sent_at` + stores `resend_message_id`. `resend-webhook.ts` new — svix HMAC-SHA256 base64-decoded `whsec_...` + ±5min timestamp guard; `email.delivered`→stamp by `resend_message_id`, `bounced`+others silent ack; no PII logged. `inviteLogic.ts` `markInviteEmailDelivered`. `inviteStore.markEmailDelivered`. `inviteWriteApi.hydrateInviteDelivery(asociatieId)`. `InvitesAdminPage` hydrates + shows `emailDeliveredOn`
- env: `RESEND_WEBHOOK_SECRET` in `.env.example` + RUNBOOK-MVP §2b
- locales: `invites.emailDeliveredOn` EN+RO
- tests: 20 in `inviteDeliveryWebhook.test.ts`
- result: 145 files / 1323 tests / build green

### T115 MVP ✅ — Live Supabase read/write for apartment registry
- api/code:
  - `toRow()` strips `ap-` prefix before insert (uuid valid); `toDbId()` for `.eq('id', ...)` in `updateApartment`/`deleteApartment`
  - `writeInviteToLive()` strips `ap-` from `invite.apartmentId` before insert (FK on `invite_codes.apartment_id` → `apartments.id`)
  - `createApartments`/`updateApartment`/`deleteApartment` gain `onError?: (err: ApartmentWriteError) => void`; callers in `ApartmentFormPage`+`ApartmentsPage` toast bilingual error
  - Postgres `23505` classified as `'conflict'` with specific bilingual toast
  - `writeInviteToLive(invite)` called in `ApartmentFormPage.onConfirmInvite` when `isSupabaseConfigured`
  - `expiresAt: onboardingExpiry()` (24h) instead of null
- locales: `apartments.conflictError`/`saveFailed` RO+EN
- tests: 11 in `apartmentsLivePath.test.ts`
- result: 144 files / 1301 tests / build green

### T163 P3 ✅ — Distinguish row warnings from blocking errors in CSV import
- api/code: `ImportBatchResult.warnings: string[]` added to `csv.ts`; "email invalid, invite skipped" moves to warnings (apartment still created). `ApartmentsPage` shows blocking errors in red banner, warnings in amber, independent dismiss
- locales: `importErrorsTitle` clarified + `importWarningsTitle` added RO+EN
- tests: 4 updated + 3 new for `resolveImportBatch`
- result: 143 files / 1290 tests green

### T165 P3 ✅ — Link Textarea error to control with `aria-describedby`
- api/code: `aria-describedby={error ? `${fieldId}-err` : undefined}` on `<textarea>`, `id` on error `<p>` in `Textarea` (`src/shared/components/Input.tsx`)
- tests: 6 in `Input.test.tsx`
- result: 1288 tests / build green

### T55 MVP ✅ — Live invite write/consume + real account creation
- mig: `supabase/migrations/20260527000004_onboarding_redemption_rpcs.sql`:
  - `resolve_onboarding_token(p_token text)` STABLE, anon+authenticated; returns minimal context; revoked > used > expired > ok; `REVOKE FROM PUBLIC; GRANT TO anon, authenticated`
  - `redeem_onboarding_token(p_token, p_full_name, p_locale)` VOLATILE, authenticated only; uses `auth.uid()`+server-resolved email; `SELECT ... FOR UPDATE` lock; email-ownership check; upserts `users`; inserts `memberships` (admin for `admin_setup`, role for `resident_invite`); links `apartment_residents`; marks `consumed_at`+`consumed_by_user_id`; `SECURITY DEFINER SET search_path = ''`
- api/code:
  - `src/features/onboarding/onboardingApi.ts` — `resolveTokenLive()`+`redeemTokenLive()`
  - `src/features/invites/inviteWriteApi.ts` — `writeInviteToLive(invite)` strips `inv-` prefix; called from `ApartmentsPage.handleFileSelected` before `sendInviteEmail`
  - `AccountSetupPage` `useEffect` calls `resolveTokenLive` on mount; submit async branches on `isSupabaseConfigured` — `signUp(email, password)` → surface `err_no_session` if Confirm Email on → `redeemTokenLive` → `authStore.hydrate()`
- locales: `setup.err_no_session`/`err_email_mismatch`/`resolving` per language
- tests: 36 static source in `onboardingRedemption.test.ts`
- notes: known gap — `apartment_residents` has no unique `(apartment_id, user_id)`, redeem uses `WHERE NOT EXISTS` guard
- result: 142 files / 1282 tests / build green

### T92 MVP ✅ — Server-side privileged provisioning (Netlify, service role)
- api/code: `netlify/functions/provision-asociatie.ts` POST only — (1) `isSupabaseAdminConfigured()`→503; (2) `verifyBearerToken()`→401; (3) re-checks `platform_admins` with service-role (equivalent to `is_super_admin()`)→403; (4) inline validates `adminName`/`adminEmail`→422; (5) creates provisional `asociatii` row with UUID-hex slug; (6) creates `invite_codes` row `kind='admin_setup'`, 64-hex token, 24h expiry; (7) dispatches `buildAdminInviteEmail`+`sendEmail` when `isResendConfigured()` (non-fatal); (8) returns `{ok, inviteId, emailSent}`. `PlatformAddAsociatiePage.tsx` live branch POSTs with bearer; surfaces `err.notConfigured`/`err.forbidden`/`err.provisionFailed`; `sentNoteLiveNoEmail` when Resend not configured
- mig: `20260527000003_invite_kind.sql` adds `kind text` (`'resident_invite'|'admin_setup'`) + `revoked_at timestamptz` to `invite_codes`
- locales: 3 new keys per language (`sentNoteLiveNoEmail`, `err.notConfigured`/`forbidden`/`provisionFailed`)
- tests: 32 in `provisionAsociatie.test.ts`
- result: 141 files / 1246 tests / build green

### T169 MVP ✅ — Live superadmin account + `is_super_admin()` grant
- mig: `supabase/migrations/20260527000002_superadmin_grant.sql` — `REVOKE EXECUTE FROM PUBLIC`+`anon`; `GRANT EXECUTE TO authenticated`. Parameterized seed template as SQL line-comment INSERT with `<SUPERADMIN_EMAIL>` placeholder
- tests: tightened `mfaChannelsHook.test.ts` grant-negation regexes (`[\s\S]+?` → `[^;]+`); 6 new in `platformSuperadmin.test.ts` (GRANT/REVOKE present, seed placeholder, comment-only, `verify()` contract)
- result: 140 files / 1214 tests / build green

### T168 MVP ✅ — Live env + Resend email provider setup
- env: `.env.example` — Confirm email OFF (invite-link is proof of ownership), Site URL = resident origin, platform origin in redirect allow-list; Resend requires verified domain (recommend `vecini.online`), `RESEND_FROM_EMAIL=noreply@vecini.online`
- docs: new `RUNBOOK-MVP.md` (Supabase keys/auth/migrations/T169 superadmin; Resend account/domain/key; Netlify two sites `netlify.toml`+`netlify-platform.toml` env table; smoke steps). `DECISIONS.md` T168 block (email-as-verification, two-site deploy, `APP_URL` = resident origin)
- result: 140 files / 1208 tests / build green

### T166 P3 ✅ — Skip feature-request clear when no pending demand
- api/code: `hasAnyRequest(requests, asociatieId, featureKey)` selector in `featureRequestLogic.ts`; `clearFor` guards on it — skips redundant `set()`+`mirrorClear` delete when no demand
- tests: 3 in `featureRequestLogic.test.ts`
- result: 140 files / 1208 tests / build green

### T162 P3 ✅ — "Dismiss without enabling" on feature-request triage
- api/code: secondary "Respinge"/"Dismiss" action (ghost, `X` icon) opens confirm `Modal`; `dismissRequested(featureKey)` reuses `clearRequests`+`mirrorClear` without touching flag; records `feature.request_dismissed` audit
- locales: 4 `features.*` keys (`requestDismiss`/`requestDismissTitle`/`requestDismissBody`/`requestDismissedToast`) RO+EN; `AUDIT_ACTIONS`+`ACTION_TONE` (neutral)+`audit.action.feature.request_dismissed`
- tests: 3 in `featuresAdminDismissRequest.test.tsx`
- result: 140 files / 1205 tests / build green

### T161 P3 ✅ — Clear satisfied feature requests when module enabled via toggle
- api/code: `Switch.onChange` on `FeaturesAdminPage` calls `clearRequests(asociatieId, f.key)` on off→on only (`if (v)`), reusing `clearFor`+`mirrorClear` delete, before recording `feature.enabled` audit
- tests: 3 in `featuresAdminToggleClears.test.tsx`
- result: 139 files / 1202 tests / build green

### T131 P2 ✅ — Format-validate asociatie identity in BuildingSettingsPage
- api/code: new `src/shared/lib/identity.ts` canonical `normalizeIban`/`isValidIban`/`isValidCui`/`isValidPhone` + re-exports `isValidEmail`; `platformProvisioningLogic.ts` imports from there and re-exports. `validateBuildingIdentity(form)` in `buildingLogic.ts` (name required ≥3 chars; CUI/IBAN/phone/email optional but format-checked; IBAN normalized for storage). `BuildingSettingsPage` wires via `useMemo`+`touched`, blocks save with `building.fixErrors` toast
- locales: `building.fixErrors` + `building.err.{required,tooShort,email,cui,iban,phone}` RO+EN
- tests: 5 in `buildingLogic.test.ts`
- result: 138 files / 1199 tests / build green

### T146 P2 ✅ — Offline: capture invitee display name + seed minimal profile
- api/code: `accountSetupLogic.ts` adds `name` on `AccountForm`, `nameInvalid`, `isValidName` (trimmed `NAME_MIN_LENGTH=2`/`NAME_MAX_LENGTH=80`). `profileLogic.ts` adds `firstName(fullName)`+`seedProfile(userId, email, fullName)`. `AccountSetupPage` "Nume complet" input above email; on successful redeem/consume offline seeds `profileStore` via `saveProfile(seedProfile(...))`
- locales: `setup.name`/`nameHint`/`err_name` RO+EN
- tests: 4 `isValidName` + 4 `evaluateAccountForm` + 2 `firstName` + 2 `seedProfile`
- result: 138 files / 1194 tests / build green

### T160 P2 ✅ — Validate email format in CSV import before issuing invites
- api/code: `resolveImportBatch` in `csv.ts` imports `isValidEmail` from `@/features/auth/authLogic`; opt_in+email row with bad email → apartment still in `toCreate`, withheld from `toInvite`, row warning appended to `errors`
- tests: 4 in `csv.test.ts`
- result: 138 files / 1183 tests / build green

### T151 P2 ✅ — Admin surface to triage `feature_requests` queue
- api/code: `featureRequestLogic.ts` adds `FeatureRequestSummary`+`summarizeRequests(requests, asociatieId)`+`clearRequestsFor`+`replaceAsociatieRequests`. `featureRequestStore` gains `summaryFor`/`clearFor` (set+best-effort `mirrorClear` delete under "admin clear asociatie feature requests" policy)/`hydrateFor`. `FeaturesAdminPage` renders "Requested by residents" triage above categories; each row "Enable" flips flag + clears requests + records `feature.enabled` + toasts
- locales: `features.requestsTitle`/`requestsSubtitle`/`requestCount`/`requestEnable`/`requestEnabledToast` RO+EN
- tests: 8 in `featureRequestLogic.test.ts`
- result: 138 files / 1179 tests / build green

### T159 P2 ✅ — Extend in-app AAL2 step-up on SecurityPage to support email/Telegram OTP
- api/code: new state (`stepUpSelectedChannel`/`stepUpOtpSent`/`stepUpDemoCode`/`stepUpDemoConfirmToken`/`stepUpResendCountdown`/`stepUpResendTimerRef`); `stepUpAvailableChannels()` uses `enrolled`+`demoEnabledChannels`. Effects auto-reset on `needsStepUp` clear + auto-select single channel. `onStepUp` dispatches `verifyOtp` for email/Telegram, `verifyChallenge` for TOTP/recovery
- tests: 8 in `securityPageStepUp.test.tsx`
- result: 138 files / 1172 tests / build green

### T156 P1 ✅ — ApartmentsPage "Import lista" CSV parse + auto-invite
- api/code: `resolveImportBatch(rows, parseErrors, existingApartmentKeys)` in `csv.ts` — two-pass dedup (registry+within-CSV), Romanian row-indexed errors. Hidden `<input type="file" accept=".csv">` + "Import lista" button. `handleFileSelected` async — `file.text()` → `parseApartmentsCsv` → `resolveImportBatch` → `rowToApartment` → `createApartments` → for each `toInvite` issue via `useInviteStore.getState().issue()` (role from `proprietar`, `apartmentId` mapped by `toCreate.indexOf`, `onboardingExpiry()`) → `sendInviteEmail`+`markEmailSent`
- locales: `apartments.importList`/`importing`/`importSuccess`/`importNone`/`importErrorsTitle` RO+EN
- tests: 9 in `csv.test.ts`
- result: 137 files / 1164 tests / build green

### T116 P1 ✅ — Round-trip occupants through CSV import + apartment form
- api/code: `ApartmentImportRow` in `csv.ts` extended with `name`/`email`/`numar_persoane`/`proprietar`/`opt_in`. `parseApartmentsCsv` accepts new columns, falls back to legacy `proprietar_principal_name`, `bool()` coerces "true"/"1"/"da"/"yes". `rowToApartment(row, asociatieId): Apartment` — builds one-entry `persons` (role `proprietar`/`locator`), sets `numar_persoane` (CSV / 1 if name / 0)
- tests: 9 updated + 13 new in `csv.test.ts`
- result: 137 files / 1155 tests / build green

### T141 P1 ✅ — Migrations + Custom Access Token Hook for app-defined session elevation
- mig: `20260527000001_mfa_channels_hook.sql`:
  - `mfa_channels(id, user_id, channel, enabled_at, target_hint)` — RLS, 3 self-scoped policies (read/insert/delete `user_id = auth.uid()`), unique `(user_id, channel)`, check `('email','telegram')`
  - `mfa_otp_challenges(...code_hash, code_salt, confirm_token_hash, expires_at, consumed_at, attempts, session_id)` — RLS, zero client policies, service-role-only
  - `session_elevations(...session_id unique, channel, elevated_at, expires_at)` — RLS, zero client policies, check extends to `'recovery'`
  - `custom_access_token_hook(event jsonb)` SECURITY DEFINER `set search_path = ''`, reads `event->'claims'->>'session_id'`, merges `app_2fa_at`+`app_2fa_channel` via `jsonb_set`; `revoke from public`+`grant execute to supabase_auth_admin`
- notes: hook must be registered in Supabase dashboard (Authentication > Hooks); inert until then
- tests: 24 in `mfaChannelsHook.test.ts`
- result: 137 files / 1141 tests / build green

### T140 P1 ✅ — Demo-mode email + Telegram second-factor channels (offline)
- api/code: `mfaStore` adds `OtpChannelInfo`+`DemoOtpChallenge`; persisted `demoEnabledChannels`/`demoResendAt`/`otpThrottles`; transient `pendingDemoRole`+`demoOtpChallenges`. Actions: `loadChannels`/`enableChannel`/`disableChannel`/`requestOtp`/`verifyOtp`/`verifyConfirmToken`/`otpResendCooldownMs`/`enabledChannels`/`setPendingDemoRole`. `challengeRequired()` returns true when any delivered channel enabled. `SecurityPage` "Canale al doilea factor" Card. `LoginPage` channel picker with `pendingMfa`. New `Confirm2faPage` at `/confirma-2fa?token=&channel=`
- locales: `auth.mfa.channels.*`+`auth.mfa.confirm2fa.*`+`auth.mfa.err.*` (`expiredCode`/`noChannel`/`deliveryFailed`/`channelLocked`) RO+EN
- tests: 22 in `otpChannelStore.test.ts` + E2E happy path
- result: 136 files / 1111 tests / build green

### T126 P1 ✅ — Notifications inbox + locatar-joined notice
- api/code: `src/features/notifications/notificationLogic.ts` — `AppNotification`/`NotificationKind` (`membership.joined`/`announcement.published`/`generic`)/`NotificationPriority`; `createNotification`/`buildMembershipJoinedNotification`/`markNotificationRead`/`isUnread`/`notificationsFor`/`unreadCountFor`/`notifAgeMs`. Persisted `notificationStore` (`vecini.notifications`) with `DEMO_NOTIFICATIONS`; `emit`/`markRead`/`markAllRead`/`forUser`/`unreadCount`/`emitMembershipJoined`. `authStore.redeemInvite` calls `emitMembershipJoined` on `consumed.invite.createdBy`. `NotificationsPage` rebuilt; `AppLayout` Topbar `.iconbtn__badge` capped "9+"
- locales: 10 `notifications.*` RO+EN
- tests: 25 in `notificationLogic.test.ts` + E2E T126
- notes: live fan-out (RLS rows, email/Telegram) is T127
- result: 135 files / 1085 tests / build green

### T155 P1 ✅ — ApartmentsPage downloadable CSV template
- api/code: `generateApartmentsCsvTemplate()` in `csv.ts` (CRLF, header `scara,numar_apartament,name,email,numar_persoane,proprietar,opt_in`, 3 RO sample rows). `ApartmentsPage` `handleDownloadTemplate` via Blob + `<a download="sablon-apartamente.csv">`
- locales: `apartments.downloadTemplate` RO+EN
- tests: 5 in `csv.test.ts`
- result: 134 files / 1072 tests / build green

### T90 P1 ✅ — Invite + setup-link QR via shared QR component
- api/code: `src/shared/lib/qr.ts` — `generateQrDataUrl(value, size?)` (wraps `qrcode.toDataURL`) + `qrDownloadFilename(label)`. `src/shared/components/QrCode.tsx` — async data URL, skel shimmer, "Descarca PNG" via programmatic `<a download>`. `InvitesAdminPage` per-invite "Afiseaza QR"/"Ascunde QR" toggle
- locales: `common.downloadQr`/`qrCodeAlt` + `invites.showQr`/`hideQr` RO+EN
- tests: 6 in `qr.test.ts`
- result: 134 files / 1062 tests / build green

### T154 P1 ✅ — Onboarding: admin setup link → OnboardingWizard → Apartamente
- api/code: `postSetupRoute(kind)` returns `'/onboarding'` for `'setup'`, `'/app'` for `'invite'`. `AccountSetupPage.tsx` calls it. `OnboardingWizard.tsx` reduced 5→3 steps (`profile`/`features`/`branding`); CSV-import + bulk-invite removed; finish navigates `/app/admin/apartamente`
- locales: `onboarding.finishHint` updated RO+EN
- tests: 2 in `accountSetupLogic.test.ts`
- result: 133 files / 1056 tests / build green

### T152 P1 ✅ — Superadmin "Add Asociatie" dedicated page
- api/code: new `PlatformAddAsociatiePage.tsx` at `/consola/asociatii/adauga` — two fields (admin name+email), 400ms demo delay, success banner. `validateAdminInvite`/`blankAdminInvite` in `platformProvisioningLogic.ts`. `PendingAdminInvite`+`pendingInvites: PendingAdminInvite[]`+`inviteAdmin(name, email)`+`markAdminEmailSent(id)` in `platformAsociatiiStore.ts` (persist v4 migration). `PlatformAsociatiiPage.tsx` modals removed; "Invitatii in asteptare" section
- locales: `platform.addAsociatie.*` RO+EN; updates to `provisionCta`/`pendingInvitesTitle`/`pendingInvitesEmpty`/`invitedOn`
- tests: 7 new
- result: 133 files / 1054 tests / build green

### T153 P1 ✅ — Admin invite email: bilingual HTML template + QR
- api/code: `buildAdminInviteEmail` in `inviteEmail.ts` — branded header, bilingual admin-role intro, rounded-pill CTA, optional QR `<img src="data:image/png;base64,...">` 200x200, fallback link, 24h expiry+ignore footer. `invite-email.ts` adds `kind?: 'admin_setup'|'resident_invite'`; for admin calls `QRCode.toDataURL(link, {width:200, margin:2})` (non-fatal). `qrcode` added to deps, `@types/qrcode` to devDeps
- tests: 8 in `inviteEmail.test.ts`
- result: 133 files / 1047 tests / build green

### T148 P1 ✅ — Authorize `invite-email` function caller (no open relay)
- api/code: `netlify/functions/_shared/supabaseAdmin.ts` (service-role, `verifyBearerToken`/`isAdminOfAsociatie`/`getInviteById`/`getAsociatieName`) + `_shared/rateLimiter.ts` (pure `checkSlidingWindow` + production `checkInviteRateLimit`). Function requires `Authorization: Bearer`; resolves caller via `auth.getUser()`; looks up invite by `inviteId`; rate limits 20/10min per `userId:asociatieId`; asserts admin/presedinte of invite's asociatie; builds link from `APP_URL`+DB token. `inviteEmailApi.ts` live sends `{inviteId, locale}` with bearer
- mig: `20260526000005_invite_token.sql` adds `token` column (partial unique index) to `invite_codes`
- tests: schema guard + 5 sliding-window in `inviteEmailAuth.test.ts`
- result: 133 files / 1039 tests / build green

### T157 P1 ✅ — Remove invite-code UI from Admin Invites + Account Setup
- api/code: `InvitesAdminPage` removes `<code>` chip + "Copiaza codul" button (keeps "Copiaza linkul"/"Trimite pe email"/"Revoca"). `AccountSetupPage` removes manual code-entry; no `?token=` shows bilingual "Link invalid" error state. `code` state + fallback removed
- locales: `setup.noTokenTitle`/`noTokenBody` RO+EN; `invites.issued`/`autoIssued` strip `{{code}}`
- result: 132 files / 1031 tests / build green

### T150 P2 ✅ — Locked-feature "ask admin to enable" request channel
- api/code: `src/shared/features/featureRequestLogic.ts` — `FeatureRequest`/`newFeatureRequest`/`hasRequested`/`addRequest`. Persisted `featureRequestStore` (`request`/`has`) with best-effort `feature_requests` mirror. `src/app/LockedFeatureNotice.tsx` replaces bare `EmptyState` in `FeatureRouteGuard`; serif title + chip + lock medallion + "Cere activarea" CTA + confirmed state
- mig: `20260526000004_feature_requests.sql` — RLS scoped by `asociatie_id`; resident reads/files/withdraws own (`requested_by = auth.uid()`+`is_member`); admin/president read+clear; no update policy; `unique (asociatie_id, feature_key, requested_by)`
- locales: `common.featureDisabledHint`/`requestFeature`/`requestFeatureConfirm`/`requestFeatureToast`/`requestFeatureAlreadyToast`; reworded delete confirm bilingual
- tests: new `featureRequestLogic.test.ts` + `featureRequestsRls.test.ts`
- result: 132 files / 1031 tests / build green

### T147 P1 ✅ — Invitation email: bilingual templates + send function
- api/code: `src/shared/lib/inviteEmail.ts` — `buildInviteEmail`+`resolveEmailLocale`; bilingual subject/plain/HTML, inline-styled CTA, HTML-escaped values. `InviteCode` adds `emailSentAt`+`emailDeliveredAt` (epoch ms, null default); `markInviteEmailSent`+`canEmailInvite`. `inviteStore.markEmailSent(id, at?)`. `src/features/invites/inviteEmailApi.ts` — `sendInviteEmail` offline simulates, live POSTs to `netlify/functions/invite-email.ts` which uses `_shared/resend.ts` `sendEmail` over `https://api.resend.com/emails`. `ApartmentFormPage.onSendByEmail` + `InvitesAdminPage` "Trimite/Retrimite pe email" action
- mig: `20260526000003_invite_email_delivery.sql` adds `invite_email_sent_at`+`invite_email_delivered_at`
- locales: `apartments.emailSent`/`emailFailed`; `invites.sendEmail`/`resendEmail`/`emailSent`/`emailSentOn`/`emailFailed`; new audit action `invite.email_sent`
- tests: new `inviteEmail.test.ts` + extended `inviteLogic.test.ts`
- result: 130 files / 1019 tests / build green

### T124 P1 ✅ — Account-creation-on-redemption "set password twice" landing
- api/code: new shared `AccountSetupPage.tsx` at `/configurare-cont` replacing deleted `JoinAsociatiePage`. New `accountSetupLogic.ts` — `resolveOnboarding(value, invites, provisions, now)`/`setupProvisionStatus`/`evaluateAccountForm`. `inviteCode.ts` `ONBOARDING_REDEEM_PATH` moves `/onboarding/alatura` → `/configurare-cont`; legacy route query-preserving `<Navigate>` redirect. `authStore.redeemInvite(value)` (token-or-code, replay-safe, establishes demo session)+`activateProvisionedAdmin`. `platformAsociatiiStore` adds `AdminProvisionRecord.redeemedAt`+replay-safe `consumeSetup(value)`+`setupProvisionLinks`; persist v2→v3 migrate. `PasswordStrengthMeter` extracted from `LoginPage` to `src/features/auth/PasswordStrengthMeter.tsx`
- locales: full bilingual `setup.*` RO+EN
- tests: new `accountSetupLogic.test.ts`+`accountRedemption.test.ts`; smoke E2E T124 happy path
- result: 131 files / 1007 tests / build green

### T139 P1 ✅ — Pure OTP-channel logic + `app2faSatisfied` enforcement axis
- api/code: new `src/features/auth/otpChannelLogic.ts` — `generateNumericOtp` (rejection-sampled, no modulo bias — bytes >=250 discarded), `normalizeOtp`/`isValidOtpFormat`, `generateOtpSalt`+salted `hashOtp`+constant-time `timingSafeEqualHex`+`verifyOtpHash`, `generateConfirmToken` (256-bit base64url)+`hashConfirmToken`, `otpExpiresAt`/`otpChallengeExpired` (10min TTL)+`resendCooldownRemainingMs` (60s), `MfaChannel`+`DELIVERED_OTP_CHANNELS`+`isDeliveredChannel`, `maskEmail`/`maskTelegram`. `mfaLogic.ts` `mfaEnforcementRedirect` gains optional `app2faSatisfied` axis; `MfaErrorKey`+`mfaErrorKey` gain `expiredCode`/`noChannel`/`deliveryFailed`/`channelLocked`
- tests: new `otpChannelLogic.test.ts` + extended `mfaLogic.test.ts`
- result: 127 files / 983 tests / build green

### T137 P0 ✅ — Close within-tenant privacy leak on `anonymous_messages` (F05)
- mig: `20260526000001_anonymous_message_privacy.sql` drops `"members read"`+`"comitet write"` on `anonymous_messages` (keeps self-scoped `owner manage`). Comitet works through `anonymous_messages_for_comitet(asociatie)` (returns inbox WITHOUT sender column) and `set_anonymous_message_status(id, status)` (flips only status), both SECURITY DEFINER `set search_path = public` gated on `has_role(..., array['admin','presedinte','comitet'])`
- tests: new `anonymousMessagePrivacyRls.test.ts` (8 assertions)
- docs: SECURITY.md+DECISIONS.md updated
- result: 125 files / 960 tests / build green

### T133 P1 ✅ — Resident-app base URL for onboarding links built in platform console
- api/code: `residentAppUrl` on `ClientEnv` resolves `VITE_RESIDENT_APP_URL`→`VITE_APP_URL`→`window.location.origin` via pure exported `resolveResidentAppUrl(residentUrl, appUrl)`. `VITE_RESIDENT_APP_URL` in `src/vite-env.d.ts`+`.env.example`. 4 setup-link builders in `PlatformAsociatiiPage.tsx` use `env.residentAppUrl`. `InvitesAdminPage`'s `buildInviteLink(invite, env.appUrl)` left on `appUrl` (runs on resident origin)
- tests: 4 in `residentAppUrl.test.ts`
- result: 126 files / 964 tests / build green

### T134 P1 ✅ — Route platform superadmin to console, never through asociatie onboarding
- api/code: server-authoritative `isPlatformSuperAdmin` on `authStore` — `hydrate()` resolves `supabase.rpc('is_super_admin')`; `enterDemo(role)` sets from `role === 'super_admin'`; cleared on sign-out+`SIGNED_OUT`. `resolveAsociatieRoute({isPlatformSuperAdmin, hasActiveMembership}) → 'superadmin'|'onboarding'|'app'`+`SUPERADMIN_HOME_PATH` in `hydrationLogic.ts`. `RequireAsociatie`/`AppHome`/`RequireSuperAdmin`/`AppLayout` use the flag. `demoTenantContext('super_admin')` returns no membership
- tests: 5 cases in `hydrationLogic.test.ts` + `demoTenant.test.ts` updated
- result: 122 files / 934 tests / build green

### T123 P1 ✅ — Secure tokenized onboarding links (opaque + 24h, code fallback)
- api/code: `inviteCode.ts` adds `generateInviteToken` (256-bit CSPRNG 64 lower-hex)+`isValidInviteToken`/`normalizeInviteToken`+`ONBOARDING_REDEEM_PATH` (currently `/onboarding/alatura`)+`buildOnboardingLink(baseUrl, token)`. `inviteLogic.ts` adds `token` on `InviteCode` (minted in `createInvite`)+`'24h'` at top of `EXPIRY_PRESETS_MS`+`ONBOARDING_LINK_TTL_MS`+`onboardingExpiry(now)`+`findByToken`+`buildInviteLink`. `inviteStore.ts` adds `consumeByToken(token, userId)` via `consumeMatched`. `platformProvisioningLogic.ts` `ProvisionedAdmin` adds `setupToken`+24h `expiresAt`; `buildSetupLink`. Store persist v2 with migrate. UI: superadmin provisioning card+modal + `InvitesAdminPage` shows deep link+copy
- locales: `invites.copyLink`/`linkCopied`/`expiry_24h`, `platform.asociatii.setupLinkLabel`/`linkExpiry`/`copyLink`/`linkCopied`, reworded `resultBody`
- tests: extended `inviteCode.test.ts`/`inviteLogic.test.ts`/`platformProvisioningLogic.test.ts` + new `inviteStore.test.ts`
- result: 123 files / 928 tests / build green

### T122 P1 ✅ — Capture full asociatie identity at superadmin provisioning
- api/code: `Asociatie` adds `iban`/`contact_phone`/`contact_email`. `ProvisionInputDraft`/`ProvisionInput` add `address`/`cui`/`registrationNumber`/`iban`/`contactPhone`/`contactEmail` (optional but format-checked). New exported `normalizeIban`/`isValidIban` (15-34 chars)+`isValidCui` (optional RO prefix+2-10 digits)+`isValidPhone` (7-15 digits). `PlatformAsociatiieSummary` gains identity; demo carries RO sample values. Provisioning form + each card identity `<dl>`. `BuildingSettingsPage` adds IBAN+contact phone/email inputs
- mig: `20260525000003_asociatie_identity.sql` `add column if not exists`
- locales: `platform.asociatii.fields.*`/`err.*`, `building.iban`/`contactPhone`/`contactEmail` RO+EN
- tests: extended `platformProvisioningLogic.test.ts`
- result: 121 files / 910 tests / build green

### T94 P2 ✅ — Superadmin console: asociatii + admin provisioning (offline path)
- api/code: new pure `platformProvisioningLogic.ts` — `validateProvisionInput`/`provisionAsociatie`/`newPlatformAsociatieId`/`sortAsociatii`/`daysSince`/`isDormant` (30d window) — 12 assertions. Persisted `platformAsociatiiStore` (`vecini.platform.asociatii`) seeded from `DEMO_PLATFORM_ASOCIATII`; `provision(input)` writes 2 audit entries (`asociatie.provisioned`+`admin.provisioned`) via `useAuditStore.record`. `AUDIT_ACTIONS`+`AUDIT_ENTITIES`+`ACTION_TONE`+`audit.action.*`/`audit.entity.*` extended. New `PlatformAsociatiiPage` at `/consola/asociatii`; sidebar entry `ready`
- locales: full bilingual RO+EN
- tests: 12 new
- result: 119 files / 883 tests / build green

### T93 P2 ✅ — Separate superadmin app shell (own build + subdomain)
- api/code: `src/platform/*` front-end as second Vite page (`platform.html` → `src/platform/main.tsx`); `vite.config.ts` `rollupOptions.input` adds both. `npm run build` emits `dist/index.html`+`dist/platform.html`+distinct `platform-*.js` chunk. Shares Supabase client/types/i18n/theme/retry. `PlatformProviders`/`platformRouter`/`PlatformLayout`/`PlatformHomePage`. Pure `resolvePlatformAccess` (`platformAuthLogic.ts`); `RequirePlatformAdmin`; `platformAuthStore.verify()` calls `supabase.rpc('is_super_admin')`
- env: new `netlify-platform.toml` — separate site, `/* → /platform.html`, tightest CSP (self+Supabase only, COEP `require-corp`, `X-Robots-Tag: noindex`)
- tests: 10 in `platformAuthLogic.test.ts`
- result: 118 files / 871 tests / build green

### T114 P1 ✅ — Admin apartment registry (add/configure/edit) + building settings
- api/code: `Apartment` gains `ApartmentPerson`+`persons`. New `src/features/admin/` — pure `apartmentsLogic.ts` (zod `ApartmentInput`, `blankGridRows`/`newApartment`/`applyApartmentEdit`/`newPerson`/`sortApartments`); persisted `apartmentsStore` with `useAsociatieApartments`/`useApartment`; dual-mode `apartmentsApi.ts`; `asociatieStore` (`useCurrentAsociatie`/`update`). Pages: rewritten `ApartmentsPage`, `ApartmentsBulkAddPage`, `ApartmentEditPage`, `BuildingSettingsPage` at `/app/admin/cladire`; `chrome.building` nav. Audit `apartment.created/updated/deleted`+`building.updated`
- mig: `20260525000001_apartment_persons.sql` `persons jsonb default '[]'`
- tests: `apartmentsAdminLogic.test.ts` (12) + `apartmentsStore.test.ts` (6)
- result: 115 files / 834 tests / build green

### T112 P2 ✅ — Re-gated enrolled-but-AAL1 session completes step-up in-app
- api/code: `SecurityPage` effect resolves `challengeRequired()` for live enrolled session; step-up `Card` at top renders TOTP/recovery `Input` wired to `verifyChallenge`, reusing T31 throttle. On success clears, toasts `stepUpDone`, navigates `/app`. `useMfaEnforcement` re-resolves AAL per navigation (effect keyed on `pathname`) — only for live enrolled privileged role
- locales: `auth.mfa.stepUp{Title,Body,Done}` RO+EN
- tests: T112 block in `mfaEnforcement.test.tsx` (+2 → 20)
- result: 113 files / 816 tests / build green

### T102 P2 ✅ — Re-gate in-app shell on AAL2 (challenge satisfied), not enrollment
- api/code: pure `mfaEnforcementRedirect` adds optional `aalSatisfied` axis; security page always reachable first, un-enrolled steered to enroll, enrolled with `aalSatisfied === false` steered to security page. Axis opt-in/back-compat. `useMfaEnforcement` reads `mfaStore.challengeRequired()` into resolved `aalSatisfied` (passes `aalSatisfied ?? true`)
- tests: +6 → 18 in `mfaEnforcement.test.tsx`; `seedMfa` stubs `challengeRequired`; supabase mock adds `getAuthenticatorAssuranceLevel`
- result: 113 files / 814 tests / build green

### T91 P1 ✅ — Platform superadmin identity + cross-asociatie RLS foundation
- mig: `20260524000002_platform_superadmin.sql`:
  - `platform_admins (user_id PK → users, granted_at, granted_by, note)` — no `asociatie_id` (platform-wide), RLS, single SELECT `"super admin read platform admins"` gated on `is_super_admin()`, no other policy (service-role-only writes)
  - `is_super_admin()` mirrors `is_member`/`has_role` — `returns boolean language sql stable security definer set search_path = public`; no asociatie arg
  - Additive permissive SELECT policies gated on `is_super_admin()` on `asociatii`/`memberships`/`audit_log`; read-only client-side, no cross-tenant write
- tests: 9 in `platformSuperadmin.test.ts`
- result: 113 files / 808 tests / build green

### T24 P1 ✅ — Consumer-rights surface (ANPC / SOL)
- api/code: `consumerRights(lang)` `LegalDoc` in `legalContent.ts` — pre-contractual info OUG 34/2014, 14-day withdrawal, refunds, ANPC contact, ec.europa.eu/consumers/odr, SAL OG 38/2015. `ConsumerRightsPage` reusing `LegalDocPage` chrome at `/protectia-consumatorului`. Wired into Terms doc + app footer + LoginPage footer + PrivacySettingsPage card
- locales: `consent.consumerLink` RO+EN
- tests: 7 in `consumerRights.test.ts`
- result: 112 files / 799 tests / build green

### T74 P2 ✅ — Declare processing profile on registry (single source for ROPA)
- api/code: moved `RopaDataCategory`/`ProcessingProfile`/`RECIP_*` constants/`CATEGORY_DEFAULTS`/optional `FeatureDef.processing?: Partial<ProcessingProfile>` onto `registry.ts`. 11 per-feature overrides inline (F05 anon, F10/F12 legal, F20/F44 financial-contract, F28 location, F36/F37/F49/F63/F64 consent). `ropaLogic` `profileFor(feature)` shallow-merges; re-exports `CATEGORY_DEFAULTS`/types
- tests: +3 guard assertions in `ropaLogic.test.ts`
- result: 111 files / 792 tests / build green

### T23 P1 ✅ — Minors' consent guardrails (Legea 190/2018)
- api/code: new pure `src/shared/lib/minorsGuard.ts` — `KIDS_AGE_RANGE_FIELDS`/`KIDS_EVENT_FIELDS` allowlists, `minorIdentityFields` over `MINOR_IDENTITY_FIELD_PATTERNS`, `unexpectedFields`, `assertAggregateOnly(record, allowed, context)` throws `MinorIdentityError`. F64 store `registerKids`/`addEvent` calls it on every write
- docs: privacy policy "Minori"/"Children" sections cite GDPR art. 8 + Legea 190/2018 art. 8; new `MINORS_PRIVACY.md`
- tests: 14 in `minorsGuard.test.ts` (incl. structural lock on domain.ts + schema lock on `20260121000002_features.sql`)
- result: 111 files / 789 tests / build green

### T12 P1 ✅ — F67 Acasa personalizabil
- api/code: pure `homeLayoutLogic` (`src/features/home/`) — `HomeCard`/`LayoutByKey`; `homeCardCatalog(flags)` (registry order, routed, enabled); `defaultLayout(flags)` (first `DEFAULT_VISIBLE_COUNT=6` shown compact); `reconcileLayout(saved, flags)` (keep/drop/append); `toggleCardVisible`/`cycleCardSize`/`moveCard`/`moveCardTo`/`visibleCards`/`isDefaultLayout`/`layoutForKey`/`layoutStorageKey`. Persisted `homeLayoutStore` (`vecini.home`) keyed `${residentId}::${asociatieId}` + `useHomeLayoutKey()`. Rewrote `HomePage` with pencil-edit/show-hide/reorder/size/native DnD/Resetează
- mig: `20260524000001_home_layouts.sql` — owner-only `"self manage own home layout"` for-all with `resident_user_id = auth.uid() and is_member(asociatie_id)`, `unique (resident_user_id, asociatie_id)`
- locales: `home.*` RO+EN
- tests: 12 in `homeLayoutLogic.test.ts` + 3 in `homeLayoutSchema.test.ts` + E2E
- result: 110 files / 775 tests / build green

### T11 P1 ✅ — F66 Profil complet
- api/code: `profileLogic` adds avatar crop (`squareCropRect`/`avatarThumbDim` cap `AVATAR_MAX_DIM=256`/`AVATAR_MAX_BYTES=5MB`/`isAcceptedImageType`), per-type validators (email/phone/RO-plate/date/number/link), `completeness` 0-100 over 10 standard fields, custom-field ops. Rewritten `ProfilePage` at `/app/profil` — avatar (canvas crop or initials), standard-fields card (full/display name, phone, email, apartament Select, scara, etaj, car plate, address, DOB, language), emergency-contact, custom-fields with type catalog + visibility toggle + reorder + delete + add modal, account card
- mig: `20260523000001_profile_complete.sql` extends `users` (display_name/scara/etaj/car_plate/address/date_of_birth/emergency_contact jsonb) + adds owner-RLS `profile_custom_fields` table (field_type+visibility checks)
- locales: `profile.*` RO+EN
- tests: `profileLogic.test.ts` (20) + `profileSchema.test.ts` (5) + 1 E2E
- result: 108 files / 760 tests / build green

### T30 P1 ✅ — MFA enforcement E2E for live privileged roles
- api/code: extracted pure `mfaEnforcementRedirect(input)` to `mfaLogic` + `MFA_SECURITY_PATH`+`MfaEnforcementInput`; returns steer path or null. Hook moved to `src/app/useMfaEnforcement.ts`. `AppLayout` shed unused imports
- tests: 12 in `mfaEnforcement.test.tsx` (first `@testing-library/react` render test) — pure-decision matrix + live routing harness
- result: 106 files / 735 tests / build green

### T77 P2 ✅ — Aggregate data-subject export across all subject's asociatii
- api/code: `ticketsForAsociatii(byAsociatie, asociatieIds)` in `ticketLogic` + `threadsForAsociatii` in `discussionLogic`. `subjectAsociatieIds(memberships, currentAsociatieId)` in `gdprLogic`. `MyDataPage` `buildExport` resolves subject asociatie ids, reads `useTicketsStore.getState().byAsociatie`/`useDiscussionStore.getState().byAsociatie` fresh
- tests: +3 `subjectAsociatieIds` + +1 each in `ticketLogic.test.ts`/`discussionLogic.test.ts`
- result: 105 files / 723 tests / build green

### T09 P1 ✅ — Audit log surface
- api/code: new pure `auditLogic` (`src/features/audit/`) — hash-chained `AuditEntry` (seq, prev_hash, hash); `newEntry`/`appendEntry`/`verifyChain`/`filterEntries`/`sortBySeqDesc`/`pruneExpired` (`AUDIT_RETENTION_DAYS=730`)/`auditToJson`/`auditToCsv`/`AUDIT_ACTIONS`/`AUDIT_ENTITIES`/`buildDemoAuditChain`. Persisted `auditStore` (`vecini.audit`) keyed by asociatie; `record(input)` appends + mirrors to `audit_log`; `useAsociatieAudit()`+`recordAudit(fields)`. Admin `AuditLogPage` at `/app/admin/jurnal` with integrity badge + filters + JSON/CSV. Emitters wired in: `FeaturesAdminPage`/`InvitesAdminPage`/`DsrAdminPage`/`BreachAdminPage`/`AnnouncementsPage`
- mig: `20260522000021_audit_log.sql` — `audit_log` table, indexes, RLS admin/presedinte read + member self-append, no update/delete
- locales: `audit.*`+`chrome.auditLog` RO+EN
- tests: 14 in `auditLogic.test.ts` + E2E
- result: 105 files / 718 tests / build green

### T07 P1 ✅ — Resilience & error handling
- api/code:
  - `src/shared/lib/errorReporting.ts` — pure, dependency-free, `scrubMessage` redacts emails/JWTs/Bearer/secret params/digit runs; `normalizeError`/`makeRef`/`buildReport`; pluggable sink via `setErrorSink`; `installGlobalErrorHandlers()` in `main.tsx`
  - `src/shared/components/ErrorBoundary.tsx` — class boundary reports through hook; bilingual recovery with support ref + retry/home; resets on nav via `resetKeys`. Placed at app shell + around each route's `Outlet` keyed by `pathname`
  - `ErrorState` mirrors `EmptyState` layout, `role="alert"`, danger icon + optional ref. CSS `.empty__icon--danger`/`.error-state__*` in `primitives.css`
  - `src/shared/lib/retry.ts` — pure `backoffDelay`/`statusOf`/`isRetryableError`/`shouldRetry`. Wired into react-query `QueryClient` `retry`+`retryDelay`
- locales: `common.errorTitle`/`errorBody`/`errorRef`/`retry` RO+EN
- tests: `errorReporting.test.ts` (12) + `retry.test.ts` (11)
- result: 104 files / 704 tests / build green

### T31 P1 ✅ — MFA challenge attempt throttling
- api/code: reused T03 `loginThrottle`. `mfaStore` adds persisted `challengeThrottle: ThrottleState` + `challengeLockMs()`. `verifyChallenge` refuses while locked → `{error:'locked', lockedMs}`; runs verification; on success clears throttle; on wrong-credential only (`mfaErrorKey(error) === 'invalidCode'`) registers failure. Return type → `ChallengeResult`. `LoginPage.submitChallenge` checks `lockedMs` first, shows `auth.mfaLockout` toast. Two new audit events `mfaChallengeFailed`/`mfaChallengeLocked` in `AUTH_EVENT_TYPES`+`auth_audit_events`
- tests: 5 in `mfaChallengeThrottle.test.ts`
- result: 102 files / 681 tests / build green

### T38 P1 ✅ — Anonymous-survey response privacy within tenant
- mig: `20260522000020_response_privacy.sql` drops `"members read"`+`"comitet write"` on `survey_responses`/`votes`/`priority_rankings`. Replaces with:
  - `survey_responses`: `"self read own survey response"` + `"comitet read named survey responses"` gated on `surveys.anonymous = false` AND privileged role
  - `votes`: `"self read own vote"` + existing `"self cast vote"`; no update/delete (ballot secrecy by default)
  - `priority_rankings`: single `"self manage priority ranking"` for-all scoped through `apartment_residents`
  - Added security-definer fixed-search_path member-gated functions `survey_tally(survey_id)`/`poll_tally(poll_id)`/`priority_ranking_turnout(asociatie_id)` — counts only, no identity column in returns
- tests: 13 in `responsePrivacyRls.test.ts`
- result: 101 files / 676 tests / build green

### T35 P1 ✅ — Automated RLS-coverage guard
- tests: `tests/unit/rlsCoverage.test.ts` (5 assertions) parses every migration (line-comments stripped), collects every `create table [if not exists] NAME` in public schema, asserts each of **124 tables** is RLS-enabled. Two enable paths: `alter table X enable row level security` OR `select apply_standard_rls('X')`. Macros `apply_owner_rls`/`reapply_owner_rls`/`apply_member_insert_rls`/`apply_governance_owner_rls` only ADD policy. 2nd assertion: every owner/member-insert/governance policy target (27) RLS-enabled. 3rd: pins assumption by parsing macro bodies. Current: 124 tables, 30 enabled directly + 94 via `apply_standard_rls`
- result: 100 files / 663 tests / build green

### T73 P1 ✅ — Broaden data-subject export to all personal-data stores
- api/code: refactored `gdprLogic` around single source `SUBJECT_SECTIONS` array — `select`+`action`+`reasonKey`+`periodKey`+`basisKey` per entry. Export/ERASURE_PLAN/RETENTION_POLICY derived. Broadened 6→26 sections: discussions/adminchat/anonymous/petitions/thankyous/directory/birthdays/carpool/sitters/barter/pets/bikes/lending/feedback (non-anon)/kids age-ranges/kids-events/laundry/moving/venue bookings/visitors. New `EXPORT_SECTION_KEYS` export. `MyDataPage` wires 20 additional stores
- locales: 20 new `gdpr.section.*` + 5 `gdpr.reason.*` + 2 `gdpr.retain.*` + 1 `gdpr.basis.*` RO+EN
- tests: 22 in `gdprLogic.test.ts` (exact `EXPORT_SECTION_KEYS` set lock)
- result: 99 files / 658 tests / build green

### T22 P0 ✅ — Personal-data breach procedure (art. 33/34)
- api/code: pure `breachLogic` — `classifyRisk` (sensitivity/scale/identifiability/neutralisation → low/risk/high), `requiresAuthorityNotification`/`requiresSubjectNotification`, 72h `authorityDeadline`+`deadlineState`, detectat→evaluat→notificat→inchis lifecycle, `newBreach`, `breachLogToCsv`. `breachContent` generates art. 33 ANSPDCP notification + art. 34 resident notice (bilingual plain-text, signature-ready). Persisted append-only `breachStore` mirrors `data_breaches`. Admin `BreachAdminPage` at `/app/admin/incidente-date`
- mig: `20260522000019_data_breaches.sql` — controller-role manage, no delete policy, risk/status check constraints
- docs: new `BREACH_PROCEDURE.md`; bilingual `breach.*` RO+EN
- tests: 29 in `breachLogic.test.ts` + E2E
- result: 99 files / 651 tests / build green

### T21 P0 ✅ — DPA + records of processing (art. 28 & 30)
- api/code: pure `ropaLogic` — `ProcessingProfile`+`FeatureCategory` defaults sharpened by per-feature overrides (financial F12/F20/F44, opt-in F36/F37/F49/F63/F64, anon F05); always-present 4 platform activities (account/auth, security log, consent, DSR). `buildRopa(enabledKeys)`/`profileFor`/`ropaToCsv`/`ropaToJson`. New `dpaContent.ts` bilingual DPA art. 28 + `dpaToText`. Admin `ProcessingRecordsPage` at `/app/admin/prelucrare-date`
- locales: `ropa.*`/`dpa.*` + `chrome.processing` + `consent.processingLink` RO+EN
- tests: 11 in `ropaLogic.test.ts`
- result: 98 files / 622 tests / build green

### T06 P0 ✅ — GDPR data-subject rights
- api/code: pure `gdprLogic` (`collectPersonalData`/`toExportJson`/`toExportCsv`/`ERASURE_PLAN`/`RETENTION_POLICY`/`ANONYMIZED_NAME`/`DataSubjectRequest` model with `makeRequest`/`actionRequest`/`hasOpenRequest`/`pendingCount`/`sortRequests`). Resident `MyDataPage` at `/app/datele-mele`. Admin `DsrAdminPage` at `/app/admin/cereri-date`. Persisted `gdprStore` mirrors `data_subject_requests`
- mig: `20260522000018_data_subject_requests.sql` append/no-delete RLS (self files+reads own; admin/president reads+actions)
- docs: new `DATA_RETENTION.md`; `gdpr.*` RO+EN
- tests: 13 + E2E
- result: 97 files / 612 tests / build green

### T60 P2 ✅ — Extend `invite_codes` schema with `role` + `single_use`
- mig: `20260522000017_invite_codes_role_single_use.sql` `add column if not exists` `role text not null default 'proprietar'`+`single_use boolean not null default true`. `invite_codes_role_check` constraint (drop-if-exists then re-add) restricts to `INVITABLE_ROLES`: `proprietar`/`chirias`/`comitet`/`cenzor`/`presedinte`
- tests: 4 in `inviteCodesSchema.test.ts`
- result: 96 files / 599 tests / build green

### T69 P2 ✅ — Scope owner-delete least-privilege on governance tables
- mig: `20260522000016_governance_owner_least_privilege.sql` adds `apply_governance_owner_rls(tbl, owner_col, child_tbl, child_fk)` replacing `"owner manage"` (for all) on `budget_proposals`→`budget_votes`, `ideas`→`idea_votes`, `petitions`→`petition_signatures`. Splits into `"owner insert"`+`"owner update unlocked"`+`"owner delete unlocked"` with `not exists` lock on child vote/signature row. Comitet `"comitet write"` (for all) + member `"members read"` untouched
- tests: 6 in `governanceOwnerLeastPrivilege.test.ts`
- result: 95 files / 595 tests / build green

### T71 P2 ✅ — Tenant-consistency for apartment refs from junction tables
- mig: `20260522000015_apartment_ref_tenant_consistency.sql` — `security definer` fixed-`search_path` trigger `check_apartment_parent_tenant` (reads NEW via `to_jsonb`, raises `check_violation` on parent.asociatie_id ≠ apartment.asociatie_id; NULL apartment ref allowed) + idempotent `add_apartment_tenant_trigger(child, apt_col, parent, parent_fk_col)`. Applied to 6 refs: `aga_votes.apartment_id`→`agas`, `aga_attendees.apartment_id`+`proxy_for_apartment_id`→`agas`, `budget_votes.apartment_id`→`budget_proposals`, `idea_votes.apartment_id`→`ideas`, `petition_signatures.apartment_id`→`petitions`. `apartment_residents` excluded
- tests: 8 in `apartmentRefTenantConsistency.test.ts` (derives qualifying set from schema)
- result: 94 files / 589 tests / build green

### T70 P1 ✅ — Fix `aga_votes` RLS referencing non-existent `asociatie_id` column
- mig: edits `20260121000002_features.sql` (no applied history; prior migration aborts so no later additive could run). Removes broken `select apply_standard_rls('aga_votes')`. Adds explicit RLS: `enable row level security` + `"members read votes"` (parent `is_member(a.asociatie_id)` through `agas`) + `"comitet write votes"` (for all). Combined with batch5 `"self cast aga vote"`
- tests: 4 in `rlsHelperColumns.test.ts` (parses every `create table` + every `apply_*` call, asserts target table declares referenced columns)
- result: 93 files / 581 tests / build green

### T46 P1 ✅ — Parent-child tenant-consistency guards
- mig: `20260522000014_tenant_consistency_fk.sql` — `add_tenant_fk(child, fk_col, parent)` helper. Applied to all **43** parent-child references where both carry direct `asociatie_id`. Composite FK: parent gains `unique (id, asociatie_id)`; child FK `(fk_col, asociatie_id) -> parent (id, asociatie_id)`. Default `on delete no action`. `MATCH SIMPLE` for NULL fk_col. Idempotent via `pg_constraint`
- tests: 8 in `tenantConsistency.test.ts` (derives qualifying pairs from migration SQL)
- result: 92 files / 577 tests / build green

### T45 P0 ✅ — Harden owner-scoped RLS to also require membership
- mig: `20260522000013_owner_rls_membership.sql` redefines `apply_owner_rls` to require `%I = auth.uid() and is_member(asociatie_id)` in BOTH using+with check. New idempotent `reapply_owner_rls(tbl, owner_col)` drops+recreates `"owner manage"`. Re-applied to all 25 owner-scoped tables. `apply_member_insert_rls` already required `is_member(asociatie_id)`
- tests: 6 in `ownerRlsMembership.test.ts`
- result: 91 files / 569 tests / build green

### T54 P1 ✅ — Single green E2E smoke for MVP loop (demo)
- e2e: `T54: the full MVP loop works end-to-end in demo mode` in `tests/e2e/smoke.spec.ts` walks: (1) demo entry lands `/app`; (2) active asociatie+role asserted; (3) admin issues invite at `/app/admin/invitatii`, redeem at `/onboarding/alatura`; (4) `/app/anunturi` header visible; (5) admin publishes announcement, resident reads on page+home widget; (6) resident starts discussion+reply; (7) submits sesizare; (8) toggles F01 off in `/app/admin/functionalitati`, asserts direct URL renders "not enabled" notice. Runs in CI (T08)
- result: 90 files / 563 tests / build green

### T50 P1 ✅ — Telegram mock/linking path with `/start CODE`
- api/code: dependency-free `src/shared/lib/telegramStart.ts` — `parseStartCommand` (tolerates `/start@botname`/whitespace/case)/`normalizeStartPayload`/`payloadLooksLikeCode`/`replyForStart`/`replyChecking`. New `src/features/telegram/telegramLinkLogic.ts` — `TelegramLinkCode`+`createLinkCode`/`validateLinkCode` (ok/expired/used/unknown)/`findLinkByCode`/`consumeLinkCode`; `buildLinkFromLinkCode`/`buildLinkFromInvite`; `resolveTelegramStart` resolver. Persisted `telegramLinkStore` (`vecini.telegram`) — `issueLinkCode`/`linkByPayload` (atomic replay-safe)/`linkFor`/`unlink`. Webhook `/start` uses parser+shared replies
- tests: `telegramStart.test.ts` (11) + `telegramLinkLogic.test.ts` (17) + `telegramLinkStore.test.ts` (8)
- result: 90 files / 563 tests / build green

### T49 P1 ✅ — Sesizari/reclamatii (F17) vertical slice scoped to active asociatie
- api/code: `ticketLogic` adds `TicketsByAsociatie`/`seedTickets`/`ticketsForAsociatie` (frozen empty default)/`NewTicketInput`/`newTicket` (SLA from severity)/`addTicketIn`. `ticketsStore` keyed by asociatie (`byAsociatie`); `add(asociatieId, reporterUserId, input)`; `useAsociatieTickets()`. `TicketsPage`/`ApartmentInfoPage`/`RecurringPage` migrated
- tests: 5 new in `ticketLogic.test.ts` + E2E
- result: 87 files / 530 tests / build green

### T48 P1 ✅ — Discutii/forum (F02) vertical slice scoped to active asociatie
- api/code: `discussionLogic` adds `ThreadsByAsociatie`/`seedThreads`/`threadsForAsociatie`/`newThread`/`newMessage`/`addThreadIn`/`mapThreads`/`addMessageIn`/`togglePinIn`/`deleteMessageIn`. `discussionStore` keyed by asociatie; `useAsociatieThreads()`. `DiscussionsPage` resolves author (profile?.id/full_name live, new `DEMO_CURRENT_USER_NAME` offline). A11y fix: reply send button `aria-label`
- locales: `discussions.send` RO+EN
- tests: 8 new in `discussionLogic.test.ts` + E2E
- result: 87 files / 525 tests / build green

### T47 P1 ✅ — Anunturi (F01) vertical slice scoped to active asociatie
- api/code: pure `announcementsLogic` — `seedAnnouncements`/`announcementsForAsociatie` (frozen empty)/`newAnnouncement`/`addAnnouncementIn`. `announcementsStore` keyed by asociatie (`byAsociatie`); `add(asociatieId, authorUserId, input)`; `useAsociatieAnnouncements()`. `AnnouncementsPage`+`HomePage` widget migrated
- tests: 6 in `announcementsLogic.test.ts`
- result: 87 files / 517 tests / build green

### T44 P1 ✅ — Gate direct routes for disabled modules
- api/code: pure `featureRouteLogic` — `PATH_TO_FEATURE` (from registry, no two sharing path)/`appRouteSegment`/`featureKeyForRoute`/`isFeatureRouteBlocked(flags, pathname)`. New `FeatureRouteGuard` (`src/app/`) wraps `<Outlet />`; renders `PageHeader`+`EmptyState` with bilingual `common.featureDisabled` when blocked. `DEMO_FEATURES` = all `implemented` features (was curated `RECOMMENDED_FEATURES` 10); real new asociatie keeps `RECOMMENDED_FEATURES` starter
- tests: 8 in `featureRouteLogic.test.ts` + E2E
- result: 86 files / 511 tests / build green

### T43 P1 ✅ — Per-asociatie feature flags from local store
- api/code: pure `featureFlagsLogic` — `seedFlags` (demo asociatie gets `DEMO_FEATURES`)/`flagsForAsociatie` (frozen empty default for stable selector)/`isFeatureEnabled`/`setFlagIn`/`setAllIn`/`migrateFlatFlags`. `featureStore` keyed `byAsociatie`, persist `vecini.features` v2 with migrate. `setFlag(asociatieId, key, enabled)`/`setAll(asociatieId, flags)`. `useAsociatieFlags()` hook. `useFeature(key)`/`FeatureGate` read active asociatie. `OnboardingWizard.finish()` scopes `setAll(asociatieId, selected)`
- tests: 8 in `featureFlagsLogic.test.ts`
- result: 85 files / 503 tests / build green

### T42 P1 ✅ — Resident join via invite code (local consume + membership)
- api/code: pure `buildMembershipFromInvite(userId, invite)` in `inviteLogic` (joiner enters asociatie with role; `apartmentId` rides along to live join RPC). `authStore.joinByInvite(code)` orchestrates: peek first, consume through replay-safe `inviteStore.consume`, build membership via `sortByPrivilege`, select asociatie. Returns `InviteStatus`. New `JoinAsociatiePage` at `/onboarding/alatura` bilingual; `/alatura` bot
- locales: `join.*` RO+EN
- tests: +2 `buildMembershipFromInvite` + new `joinByInvite.test.ts` (6 cases) + 2 E2E
- result: 84 files / 495 tests / build green

### T41 P1 ✅ — Invite-code generation + admin surface
- api/code: pure `inviteLogic` — `createInvite` (regenerates on collision)/`validateInvite` (ok/expired/used/revoked/unknown, precedence unknown→revoked→used→expired→ok)/`consumeInvite`/`revokeInvite`/`findByCode` (normalises whitespace/case/separators)/`isRedeemable`/`expiryFromPreset` (7d/30d/90d/never)/`INVITABLE_ROLES` (excludes admin/super_admin). `InviteCode` shape mirrors `invite_codes` (epoch ms timestamps). Persisted `inviteStore` (`vecini.invites`) — `issue`/`revoke`/atomic `consume` (re-validates inside set, replay-safe)/`forAsociatie`. New `InvitesAdminPage` at `/app/admin/invitatii`; `/invitatii` bot
- locales: `invites.*` RO+EN
- tests: 16 in `inviteLogic.test.ts`
- result: 83 files / 487 tests / build green

### T27 P1 ✅ — Member-less onboarding gate + local create/join
- api/code: `RequireAsociatie` gate nested in `RequireAuth` around `AppLayout`; waits T52 hydration, redirects member-less to `/onboarding`. Pure `onboardingLogic` — `newLocalAsociatieId`/`buildFounderMembership` (founder is admin). `authStore.createLocalAsociatie(name)` appends founder admin via `sortByPrivilege`, selects, records `localAsociatii`. `OnboardingWizard.finish()` calls it before flags
- tests: 4 in onboardingLogic
- result: 82 files / 471 tests / build green

### T53 P1 ✅ — Seed local tenant context on demo entry
- api/code: `src/features/auth/demoTenant.ts` — `DEMO_MEMBERSHIP` (DEMO_CURRENT_USER_ID as admin of DEMO_ASOCIATIE) + pure `demoTenantContext()`. `authStore.enterDemo` applies — `currentAsociatieId='demo-asoc'`, `activeRole()='admin'`
- tests: 5 in `demoTenant.test.ts`
- result: 81 files / 467 tests / build green

### T28 P0 ✅ — Profile + membership + active-asociatie hydration in authStore
- api/code: pure `hydrationLogic` — `activeMemberships`/`sortByPrivilege`/`pickActiveAsociatieId`/`roleFor`/`hasNoActiveAsociatie`/`ROLE_RANK`. `authStore.currentAsociatieId`+`hydrate()` (live only, loads `users`+active `memberships`, sorts by privilege, derives active asociatie honouring prior selection)+`activeRole()`+`setActiveAsociatie(id)`. `init` hydrates on existing session+`SIGNED_IN`; `SIGNED_OUT` clears
- tests: 17 in `hydrationLogic.test.ts`
- result: 80 files / 456 tests / build green

### T52 P2 ✅ — Hydration loading state + hydrate resilience
- api/code: `authStore` `hydrating` flag consumed by `RequireAuth`. Hydrate race+error-safe: monotonic `hydrateSeq` token drops stale results; sign-out paths bump+clear `hydrating`. Pure `mergeHydration` helper — retains known-good state on query error, clears profile only on successful empty read
- tests: +6 `mergeHydration` cases
- result: 80 files / 462 tests / build green

### T34 P0 ✅ — Fix unprotected vote/signature tables (RLS never enabled)
- mig: `20260522000012_vote_signature_rls.sql` enables RLS on `budget_votes`/`idea_votes`/`petition_signatures`. Parent-scoped select+insert-with-check, gated on `is_member(...)` via parent (`budget_proposals`/`ideas`/`petitions`). Composite PK keeps one-per-apartment. No update/delete/for-all
- tests: 9 in `voteSignatureRls.test.ts`
- result: 77 files / 434 tests

### T04 P0 ✅ — RLS & tenant-isolation security audit
- mig/audit: swept all 122 public tables — all RLS-enabled, asociatie_id-scoped (direct, via `is_member`/`has_role`+`apply_*` helpers, or through parent); no `using (true)`; helpers `security definer`+fixed `search_path`
- env: `netlify.toml` adds `Strict-Transport-Security` (2y, includeSubDomains, preload); strict `Content-Security-Policy` (`default-src 'self'`, `script-src 'self'`, `object-src`/`frame-ancestors 'none'`, `connect-src` self+Supabase only over REST+WebSocket, `upgrade-insecure-requests`); COOP/CORP `same-origin`; `X-DNS-Prefetch-Control: off`; tightened `Permissions-Policy`. `npm audit`: 0 vulnerabilities
- docs: new `SECURITY.md`
- tests: `rlsTenantIsolation.test.ts` (6) + `securityHeaders.test.ts` (4)
- result: 79 files / 444 tests / build green

### T10 P1 ✅ — F35 Apartament info
- notes: pre-shipped feature; queue entry resolved during 2026-05-22 audit. `apartmentLogic`+`ApartmentInfoPage`+registry toggle+route+`/apartament_meu` bot+RO/EN+E2E. Computed over existing tables, no migration

### T13 P1 ✅ — F10 AGA digitala
- notes: pre-shipped feature; queue entry resolved during 2026-05-22 audit. `agaLogic` (quorum/present/tally/percent/outcome/sort/lifecycle/PV) + `agaStore` + `AgaPage` + registry toggle + route + `/aga` bot + RO/EN + batch5 owner-RLS migration + E2E. PV ships as downloadable plain-text (RO, signature-ready); server-rendered PDF is T37

### T05 P0 ✅ — GDPR consent & legal surface
- api/code: global `ConsentBanner` (Accept all / Doar esentiale / Personalizeaza); public `/confidentialitate`/`/termeni`/`/cookies` bilingual via `legalContent.ts`; in-app `/app/confidentialitate` consent management; `consentLogic`+`consentGate` (`mayNotify` fan-out gate); persisted `consentStore`
- mig: additive `consent_records` (owner RLS + admin read)
- docs: lawful-basis notes in `DECISIONS.md`
- result: pipeline green + E2E

### T01 P0 ✅ — Live Supabase auth wiring
- api/code: pure `authLogic` (email/password validation, `canSubmit` per mode, `mapAuthError`). `authStore` extended with `signUp` (email-confirmation aware), `requestPasswordReset`/`updatePassword`/`resendVerification`, `PASSWORD_RECOVERY` → `recovery` flag. `LoginPage` mode-switching (sign in/up/forgot) + confirmation panels; new `ResetPasswordPage` at `/reset-parola`. Demo fallback intact
- env: `.env.example` documents Confirm email ON + Site URL + `/reset-parola` redirect + `VITE_APP_URL`
- locales: `auth.err.*` RO+EN; `.auth-link` style
- tests: unit + 1 E2E
- result: pipeline green

### T02 P0 ✅ — 2FA/MFA (TOTP)
- api/code: pure `mfaLogic` — self-contained RFC 6238/4226 TOTP over Web Crypto, base32 codec, single-use recovery-code gen/hash/consume, `requiresMfa` role rule, `challengeNeeded` AAL state machine, `mfaErrorKey` (tested against RFC vectors). `mfaStore` orchestrates both paths. `SecurityPage` at `/app/securitate` — enroll (Supabase QR live / manual key demo) → 6-digit confirm → 10 single-use recovery codes (copy/download) → manage (regenerate)/disable. `LoginPage` post-password TOTP/recovery challenge. `AppLayout` steers privileged un-enrolled in live path. Recovery codes stored as SHA-256 hashes
- mig: `mfa_recovery_codes` (owner-only RLS)
- locales: `auth.mfa.*` RO+EN; `/securitate` bot; UserMenu link
- tests: unit + 1 E2E
- result: pipeline green

### T03 P0 ✅ — Auth & session hardening
- api/code: pure `passwordPolicy` (min-10 length + bcrypt-72 cap + character variety + offline breached/common blocklist + email-echo rejection + strength score). Pure `loginThrottle` (sliding-window failed-attempt counting + escalating capped lockout per normalised email). Pure `authAudit` (privacy-safe event model; `redactEmail` masks to `a***@domain`, no passwords/tokens/codes/full emails). Persisted `securityStore` wraps throttle map+activity log, mirrors to `auth_audit_events`. `authStore` `signOutEverywhere` (`scope:'global'`), throttle-gated `signIn` returning `lockedMs`, audit across sign-in/out/password change/reset request/demo entry. Supabase client uses PKCE flow. `LoginPage` live password-strength meter + bilingual lockout toast. `SecurityPage` "active sessions / sign out everywhere" + "recent security activity"
- mig: `auth_audit_events` (append-only, owner-read+admin-read)
- locales: `auth.pwd.*`/`auth.sessions.*`/`auth.audit.*`/`auth.lockout` RO+EN
- tests: 32 new + 1 E2E
- result: pipeline green

---

## Earlier history & audit passes

- 2026-05-22 audit/replenish pass: measured vision coverage (~58%, in `RESUME.md §0`), swept RLS across 122 tables, found 3 with no RLS → T34 (P0). Fed T34/T35/T37, sharpened T04 (CSP+HSTS, T34 cross-ref). 76 files / 425 tests / build green; RO/EN i18n parity clean
