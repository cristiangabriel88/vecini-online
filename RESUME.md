# RESUME — vecini.online

Terse machine-readable status log. Full history archived in `COMPLETED.md` (newest first). Drives `make progress` (see `BACKLOG.md` + `CLAUDE.md`).

## 0. Current status

- date: 2026-05-28
- last_task: T129 (P2) F04 private messaging mirrors hardened + RLS regression test
- pipeline: green (lint + typecheck + test + build + build:pi + build:demo)
- counts: 165 files / 1523 tests
- stages: PROD/DEV/DEMO formalized (T171/T172); all three build green every task
- mvp_spine: complete (T168/T169/T92/T55/T115 done; T128 token hardening done)
- next: T130 link admin-initiated F04 threads to resident's live account
- features: 65/65 built end-to-end; F66+F67 (Cat-9 personalization) done
- blockers: Playwright browser binaries not downloadable in sandbox; E2E runs in CI only

---

### T129 P2 ✅ 2026-05-28 — F04 private messaging mirrors hardened
- api/code: `adminChatApi.ts` (`startThread`/`reply`/`toggleStatus` accept optional `onError`), `AdminChatPage` passes `toast.error(t('adminChat.writeFailed'))`
- locales: `writeFailed` EN+RO
- tests: +27 (`privateThreadPrivacyRls.test.ts` backend-free RLS regression 7; `adminChatApi.test.ts` 20)
- result: 165 files / 1523 tests; all builds green
- notes: live smoke pending creds

### T178 P2 ✅ 2026-05-28 — Documentation pass for three-stage model
- docs: `DECISIONS.md` + `PI_DEPLOYMENT.md` updated (rationale, DEV email workflow, env vars)
- result: 163 files / 1500 tests

### T177 P2 ✅ 2026-05-28 — Visible stage banner
- api/code: `StageBanner.tsx` (fixed bottom-left pill, amber `--warning-soft` DEV, warm-graphite `--bg-inverse` DEMO, hidden PROD)
- tests: +5
- result: 163 files / 1500 tests; all builds green

### T176 P1 ✅ 2026-05-28 — npm run pi:seed
- api/code: `scripts/pi-seed.mjs` (7 dev auth users `{role}@dev.local` + `super.admin@dev.local`, upserts memberships + platform_admins, `--password` override, stage + cloud-URL guards), `seed` subcommand in `pi.sh`, `pi:seed` in `package.json`
- docs: `PI_DEPLOYMENT.md` role/email/password table
- tests: +10
- result: 161 files / 1495 tests; all builds green

### T175 P1 ✅ 2026-05-28 — MAIL_MODE=resend|log|disabled for invite-email
- mig: `20260529000001_email_outbox.sql`
- api/code: `getMailMode()` in `resend.ts`, `invite-email.ts` branches on mode, `.env.pi.example` gains `MAIL_MODE=log`, `InvitesAdminPage` collapsible outbox panel
- tests: +5
- result: 160 files / 1485 tests; all builds green

### T174 P1 ✅ 2026-05-28 — Auto-bypass login in DEMO + remember last role
- api/code: `DemoEntry` in `router.tsx`; root `/` skips LoginPage in DEMO, reads `localStorage['iv.demo.role']` via `readLastDemoRole()`, navigates `/app`; `enterDemo` persists role on switch
- tests: +13
- result: 159 files / 1480 tests; all builds green

### T173 P1 ✅ 2026-05-28 — Floating dev role switcher
- api/code: `DevRoleSwitcher.tsx` (floating/inline variants), `signInAsDevUser` in authStore, mounted in AppLayout, LoginPage buttons extracted
- locales: +5 keys per language
- tests: +9
- result: 158 files / 1467 tests; all builds green

### T172 P1 ✅ 2026-05-28 — Stage-specific build/dev scripts
- api/code: `build:prod`/`build:pi`/`build:demo`/`dev:pi`/`dev:demo` in `package.json`; `.env.pi` + `.env.demo` committed; `.gitignore` updated with `!.env.pi`/`!.env.demo`
- result: 157 files / 1458 tests; all builds green

### T171 P1 ✅ 2026-05-28 — Three-stage deployment model
- api/code: `AppStage` type + `appStage` on `ClientEnv`; pure `resolveAppStage()` + `getStage()`/`isProd()`/`isDev()`/`isDemo()`; `.env.demo.example` created; `.env.example` + `.env.pi.example` get `VITE_APP_STAGE`
- docs: BACKLOG/CLAUDE protocol updated
- tests: +8
- result: 157 files / 1458 tests
- notes: formalizes PROD (cloud) / DEV (Pi) / DEMO (offline) split

### T128 P0/MVP ✅ 2026-05-28 — Token-security hardening
- mig: `20260528000003` (pgcrypto, hash existing plaintext tokens in-place, creates `token_redemption_attempts` (RLS, no public policy), updates both onboarding RPCs to hash before lookup + rate-limit 10/15 min + audit `invite.redeemed`)
- api/code: `inviteWriteApi.ts` uses Web Crypto (hash only); `RedeemRpcResult` adds `'rate_limited'`; `AUDIT_ACTIONS` + `ACTION_TONE` + locales updated
- result: 156 files / 1452 tests
- notes: MVP spine complete after this

### T111 P2 ✅ 2026-05-28 — Drop super_admin from memberships role check
- mig: drops+recreates `memberships_role_check` with 6 tenant roles only
- tests: +1 parse-based regression (4 assertions)
- result: 154 files / 1430 tests

### T08 P1 ✅ 2026-05-28 — E2E suite green + CI
- api/code: `.github/workflows/ci.yml` (check job: lint+typecheck+unit+build; e2e job: chromium Playwright with artifact on failure); `tests/e2e/isolation.spec.ts` 3 isolation tests (unauth redirect from `/app` and `/app/anunturi`, sign-out via UserMenu)
- result: 153 files / 1426 tests

### T170 P0/MVP ✅ 2026-05-28 — Fix live resident-invite email
- api/code: strip `inv-` id prefix inline in `sendInviteEmail` (`startsWith('inv-') ? id.slice(4) : id`), posted `inviteId` is bare UUID matching row `writeInviteToLive` inserted
- tests: +3 static-analysis
- result: 144 files / 1298 tests

### T100 P1 ✅ 2026-05-28 — Mandatory hardened MFA for super_admin
- api/code: `platformAuthLogic.ts` adds `mfa-enrollment-required` + `supabaseConfigured`/`mfaLoaded`/`mfaEnrolled` inputs; `RequirePlatformAdmin` blocks with TOTP enrollment screen (begin/confirm/cancel/recovery); `PlatformLoginPage` adds `pendingMfa` challenge step (live + demo)
- locales: `platform.mfa.*` + `backToSignIn`
- tests: +6
- result: 153 files / 1426 tests

### T57 P2 ✅ 2026-05-28 — Live activation: content slices read/write Supabase
- mig: adds `title` to `discussion_threads`, `author_name` to `discussion_messages`
- api/code: `announcementsApi`, `discussionApi`, `ticketsApi` (hydrate + write); stores gain `replaceForAsociatie`; pages wired with `useEffect` hydration + API-routed mutations
- tests: +32
- result: 153 files / 1420 tests

### T56 P2 ✅ 2026-05-28 — Live activation: per-asociatie feature flags
- api/code: `featureApi.ts` (`hydrateFeatureFlags` + `setFeatureFlagLive`); `FeaturesAdminPage` hydrates on mount
- tests: +7
- result: 150 files / 1388 tests

### T145 P3 ✅ 2026-05-28 — Remove unused join.* locale keys
- api/code: removed 13-key `join.*` block from `ro.json` + `en.json`
- result: 149 files / 1381 tests

### T158 P3 ✅ 2026-05-28 — Remove orphaned onboarding locale keys
- api/code: removed 6 dead keys (`import`/`invite`/`csvHelp`/`csvParsed`/`csvError`/`inviteEmails`) from onboarding section both languages
- result: 149 files / 1381 tests

### T164 P3 ✅ 2026-05-27 — Seed invitee profile locale from active UI language
- api/code: `seedProfile` gains optional `locale`; `AccountSetupPage` offline path narrows `i18n.language` to `Locale`
- tests: +2
- result: 149 files / 1381 tests

### T167 P3 ✅ 2026-05-27 — Triage-row actions responsive on narrow viewports
- api/code: icon+meta wrapped in flex group; outer row `flex-col sm:flex-row`; title/key/count row `flex-wrap`
- tests: +4 structural
- result: 149 files / 1379 tests

### T138 P2 ✅ 2026-05-27 — Live-wire F05 comitet inbox via privacy-preserving fns
- api/code: `AnonymousMessage.sender_user_id` optional (comitet rows never carry it); `anonymousStore.replaceAll` + `setStatus`; new `anonymousApi.ts` (`hydrateAnonymousMessages` RPC privileged, owner-table residents, no-op offline; `submitAnonymousMessage`; `setAnonymousMessageStatus`); `AnonymousPage` role-aware hydration + `isSupabaseConfigured` branches
- tests: +14
- result: 148 files / 1375 tests

### T135 P2 ✅ 2026-05-27 — Cross-origin superadmin redirect to platform subdomain
- api/code: `AsociatieRoute` gains `'platform-redirect'`; `resolveAsociatieRoute` returns it when superadmin + `platformUrl` set; `RequireAsociatie` + `AppHome` fire `window.location.href` in `useEffect`; `env.platformUrl` reads `VITE_PLATFORM_URL`
- tests: +19
- result: 147 files / 1363 tests

### T117 P2 ✅ 2026-05-27 — Reconcile embedded persons with apartment_residents
- mig: `20260527000006` updates `redeem_onboarding_token` to set `claimed_user_id` in persons entry (name match first, role fallback, unclaimed-only)
- api/code: `ApartmentPerson.claimed_user_id?`; pure `isPersonClaimed` + `claimPersonInList`; `ApartmentFormPage` shows "Account linked" badge + disables name input for claimed
- locales: `personLinked`
- tests: +21
- result: 146 files / 1344 tests

### T149 P2 ✅ 2026-05-27 — Resend delivery webhook → stamp invite_email_delivered_at
- mig: adds `resend_message_id` column
- api/code: `resend.ts` returns `messageId`; `invite-email.ts` stamps `invite_email_sent_at` + stores `resend_message_id`; new `resend-webhook.ts` Netlify function with svix HMAC-SHA256 verification + ±5 min freshness; `markInviteEmailDelivered` + `hydrateInviteDelivery`; `InvitesAdminPage` shows `emailDeliveredOn`
- env: `RESEND_WEBHOOK_SECRET`
- result: 145 files / 1323 tests

### T115 MVP ✅ 2026-05-27 — Live Supabase R/W for apartment registry
- api/code: `toRow()` strips `ap-` prefix from local apartment ids; new `toDbId()` for WHERE clauses; `writeInviteToLive` strips `ap-` from `apartmentId`; mutation fns gain `onError?`; PG `23505` → `'conflict'`; `ApartmentFormPage.onConfirmInvite` calls `writeInviteToLive` + `onboardingExpiry()`
- locales: +2 RO+EN
- tests: +11 (`apartmentsLivePath.test.ts`)
- result: 144 files / 1301 tests
- notes: MVP spine complete after this

### T55 MVP ✅ 2026-05-27 — Live invite write/consume + real account on redemption
- mig: `20260527000004_onboarding_redemption_rpcs.sql` — two SECURITY DEFINER RPCs: `resolve_onboarding_token` (anon+authenticated, token-as-bearer-secret) + `redeem_onboarding_token` (authenticated, FOR UPDATE replay-safe, upserts users row, inserts membership, links apartment_residents, marks invite consumed); both `set search_path = ''` fully-qualified
- api/code: new `src/features/onboarding/onboardingApi.ts` (resolveTokenLive/redeemTokenLive); new `src/features/invites/inviteWriteApi.ts` (writeInviteToLive best-effort); `AccountSetupPage` live branch: useEffect resolves → `supabase.auth.signUp` → `redeemTokenLive` → `authStore.hydrate()`; `ApartmentsPage` CSV import calls `writeInviteToLive` before email when configured
- locales: +3 per language
- tests: +36 static
- result: 142 files / 1282 tests

### T92 MVP ✅ 2026-05-27 — Server-side privileged provisioning Netlify fn + wire superadmin live send
- mig: `20260527000003_invite_kind.sql` adds `kind` + `revoked_at` to `invite_codes`
- api/code: new `netlify/functions/provision-asociatie.ts` (POST-only service-role, re-verifies caller is platform superadmin by querying `platform_admins` via service role -- NOT `is_super_admin()` which needs `auth.uid()`, validates name/email server-side, creates provisional `asociatii` row + `kind='admin_setup'` `invite_codes` (24h token, never from client), dispatches admin invite email via `buildAdminInviteEmail`+`sendEmail` when Resend configured, non-fatal); `PlatformAddAsociatiePage.tsx` live branch wired (session bearer, errors `notConfigured`/`forbidden`/`provisionFailed`, `sentNoteLiveNoEmail` when Resend absent)
- tests: +32 static + pure-logic
- result: 141 files / 1246 tests

### T169 MVP ✅ 2026-05-27 — Live superadmin account + is_super_admin() grant verified
- mig: `20260527000002_superadmin_grant.sql` — least-privilege execute contract for `is_super_admin()` (REVOKE FROM PUBLIC + anon, GRANT TO authenticated only); documented parameterized seed path with `<SUPERADMIN_EMAIL>` placeholder applied separately by Hermes after auth user creation (no real id committed)
- api/code: tightened `mfaChannelsHook.test.ts` grant-negation regexes to stop at statement boundaries
- tests: +6 (`platformSuperadmin.test.ts` GRANT/REVOKE, seed pattern contract, `platformAuthStore.verify()` static contract)
- result: 140 files / 1214 tests

### T168 MVP ✅ 2026-05-27 — Live environment + Resend email provider setup
- api/code: no source change
- docs: `.env.example` updated (Supabase "Confirm email" OFF since invite link IS verification; Resend needs verified sending domain); new `RUNBOOK-MVP.md` (Supabase + Resend + Netlify provisioning + smoke); `DECISIONS.md` block (email-as-verification, Netlify run target, `APP_URL` = resident origin)
- result: 140 files / 1208 tests
- notes: first task of MVP presentation spine; config/runbook only

### T166 P3 ✅ 2026-05-27 — Skip feature-request clear when no pending demand
- api/code: pure `hasAnyRequest(requests, asociatieId, featureKey)` in `featureRequestLogic.ts`; guards `featureRequestStore.clearFor` (returns early when no demand instead of running no-op set + mirrorClear delete)
- tests: +3
- result: 140 files / 1208 tests
- notes: trims wasted `feature_requests` delete on nearly every enable live

### T162 P3 ✅ 2026-05-27 — Dismiss-without-enabling on feature-request triage
- api/code: `FeaturesAdminPage` triage row gets "Respinge"/"Dismiss" beside "Activează", behind confirm `Modal`, clears module's pending requests via `clearFor` WITHOUT flipping flag; new `feature.request_dismissed` audit (`requested → dismissed`) in `AUDIT_ACTIONS` + `ACTION_TONE` neutral
- locales: +4 `features.*` RO+EN + audit labels
- tests: +3 (`featuresAdminDismissRequest.test.tsx`)
- result: 140 files / 1205 tests

### T161 P3 ✅ 2026-05-27 — Clear satisfied requests on normal toggle
- api/code: per-feature `Switch` on `FeaturesAdminPage` calls `clearRequests(asociatieId, f.key)` on off→on (guarded `if (v)`); disabling leaves requests untouched
- tests: +3 (`featuresAdminToggleClears.test.tsx`)
- result: 139 files / 1202 tests

### T131 P2 ✅ 2026-05-27 — Format-validate asociatie identity in BuildingSettingsPage
- api/code: new shared `src/shared/lib/identity.ts` (canonical `normalizeIban`/`isValidIban`/`isValidCui`/`isValidPhone`, moved out of `platformProvisioningLogic.ts` which now imports + re-exports); pure `validateBuildingIdentity(form)` in `buildingLogic.ts` (name >=3, CUI/IBAN/phone/contact-email format-checked when filled, IBAN normalized); `BuildingSettingsPage` shows bilingual inline errors + blocks save with `building.fixErrors` toast
- locales: `building.fixErrors` + `building.err.*` RO+EN
- tests: +5
- result: 138 files / 1199 tests
- notes: main app no longer reaches into `src/platform`

### T146 P2 ✅ 2026-05-27 — Capture invitee display name + seed minimal offline profile
- api/code: `AccountSetupPage` required "Nume complet" field; offline path seeds `profileStore` via `saveProfile(seedProfile(...))`; `accountSetupLogic.ts` adds `name` + `nameInvalid` + `isValidName` (trimmed 2-80, no character class so RO diacritics/hyphens pass); `profileLogic.ts` adds `firstName` + `seedProfile`
- locales: +3 RO+EN
- tests: +12 (8 + 4)
- result: 138 files / 1194 tests
- notes: live name persistence stays T55

### T160 P2 ✅ 2026-05-27 — Validate email format in CSV import rows
- api/code: `resolveImportBatch` in `csv.ts` reuses canonical `isValidEmail` from `@/features/auth/authLogic`; `opt_in && email` rows with malformed address still created but withheld from `toInvite`, bilingual warning appended; non-opted bad emails produce no warning
- tests: +4
- result: 138 files / 1183 tests

### T151 P2 ✅ 2026-05-27 — Admin triage surface for resident feature requests
- api/code: `featureRequestLogic.ts` adds `summarizeRequests` (group by module, requester count + names, newest-first), `clearRequestsFor`, `replaceAsociatieRequests`; `featureRequestStore` adds `summaryFor`, `clearFor` (set + best-effort `mirrorClear`), `hydrateFor` (live select, no-op offline); `FeaturesAdminPage` renders "Requested by residents" triage section above category list with one-tap Enable that flips flag + clears requests + audits `feature.enabled` + toasts
- locales: +5 RO+EN
- tests: +8
- result: 138 files / 1179 tests

### T159 P2 ✅ 2026-05-27 — SecurityPage step-up OTP channel support
- api/code: `SecurityPage` step-up mirrors full LoginPage channel picker + OTP flow; auto-selects single channel, picker for multi, full send/demo-code/verify/resend/change-channel for email + Telegram, `verifyChallenge` fallback for TOTP/recovery; new `stepUpAvailableChannels()` uses `enrolled` (not `demoSecret`)
- tests: +8 (`securityPageStepUp.test.tsx`)
- result: 138 files / 1172 tests

### T156 P1 ✅ 2026-05-27 — ApartmentsPage CSV import + auto-invite
- api/code: new `resolveImportBatch` pure (two-pass dedup: registry keys + within-CSV, returns `{toCreate, toInvite, errors}`); `ApartmentsPage` hidden file input + "Import lista" button (header + empty-state); `handleFileSelected` async: parse → dedup → `createApartments` → issue invites for opt-in via `inviteStore.issue` + `sendInviteEmail` + `markEmailSent`; dismissible amber error panel; success toast
- locales: +5 RO+EN
- tests: +9
- result: 137 files / 1164 tests

### T141 P1 ✅ 2026-05-27 — Migrations + Custom Access Token Hook for session elevation
- mig: `20260527000001_mfa_channels_hook.sql` — `mfa_channels` (RLS, self read/insert/delete, unique user+channel); `mfa_otp_challenges` (RLS on, zero policies = service-role-only); `session_elevations` (RLS on, zero policies, unique session_id, channel includes 'recovery' for T29); `custom_access_token_hook` (SECURITY DEFINER, `set search_path = ''`, reads session_id from claims, injects `app_2fa_at` + `app_2fa_channel`, revoke-from-public, grant to supabase_auth_admin only)
- tests: +24 (`mfaChannelsHook.test.ts`)
- result: 137 files / 1141 tests
- notes: dashboard activation documented in migration header

---
*Older entries archived in `COMPLETED.md`. Trust `FEATURES.md` for per-feature status.*
