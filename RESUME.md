# RESUME — vecini.online

A quick-start status summary so work can resume without re-reading the full spec.
Sourced from `DECISIONS.md` and `FEATURES.md` (both live at the repo root, not
under `docs/`, despite references to the contrary). The product is
**vecini.online** throughout.

> Scope note: the spec defines **65 features (F01–F65)**. This codebase is a
> production-shaped *foundation*: buildable, type-safe, lint-clean, unit-tested,
> with features being built end-to-end batch by batch and the rest registered,
> toggleable, and backed by schema so the platform is complete in shape.

---

> **Next work is driven by `BACKLOG.md`** (the protocol + open `⬜` queue) via the
> autonomous `make progress` protocol in `CLAUDE.md`. Trigger it by typing
> `make progress` (one task) or running `scripts/run-overnight.sh` (continuous,
> unattended, Git Bash). Section 4 below is historical context, not the live queue.
> Finished tasks' full done-notes are archived in `COMPLETED.md` (newest first);
> §0 below stays the dated chronological summary.

## 0. Current status (updated 2026-05-28, T173 done -- floating dev role switcher live in DEV + DEMO; all 7 roles; 158 files / 1467 tests)

The three-stage model (PROD/DEV/DEMO) is fully operational. A floating role-switcher chip-bar now appears in DEV and DEMO stages, letting the operator flip between all 7 roles from any page without returning to login. In PROD it is absent entirely. LoginPage role buttons are now served by the same shared component.

- **2026-05-28 — T173 (P1) Floating dev role switcher.** `DevRoleSwitcher.tsx` with `floating`/`inline` variants; `signInAsDevUser` added to authStore. Mounted in AppLayout; LoginPage buttons extracted. 5 new locale keys per language. 9 new tests. 158 files / 1467 tests / build / build:pi / build:demo green.
- **2026-05-28 — T172 (P1) Stage-specific build/dev scripts.** `build:prod`, `build:pi`, `build:demo`, `dev:pi`, `dev:demo` added to `package.json`. `.env.pi` + `.env.demo` committed; `.gitignore` updated with `!.env.pi` + `!.env.demo`. 157 files / 1458 tests / build / build:pi / build:demo green.
- **2026-05-28 — T171 (P1) Three-stage deployment model.** `AppStage` type + `appStage` field added to `ClientEnv`; `resolveAppStage()` pure helper + `getStage()`/`isProd()`/`isDev()`/`isDemo()` exported. `.env.demo.example` created; `.env.example` + `.env.pi.example` updated with `VITE_APP_STAGE`. 8 new tests. BACKLOG.md / CLAUDE.md protocol updated. 157 files / 1458 tests green.
- **2026-05-28 — T128 (P0/MVP) Token-security hardening.** Migration `20260528000003` enables pgcrypto, hashes existing plaintext tokens in-place, creates `token_redemption_attempts` table (RLS, no public policy), updates both onboarding RPCs to hash before lookup + rate-limit (10/15 min) + audit `invite.redeemed` on success. `inviteWriteApi.ts` uses Web Crypto to store hash only. `RedeemRpcResult` adds `'rate_limited'`; `AUDIT_ACTIONS` + `ACTION_TONE` + locales updated. MVP spine complete. 156 files / 1452 tests green.
- **2026-05-28 — T111 (P2) Drop super_admin from memberships role check.** Migration drops+recreates `memberships_role_check` with 6 tenant roles only; parse-based regression test added (4 assertions). 154 files / 1430 tests green.
- **2026-05-28 — T08 (P1) E2E suite green + CI.** `.github/workflows/ci.yml` added (check job: lint + typecheck + unit + build; e2e job: chromium Playwright with artifact on failure). `tests/e2e/isolation.spec.ts` added: 3 isolation tests (unauthenticated redirect from `/app` and `/app/anunturi`, sign-out via UserMenu). 153 files / 1426 tests green.
- **2026-05-28 — T170 (P0/MVP) Fix live resident-invite email: strip the `inv-` id prefix before calling the function.** Applied `startsWith('inv-') ? id.slice(4) : id` inline in `sendInviteEmail` so the posted `inviteId` is a bare UUID, matching the row `writeInviteToLive` inserted and passing the Netlify function's UUID validation. 3 new static-analysis tests. 144 files / 1298 tests green.
- **2026-05-28 — T100 (P1) Mandatory hardened MFA for super_admin platform accounts.** `platformAuthLogic.ts` adds `mfa-enrollment-required` state + `supabaseConfigured`/`mfaLoaded`/`mfaEnrolled` inputs. `RequirePlatformAdmin` renders a blocking TOTP enrollment screen (begin/confirm/cancel/recovery-codes) when superadmin is not enrolled; `PlatformLoginPage` adds a `pendingMfa` challenge step after password sign-in (live + demo). `platform.mfa.*` + `backToSignIn` locale keys added. 6 new tests. 153 files / 1426 tests green.
- **2026-05-28 — T57 (P2) Live activation: content slices read/write Supabase.** Migration adds `title` to `discussion_threads` and `author_name` to `discussion_messages`. Three new API modules (`announcementsApi`, `discussionApi`, `ticketsApi`) with hydrate + write functions; stores gain `replaceForAsociatie`; pages wired with `useEffect` hydration + API-routed mutations. 32 new tests. 153 files / 1420 tests green.
- **2026-05-28 — T56 (P2) Live activation: per-asociație feature flags read/write.** New `featureApi.ts` (`hydrateFeatureFlags` + `setFeatureFlagLive`); `FeaturesAdminPage` hydrates on mount and uses live setter; 7 new tests. 150 files / 1388 tests green.
- **2026-05-28 — T145 (P3) Remove unused join.* locale keys.** Confirmed zero source references; removed the 13-key `join.*` block from both `ro.json` and `en.json`. 149 files / 1381 tests green.
- **2026-05-28 — T158 (P3) Remove orphaned onboarding locale keys.** Confirmed zero source references via ripgrep; removed 6 dead keys (`import`, `invite`, `csvHelp`, `csvParsed`, `csvError`, `inviteEmails`) from the `onboarding` section in both `ro.json` and `en.json`. 149 files / 1381 tests green.
- **2026-05-27 — T164 (P3) Seed invitee profile locale from active UI language.** `seedProfile` gains an optional `locale` parameter; `AccountSetupPage` offline path narrows `i18n.language` to `Locale` and passes it to `seedProfile`. 2 new tests. 149 files / 1381 tests green.
- **2026-05-27 — T167 (P3) Triage-row actions responsive on narrow viewports.** Icon+meta wrapped in a flex group; outer row is `flex-col sm:flex-row`; title/key/count row gains `flex-wrap`. Actions drop to their own row on mobile, stay beside meta on sm+. 4 structural tests. 149 files / 1379 tests green.
- **2026-05-27 — T138 (P2) Live-wire F05 comitet inbox through privacy-preserving functions.** `AnonymousMessage.sender_user_id` made optional (comitet rows never carry it). `anonymousStore` gains `replaceAll` + `setStatus`. New `anonymousApi.ts`: `hydrateAnonymousMessages` (RPC for privileged, owner-table for residents, no-op offline), `submitAnonymousMessage`, `setAnonymousMessageStatus`. `AnonymousPage` wired with role-aware `useEffect` hydration + `isSupabaseConfigured` branches. 14 new tests. 148 files / 1375 tests green.
- **2026-05-27 — T135 (P2) Cross-origin superadmin redirect to platform subdomain.** `AsociatieRoute` gains `'platform-redirect'`; `resolveAsociatieRoute` returns it when superadmin + `platformUrl` set; `RequireAsociatie` fires `window.location.href` in `useEffect` + returns null; `AppHome` same defense-in-depth; `env.platformUrl` reads `VITE_PLATFORM_URL`; `.env.example` documented. Existing hydrationLogic tests pass unchanged. 19 new tests. 147 files / 1363 tests green.
- **2026-05-27 — T117 (P2) Reconcile embedded persons with account-linked apartment_residents.** `ApartmentPerson` gains `claimed_user_id?`; migration `20260527000006` updates `redeem_onboarding_token` to set `claimed_user_id` in the matching persons entry (name match first, role fallback, unclaimed-only); pure `isPersonClaimed` + `claimPersonInList` helpers; `ApartmentFormPage` shows "Account linked" badge + disables name input for claimed persons; bilingual `personLinked` key. 21 new tests. 146 files / 1344 tests green.
- **2026-05-27 — T149 (P2) Live activation: Resend delivery webhook -> stamp `invite_email_delivered_at`.** Migration adds `resend_message_id` column; `resend.ts` returns `messageId` from response body; `invite-email.ts` stamps `invite_email_sent_at` + stores `resend_message_id`; `resend-webhook.ts` new Netlify function with svix HMAC-SHA256 verification + +-5 min timestamp freshness; `markInviteEmailDelivered` + `markEmailDelivered` action added; `hydrateInviteDelivery` hydrates delivery state on mount; `InvitesAdminPage` shows `emailDeliveredOn`; bilingual strings + `RESEND_WEBHOOK_SECRET` in env/runbook. 145 files / 1323 tests green.
- **2026-05-27 — T115 (MVP) Live Supabase read/write for the apartment registry.** Fixed the live path: `toRow()` now strips the `ap-` prefix from local apartment ids (so DB receives a valid UUID); new `toDbId()` helper used in WHERE clauses; `writeInviteToLive` strips `ap-` from `apartmentId` (FK now links to real apartment row); all three mutation functions gained an `onError?` callback so callers can surface a bilingual toast on failure; Postgres unique constraint code `23505` mapped to `'conflict'` error key; `ApartmentFormPage.onConfirmInvite` now calls `writeInviteToLive` + uses `onboardingExpiry()` TTL; 2 new locale keys (RO+EN). 11 new tests in `apartmentsLivePath.test.ts`. MVP spine complete: all planned tasks done. 144 files / 1301 tests green.
- **2026-05-27 — T163 (P3) Distinguish row warnings from blocking errors in the CSV import summary.** Added `warnings: string[]` to `ImportBatchResult`; the "email invalid, invite skipped" notice moves from `errors` to `warnings` (apartment IS created). `ApartmentsPage` shows blocking errors in red + non-blocking warnings in amber with independent dismiss buttons. New `importWarningsTitle` locale key (RO+EN). Updated 4 existing tests + 3 new. 143 files / 1290 tests green.
- **2026-05-27 — T165 (P3) Link the shared Textarea error to its control with aria-describedby.** Added `aria-describedby` + `id` to the error `<p>` in `Textarea` (`src/shared/components/Input.tsx`), mirroring the existing `Input` pattern so screen-readers hear the error text when a field is invalid. Added `tests/unit/Input.test.tsx` (6 tests: Input + Textarea aria wiring, hint/error mutual exclusion). 143 files / 1288 tests green.
- **2026-05-27 — T55 (MVP) Live invite write/consume + real account creation on redemption (admin + resident).** Two SECURITY DEFINER RPCs in new migration `20260527000004_onboarding_redemption_rpcs.sql`: `resolve_onboarding_token` (anon+authenticated, token-as-bearer-secret, returns context for AccountSetupPage) and `redeem_onboarding_token` (authenticated only, FOR UPDATE replay-safe, upserts users row, inserts membership, links apartment_residents, marks invite consumed). Both use `SET search_path = ''` with fully qualified table names. New `src/features/onboarding/onboardingApi.ts` (resolveTokenLive/redeemTokenLive RPC wrappers) and `src/features/invites/inviteWriteApi.ts` (writeInviteToLive, best-effort live row write). `AccountSetupPage.tsx` live branch: `useEffect` resolves token via RPC, `submit` calls `supabase.auth.signUp` -> `redeemTokenLive` -> `authStore.hydrate()`. `ApartmentsPage` CSV import now calls `writeInviteToLive` before email send when `isSupabaseConfigured`. 3 new i18n keys per language. 36 new static source tests. Remaining spine: T115 (live apartments). 142 files / 1282 tests green.
- **2026-05-27 — T92 (MVP) Server-side privileged provisioning (Netlify function, service role) + wire the superadmin live send.** New `netlify/functions/provision-asociatie.ts`: POST-only service-role function that re-verifies the caller is a platform superadmin (queries `platform_admins` via service role, not `is_super_admin()` which needs `auth.uid()`), validates `adminName`/`adminEmail` server-side, creates a provisional `asociatii` row + a `kind='admin_setup'` `invite_codes` row (24h token, never from client), and dispatches the real admin invite email via `buildAdminInviteEmail`+`sendEmail` when Resend is configured (non-fatal). New migration `20260527000003_invite_kind.sql`: adds `kind` + `revoked_at` to `invite_codes`. `PlatformAddAsociatiePage.tsx` live branch wired: session bearer token, error display (`notConfigured`/`forbidden`/`provisionFailed`), `sentNoteLiveNoEmail` note when Resend is absent. 32 new static + pure-logic tests. Remaining spine: T55 (live invite write/consume + real account creation), T115 (live apartments). 141 files / 1246 tests green.
- **2026-05-27 — T169 (MVP) Live superadmin account + `is_super_admin()` grant verified.** New migration `20260527000002_superadmin_grant.sql`: least-privilege execute contract for `is_super_admin()` (REVOKE FROM PUBLIC + anon, GRANT TO authenticated only) so `platformAuthStore.verify()` -> `supabase.rpc('is_super_admin')` is callable only under a real session. Migration carries a documented, parameterized seed path (INSERT template with `<SUPERADMIN_EMAIL>` placeholder, applied separately by Hermes after the auth user is created -- no real id committed). Also tightened `mfaChannelsHook.test.ts` grant-negation regexes to stop at statement boundaries. 6 new tests in `platformSuperadmin.test.ts` (GRANT/REVOKE presence, seed pattern contract, `platformAuthStore.verify()` static contract). Remaining spine: T92 (provisioning function + wire superadmin send), T55 (live invite write/consume + real account creation), T115 (live apartments). 140 files / 1214 tests green.
- **2026-05-27 — T168 (MVP) Live environment + Resend email provider setup.** First task of the new **MVP presentation spine** (the hand-picked, dependency-ordered set the `make mvp` action drives, defined alongside the action in `BACKLOG.md`). The spine makes the real superadmin -> admin -> resident invite/onboarding flow work with **real email + real accounts**; the screens + pure logic already exist and pass offline, so the spine switches on the live backend + email delivery. T168 itself is config/runbook only: updated `.env.example` (Supabase "Confirm email" OFF since the invite link is the verification; Resend needs a verified sending domain), added `RUNBOOK-MVP.md` (the Supabase + Resend + Netlify provisioning checklist + smoke steps), and a `DECISIONS.md` block (email-as-verification, deploy-to-Netlify run target, `APP_URL` = resident origin). Verified the existing live gates (`isSupabaseConfigured`, `isResendConfigured()`, `isSupabaseAdminConfigured()`, link base from `APP_URL`) need no change. No source change. Remaining spine: T169 (live superadmin + grant), T92 (provisioning function + wire superadmin send), T55 (live invite write/consume + real account creation), T115 (live apartments). 140 files / 1208 tests green.
- **2026-05-27 — T166 (P3) Skip the feature-request clear when a toggled-on module has no pending demand.** Added a cheap pure `hasAnyRequest(requests, asociatieId, featureKey)` presence selector to `featureRequestLogic.ts` and guarded `featureRequestStore.clearFor` with it: when no demand is recorded for `(asociatie, module)` the store returns early instead of running a no-op `set(...)` + best-effort `mirrorClear` DB delete. Since an admin enabling a module via the normal `Switch` (T161) usually turns on something nobody requested, this trims a wasted `feature_requests` delete on nearly every enable live; the clear behaviour is byte-for-byte identical when there IS demand, and the triage enable/dismiss paths (T151/T162, which only ever act on modules with demand) are unaffected. UI unchanged. 3 new `hasAnyRequest` unit tests. Backend-free offline. 140 files / 1208 tests green.
- **2026-05-27 — T162 (P3) "Dismiss without enabling" action on the feature-request triage queue.** Each triage row on `FeaturesAdminPage` now offers a secondary "Respinge" / "Dismiss" action beside "Activează", behind a confirm `Modal`, that clears the module's pending resident requests (reusing `clearFor`, so the live `mirrorClear` delete fires under the existing policy) WITHOUT flipping the feature flag, and records a distinct `feature.request_dismissed` audit event (`requested -> dismissed`) so the decision stays traceable. New audit action wired into `AUDIT_ACTIONS`, `ACTION_TONE` (neutral), and the `audit.action.*` labels (RO+EN); 4 new `features.*` locale keys (RO+EN). New component test `featuresAdminDismissRequest.test.tsx` (3 tests). Backend-free; the live delete mirror already existed. Surfaced T167 (responsive triage-row actions on narrow viewports). 140 files / 1205 tests green.
- **2026-05-27 — T161 (P3) Clear satisfied feature requests when a module is enabled via the normal toggle.** The per-feature `Switch` on `FeaturesAdminPage` now calls `clearRequests(asociatieId, f.key)` on the off->on transition (guarded by `if (v)`), matching the triage "enable" action, so a module enabled through the regular toggle clears its pending resident requests instead of leaving the rows lingering in `featureRequestStore`/`feature_requests`. Disabling (on->off) leaves requests untouched. New component test `featuresAdminToggleClears.test.tsx` (3 tests) pins the toggle-path guard. Backend-free; the live delete mirror already existed. 139 files / 1202 tests green.
- **2026-05-27 — T131 (P2) Format-validate the asociație identity in BuildingSettingsPage.** New shared `src/shared/lib/identity.ts` holds the canonical `normalizeIban`/`isValidIban`/`isValidCui`/`isValidPhone` validators (moved out of `platformProvisioningLogic.ts`, which now imports + re-exports them) and re-exports `isValidEmail`, so the main app no longer needs to reach into `src/platform`. New pure `validateBuildingIdentity(form)` in `buildingLogic.ts`: name required (>= 3 chars), CUI/IBAN/phone/contact-email optional but format-checked when filled, IBAN normalised for validation + storage. `BuildingSettingsPage` shows bilingual inline field errors and blocks save (with a `building.fixErrors` toast) when invalid, storing the IBAN normalised. New `building.fixErrors` + `building.err.*` keys (RO+EN). 5 new `buildingLogic` tests. Surfaced T165 (Textarea error lacks `aria-describedby` linkage). 138 files / 1199 tests green.
- **2026-05-27 — T146 (P2) Capture the invitee's display name + seed a minimal profile offline on account creation.** `AccountSetupPage` (`/configurare-cont`) gains a required "Nume complet" / "Full name" field; on a successful redeem/consume, when `!isSupabaseConfigured`, it seeds `profileStore` for the redeeming user id via `saveProfile(seedProfile(...))` so the chrome + F36 directory show who joined without a profile edit. Pure logic: `accountSetupLogic.ts` adds `name` to `AccountForm`, `nameInvalid` to the result, and `isValidName` (trimmed 2-80 chars, no character class so RO diacritics/hyphens pass); `profileLogic.ts` adds `firstName` + `seedProfile` (full name + email, display name = first token, rest empty). Live name persistence (real `users` row) stays T55. 3 new locale keys (RO+EN). 8 new + updated `accountSetupLogic` tests, 4 new `profileLogic` tests. Surfaced T164 (seed profile locale from active UI language). 138 files / 1194 tests green.
- **2026-05-27 — T160 (P2) Validate email format in CSV import rows before issuing invites.** `resolveImportBatch` in `csv.ts` now reuses the canonical `isValidEmail` from `@/features/auth/authLogic` (no new validator extraction needed; matches the existing `shared/lib/env.ts` + `shared/lib/supabase.ts` import direction). An `opt_in && email` row with a malformed address (e.g. "ionescu", "x@") is still created (`toCreate`) but withheld from `toInvite`, with a bilingual-context warning appended to `errors` ("Rândul N: <label> are email invalid, nu se va trimite invitație."), so no bad recipient is stored on an `InviteCode` or sent. Non-opted-in rows with a bad email produce no warning. 4 new `resolveImportBatch` unit tests. Surfaced T163 (split row warnings from blocking errors in the import summary UI). 138 files / 1183 tests green.
- **2026-05-27 — T151 (P2) Admin triage surface for resident feature requests.** Pure helpers added to `featureRequestLogic.ts`: `summarizeRequests` (group by module, requester count + names, newest-first), `clearRequestsFor` (tenant+module scoped), `replaceAsociatieRequests` (live hydration swap). `featureRequestStore` gained `summaryFor`, `clearFor` (set + best-effort `mirrorClear` delete) and `hydrateFor` (live select of the tenant slice, no-op offline). `FeaturesAdminPage` renders a "Requested by residents / Cerute de locatari" triage section above the category list for still-disabled requested modules: per-row icon/title/count/names + one-tap "Enable" that flips the flag, clears the satisfied requests, audits `feature.enabled`, and toasts. 5 new locale keys (RO+EN). 8 new unit tests. Surfaced T161 (clear requests on the normal toggle too) + T162 ("dismiss without enabling" action). 138 files / 1179 tests green.
- **2026-05-27 — T159 (P2) SecurityPage step-up OTP channel support.** `SecurityPage` step-up card now mirrors the full LoginPage channel picker + OTP flow: auto-selects single channel, shows channel picker for multiple options, full send/demo-code/verify/resend/change-channel flow for email and Telegram, `verifyChallenge` fallback for TOTP/recovery. New `stepUpAvailableChannels()` uses `enrolled` (not `demoSecret`) for correctness. 8 component tests in new `securityPageStepUp.test.tsx`. 138 files / 1172 tests green.
- **2026-05-27 — T156 (P1) ApartmentsPage CSV import + auto-invite.** New `resolveImportBatch` pure helper in `csv.ts` (two-pass duplicate detection: registry keys + within-CSV dedup, returns `{toCreate, toInvite, errors}`). `ApartmentsPage`: hidden file input + "Import lista" button (both in header bar and empty-state); `handleFileSelected` async handler: parse -> dedup -> `createApartments` -> issue invites for opt-in rows via `inviteStore.issue` + `sendInviteEmail` + `markEmailSent`; dismissible amber error panel for per-row errors; success toast with apartment + invite counts. 5 new locale keys (RO+EN). 9 new `resolveImportBatch` unit tests. 137 files / 1164 tests / build all green.
- **2026-05-27 — T116 (P1) CSV occupant round-trip + `rowToApartment` helper.** `ApartmentImportRow` extended with `name`, `email`, `numar_persoane`, `proprietar`, `opt_in`; `parseApartmentsCsv` accepts new and legacy headers with bool coercion ("true"/"1"/"da"); new `rowToApartment(row, asociatieId)` converts a parsed row to a full `Apartment` with a typed `persons` entry and correct person-count defaulting. 137 files / 1155 tests / build all green.
- **2026-05-27 — T141 (P1) Migrations + Custom Access Token Hook for app-managed session elevation.** New `supabase/migrations/20260527000001_mfa_channels_hook.sql`: `mfa_channels` (RLS, self read/insert/delete, unique user+channel); `mfa_otp_challenges` (RLS on, zero policies = service-role-only, code_hash/salt, confirm_token_hash, attempts, session_id); `session_elevations` (RLS on, zero policies, unique session_id, channel includes 'recovery' for T29); `custom_access_token_hook` (SECURITY DEFINER, `set search_path = ''`, reads session_id from claims, looks up session_elevations, injects app_2fa_at + app_2fa_channel, revoke-from-public, grant to supabase_auth_admin only). Dashboard activation documented in migration header. New `mfaChannelsHook.test.ts` (24 tests). 137 files / 1141 tests / build all green.
- **2026-05-26 — T140 (P1) Demo-mode email + Telegram 2FA channels.** Extended `mfaStore` with OTP channel support: `demoEnabledChannels`, `demoOtpChallenges`, `demoResendAt`, `otpThrottles`, `pendingDemoRole`; actions `enableChannel`/`disableChannel`/`requestOtp`/`verifyOtp`/`verifyConfirmToken`/`enabledChannels`. `challengeRequired()` now returns `true` when any delivered channel is enabled. `SecurityPage`: new "Second-factor channels" card with email + Telegram enable/disable. `LoginPage`: channel picker + OTP send/verify flow + resend cooldown timer + demo code badge. New `Confirm2faPage` at `/confirma-2fa`. New `auth.mfa.channels.*` + `auth.mfa.confirm2fa.*` + error keys in RO/EN. 22 new unit tests (`otpChannelStore.test.ts`). E2E happy path added. 136 files / 1111 tests green. Open tasks: T141 (P1: migrations + hook), T116, T156 (CSV import), T151, T149, ...
- **2026-05-26 — T126 (P1) Notifications inbox + "locatar joined" notice.** New `notificationLogic.ts` (pure: `AppNotification`, `createNotification`, `buildMembershipJoinedNotification`, mark/filter/count helpers). New persisted `notificationStore.ts` seeded from `DEMO_NOTIFICATIONS` (2 demo entries). `authStore.redeemInvite` now calls `emitMembershipJoined` on success, targeting the invite's `createdBy` user. `NotificationsPage.tsx` rebuilt as a real inbox (bilingual title/body from `kind`+`data`, relative age, click-to-read, mark-all-read). Topbar bell badge shows live unread count. CSS: `.iconbtn__badge` + `.notif-row*` styles. 10 new locale keys (RO+EN). 25 new unit tests (`notificationLogic.test.ts`). E2E: T126 happy-path added to `smoke.spec.ts`. 135 files / 1085 tests green. Open tasks: T140, T141 (P1: 2FA channels), then T116, T156 (CSV import), T151, T149, ...
- **2026-05-26 — T155 (P1) ApartmentsPage CSV template download.** `generateApartmentsCsvTemplate()` in `csv.ts` (header `scara,numar_apartament,name,email,numar_persoane,proprietar,opt_in` + 3 sample rows, CRLF). "Descarca sablon .csv" button added to both the populated header bar and the empty-state area. 5 new unit tests. 134 files / 1072 tests green. Open tasks: T116, T156 (CSV round-trip + import), then T126, T140, T141, ... (P1 queue).
- **2026-05-26 — T90 (P1) Invite QR via shared QrCode component.** New `src/shared/lib/qr.ts` (`generateQrDataUrl` wrapping `qrcode.toDataURL`, pure `qrDownloadFilename`). New `src/shared/components/QrCode.tsx`: async PNG generation via Canvas API, shimmer placeholder while loading, one-tap PNG download via programmatic `<a>` click, silently returns null on canvas failure. `InvitesAdminPage`: per-invite "Afișează QR"/"Ascunde QR" toggle button (tracked by a `Set<string>` of open IDs), renders `<QrCode value={link} label={code} />` when open. CSS: `.qr-code` / `.qr-code__img` / `.qr-code__download` in `primitives.css` with fade-in animation and `prefers-reduced-motion` guard. New locale keys `common.downloadQr`/`common.qrCodeAlt` and `invites.showQr`/`invites.hideQr` (RO+EN). 6 new `qrDownloadFilename` unit tests. Decision: used existing `qrcode` package instead of adding `qrcode.react`; PlatformAsociatiiPage QR moot since T152 moved setup links to email only (T153 already embeds QR in the email template). 134 files / 1062 tests green. Open tasks: T155, T156, T116 (CSV template + import on ApartmentsPage), then T126, T140, T141, ... (P1 queue).
- **2026-05-26 — T154 (P1) Onboarding: setup link -> OnboardingWizard -> Apartamente page.** New `postSetupRoute(kind)` helper in `accountSetupLogic.ts` (unit-tested); `AccountSetupPage` now redirects setup tokens to `/onboarding` and invite tokens to `/app`; `OnboardingWizard` slimmed to 3 steps (Profile + Features + Branding, CSV-import and bulk-invite steps removed) and navigates to `/app/admin/apartamente` on finish. Locale `finishHint` updated (RO+EN). 2 new tests. 133 files / 1056 tests green. Open tasks: T155, T156, T116 (MVP priority: CSV template + import on ApartmentsPage), then T90, T126, T140, ... (existing P1 queue).
- **2026-05-26 — T152 (P1) Superadmin dedicated Add Asociatie page.** New `PlatformAddAsociatiePage.tsx` at `/consola/asociatii/adauga`: admin name + email fields only, "Trimite invitatie" button, simulated email dispatch, success banner ("Invitatie trimisa la {email}") with re-send and back-to-list CTAs. New `validateAdminInvite` / `blankAdminInvite` in provisioning logic; new `PendingAdminInvite` type + `inviteAdmin()` + `markAdminEmailSent()` in platform store (persist v4). `PlatformAsociatiiPage` updated: button navigates (no modal), both modals removed, setup code/link rows removed from cards, new "Invitatii in asteptare" section. Router: `asociatii/adauga` route added. CSS + locale (RO + EN `platform.addAsociatie.*`). 7 new unit tests. 133 files / 1054 tests green. Open tasks: T154, T116, T155, T156 (MVP priority), then T90, T126, T140, T141, ... (existing P1 queue).
- **2026-05-26 — T153 (P1) Admin invitation email: polished bilingual template + embedded QR code.** New `buildAdminInviteEmail` in `src/shared/lib/inviteEmail.ts`: branded header, admin-role intro (RO+EN), rounded-pill CTA, optional QR code block (200x200 inline PNG), 24h expiry footer. `invite-email` Netlify function: new `kind` field (`'admin_setup'` | `'resident_invite'`); generates QR via `qrcode.toDataURL()` (non-fatal fallback) then calls `buildAdminInviteEmail`; unchanged resident path. `qrcode` added to deps. 8 new unit tests. 133 files / 1047 tests green. Open tasks: T154, T116, T155, T156 (MVP priority), then T90, T126, T140, T141, ... (existing P1 queue).
- **2026-05-26 — T148 (P1) `invite-email` function hardened (open relay closed).** New `_shared/supabaseAdmin.ts` (service-role client, `verifyBearerToken`, `isAdminOfAsociatie`, `getInviteById`, `getAsociatieName`) and `_shared/rateLimiter.ts` (pure sliding-window, 20 sends per 10 min per caller+asociatie). Function now requires Bearer auth, resolves caller server-side, looks up invite by id from DB (not from client-supplied fields), rate-limits, asserts admin/presedinte role, builds link from DB token. New migration adds `token` column to `invite_codes`. `inviteEmailApi.ts` updated to send `{ inviteId }` + Bearer header. 133 files / 1039 tests green.
- **2026-05-26 — T157 (P1) Invite code UI removed from all surfaces.** `InvitesAdminPage`: removed the code chip and "Copy code" button from each invite row (link, email, and revoke remain); issue toasts no longer echo the code. `AccountSetupPage`: removed the manual code-entry fallback input; arriving without a `?token=` now shows a clean bilingual "Link invalid" error state. New `setup.noTokenTitle`/`setup.noTokenBody` locale keys (RO+EN); `invites.issued` and `invites.autoIssued` updated to remove code interpolation. `inviteLogic.ts`, `inviteStore.ts`, and DB schema unchanged (code field preserved for backward compat). 132 files / 1031 tests green.

## 0a. Previous status (2026-05-26, T150 locked-feature request channel)

- **2026-05-26 - T150 (P2) Locked-feature "ask the admin" request channel.** A
  resident reaching a module the asociație has not enabled now meets a premium
  `LockedFeatureNotice` (new `src/app/LockedFeatureNotice.tsx`, replacing the bare
  `EmptyState` in `FeatureRouteGuard`) with a "Cere activarea"/"Request activation"
  CTA that records a dedup-per-(asociație, module, resident) request and settles
  into a confirmed state. New pure `featureRequestLogic.ts`
  (`newFeatureRequest`/`hasRequested`/`addRequest`) + persisted
  `featureRequestStore.ts` (offline-first, best-effort mirror to `feature_requests`).
  New RLS migration `20260526000004_feature_requests.sql` (tenant-scoped, self
  file/read/withdraw, admin read/clear, no update, unique per resident+module).
  Also reworded the apartment `deleteConfirm` to a clearer permanent-deletion
  phrasing (RO+EN). New `featureRequestLogic.test.ts` + `featureRequestsRls.test.ts`.
  `lint`/`typecheck`/`test` (132 files / 1031 tests)/`build` all green. Queued T151
  (admin surface to triage the `feature_requests` queue) P2.
- **2026-05-26 — T147 (P1) Invitation email delivery.** Both the apartment edit
  surface ("Trimite pe email") and the invites surface now deliver an invitation
  by email instead of an "coming soon" stub. New pure `src/shared/lib/inviteEmail.ts`
  (`buildInviteEmail`/`resolveEmailLocale`) renders a bilingual RO/EN email (subject
  + text + HTML, escaped, CTA button + copyable link) keyed off the recipient's
  locale, importable by both the client and the Netlify function. `InviteCode` gained
  `emailSentAt`/`emailDeliveredAt` + `markInviteEmailSent`/`canEmailInvite`;
  `inviteStore.markEmailSent`. Dual-mode `inviteEmailApi.sendInviteEmail` simulates
  offline, POSTs to the new `invite-email` Netlify function live, which sends via the
  new `_shared/resend.ts` (`sendEmail` over Resend, no PII logged). New audit action
  `invite.email_sent`; migration `20260526000003_invite_email_delivery.sql` adds the
  two delivery columns. New `inviteEmail.test.ts` + extended `inviteLogic.test.ts`.
  `lint`/`typecheck`/`test` (130 files / 1019 tests)/`build` all green. Queued T148
  (authorize the function caller, no open relay) P1, T149 (Resend delivery webhook
  -> `emailDeliveredAt`) P2.
- **2026-05-26 — T124 (P1) Account-creation-on-redemption landing.** New shared
  bilingual `AccountSetupPage` at `/configurare-cont` replaces the code-only
  `JoinAsociatiePage` (deleted): an invitee arriving by onboarding deep link
  (`?token=`) or the short fallback code sets a password twice, and on submit the
  matching token/code is consumed once (single-use, 24h, replay-safe) and the
  membership is activated offline — `admin` for an admin setup link, the code's
  role for a locatar invite — landing them in `/app`. New pure
  `accountSetupLogic.ts` (`resolveOnboarding` token-or-code for both kinds,
  `setupProvisionStatus`, `evaluateAccountForm`); `authStore.redeemInvite` +
  `activateProvisionedAdmin`; `platformAsociatiiStore.consumeSetup` (replay-safe)
  + `redeemedAt` (persist v3) + `setupProvisionLinks`. `ONBOARDING_REDEEM_PATH`
  moved to `/configurare-cont` in one place; legacy `/onboarding/alatura`
  redirects (query-preserving). `PasswordStrengthMeter` extracted to a shared
  component used by `LoginPage` + the new page. Bilingual `setup.*`. New
  `accountSetupLogic.test.ts` + `accountRedemption.test.ts`; smoke E2E rewired +
  a T124 happy-path. `lint`/`typecheck`/`test` (131 files / 1007 tests)/`build`
  all green. Decision in `DECISIONS.md`. Queued T145 (remove dead `join.*` keys),
  T146 (offline display-name + minimal profile); T136 prerequisite now met.

- **2026-05-26 — T139 (P1) Pure OTP-channel logic + `app2faSatisfied` enforcement
  axis (foundation for email/Telegram 2FA).** User request: add easier second
  factors (email code + click-to-confirm link, Telegram code) for non-technical
  users who lack an authenticator app, keeping TOTP as the gold standard. The
  constraint: Supabase grants real AAL2 only for `totp`/`phone`, so email/Telegram
  are server-verified and the session is elevated via a session-bound `app_2fa_at`
  JWT claim (Custom Access Token Hook). This task ships the backend-free
  foundation: new pure `src/features/auth/otpChannelLogic.ts` (unbiased numeric
  OTP, salted SHA-256 hash + constant-time verify, confirm-token, expiry/cooldown
  clocks, channel taxonomy, email/Telegram masking) and extended `mfaLogic`
  (`mfaEnforcementRedirect` gains an opt-in `app2faSatisfied` axis so an
  email/Telegram-only user is not trapped on the security page; four new
  `mfaErrorKey`s). New `otpChannelLogic.test.ts` + extended `mfaLogic.test.ts`.
  Decision in `DECISIONS.md`. `npm run lint`/`typecheck`/`test` (127 files /
  983 tests)/`build` all green. Queued the follow-ups T140 (offline UI), T141
  (migrations + hook), T142 (service-role functions), T143 (live wiring), T144
  (server attempt-limit parity); noted T29 should reuse the same elevation primitive.
- **2026-05-26 — T133 (P1) Resident-app base URL for onboarding links built in
  the platform console.** The superadmin console is a separate build on its own
  subdomain, so `env.appUrl` resolves to the platform origin there and a setup
  link minted in the console pointed residents at the wrong host. Added
  `env.residentAppUrl` resolving `VITE_RESIDENT_APP_URL` → `VITE_APP_URL` →
  `window.location.origin` via a new pure, unit-tested `resolveResidentAppUrl`;
  declared `VITE_RESIDENT_APP_URL` in `vite-env.d.ts` and documented it in
  `.env.example`. The four setup-link builders in `PlatformAsociatiiPage` now pass
  `env.residentAppUrl`; the builders stay pure (only the caller's source changed).
  `InvitesAdminPage` stays on `appUrl` (it runs on the resident origin). Decision
  in `DECISIONS.md`. `npm run lint`/`typecheck`/`test` (126 files / 964 tests)/
  `build` all green. No new tasks surfaced; the live cross-origin redirect of the
  superadmin is the separate queued T135.
- **2026-05-26 — T134 (P1) Route a platform superadmin to the console, never
  through association onboarding.** A live platform superadmin exists only in
  `platform_admins` (not in `memberships`), so the main app hydrated them with no
  membership and `RequireAsociatie` bounced them to `/onboarding`; the in-app
  superadmin surface keyed off `activeRole() === 'super_admin'`, which only worked
  in demo because demo seeded a (fake) `super_admin` membership. Added a
  server-authoritative `isPlatformSuperAdmin` flag to `authStore` (`hydrate()`
  resolves `supabase.rpc('is_super_admin')` alongside profile/memberships, error →
  false; `enterDemo(role)` sets it from the role; cleared on sign-out). New pure,
  unit-tested `resolveAsociatieRoute` + `SUPERADMIN_HOME_PATH` in `hydrationLogic`
  (superadmin → console with or without a membership; only a member-less
  non-superadmin → onboarding). `RequireAsociatie`/`AppHome`/`RequireSuperAdmin`/
  `AppLayout` nav all read the flag; `demoTenantContext('super_admin')` now seeds
  **no membership**, matching the live member-less reality (no fake membership).
  The privileged boundary stays DB RLS + service-role re-checks; the flag only
  decides routing. Decision recorded in `DECISIONS.md`.
  `npm run lint`/`typecheck`/`test` (122 files / 934 tests)/`build` all green.
  Surfaced T135 (live cross-origin redirect to the platform subdomain) and T136
  (distinct admin-setup vs resident-onboarding completion signals).
- **2026-05-26 - T123 (P1) Secure tokenized onboarding links.** Onboarding now
  hands out a secure deep link, not just a short code. New shared-lib primitives
  (`generateInviteToken`, 256-bit CSPRNG, 64-hex; `isValidInviteToken`/
  `normalizeInviteToken`; `buildOnboardingLink`; `ONBOARDING_REDEEM_PATH`). The
  `InviteCode` model carries a `token`; `EXPIRY_PRESETS_MS` gained a `24h` preset
  with `ONBOARDING_LINK_TTL_MS`/`onboardingExpiry`; `findByToken` + `buildInviteLink`
  added; the store gained a replay-safe `consumeByToken`. Superadmin provisioning
  mints a `setupToken` + 24h `expiresAt` and a `buildSetupLink`; the platform store
  persists them (v2 + backfilling migrate). The invites admin surface and the
  provisioning card/result modal render the copyable secure link (the short code
  stays the manual fallback). Bilingual RO/EN, decision in `DECISIONS.md`.
  `npm run lint`/`typecheck`/`test` (123 files / 928 tests)/`build` all green.
  Surfaced T133 (resident-app base URL for links built in the platform console);
  token-aware redemption folds into T124, QR into T90, hashing-at-rest into T128.
- **2026-05-26 — T122 (P1) Full asociație identity at superadmin provisioning.**
  Provisioning now captures the asociație's identity up front: address, CUI/CIF,
  registration number, IBAN, contact phone + email (alongside the required core).
  Added `iban`/`contact_phone`/`contact_email` to the `Asociatie` type + an
  additive migration `20260525000003_asociatie_identity.sql`. Extended the pure
  provisioning logic (`ProvisionInputDraft`/`ProvisionInput` + validation) with
  optional-but-format-checked identity fields and new exported validators
  (`isValidIban`/`normalizeIban`, `isValidCui`, `isValidPhone`); the provisioning
  form gained the six inputs and each console card renders the identity. For
  field parity the admin's `BuildingSettingsPage` gained matching IBAN + contact
  inputs. Demo seeds carry real RO sample values. Bilingual RO/EN, decision
  recorded in `DECISIONS.md`. `npm run lint`/`typecheck`/`test` (121 files / 910
  tests)/`build` all green. Surfaced T131 (format-validate identity in building
  settings too) and T132 (echo identity in the provisioning result modal).
- **2026-05-26 — Onboarding/provisioning data-flow audit (docs + backlog).**
  Reviewed the full path with the user (superadmin provisions asociație + first
  admin -> admin onboards via a secure link and sets a password -> admin invites
  locatari -> locatar onboards and the admin is notified) and documented the
  canonical flow in a new `ONBOARDING_FLOW.md` (actors, the four stages, the
  token/security model, the demo-vs-live split, and a stage->file->task map).
  Four decisions recorded in `DECISIONS.md`: secure opaque token link + QR with
  the short code as a manual fallback (D1); account created on redemption with a
  "set password twice" landing (D2); onboarding links fixed at 24h + a 24h preset
  (D3); a real in-app notifications inbox emitting a "locatar joined" notice to
  the admin (D4). Queued the work as P1 tasks T122 (full asociație identity at
  provisioning), T123 (secure tokenized links + 24h), T124 (account-on-redemption
  landing page), T90 (repurposed/bumped: shared invite + setup-link QR), T126
  (notifications inbox + joined notice), plus P2 live-activation T127
  (notifications fan-out) and T128 (hash tokens at rest); widened T92 and T55 to
  cover the full identity fields, the hashed 24h token, and account creation on
  redemption. Docs-only change; pipeline unaffected.
- **2026-05-25 — T94 (P2) Superadmin console: asociații + admin provisioning.**
  The first console page (`/consola/asociatii`) lists every asociație
  (members/apartments counts, active/dormant signal, last-admin-sign-in) and
  provisions a new asociație with its first administrator. New pure, unit-tested
  `platformProvisioningLogic.ts` (`validateProvisionInput` with per-field error
  codes + a trimmed request; `provisionAsociatie` minting a one-time setup code
  via the shared `generateInviteCode`, collision-safe; `sortAsociatii`;
  `isDormant`/`daysSince`). New persisted `platformAsociatiiStore` seeded from
  the T93 demo dataset: `provision` adds the summary, records the provisioned
  admin (name/email/setup code) keyed by asociație, and audits the provisioning
  as the genesis of the new asociație's tamper-evident chain
  (`asociatie.provisioned` + `admin.provisioned`, surfacing in T09 + the T95
  viewer). New `PlatformAsociatiiPage` (card grid + provisioning modal with
  inline validation + a setup-code handoff modal), wired into the router +
  sidebar; the home overview's asociații card now links. The privileged live
  write stays the T92 service-role function; the live cross-tenant list read is
  the new T120. Bilingual RO/EN, premium-feel, offline-first. Decision in
  `DECISIONS.md`. Pipeline green: lint, typecheck, 119 files / 883 tests, build
  (both HTML entries + a code-split `PlatformAsociatiiPage` chunk). Surfaced T120
  (live activation: cross-tenant list read + server-mediated provision) and T121
  (E2E for the provisioning console).
- **2026-05-25 — T93 (P2) Separate superadmin app shell (own build +
  subdomain).** Stood up the platform/superadmin console as its own front-end
  under `src/platform/*`, built as a second Vite page: `platform.html` →
  `src/platform/main.tsx`, added to `vite.config.ts`
  `build.rollupOptions.input`, so `npm run build` emits both `dist/index.html`
  (resident/admin) and `dist/platform.html` (operator console) and the
  superadmin bundle is code-split into its own chunk, never shipped to regular
  users. The shell reuses the Supabase client, domain types, i18n (new
  `platform.*` RO/EN keys), theme/tint stores, retry/query config and error
  reporting, but mounts its own `PlatformProviders` (no resident consent
  banner), `platformRouter`, `PlatformLayout` (own topbar + left rail, theme/lang
  toggle, sign-out, demo badge) and a `PlatformHomePage` overview (welcome,
  demo platform totals from a new `demoPlatform.ts`, and roadmap cards for the
  T94-T99 console areas). Access is server-authoritative, never client-trusted:
  a pure, unit-tested `resolvePlatformAccess` (`platformAuthLogic.ts`) drives
  `RequirePlatformAdmin`, and `platformAuthStore.verify()` calls
  `supabase.rpc('is_super_admin')` (the T91 SECURITY DEFINER helper) for a live
  session — any error or `false` denies, an unknown result holds on `verifying`,
  and a `demo` flag grants the offline showcase. `PlatformLoginPage` reuses the
  shared `signIn` live and offers a single demo-console entry offline. New
  `netlify-platform.toml` documents the separate Netlify site (shared build,
  `/* → /platform.html` redirect, tightest CSP: self + Supabase only, COEP
  `require-corp`, `noindex`). New `tests/unit/platformAuthLogic.test.ts` (10
  assertions: the full access-state matrix incl. demo short-circuit and
  verifying-not-denied, plus demo-totals aggregation). Decision in
  `DECISIONS.md`. Pipeline green: lint, typecheck, 118 files / 871 tests, build
  (both HTML entries emitted). MFA on the platform login is deferred to T100.
  Surfaced T118 (verify/lock the `is_super_admin()` RPC grant for the live gate)
  and T119 (platform-shell access E2E). Unblocks the console pages T94-T99,
  which mount under `/consola`.
- **2026-05-25 — T114 (P1) Admin apartment registry (add / configure / edit) +
  building settings.** The admin apartments area is now a full CRUD registry
  instead of a read-only list of `DEMO_APARTMENTS`. First-login empty state leads
  to a bulk-add grid (pick a count, fill entrance/floor/number/owner/area/
  cota-parte/people); each row has a pencil to a dedicated edit page
  (`/app/admin/apartamente/:id`) with a named-occupant list editor alongside the
  editable `numar_persoane` count; the building profile is editable at
  `/app/admin/cladire`. New `src/features/admin/` data layer: pure
  `apartmentsLogic` (zod), a persisted `apartmentsStore` seeded from demo, a
  dual-mode `apartmentsApi` repository (store + best-effort Supabase mirror), and
  a self-contained `asociatieStore` for the building profile. Apartment model
  gained `persons` (jsonb migration `20260525000001`, covered by existing RLS).
  Audit + bilingual strings extended. Pipeline green: lint, typecheck,
  115 files / 834 tests, build. Follow-ups queued: T115 (live Supabase
  activation), T116 (CSV import round-trips occupants), T117 (reconcile `persons`
  with `apartment_residents`).
- **2026-05-24 — T112 (P2) Let a re-gated enrolled-but-AAL1 session complete the
  step-up in-app.** Closed the gap left by T102: the AAL2 re-gate steers an
  enrolled-but-AAL1 privileged session to `/app/securitate`, but that page only
  managed enrolment/recovery, so the session had no in-app way to satisfy the
  second factor short of a full re-login. `SecurityPage` now surfaces an in-app
  step-up `Card` (shown when `challengeRequired()` is true for an enrolled live
  session) wired to the existing `verifyChallenge` — reusing the T31 throttle,
  the lockout toast, and the `auth.mfa.challenge*` strings plus three new
  bilingual `auth.mfa.stepUp{Title,Body,Done}` strings; on success it navigates
  to `/app`. Demo stays ungated (gated on `isSupabaseConfigured`).
  `useMfaEnforcement` was refactored from a cached `aalSatisfied` into a single
  async effect that re-resolves the AAL fresh per navigation (only for an
  enrolled live privileged session) and feeds the unchanged pure
  `mfaEnforcementRedirect`, so a stepped-up session reaching the shell is let
  through instead of being bounced back, while a still-AAL1 session is re-gated
  on any navigation. Tests: +2 in the T30/T102 render harness (20 total) proving
  the re-resolution lets a now-satisfied session into the shell and still bounces
  an unsatisfied one. Pipeline green: lint, typecheck, 113 files / 816 tests,
  build. Follow-up T113 (carry a return-to through the step-up). Recovery-code
  step-up still needs the T29 server routine; the live AAL re-check across a
  token-refresh folds into T08.

- **2026-05-24 — T102 (P2) Re-gate the in-app shell on AAL2, not only on
  enrolment.** Closed the gap where a privileged session that lands on the shell
  enrolled-but-AAL1 (a skipped challenge, a stale tab, an expired step-up, a
  direct deep-link) would pass the in-app 2FA gate. Extended the pure
  `mfaEnforcementRedirect` (`mfaLogic.ts`) with an optional, back-compatible
  `aalSatisfied` axis: the security page is reachable first, an un-enrolled
  privileged session is steered to enrol, and now an enrolled session whose
  `aalSatisfied === false` is also steered — being merely enrolled is no longer
  enough, the session must have passed the second factor. Omitted/unknown AAL is
  treated as satisfied so the gate never steers on a flash. `useMfaEnforcement`
  resolves `mfaStore.challengeRequired()` into the axis (live, enrolled sessions
  only) and feeds the same pure decision; demo/offline stays ungated. Steers to
  the existing security page (the task's "(or the security page)" option) rather
  than re-routing to `/login`. Tests reuse the T30 render harness
  (`mfaEnforcement.test.tsx`, +6 → 18): pure cases (all privileged roles re-gated
  on `aalSatisfied:false`, allowed on `true`, un-enrolled still steered, no loop
  on the security page) and live-routing cases (enrolled-but-AAL1 admin routed to
  `/app/securitate`, enrolled+AAL2 admin reaches the shell, resident never
  re-gated). Pipeline green: lint, typecheck, 113 files / 814 tests, build. The
  live AAL re-check across token-refresh folds into the live E2E (T08).

- **2026-05-24 — T91 (P1) Platform superadmin identity + cross-asociatie RLS
  foundation.** Established the platform tier the whole superadmin surface
  (T92/T100/T93-T99) depends on, as an additive idempotent migration
  (`20260524000002_platform_superadmin.sql`). New `platform_admins` table (PK
  `user_id`, no `asociatie_id` — platform-wide, not tenant data), RLS-enabled
  with a super-admin-only read policy and **no** client write policy (the roster
  changes only through the T92 service-role function, which bypasses RLS, so it
  can't be self-escalated from the browser). New `is_super_admin()` helper
  mirrors `is_member`/`has_role` (`stable security definer set search_path =
  public`, platform-wide, reads `platform_admins`). Cross-tenant access added as
  **separate additive permissive SELECT policies** gated on `is_super_admin()` on
  `asociatii`, `memberships`, `audit_log` — Postgres ORs permissive policies, so
  a platform admin gains platform-wide read while no tenant member's scope
  changes. The tier is **read-only client-side**: no cross-tenant
  write/update/delete policy anywhere; `users` deliberately not granted
  cross-tenant read (resident-PII least privilege). New backend-free guard
  `tests/unit/platformSuperadmin.test.ts` (9 assertions: helper is
  platform-wide/security-definer/fixed-search-path reading the roster;
  `platform_admins` created + RLS-enabled + no `asociatie_id`; read-only roster
  with no client write; each table's `for select` is_super_admin gate; **every**
  is_super_admin policy is `for select` so the tier can't write; no
  `using (true)`; original member policies intact). Verified against the RLS
  guards (T35/T04/T70/T46/T71). Decision in `DECISIONS.md`. Pipeline green: lint,
  typecheck, 113 files / 808 tests, build. Surfaced T111 (drop the stale
  `super_admin` value from the per-asociație `memberships` role check). Unblocks
  T92, T100 and the console T93-T99.

- **2026-05-24 — T24 (P1) Consumer-rights surface (ANPC / SOL).** Surfaced the
  mandatory consumer-protection information for a distance SaaS contract with
  consumer residents as a new public `LegalDoc` (`consumerRights`) in
  `legalContent.ts` (same typed bilingual pattern as privacy/terms/cookies):
  who provides the service + contact, pre-contractual information (OUG 34/2014,
  Directive 2011/83/UE), the 14-day right of withdrawal (with the
  started-service / fully-performed carve-outs), refunds, complaints + ANPC
  (Autoritatea Națională pentru Protecția Consumatorilor, B-dul Aviatorilor nr.
  72, Sector 1, București; www.anpc.ro), online + alternative dispute resolution
  (the EU ODR/SOL platform at ec.europa.eu/consumers/odr; SAL per OG 38/2015;
  Romanian courts remain competent) and an in-app help route. New
  `ConsumerRightsPage` (reuses `LegalDocPage`) at the public route
  `/protectia-consumatorului`. Wired into Terms (a new "Consumer
  rights"/"Drepturile consumatorilor" section in both languages) and linked from
  the three legal-link surfaces — app footer (`AppLayout`), login footer
  (`LoginPage`), privacy-settings documents card (`PrivacySettingsPage`, `Scale`
  icon) — via a new bilingual `consent.consumerLink` string. Fully offline, no
  backend. New `tests/unit/consumerRights.test.ts` (7 assertions): non-empty doc
  with ≥6 sections + no blank paragraph in both languages, ANPC + www.anpc.ro,
  the ODR/SOL URL, the 14-day withdrawal under OUG 34/2014, refunds +
  pre-contractual info, the SAL/OG 38/2015 route, and that Terms carries a
  consumer-rights section — so a required element can't silently drop. Decision
  in `DECISIONS.md`. Pipeline green: lint, typecheck, 112 files / 799 tests,
  build. Surfaced T110 (present the pre-contractual info + express-consent /
  withdrawal acknowledgement at the billing checkout when T19 lands). The
  billing-surface wiring proper folds into T19.

- **2026-05-24 — T74 (P2) Declare each feature's processing profile on the
  registry (single source for the ROPA).** Removed the parallel `FEATURE_OVERRIDES`
  map inside `ropaLogic` so the art. 30 register is generated from the same module
  that defines each feature. `registry.ts` now owns the GDPR processing vocabulary
  — `RopaDataCategory`, `ProcessingProfile`, the `RECIP_*` recipient-key constants,
  `CATEGORY_DEFAULTS`, and a new optional `FeatureDef.processing?: Partial<ProcessingProfile>`
  that shallow-merges over the category default. The 11 special-case overrides
  (F05 anonymous, F10/F12 legal, F20/F44 financial, F28 location, F36/F37/F49/F63/F64
  consent opt-in) now live inline on their `FeatureDef`. The types live on the
  registry (not `ropaLogic`) to keep the dependency direction correct and avoid a
  cycle; `ropaLogic.profileFor` reads `feature.processing` and re-exports
  `CATEGORY_DEFAULTS`/the types for stable import sites. No locale change (keys
  moved, not added). `ropaLogic.test.ts` adds 3 guards (override declared on the
  registry + resolved profile = default ⊕ override; override-free features inherit
  the category default verbatim; every declared override is well-formed). Decision
  in `DECISIONS.md`. Pipeline green: lint, typecheck, 111 files / 792 tests, build.
  Surfaced follow-up T109 (semantic guard for a feature that *should* override but
  doesn't).

- **2026-05-24 — T23 (P1) Minors' consent guardrails (Legea 190/2018).** Made the
  "no feature collects identifying data about children" rule enforced, not just
  declared. New pure `src/shared/lib/minorsGuard.ts`: the aggregate field
  allowlists `KIDS_AGE_RANGE_FIELDS`/`KIDS_EVENT_FIELDS`, an identity-name
  detector (`MINOR_IDENTITY_FIELD_PATTERNS`/`minorIdentityFields` — flags
  `child_name`, `copil_*`, `data_nasterii`, `cnp`, `școală`, `birthday`, but not
  the responsible adult's `user_id`/`organizer_name`), and
  `assertAggregateOnly(record, allowed, context)` throwing `MinorIdentityError`.
  The F64 kids store now calls the guard on every write, so an identifying field
  can never reach the store. New `tests/unit/minorsGuard.test.ts` (14): detector
  positives/negatives, the runtime guard, a structural lock parsing `domain.ts`
  (the `KidsAgeRange`/`KidsEvent` types must equal the allowlists), a schema lock
  parsing the migration (no child-identifying column), and that the live store +
  demo seed hold no child identity. Enhanced the privacy policy "Minori"/"Children"
  sections (RO+EN) to cite GDPR art. 8 + Legea 190/2018 art. 8 and state the rule
  is enforced technically. New `MINORS_PRIVACY.md` reference doc; decision in
  `DECISIONS.md`. Pipeline green: lint, typecheck, 111 files / 789 tests, build.
  No new problems surfaced (F64 is the only minor-facing feature; the guard is
  ready for any future one).

- **2026-05-24 — T12 (P1) F67 Acasă personalizabil (customizable home).** The
  second Category-9 personalization feature, completing the pair with F66. New
  pure, unit-tested `homeLayoutLogic` (`src/features/home/`): the `HomeCard`
  model (`{ key, visible, size: 'compact' | 'expanded' }`); `homeCardCatalog`
  returns the enabled, routed features in registry order (the single source for
  the card catalog, so a disabled feature is never offered); `defaultLayout`
  shows the first `DEFAULT_VISIBLE_COUNT` (6) and hides the rest;
  `reconcileLayout` keeps a saved layout's order/visibility/size for still-enabled
  keys, drops disabled keys and appends newly enabled ones (so it can never
  reference a disabled feature); non-mutating `toggleCardVisible`/`cycleCardSize`/
  `moveCard`/`moveCardTo`, plus `visibleCards`/`isDefaultLayout`/`layoutForKey`
  (stable frozen empty reference)/`layoutStorageKey` (12 assertions). Persisted
  `homeLayoutStore` (`vecini.home`) keyed by `${residentId}::${asociatieId}`
  with `save`/`reset`/`forKey`/`hasLayout` + a `useHomeLayoutKey()` hook. Rewrote
  `HomePage`: a `Personalizează` pencil flips the grid into edit mode (eased
  transitions) where each card has show/hide, up/down reorder + native
  drag-and-drop and a compact↔expanded size toggle; `Resetează la implicit`
  (disabled at default) + `Gata` exit; every edit autosaves per resident. View
  mode renders only visible cards in order (expanded = two columns) with an
  all-hidden empty state; announcements/polls show outside edit mode. Additive,
  idempotent migration `20260524000001_home_layouts.sql` (resident+asociație FKs,
  ordered `cards` jsonb, one-per-resident-per-asociație unique, owner-only +
  tenant-tightened `is_member` for-all RLS). Backend-free schema-parity guard
  `homeLayoutSchema.test.ts` (3). Bilingual `home.*` RO/EN; no bot command (web
  surface). Verified against the RLS-coverage (T35), tenant-isolation (T04/T46)
  and helper-column (T70) guards. Pipeline green: lint, typecheck, 110 files /
  775 tests, build; one E2E (customize → hide F01 card → leaves the grid →
  survives reload). Surfaced T106 (live persistence under owner RLS), T107
  (touch-friendly pointer drag), T108 (rich per-card home widgets). **Both
  Category-9 personalization features (F66 + F67) are now complete.**

- **2026-05-24 — T11 (P1) F66 Profil complet (rich profile editor).** The pure
  `profileLogic`/`profileStore` existed (committed, unwired); wired them end-to-end
  behind a rewritten `ProfilePage` and rounded out the model. Added the avatar crop
  maths to `profileLogic` (`squareCropRect` center-crop, `avatarThumbDim` cap at 256,
  `AVATAR_MAX_BYTES` 5 MB, `isAcceptedImageType`) on top of the existing per-type
  validators (email/phone/RO-plate/date/number/link → stable error keys),
  `completeness` (0-100 over 10 fields), and the non-mutating custom-field ops
  (`new`/`add`/`update`/`remove`/`move`/`sorted`/`neighbourVisible`). New `ProfilePage`
  at `/app/profil` (replacing the name+language+logout stub): circular avatar
  (file → center-cropped square JPEG data URL via canvas, initials fallback) + live
  completeness bar + autosave (every change persists, transient "Salvat"); standard
  fields (full/display name, phone, email, apartament `Select` prefilling scara/etaj,
  car plate→F28, address, DOB→F63, language→i18n) with inline per-type errors;
  emergency-contact card; custom-fields card rendering the right control per type
  with a private↔neighbours toggle, up/down reorder + delete and an "Adaugă câmp"
  modal; account card linking to Notificări/Securitate/Datele mele/Confidențialitate
  + sign-out. Additive migration `20260523000001_profile_complete.sql` extends `users`
  with the standard columns and adds the owner-RLS `profile_custom_fields` table
  (field_type + visibility checks mirroring the app catalog); apartment link stays in
  `apartment_residents`, avatar reuses `users.avatar_url` live (Storage bucket is a
  follow-up), so the tenant-consistency guards are untouched. Bilingual `profile.*`
  RO/EN, `/profil` bot help, `.profile-link` CSS. Tests: `profileLogic.test.ts` (20) +
  `profileSchema.test.ts` (5, app↔schema parity) + one E2E. Verified the new table
  against the RLS-coverage (T35), tenant-isolation (T04) and apartment-ref (T71)
  guards. Pipeline green: lint, typecheck, 108 files / 760 tests, build. Surfaced
  T103 (live persistence + Storage avatar), T104 (wire car_plate→F28 + visible fields→F36
  + admin profile view), T105 (drag-reorder). F66 is the first of the two Category-9
  personalization features; F67 (T12) is the remaining one.

- **2026-05-23 — T30 (P1) MFA enforcement E2E for live privileged roles.** The
  T02 in-app 2FA gate (`AppLayout` steers an un-enrolled privileged session to
  `/app/securitate`) was untested end-to-end because demo mode has no backend
  role. Extracted the decision into a pure, exported `mfaEnforcementRedirect`
  (+ `MFA_SECURITY_PATH`, `MfaEnforcementInput`) in `mfaLogic` — inert for demo,
  pre-load, non-privileged, already-enrolled, or already-on-page — and moved the
  hook to its own module `src/app/useMfaEnforcement.ts` (so it is testable in
  isolation); `AppLayout` now just imports it and shed its unused MFA imports.
  New `tests/unit/mfaEnforcement.test.tsx` (12 assertions, the suite's first
  `@testing-library/react` render test): a pure-decision matrix over every input
  axis, plus a live routing harness that mocks `isSupabaseConfigured: true`,
  seeds a privileged membership + enrolment status into the real stores, renders
  the hook in a `MemoryRouter`, and asserts the actual redirect (privileged
  un-enrolled → `/app/securitate`, cannot reach another route; resident/enrolled/
  pre-load not steered). Pipeline green: lint, typecheck, 106 files / 735 tests,
  build. Surfaced T102 (re-gate the shell on AAL2-satisfied, not only enrolment)
  and a note on T51 (migrate the hook's role read to `activeRole()`). The full
  browser-level live E2E folds into T08.

- **2026-05-23 — T77 (P2) Aggregate the data-subject export across all the
  subject's asociății.** T73 broadened the art. 15 export to 26 sections, but
  tickets and discussions were read in `MyDataPage` via the active-asociație
  hooks, so a resident in more than one asociație got only the active tenant's
  tickets + forum messages (the flat stores already spanned all asociații). New
  pure, unit-tested union helpers — `ticketsForAsociatii` (`ticketLogic`) and
  `threadsForAsociatii` (`discussionLogic`) — flatten the per-asociație
  `byAsociatie` map across a list of ids, in order, deduping repeated ids and
  ignoring empty asociații (the caller's `reporter_user_id`/`author_user_id`
  filters narrow to the subject). New pure `subjectAsociatieIds(memberships,
  currentAsociatieId)` in `gdprLogic` resolves the asociații whose keyed stores
  may hold the subject's rows (active first, then every membership, deduped).
  `buildExport` now reads the two keyed stores via `getState().byAsociatie`
  (fresh at click time, no render-time selector churn) scoped to those ids, so
  the export is membership-complete; `collectPersonalData` stays pure. The
  active-only hooks are kept for the per-asociație feature views. Tests: +3
  `subjectAsociatieIds` + 1 each in `ticketLogic`/`discussionLogic`. Pipeline
  green: lint, typecheck, 105 files / 723 tests, build. Surfaced T101 (label each
  export section's asociație so a multi-asociație copy is self-describing). The
  remaining export/erasure follow-up is T78 (Storage photo erasure).

- **2026-05-23 — Specced + queued three owner-requested capability areas (no
  code built yet; planning/backlog pass).** Added 13 tasks (T88-T100) to
  `BACKLOG.md` at their priority positions and recorded the requirements in
  `FEATURES.md` / `DECISIONS.md` / `CLAUDE.md`. (1) **Building documents** —
  extend F33 with real file upload (admin/comitet upload, all members view +
  download): T88 (offline, size-capped base64 data URL so demo keeps working) +
  T89 (live Supabase Storage bucket + RLS). (2) **Invite QR** — T90 adds
  `qrcode.react` to render/download a QR of the invite redeem link on the admin
  invite surface. (3) **Superadmin tier** (breaks down the placeholder T20) — a
  **separate app on its own subdomain** (`src/platform/*`) for origin/session
  isolation, with the real protection being database RLS + server-side
  `super_admin` re-checks: T91 (platform identity + cross-asociatie RLS), T92
  (server-side provisioning via Netlify service-role functions — superadmin
  creates admins, admins onboard residents via invites), T100 (mandatory hardened
  MFA), T93 (separate app shell), T94 (asociații + admin console), T95
  (cross-asociatie audit viewer), T96 (platform error feed), T97 (usage/health
  metrics), T98 (audited read-only impersonation), T99 (admin↔superadmin
  messenger). Decisions recorded in `DECISIONS.md`. Feature counts unchanged
  (nothing implemented yet); pipeline untouched (Markdown-only edits).

- **2026-05-23 — T09 (P1) Audit log surface.** Added a cross-feature,
  admin-viewable audit trail. Pure `auditLogic` (`src/features/audit/`): a
  hash-chained `AuditEntry` (`seq` + `prev_hash` + `hash` linking each entry to
  its predecessor) with `appendEntry`, `verifyChain` (recomputes every link →
  `{ ok, brokenAt }`, catching any edit/reorder), `filterEntries`
  (action/entity/actor/text/date range), `pruneExpired` (730-day retention,
  the T06 security window), `auditToJson`/`auditToCsv`, and a deterministic
  `buildDemoAuditChain` seed (14 unit assertions). Persisted (`vecini.audit`)
  `auditStore` keyed by asociație, seeded for demo, `record`/`recordAudit`
  appending to the active chain + mirroring best-effort to `audit_log`; a
  `useAsociatieAudit()` hook. Admin `AuditLogPage` at `/app/admin/jurnal`
  (admin/președinte-gated, sidebar nav): live chain-integrity badge, filter bar,
  JSON/CSV export, newest-first entry list (actor, action, before→after, seq).
  Migration `20260522000021_audit_log.sql` (RLS = admin/președinte read +
  member self-append, **no update/delete** → append-only/tamper-evident).
  Tamper-evidence is two-layered: append-only storage + the re-verifiable hash
  chain. Five cross-feature emitters wired from their pages (feature toggle,
  invite issue/revoke, DSR decision, breach record/advance, announcement
  publish). Bilingual `audit.*`, `/jurnal` bot help, one E2E. Pipeline green
  (105 files / 718 tests). Surfaced T85 (wire the remaining features), T86 (live
  read + server-authoritative chain), T87 (HMAC/Merkle tamper-evidence).

- **2026-05-23 — T07 (P1) Resilience & error handling.** Added the missing
  global resilience layer. A privacy-first, dependency-free error-reporting hook
  (`src/shared/lib/errorReporting.ts`): `scrubMessage` strips emails, JWTs,
  bearer tokens, secret params and long digit runs (UUIDs kept intact),
  `buildReport` scrubs message + stack + extras, `makeRef` mints a quotable
  `IV-XXXX-XXXX` support code, and a pluggable `setErrorSink` keeps it
  **Sentry-ready** with no bundle dependency (no sink wired by default →
  dev-console no-op in production until one is attached). `installGlobalErrorHandlers`
  (in `main.tsx`) catches `window.onerror` + unhandled rejections. A class
  `ErrorBoundary` reports through the hook and shows a friendly bilingual
  recovery state (reference + retry/home), placed at the app shell and around
  each route `Outlet` (keyed by pathname, so one page crash keeps the shell
  usable). New `ErrorState` component joins `EmptyState`/`SkeletonList` as the
  standardized state family. Request retry/backoff (`src/shared/lib/retry.ts`):
  capped exponential `backoffDelay` + `isRetryableError` (5xx/network/408/429
  retry, 4xx/abort fail fast) wired into the react-query `QueryClient` for
  queries and mutations. Tests: `errorReporting.test.ts` (12) + `retry.test.ts`
  (11). Pipeline green (104 files / 704 tests). Surfaced T82 (live error sink),
  T83 (adopt the states across all pages + surface query errors), T84 (route
  store-action failures through the hook).

- **2026-05-23 — T31 (P1) MFA challenge attempt throttling.** The login-time
  TOTP/recovery challenge accepted unlimited attempts, so a stolen password plus
  brute force over the 6-digit space was not rate-limited client-side. Reused the
  T03 `loginThrottle` (sliding-window budget + escalating, capped lockout) on the
  challenge via a persisted single `challengeThrottle` in `mfaStore`:
  `verifyChallenge` pre-locks while a lockout is in force, clears on success, and
  counts a failure only on a wrong-credential guess (`invalidCode`) — config
  errors (`not-enrolled`/`recovery-live-unavailable`) never lock anyone out.
  Returns `{ error, lockedMs }`; `LoginPage` shows a bilingual `auth.mfaLockout`
  toast. Two privacy-safe audit events (`mfaChallengeFailed`/`mfaChallengeLocked`)
  added + rendered on `SecurityPage`. Guard `mfaChallengeThrottle.test.ts` (5
  assertions). Pipeline green (102 files / 681 tests). Surfaced T81 (server-side
  challenge-limit parity). Live MFA security hardening for the spine continues;
  remaining auth follow-ups T29/T30/T32/T33 need a provisioned backend.

- **2026-05-23 — T38 (P1) Anonymous-survey / vote / ranking response privacy.**
  `survey_responses`, `votes` and `priority_rankings` shipped on the standard
  `apply_standard_rls` "members read" policy, so any member of the asociație
  could read every individual row — who answered an "anonymous" survey
  (`surveys.anonymous` defaults true), how each neighbour voted, what each
  apartment ranked. A within-tenant privacy leak (less severe than the
  cross-tenant T34, but real). New additive, idempotent migration
  `20260522000020_response_privacy.sql` drops the blanket "members read" and
  "comitet write" (for-all) policies on all three and replaces them with
  least-privilege RLS: a respondent reads only their own row; comitet reads
  individual survey rows only for a NON-anonymous survey (never anonymous,
  polls or rankings); votes default to ballot secrecy (formal AGA votes keep
  their separate `aga_votes` visibility); cast survey/vote rows stay immutable
  while a per-apartment ranking is revisable through `apartment_residents`.
  Member-visible results are served attribution-free by three `security definer`
  (fixed search_path, `is_member`-gated) functions returning counts only:
  `survey_tally`, `poll_tally`, `priority_ranking_turnout`. Backend-free guard
  `responsePrivacyRls.test.ts` (13 assertions) locks the shape in. Pipeline
  green: lint, typecheck, 101 files / 676 tests, build.
- **2026-05-23 — T35 (P1) Automated RLS-coverage guard (regression test).**
  T34 happened because three tables shipped with RLS never enabled and nothing
  caught it. New backend-free guard `tests/unit/rlsCoverage.test.ts` (5
  assertions) parses every migration, collects all **124** public `create table`
  names, and asserts each is RLS-enabled — recognising the two real enabling
  paths (a direct `alter table X enable row level security`, or a
  `apply_standard_rls('X')` call, which the macro runs before adding policies;
  30 direct + 94 via the macro, disjoint). A second assertion catches the subtle
  variant where a non-enabling macro (`apply_owner_rls`/`reapply_owner_rls`/
  `apply_member_insert_rls`/`apply_governance_owner_rls`) adds a policy to a table
  whose RLS was never enabled — in Postgres that policy is silently ignored and
  the table is open — checking all 27 such targets are also enabled; a third
  parses the owner/member-insert macro bodies to pin that they contain no
  `enable row level security`, so a future edit can't quietly invalidate the
  coverage logic. Complements `rlsTenantIsolation.test.ts` (T04 invariants) and
  `rlsHelperColumns.test.ts` (T70 column existence); live cross-tenant tests
  remain T08. Pipeline green: lint, typecheck, 100 files / 663 tests, build.
  Surfaced T79 (guard that every RLS-enabled table also carries at least one
  policy — deny-all is a broken feature, not a leak, so lower priority).
- **2026-05-23 — T73 (P1) Broaden the data-subject export to all personal-data
  stores.** The art. 15 export covered only 6 sections; a resident holds personal
  data in many more features. Refactored `gdprLogic` around a single source of
  truth — a private `SUBJECT_SECTIONS` array where each entry declares how to
  `select` the subject's rows, the erasure `action` + rationale, and the
  retention period + basis — and **derived** the export sections, `ERASURE_PLAN`
  and `RETENTION_POLICY` all from it (plus the retain-only `votes`/`financial`
  categories), so a personal-data feature added there can never silently fall
  outside any of the three. Broadened from 6 to **26** export sections: forum
  messages, admin-chat messages, anonymous messages, authored petitions,
  thank-yous, directory, birthdays, carpool/sitter/barter profiles, pets, bikes,
  lending items, non-anonymous platform feedback, kids age-ranges + organized
  kids events, laundry/moving/venue bookings and visitor reports — each filtered
  to the subject by its real attribution field (parking correctly excluded, no
  `user_id`). `collectPersonalData` stays pure (the page passes store arrays in);
  `MyDataPage` wires the 20 additional stores. New `EXPORT_SECTION_KEYS` export.
  Locales: 20 new `gdpr.section.*` + 5 `gdpr.reason.*` + 2 `gdpr.retain.*` + 1
  `gdpr.basis.*`, bilingual RO/EN. Rewrote `gdprLogic.test.ts` (22 assertions):
  per-store subject filtering, an exact `EXPORT_SECTION_KEYS` set lock, an
  erasure+retention coverage guard, and an i18n-coverage guard that every
  category resolves in both ro.json and en.json. Decision recorded in
  `DECISIONS.md`. Pipeline green: lint, typecheck, 99 files / 658 tests, build.
  Surfaced T77 (aggregate tickets+discussions across all the subject's asociații,
  not just the active one) and T78 (live erasure must also delete Storage photo
  objects).
- **2026-05-23 — T22 (P0) Personal-data breach procedure (art. 33/34 GDPR).**
  The asociație, as data controller, must notify ANSPDCP within 72 hours of
  becoming aware of a breach (art. 33) and, on a high risk, inform the affected
  residents (art. 34). New pure, unit-tested `breachLogic`: `classifyRisk` maps
  the WP29/EDPB severity factors (sensitivity, scale, identifiability,
  neutralisation) to `low`/`risk`/`high`; `requiresAuthorityNotification`/
  `requiresSubjectNotification` derive the duty; the 72-hour `authorityDeadline`
  + `deadlineState` (not_required/done/on_time/due_soon/overdue) + the forward
  `detectat`→`evaluat`→`notificat`→`inchis` lifecycle; the `BreachRecord` model +
  queries + CSV export (29 assertions). New `breachContent` generates the art. 33
  ANSPDCP notification and the art. 34 resident notice as bilingual
  submission-ready text, plus the procedure as structured content. New
  append-only `breachStore` (mirrors to `data_breaches` when a backend exists).
  New admin `BreachAdminPage` at `/app/admin/incidente-date` (admin/președinte,
  sidebar `Siren` + privacy-settings link): awaiting-notification banner,
  procedure card, a record form with a live suggested-risk badge, and the
  append-only log with risk/status/deadline badges, per-record notification
  downloads, mark-notified actions and the lifecycle advance. Additive migration
  `20260522000019_data_breaches.sql` (controller-role manage, **no delete
  policy** so the trail is tamper-evident per art. 33(5)). New
  `BREACH_PROCEDURE.md`, bilingual `breach.*` RO/EN, `/incidente` bot help, breach
  CSS, one E2E happy-path. Decision recorded in `DECISIONS.md`. Pipeline green:
  lint, typecheck, 99 files / 651 tests, build. Surfaced T76 (live: dispatch the
  resident notice via the fan-out + record breach events in the T09 audit stream).
- **2026-05-23 — T21 (P0) DPA + records of processing (art. 28 & 30 GDPR).**
  The asociație is the data controller and vecini.online the processor. New pure,
  unit-tested `ropaLogic` generates the per-asociație **Record of Processing
  Activities (art. 30) from the feature/data model**: a `ProcessingProfile` (data
  categories, lawful basis, retention, recipients) per `FeatureCategory` default,
  sharpened by per-feature overrides for the special cases (financial F12/F20/F44,
  opt-in/consent F36/F37/F49/F63/F64, the anonymous F05 carrying no identity), plus
  four always-present platform activities (account/auth, security log, consent
  records, data-subject requests). `buildRopa(enabledKeys)` returns the platform
  activities then one entry per enabled, implemented feature in registry order;
  `profileFor` shallow-merges the override without mutating the defaults;
  `ropaToCsv`/`ropaToJson` serialize the localized register (11 assertions, incl. a
  guard that every implemented feature resolves a non-empty profile so none falls
  outside the register). New `dpaContent.ts` ships the bilingual **DPA template
  (art. 28)** as structured `LegalDoc` content with the controller name interpolated
  and the art. 28(3)(a-h) processor obligations + `dpaToText`. New admin
  `ProcessingRecordsPage` at `/app/admin/prelucrare-date` (admin/președinte-gated,
  sidebar nav + `ClipboardList`, also linked from the privacy settings for
  controllers): a DPA card (controller/processor, rendered template, text download)
  and the art. 30 register as a 5-column table generated from `useAsociatieFlags()`
  with JSON/CSV export. Fully offline, bilingual `ropa.*`/`dpa.*` RO/EN with the
  art. 6 references, `/prelucrare` bot help. Decision recorded in `DECISIONS.md`.
  Pipeline green: lint, typecheck, 98 files / 622 tests, build. Surfaced T74
  (declare the processing profile on the registry as the single source for the
  ROPA) and T75 (live: persist a per-asociație ROPA snapshot + DPA adoption record).
- **2026-05-23 — T06 (P0) GDPR data-subject rights (export + erasure).** Finished
  the partially-built, uncommitted T06 work (pure `gdprLogic` + `gdprStore` +
  `MyDataPage` + locales + migration existed but were unwired/uncommitted) and
  wired it end-to-end. Pure, unit-tested `gdprLogic`: `collectPersonalData`
  assembles a per-section export filtered to rows genuinely the subject's
  (profile, tickets, marketplace, ideas, consent, security activity);
  `toExportJson`/`toExportCsv` (art. 15 + 20 machine-readable copy); `ERASURE_PLAN`
  (delete/anonymize/retain with a legal rationale per category); `RETENTION_POLICY`
  (period + lawful basis); `ANONYMIZED_NAME`; the `DataSubjectRequest` lifecycle
  (`makeRequest`/`actionRequest` immutable-after-action, `hasOpenRequest`,
  `pendingCount`, `sortRequests`) — 13 assertions. Resident self-service
  `MyDataPage` at `/app/datele-mele` (linked from privacy settings): one-tap
  JSON/CSV export, the retention table, the erasure plan with rationale, a
  dedup-guarded "request erasure" (art. 17), and the resident's own request
  history. New admin actioning surface `DsrAdminPage` at `/app/admin/cereri-date`
  (sidebar nav link, role-gated to admin/președinte with a bilingual restricted
  state): the per-asociație queue with a pending badge, optional note, and
  complete/reject stamping actor + time. Export is self-service but logged;
  erasure is admin-actioned. Persisted `gdprStore` keeps the queue + erased-id
  marker offline, mirroring to `data_subject_requests` when a backend exists.
  Additive migration `20260522000018_data_subject_requests.sql` (append/no-delete
  RLS: self files+reads own; admin/president reads+actions; no delete for anyone).
  New `DATA_RETENTION.md` documents the periods, the erasure plan, and that the
  cross-store mutation + periodic cleanup run server-side when provisioned.
  `/datele_mele` bot help, GDPR CSS, bilingual `gdpr.*` RO/EN, one E2E happy-path.
  Decision recorded in `DECISIONS.md`. Pipeline green: lint, typecheck, 97 files /
  612 tests, build. Surfaced T72 (live server-side erasure execution + retention
  cleanup) and T73 (broaden the export to the remaining personal-data stores).
- **2026-05-23 — T60 (P2) `invite_codes` schema parity for the T41 local invite
  model.** The offline invite model carries a granted `role` and a `singleUse`
  flag, but the live `invite_codes` table modelled neither (single-use only
  implicitly via `consumed_by_user_id`), so T55's live persistence could not
  round-trip the full model. New additive, idempotent migration
  `20260522000017_invite_codes_role_single_use.sql` adds `role text not null
  default 'proprietar'` and `single_use boolean not null default true` (both via
  `add column if not exists`), plus a dropped-then-re-added
  `invite_codes_role_check` restricting `role` to exactly the invitable roles
  (`proprietar`/`chirias`/`comitet`/`cenzor`/`presedinte`), so the DB itself
  refuses a founder/platform `admin`/`super_admin` grant. RLS unchanged.
  Backend-free guard `tests/unit/inviteCodesSchema.test.ts` (4 assertions) checks
  both columns + defaults and that the constraint admits exactly `INVITABLE_ROLES`
  (derived from the source constant, so app + schema can't drift). Pipeline green:
  lint, typecheck, 96 files / 599 tests, build.
- **2026-05-23 — T69 (P2) Least-privilege owner grants on governance tables.**
  `apply_owner_rls`'s `"owner manage"` is a blanket `for all` grant, fine for
  personal rows but too broad for `budget_proposals`/`ideas`/`petitions`: once
  residents cast votes/signatures the row is shared, yet the author could still
  update or delete it (a delete cascading the votes/signatures away). New
  migration `20260522000016_governance_owner_least_privilege.sql` adds an
  `apply_governance_owner_rls(tbl, owner_col, child_tbl, child_fk)` helper that
  replaces the blanket grant on those three tables with operation-scoped owner
  policies — `"owner insert"`, plus `"owner update unlocked"` / `"owner delete
  unlocked"` gated on a `not exists` lock against the vote/signature child — so
  the author keeps control only while no one has acted; comitet keeps full
  moderation via `"comitet write"` and members keep read via `"members read"`.
  The lock keys on child-row existence (uniform across all three; the author, a
  member, can see those rows under T34's read policy) rather than a status.
  Backend-free guard `tests/unit/governanceOwnerLeastPrivilege.test.ts` asserts
  the drop, the operation-scoped (never for-all) policies, the lock on both
  update + delete, and exact application to the three tables. Decision recorded
  in `DECISIONS.md`. Offline MVP-spine hardening is now complete (only the
  T55–T58 live-activation follow-ups remain on the spine). Pipeline green: lint,
  typecheck, 95 files / 595 tests, build.
- **2026-05-23 — T71 (P2) Tenant-consistency for apartment refs from junction
  tables without their own `asociatie_id`.** T46's composite-FK guard only
  covered child tables carrying their own `asociatie_id`; parent-scoped junction
  tables that reference `apartments` directly but have no tenant column
  (`aga_votes`, `aga_attendees` ×2, `budget_votes`, `idea_votes` found while
  auditing, `petition_signatures`) could still attach to a foreign-asociație
  apartment. New migration `20260522000015_apartment_ref_tenant_consistency.sql`
  adds a `security definer` `before insert or update` trigger
  (`check_apartment_parent_tenant`, generic via `to_jsonb(NEW)`) that enforces
  `apartment.asociatie_id = parent.asociatie_id`, applied to all 6 references via
  an idempotent `add_apartment_tenant_trigger` helper. A composite FK was not
  usable (no `asociatie_id` on the child); `apartment_residents` is excluded (the
  apartment is its only tenant anchor). New backend-free guard
  `tests/unit/apartmentRefTenantConsistency.test.ts` derives the qualifying set
  from the schema and asserts the migration covers exactly it. Decision recorded
  in `DECISIONS.md`. Pipeline green: lint, typecheck, 94 files / 589 tests, build.
- **2026-05-23 — T70 (P1) Fix `aga_votes` RLS referencing a non-existent
  `asociatie_id` column.** `20260121000002_features.sql` called
  `apply_standard_rls('aga_votes')`, but `aga_votes` carries no `asociatie_id`
  (it is scoped through its parent `agas`), so the generated
  `using (is_member(asociatie_id))` policy referenced a missing column and would
  abort the whole migration on a real Postgres — a live-deploy blocker demo mode
  hid. Replaced the macro call with parent-scoped policies through `agas`
  (`"members read votes"` select + `"comitet write votes"` for all), matching the
  sibling `aga_agenda_items`/`aga_attendees` and the batch-5 `"self cast aga
  vote"` insert policy. Edited the source migration rather than adding a
  follow-up, because an aborting migration cannot be repaired by a later one and
  no Supabase project has ever been provisioned (decision recorded in
  `DECISIONS.md`). New backend-free guard `tests/unit/rlsHelperColumns.test.ts`
  parses every `create table` and every RLS-macro call across the suite and
  asserts each target declares the columns its generated policy references;
  `aga_votes` was the only offender. Pipeline green: lint, typecheck, 93 files /
  581 tests, build.

- **2026-05-23 — T46 (P1) Parent-child tenant-consistency guards for child
  tables.** Additive, idempotent migration `20260522000014_tenant_consistency_fk.sql`
  adds an `add_tenant_fk(child, fk_col, parent)` helper and applies it to all 43
  parent-child references where both child and parent carry a direct
  `asociatie_id`. It enforces `child.asociatie_id = parent.asociatie_id`
  declaratively via a composite FK (parent `unique (id, asociatie_id)`; child FK
  on `(fk_col, asociatie_id) -> parent (id, asociatie_id)`), so a child can only
  attach to a parent in the same asociație. MATCH SIMPLE leaves NULL fk_cols
  unenforced; default `on delete no action` preserves the existing single-column
  FK delete behaviour. Chosen over a trigger (declarative, planner-enforced,
  unbypassable, no `security definer`) — recorded in `DECISIONS.md`. Backend-free
  guard `tests/unit/tenantConsistency.test.ts` (8 assertions) derives every
  qualifying pair from the schema and asserts the migration covers exactly that
  set, so a future tenant-scoped child can't be added without a guard. Pipeline
  green: lint, typecheck, 92 files / 577 tests, build. Surfaced T70 (`aga_votes`
  gets `apply_standard_rls` but has no `asociatie_id` column — the generated
  policy references a missing column and would fail to apply live) and T71
  (junction tables without their own `asociatie_id` can still reference a
  foreign-asociație apartment).

- **2026-05-23 — T45 (P0) Harden owner-scoped RLS to also require membership in
  the target asociatie_id.** Additive, idempotent migration
  `20260522000013_owner_rls_membership.sql` redefines `apply_owner_rls` so the
  generated `"owner manage"` (`for all`) policy now requires
  `%I = auth.uid() and is_member(asociatie_id)` in **both** `using` and
  `with check` (was owner-column only), closing the write-path gap where an owner
  could insert/keep a row stamped with another asociație's id. A new idempotent
  `reapply_owner_rls(tbl, owner_col)` helper drops + recreates the policy through
  the tightened generator, re-applied to all **25** owner-scoped tables in the
  schema. Every such table carries a direct `asociatie_id` (each also gets
  `apply_standard_rls`, except `pledges` which declares it explicitly).
  `apply_member_insert_rls` already required `is_member` — left unchanged.
  Backend-free regression guard `tests/unit/ownerRlsMembership.test.ts` (6
  assertions, incl. a catalogue check that the re-applied set is exactly the set
  of `apply_owner_rls` calls across the suite, so a future owner-scoped table
  can't be added without tightening). Pipeline green: lint, typecheck, 91 files /
  569 tests, build. Surfaced T69 (the `for all` owner policy still lets an author
  delete published governance rows — scope owner-delete least-privilege). Live
  cross-tenant write test folds into T08.

- **2026-05-23 — T54 (P1) One green E2E smoke for the MVP loop (demo mode).**
  New single cohesive spec `T54: the full MVP loop works end-to-end in demo mode`
  in `tests/e2e/smoke.spec.ts` walks the whole spine in one run, reusing the
  proven per-slice selectors: demo entry → active asociație + role (home subtitle
  shows the active asociație name) → create/join (admin issues an invite at
  `/app/admin/invitatii`, redeemed at `/onboarding/alatura`, lands back on `/app`)
  → an enabled module loads → publish + read an announcement (page + home widget)
  → start a discussion and reply → submit a sesizare → finally toggle F01 off and
  assert the direct `/app/anunturi` URL shows the "not enabled" notice (the
  disabled-module step runs last since demo enables every module, T44). Runs in
  demo mode with no backend; Playwright browser binaries can't download in this
  sandbox so it executes in CI (tracked with T08) but is authored to run locally
  unchanged. Pipeline green: lint, typecheck, 90 files / 563 tests, build. The
  **MVP spine is now complete and green end-to-end offline**; remaining spine
  items are the offline hardening tasks T45/T46, with live-activation follow-ups
  T55–T58 below them.

- **2026-05-23 — T50 (P1) Telegram mock/linking path with `/start CODE`.** New
  dependency-free `telegramStart` (`src/shared/lib/`, imports only the pure
  `inviteCode` helper so the esbuild-bundled Netlify webhook can use it without
  `@/` aliases or Zustand/React): `parseStartCommand` (tolerates `/start@bot`,
  whitespace, case; payload or null; null for non-`/start` text),
  `normalizeStartPayload`/`payloadLooksLikeCode`, and `replyForStart`/
  `replyChecking` (the bot's RO-only onboarding replies per outcome). New
  `telegramLinkLogic` (`src/features/telegram/`) reuses the T41/T42 invite
  lifecycle and adds a per-user link-code lifecycle (`TelegramLinkCode`,
  `createLinkCode`/`validateLinkCode`/`findLinkByCode`/`consumeLinkCode`,
  `buildLinkFromLinkCode` with a concrete `userId` / `buildLinkFromInvite` with a
  null `userId` provisioned live in T58) and the pure `resolveTelegramStart`
  resolver (precedence: no-code → already-linked → link code → invite code →
  unknown; a found-but-not-redeemable code reports its own status), returning the
  `telegram_users`-shaped `TelegramLink` + the matched code id to consume. New
  persisted `telegramLinkStore` (`vecini.telegram`) is the local/mock path:
  `issueLinkCode`, an atomic replay-safe `linkByPayload` (records + consumes the
  link-code path; the invite path validates but records nothing offline since the
  app user is provisioned live, T58), `linkFor`, `unlink`. The webhook `/start`
  handler now uses the shared parser + format check + replies; the existing
  webhook-secret + `initData` validation is untouched. Tests: `telegramStart`
  (11), `telegramLinkLogic` (17), `telegramLinkStore` (8). Pipeline green: lint,
  typecheck, 90 files / 563 tests, build. The MVP spine logic is complete; T54
  (one green E2E smoke for the whole loop) is the remaining spine item. Surfaced
  T68 (in-app "Link Telegram" resident surface). Live webhook resolution + deploy
  is T58.

- **2026-05-23 — T49 (P1) Sesizări / reclamații (F17) scoped to the active
  asociație.** Extended `ticketLogic` with the per-asociație model mirroring
  T47/T48 (`TicketsByAsociatie`; `seedTickets` → demo asociație gets
  `DEMO_TICKETS`; `ticketsForAsociatie` → stored list or a shared frozen empty
  default for a stable selector reference; `newTicket` builds a freshly-submitted
  `primit` ticket owned by the asociație + reporter, trimmed, SLA-dated from
  severity; pure `addTicketIn` prepends newest-first without mutating — 5 new
  assertions). `ticketsStore` is keyed by asociație (`byAsociatie`, seeded for
  demo); `add(asociatieId, reporterUserId, input)` submits only into that
  asociație's list, and a new `useAsociatieTickets()` hook resolves the active
  asociație's list via `authStore.currentAsociatieId`. `TicketsPage` resolves the
  active asociație + reporter (`profile`/live, `DEMO_CURRENT_USER_ID` offline)
  and guards submit on an active asociație; `ApartmentInfoPage` and
  `RecurringPage` (F21) were migrated off the removed `items` field to the new
  hook. One E2E added (submit a sesizare → see it listed). The MVP-spine content
  slices (T47/T48/T49) are now all green offline. Pipeline green: lint, typecheck,
  87 files / 530 tests, build. Surfaced T67 (comitet status-lifecycle surface, as
  a ticket is stuck at `primit` offline). Live `tickets` read/write under RLS is
  T57; offline persistence is in T65's scope.

- **2026-05-23 — T48 (P1) Discuții / forum (F02) scoped to the active asociație.**
  Extended `discussionLogic` with the per-asociație model mirroring T47
  (`ThreadsByAsociatie`; `seedThreads` → demo asociație gets `DEMO_DISCUSSIONS`;
  `threadsForAsociatie` → stored list or a shared frozen empty default for a stable
  selector reference; `newThread` builds an empty thread owned by the asociație
  with a `#general` topic default; `newMessage` attributes a body to a
  `MessageAuthor`; pure `addThreadIn` plus a private `mapThreads` backing pure
  `addMessageIn`/`togglePinIn`/`deleteMessageIn` that no-op for an unknown asociație
  — 8 new assertions). `discussionStore` is keyed by asociație (`byAsociatie`,
  seeded for demo); `addThread`/`postMessage`/`togglePin`/`deleteMessage` take an
  `asociatieId` (post takes an explicit author), and a new `useAsociatieThreads()`
  hook resolves the active asociație's list via `authStore.currentAsociatieId`.
  `DiscussionsPage` resolves the active asociație + author (`profile`/live, new
  `DEMO_CURRENT_USER_NAME` offline) and guards every write on an active asociație;
  the hardcoded `DEMO_USER` is gone. A11y: the icon-only reply send button gained
  an `aria-label`. One E2E added (open a thread → reply → see the message).
  Pipeline green: lint, typecheck, 87 files / 525 tests, build. Surfaced T66 (wire
  the `canPost` rate limit into the post flow). Live `discussion_threads`/
  `discussion_messages` read/write under RLS is T57.

- **2026-05-23 — T47 (P1) Anunțuri (F01) scoped to the active asociație.** New
  pure, unit-tested `announcementsLogic` (`seedAnnouncements` → demo asociație
  gets `DEMO_ANNOUNCEMENTS`; `announcementsForAsociatie` → stored list or a shared
  frozen empty default for a stable selector reference; `newAnnouncement` builds a
  published row owned by the asociație + author; pure `addAnnouncementIn` prepends
  newest-first — 6 assertions). `announcementsStore` is now keyed by asociație
  (`byAsociatie`, seeded for demo); `add(asociatieId, authorUserId, input)`
  publishes only into the active asociație's list, and a new
  `useAsociatieAnnouncements()` hook resolves it via `authStore.currentAsociatieId`
  (T43 `useAsociatieFlags` pattern). `AnnouncementsPage` resolves the active
  asociație + publishing author and guards publish on an active asociație;
  `HomePage`'s recent widget reads the scoped selector. Demo unchanged
  (`currentAsociatieId='demo-asoc'` holds the seeded list). Pipeline green: lint,
  typecheck, 87 files / 517 tests, build. Surfaced T65 (persist content stores
  offline so a publish survives reload). Live `announcements` read/write is T57.

- **2026-05-23 — T44 (P1) gate direct routes for disabled modules.** New pure,
  unit-tested `featureRouteLogic` (`PATH_TO_FEATURE` from the registry,
  `appRouteSegment` for the first segment under `/app`, `featureKeyForRoute`,
  `isFeatureRouteBlocked(flags, pathname)` — 8 assertions). New `FeatureRouteGuard`
  (`src/app/`) wraps the `/app` `<Outlet />` in `AppLayout`: a route mapping to a
  disabled feature renders a bilingual "module not enabled" notice (`common.featureDisabled`,
  lock icon, back-to-home link) instead of the page; non-feature routes and enabled
  features pass through. A disabled module is now hidden from nav **and**
  unreachable by URL. Since flags now gate URL access, the **demo asociație enables
  every implemented module** (`DEMO_FEATURES` = all `implemented`, was the curated
  `RECOMMENDED_FEATURES` 10) so demo stays fully explorable and the per-feature E2E
  reach each page; a real new asociație keeps `RECOMMENDED_FEATURES` at onboarding.
  Decision in `DECISIONS.md`. One E2E added (disable F01 → `/app/anunturi` shows the
  notice). Pipeline green: lint, typecheck, 86 files / 511 tests, build. Surfaced
  T64 (enforce feature `audience`/role in the guard + nav); T54 must disable a
  module before asserting the URL block since demo now enables all.

- **2026-05-23 — T43 (P1) per-asociație feature flags from a local store.** New
  pure, unit-tested `featureFlagsLogic` (`seedFlags` → demo asociație gets
  `DEMO_FEATURES`; `flagsForAsociatie` returns the stored map or a shared frozen
  empty default for a stable selector reference; `isFeatureEnabled`; pure
  `setFlagIn`/`setAllIn`; `migrateFlatFlags` carrying the old flat shape onto the
  demo asociație). `featureStore` is now keyed by asociație (`byAsociatie`),
  persisted at `vecini.features` with `version: 2` + a migrate; `setFlag`/
  `setAll` take an asociație id, and a new `useAsociatieFlags()` hook resolves the
  active asociație's set from `authStore.currentAsociatieId` (no store cycle).
  `useFeature`/`FeatureGate` and all nav/home/assistant/admin consumers now read
  the active asociație's flags; `FeaturesAdminPage` toggles scope to the active
  asociație; `OnboardingWizard.finish()` scopes its chosen set to the new asociație
  id. Demo unchanged (demo entry → `currentAsociatieId='demo-asoc'`). Single source
  for T44 route gating. Pipeline green: lint, typecheck, 85 files / 503 tests,
  build. Surfaced T63 (show the active asociație + empty-state on
  `FeaturesAdminPage`). Live `asociatie_features` read/write is T56.

- **2026-05-23 — T42 (P1) resident join via invite code.** New pure
  `buildMembershipFromInvite(userId, invite)` in `inviteLogic` (joiner enters the
  code's asociație with the granted role; the code's `apartmentId` rides along to
  the live join RPC, the offline membership carries only role+asociație).
  `authStore.joinByInvite(code)` peeks the code first (an already-member retry
  re-selects without wasting a single-use code), consumes it via the replay-safe
  `inviteStore.consume`, builds the membership and selects the asociație,
  returning the `InviteStatus` so the UI reports `expired`/`used`/`revoked`/
  `unknown`. New bilingual `JoinAsociatiePage` at `/onboarding/alatura` (reachable
  from a link on the onboarding wizard's first step, reciprocal create link back),
  `/alatura` bot help. Tests: +2 `buildMembershipFromInvite` assertions and a new
  `joinByInvite.test.ts` (6 store-integration cases incl. replay-safety and
  already-member no-waste); two E2E happy-paths (issue→redeem→/app; invalid code
  rejected). Pipeline green: lint, typecheck, 84 files / 495 tests, build. Surfaced
  T62 (record/resolve the joined asociație's display name, folds into T59). Live
  replay-safe consume RPC under RLS is T55.

- **2026-05-23 — T41 (P1) invite-code generation + admin surface.** New pure,
  unit-tested `inviteLogic` (`createInvite` reusing `generateInviteCode` with
  collision-regeneration; `validateInvite` → `ok`/`expired`/`used`/`revoked`/
  `unknown`; `consumeInvite`/`revokeInvite` non-mutating; `findByCode`;
  `isRedeemable`; `expiryFromPreset`; `INVITABLE_ROLES` minus founder/platform
  roles). Persisted `inviteStore` (`vecini.invites`): `issue`, `revoke`, an
  atomic double-spend-safe `consume`, and a `forAsociatie` selector. New
  `InvitesAdminPage` at `/app/admin/invitatii` (admin nav link) to issue (role,
  optional apartment, expiry preset, single-use) / list / copy / revoke codes,
  scoped to the active asociație. Fully offline, bilingual `invites.*`,
  `/invitatii` bot command. Pipeline green: lint, typecheck, 83 files / 487 tests,
  build. Surfaced T60 (extend `invite_codes` with `role`+`single_use`) and T61
  (wire/remove the ApartmentsPage generate-codes button). Unblocks T42 (resident
  join via invite code). Live persistence is T55.


- **MVP milestone reframed: "One real asociație works end-to-end."** `BACKLOG.md`
  gained a `## Current MVP milestone` section and an `## MVP spine` block at the top of
  the task queue: the autonomous worker now drives one real, live vertical slice (admin
  sign-up → create/access asociație → hydrate context → invite codes → resident join →
  per-asociație feature flags → route gating → announcements → discussions → sesizări →
  Telegram `/start CODE`) before adding more breadth. New spine tasks T41–T50 + reprioritised
  T27/T28; the GDPR/security/legal queue (T06, T21, T22, …) is kept intact right below.
  New MVP rules: no new feature modules until the spine is green; one complete slice over many
  half-wired ones; blockers go above the work they block; every task notes its commands/verification;
  demo stays useful but critical paths need a live Supabase path.

- **2026-05-22 — T28 (P0) profile + membership + active-asociație hydration.** New pure,
  unit-tested `hydrationLogic` (`activeMemberships`, `sortByPrivilege`, `pickActiveAsociatieId`,
  `roleFor`, `hasNoActiveAsociatie`, `ROLE_RANK`). `authStore` now loads the `users` profile +
  active `memberships` (under RLS) on session and `SIGNED_IN`, exposes `currentAsociatieId`,
  `activeRole()` and a member-checked `setActiveAsociatie`, and clears tenant state on sign-out.
  Demo mode unchanged as the offline fallback. Pipeline green: lint, typecheck, 80 files / 456
  tests, build. Surfaced T51 (migrate consumers to the new selectors) and T52 (hydration loading
  flag). E2E core-flow smoke runs in CI (Playwright binaries can't download in this sandbox; T08).

### Earlier this cycle (T04 RLS & tenant-isolation security audit)

- **Original-vision coverage: ~58% delivered end-to-end.** The CLAUDE.md vision is a
  "secure, stable, well-polished, GDPR-compliant, multi-tenant SaaS with 2FA, a live
  Telegram bot, and robust handling of real building problems." Honest per-dimension
  read: **feature set ~95%** (all 65 built end-to-end, but exercised only in demo mode —
  not yet verified live against a provisioned backend); **auth/2FA ~70%** (T01/T02/T03
  wired, server-side parity T32 and live recovery T29 pending); **tenant-isolation
  security ~75%** (T04 done: all 122 tables RLS-covered and `asociatie_id`-scoped, CSP + HSTS +
  cross-origin headers shipped, `npm audit` clean, `SECURITY.md` authored, isolation invariants
  regression-guarded — remaining is live cross-tenant verification T08 and the static coverage
  guard T35); **GDPR/privacy ~35%** (consent + legal surface T05 done;
  data-subject rights T06, DPA/ROPA T21, breach procedure T22, minors enforcement T23 all
  pending); **stability/resilience ~40%** (no global error boundary, no standardized
  loading/empty/error states, E2E not yet run in CI — T07/T08); **Telegram bot ~30%**
  (170-line webhook skeleton with secret + initData validation, not go-live — T15);
  **premium feel ~70%** (polished in demo; a11y audit T17 and Lighthouse T18 pending);
  **SaaS readiness ~25%** (no billing T19, no super-admin console T20, live onboarding T27
  and profile hydration T28 pending). The features dominate the build effort and are done,
  which pulls the number up; the "deployable for real residents" gates (GDPR rights, live
  backend verification) pull it back down. Phase-2 task progress: **6 of ~33 hardening
  tasks complete** (T05, T01, T02, T03, T34, T04).

- **2026-05-22 audit/replenish pass (no feature built).** Swept RLS coverage across all
  122 tables: `apply_standard_rls`/`apply_owner_rls` cover 119, but **`budget_votes`,
  `idea_votes` and `petition_signatures` have RLS never enabled and zero policies** — a
  real cross-tenant exposure (who voted / who signed, visible to any authenticated user in
  any asociație). Fed in **T34 [P0]** (additive migration: enable RLS + parent-scoped
  policies on those three), **T35 [P1]** (a static, offline RLS-coverage guard test so the
  class of bug cannot recur), **T37 [P2]** (server-rendered proces-verbal PDF for F10), and
  sharpened **T04** (CSP + HSTS specifics, cross-reference to T34). Resolved two stale queue
  entries that duplicated already-shipped features (**T10**/F35, **T13**/F10). i18n RO/EN
  parity is clean (the only RO-only keys are correct `_few` Romanian plural forms). Pipeline
  green throughout: lint, typecheck, 76 test files / 425 tests, build.

- **2026-05-22 — T34 (P0) closed the vote/signature tenant-isolation hole.** Additive,
  idempotent migration `20260522000012_vote_signature_rls.sql` enables RLS on `budget_votes`,
  `idea_votes` and `petition_signatures` and adds parent-scoped `select` + `insert` policies
  that resolve the owning asociație through the parent (`budget_proposals` / `ideas` /
  `petitions`) and gate on `is_member(...)`. No `update`/`delete`/`for all` policy is granted,
  so a cast vote or signature is immutable under RLS. A backend-free regression test
  (`tests/unit/voteSignatureRls.test.ts`, 9 assertions) parses the migration SQL and fails if
  any of the three loses RLS, parent-scoping, or gains a mutation policy. The general
  table-by-table coverage guard remains T35. Pipeline green: 77 test files / 434 tests.

- **2026-05-22 — T04 (P0) RLS & tenant-isolation security audit closed.** Swept all 122
  `public` tables across the migration suite: every one has RLS enabled and is
  `asociatie_id`-scoped (directly, via `is_member`/`has_role` + the `apply_standard_rls`/
  `apply_owner_rls`/`apply_member_insert_rls` helpers, or through a parent row); no table is
  uncovered post-T34, no policy uses `using (true)`, and the membership helpers are `security
  definer` with a fixed `search_path`. Hardened `netlify.toml` with `Strict-Transport-Security`
  (2y/includeSubDomains/preload), a strict `Content-Security-Policy` (`default-src 'self'`,
  `script-src 'self'`, `object-src`/`frame-ancestors 'none'`, `connect-src` limited to self +
  the Supabase project, `upgrade-insecure-requests`), `Cross-Origin-Opener-Policy`/
  `Cross-Origin-Resource-Policy: same-origin`, and a tightened `Permissions-Policy`; verified
  the production `index.html` has no inline script/style so the CSP holds. `npm audit` clean
  (0 vulnerabilities). Authored `SECURITY.md` (threat model, controls, reporting, tracked
  gaps). Two backend-free regression guards added: `rlsTenantIsolation.test.ts` and
  `securityHeaders.test.ts`. Surfaced T39 (CSP tightening + violation reporting). Pipeline
  green: 79 test files / 444 tests.

- **Two phases. Phase 1 (features): 65 / 65 built end-to-end (100%, `BUILD_COMPLETE`).
  Phase 2 (production + legal readiness, `BACKLOG.md`): 6 tasks done (T05, T01, T02, T03, T34, T04);
  plus T10/T13 resolved as already-delivered features in the 2026-05-22 audit.**
  The app is feature-complete but not yet legally deployable for real residents:
  remaining go-live blockers are GDPR data-subject rights — export + erasure
  (T06), and the DPA + records of processing / breach procedure (T21/T22). The
  RLS/tenant-isolation audit (T04) is now done. T01 (live Supabase auth), T02
  (2FA/MFA) and T03 (auth & session hardening) are now wired; their follow-ups
  T27 (post-auth association onboarding), T28 (profile/membership hydration), T29
  (live recovery-code login), T30 (live MFA enforcement E2E), T31 (MFA challenge
  throttling), T32 (server-side auth-policy parity) and T33 (server-backed login
  lockout) are queued at P1/P2. Honest "ready to run legally" estimate: feature
  surface ~100%, production/legal hardening ~4 of 33 tasks.
- **Completed most recently (T03): auth & session hardening.** Three pure,
  unit-tested modules: `passwordPolicy` (min-10 + bcrypt-72 cap + character
  variety + offline breached/common-password blocklist + email-echo rejection +
  strength score), `loginThrottle` (sliding-window failed-attempt counting with
  escalating, capped temporary lockout per normalised email), and `authAudit`
  (privacy-safe event model — `redactEmail` masks to `a***@domain`, and the event
  shape cannot carry a password/token/code/full email). A persisted
  `securityStore` wraps the throttle map + recent-activity log and mirrors each
  event, best-effort, into the new append-only `auth_audit_events` table
  (owner-read + admin-read RLS) when a backend is present. `authStore` gained
  `signOutEverywhere` (`scope:'global'`), a throttle-gated `signIn` returning
  `lockedMs`, and audit logging across sign-in/out, password change, reset
  request and demo entry; the Supabase client uses the PKCE flow. `LoginPage`
  shows a live strength meter + bilingual lockout toast; `SecurityPage` adds an
  active-sessions / sign-out-everywhere card and a recent-activity list;
  `mfaStore` logs enable/disable/recovery-regenerate. RO/EN
  `auth.pwd.*`/`auth.sessions.*`/`auth.audit.*`/`auth.lockout`. 32 new unit tests
  + one E2E. New tasks fed in: T32 server-side auth-policy parity, T33
  server-backed login lockout.
- **The autonomous loop now drives Phase 2.** `run-overnight.sh` runs the
  `make progress` one-task protocol off `BACKLOG.md` (not the finished
  FEATURES.md build). When the queue empties it does not stop: it runs an
  audit/replenish pass that measures vision coverage and writes the next wave of
  tasks, so the loop keeps raising the quality bar until a genuine stall, a
  task/time budget, or an interrupt. Trigger continuously with the script, or one
  task at a time by typing `make progress`.
- **Completed most recently (T02): 2FA / MFA (TOTP).** Account-level second
  factor built on Supabase MFA, with a fully-offline demo path. Pure `mfaLogic`
  is a self-contained RFC 6238 / RFC 4226 implementation over Web Crypto (base32
  codec, HOTP/TOTP, drift window) plus single-use recovery-code
  generation/SHA-256 hashing/consumption, the `requiresMfa` role rule, the
  `challengeNeeded` AAL state machine and `mfaErrorKey` — unit-tested against the
  published RFC vectors. `mfaStore` orchestrates both paths (Supabase MFA
  enroll/challenge/verify/unenroll live; real TOTP verification + working
  recovery codes in demo, persisted). `SecurityPage` (`/app/securitate`) does
  enroll (QR live / manual setup key demo) → 6-digit confirm → ten recovery codes
  shown once (copy/download) → regenerate / disable. `LoginPage` gained a
  post-password TOTP/recovery challenge; `AppLayout` steers privileged
  un-enrolled users to the security page in the live path (demo stays unblocked).
  Recovery codes are stored only as SHA-256 hashes (`mfa_recovery_codes`
  migration, owner-only RLS), consumed single-use. RO/EN `auth.mfa.*` locales,
  `/securitate` bot command, UserMenu link. Unit test + one E2E happy-path
  (enrol → recovery codes → challenged at next sign-in). New tasks fed into the
  queue: T29 live recovery-code login, T30 live enforcement E2E, T31 MFA
  challenge throttling.
- **Completed earlier (T01): live Supabase auth wiring.** Real email +
  password sign-up/login, email verification, and password reset on Supabase
  Auth, with the `isSupabaseConfigured` demo fallback fully intact. Pure
  `authLogic` (email/password validation, per-mode `canSubmit`, `mapAuthError`
  → stable bilingual `auth.err.*` keys; unit-tested) + `authStore` extended with
  `signUp` (email-confirmation aware), `requestPasswordReset`, `updatePassword`,
  `resendVerification`, and a `PASSWORD_RECOVERY` → `recovery` flag in `init`.
  `LoginPage` became a mode-switching form (sign in / sign up / forgot) with
  "check your email" + reset-sent confirmation panels; new `ResetPasswordPage`
  at `/reset-parola` consumes the recovery session. RO/EN locales, `.auth-link`
  style, and `.env.example` documents the Supabase Auth dashboard config (Confirm
  email ON, Site URL + `/reset-parola` redirect allow-list) and `VITE_APP_URL`.
  One E2E happy-path (mode switching + demo entry). New tasks fed into the queue:
  T27 post-auth association onboarding, T28 profile/membership hydration.
- **Completed earlier (T05): GDPR consent & legal surface.** Global
  `ConsentBanner` (Accept all / Doar esențiale / Personalizează with per-category
  switches), public bilingual `/confidentialitate`, `/termeni`, `/cookies` pages
  (`legalContent.ts`: controller-vs-processor split, lawful bases under Legea
  196/2018 + GDPR, ANSPDCP and ANPC/SOL routes), in-app `/app/confidentialitate`
  consent management with decision history, `consentLogic` + `consentGate`
  (`mayNotify` fan-out gate) unit-tested (16 tests), persisted `consentStore`,
  additive `consent_records` migration (owner RLS + admin read), legal links in
  the app footer + login, lawful-basis notes in `DECISIONS.md`, one E2E
  happy-path. New tasks fed into the queue: T21 DPA + records of processing, T22
  breach procedure, T23 minors' consent guardrails, T24 consumer-rights surface,
  T25 accessibility statement, T26 consent-gate enforcement in the fan-out.
- **Previously: F35 Informații apartament** — a read-only
  per-apartament aggregation with no table of its own, folded over the existing
  meters/tickets/polls stores. The page shows the apartment card (owner, location,
  suprafață utilă, cotă-parte indiviză as a Romanian percent, persoane), each
  meter with its latest index and full reading history (newest-first), the
  resident's tickets (matched by apartment or reporter, de-duplicated, newest
  first) with an open/resolved summary and status badges, and per-poll vote
  summaries (the chosen option label, or a "votează acum" link) with a cast/total
  count; the payments card shows a finance-module-disabled empty state. Wired
  end-to-end: `apartmentLogic` (meters/tickets/votes folding + cota-parte percent +
  short-label + open-ticket classing + option-label, unit-tested) + `ApartmentInfoPage`
  + registry toggle flipped + route `apartament-info` + `/apartament_meu` bot
  command + RO/EN locales + demo current-user/apartment constants + one E2E
  happy-path. No migration (computed view over existing tables).
- **Completed previously: F10 AGA digitală** — the formal General Assembly
  (Legea 196/2018). A comitet convokes an assembly (datetime, location or online)
  and adds agenda items; the lifecycle runs convocată → în desfășurare →
  încheiată via an advance-status button. A live **quorum tracker** shows
  represented apartments vs. the required percent, fed by each resident's **RSVP**
  (prezent / procură / absent — a proxy still represents an apartment). While an
  assembly is in progress, residents **vote per agenda item** (pentru / contra /
  abținere) with live tally bars; each item carries a **majority rule** (simplă /
  absolută / două treimi, reused from the polls engine) that, once quorum is met,
  resolves the item to adoptat / respins / în-așteptare. A concluded assembly
  offers a one-tap **proces-verbal** download (structured Romanian minutes as
  plain text — see `DECISIONS.md` for why text not a rendered PDF). Wired
  end-to-end: `agaLogic` (quorum/present/tally/percent/outcome/sort/lifecycle/PV,
  14 unit tests) + `agaStore` + `AgaPage` + registry toggle flipped + route `aga`
  + `/aga` bot command + RO/EN locales + three demo assemblies (live/upcoming/
  concluded) + additive owner-RLS migration (batch5) for resident RSVP + vote +
  one E2E happy-path (vote on a live item).
- **Previously:** Help assistant (cross-cutting, not a numbered
  feature) — a floating corner chat widget that answers "what is X / how do I X /
  where is X" using a **local, rule-based grounded matcher (no LLM, no network)**.
  It returns only pre-written, role-filtered answers from a knowledge base derived
  from the feature registry (+ a few how-to/concept entries), so it cannot
  hallucinate or leak; "no admin access" is enforced by filtering entries to the
  viewer's role (demo/unknown → resident) and only describing enabled features,
  and it is info-only. It also answers **concrete data lookups** (e.g. "numărul
  de telefon al președintelui") from user-visible sources only — emergency
  contacts (F56) and the opt-in directory (F36) through the existing
  `visibleEntry` consent mask — with prefix matching for Romanian inflections.
  Bilingual RO/EN. Files under `src/features/assistant/*` (`knowledge`/`match`/
  `visibility`/`engine`/`dataSources` + `AssistantWidget`) + `assistantStore` +
  `assistant.css`, mounted in `AppLayout`, with match + visibility + data-lookup
  unit tests (incl. a consent-masking privacy test). A **human-feel layer** (also
  fully non-generative, so still jailbreak-proof) adds small talk (`smalltalk.ts`:
  greetings/thanks/identity/capabilities), turn-seeded varied phrasing of social/
  clarify/fallback lines, typo tolerance (bounded one-edit incl. transposition),
  "la care te referi?" clarification on near-ties, and a brief typing indicator;
  factual answers stay concise. **Phase 2 (planned):** broaden live data answers
  and swap `dataSources` to Supabase under RLS.
- **Previously (F21):** Sesizări recurente — a comitet/admin view
  computed entirely over `tickets` (no table of its own). The detector groups
  recent tickets by category+location (accent/case-insensitive), surfaces any
  group that repeats ≥3 times within a 90-day window, takes the max severity,
  and suggests a course of action (severity≥high or ≥4 occurrences → structural
  fix; otherwise routine maintenance). The page shows an attention banner with
  the active-pattern count, per-pattern cards (count badge, severity, first/last
  date range, colour-coded recommendation), and a mark-known/reactivate toggle
  that floats acknowledged patterns faded to the bottom. Wired end-to-end (logic
  module + small acknowledgement Zustand store + page + registry toggle + route
  `sesizari-recurente` + `/sesizari_recurente` bot command + RO/EN locales with
  plural forms + recurring demo tickets + 11 unit tests + one E2E). Seeded
  `DEMO_TICKETS` with a recurring lift breakdown (structural) and a recurring
  stairwell light fault (maintenance) so the demo shows live patterns.
- **Previously (F49+F50):** Cod de siguranță + Plan de evacuare — the safety
  pair (`safety` + `evacuation` slices).
- **Previously (F41+F42):** Urmărire proiecte + Jurnal foto lucrări — `projects`
  + `photojournal` slices sharing the `projects` domain.
- **Previously (F64):** Activități copii și adolescenți — `kids` slice
  (privacy-preserving children registry + coordinated activities).
- **Previously (F62):** Kit de bun-venit — `welcomekit` slice (new-resident
  onboarding checklist with progress bar + comitet add/delete steps).
- **Previously (F04):** Mesagerie privată cu administratorul — `adminchat` slice,
  now a role-aware inbox. The administrator/președinte sees every resident's
  thread (per apartment) with unread + awaiting-reply hints and can open any one
  or start a thread toward a chosen apartment; a resident sees only their own
  threads. Master/detail conversation view; per-asociație persisted store +
  dual-mode `adminChatApi` (mirrors `private_threads`/`private_messages`, no PII
  to the audit log); party-or-admin RLS in migration `20260525000002`.
  Superadmin→association messaging deferred (T99); live wiring is T118.
- **Previously (F27):** Rezervare sală comună / terasă — `venue` slice on the
  F25/F26 booking pattern. Note: the working tree is clean — F21, the help
  assistant, and all earlier slices are committed (latest: `bfabf0e` help
  assistant; `83119ed` F21 + polish).
- **Pipeline:** `npm run lint`, `npm run typecheck`, `npm test` (76 files / 425
  unit tests), and `npm run build` all pass.
- **Remaining (0 of the original 65):** none — all F01–F65 are ✅.
- **Planned for the future (2, not yet specced into schema):** F66 Profil complet
  (rich full-page profile editor — photo + structured standard fields + user-added
  typed custom fields via a `+ Adaugă câmp` button) and F67 Acasă personalizabil
  (pencil-icon edit mode on the home screen to show/hide, reorder and size the
  feature cards each resident wants). These are new Category 9 entries in
  `FEATURES.md`, marked ⬜ planned.
- **Source of truth:** the **FEATURES.md** tracking table (legend: ✅ UI done ·
  🟦 schema-only) is authoritative for per-feature status — sections 2–3 below are
  historical and undercount what's shipped. Trust the table.
- **Blockers:** none. Playwright browser binaries still can't be downloaded in
  the build sandbox, so E2E specs are written/wired but executed only locally/CI.

---

## 1. Scaffolding — done

- **Build & tooling:** Vite 6 + React + TypeScript, Tailwind, ESLint (clean),
  Vitest 3 (passing). `tsc -p tsconfig.app.json` + `tsconfig.node.json --noEmit`
  type checks (deliberately avoids `tsc -b` project references).
- **App structure:** feature-sliced `src/` — `src/app`, `src/features/*`
  (admin, alerts, announcements, auth, emergency, events, home, onboarding,
  polls, profile, tickets), `src/shared/*` (components, demo, features, lib,
  locales, store, types, styles).
- **Database:** complete schema with RLS for **all 65 features' tables** in
  `supabase/migrations/` (`..._init_core`, `..._features`, `..._storage`),
  plus `supabase/seed.sql`. Full-text (GIN) search where relevant.
- **State management:** React Query for server/async state; per-feature Zustand
  stores seeded from `src/shared/demo/demoData.ts`; persisted `featureStore`
  feature-flag store (hydrated from `asociatie_features` when a backend exists).
- **Demo mode:** app detects missing Supabase creds (`isSupabaseConfigured`) and
  runs fully offline on seeded Romanian sample data — no backend needed to demo
  or E2E-test. No mock data ships in the Supabase path.
- **Telegram:** Netlify function `netlify/functions/telegram-webhook.ts` with
  secret verification + Mini App `initData` validation (both unit-tested via
  shared `telegramAuth` helpers); command/callback routing skeleton.
- **i18n:** single `translation` namespace per locale (`ro.json`, `en.json`);
  Romanian is source of truth, English covers the admin surface.
- **Security:** stored HTML routed through `sanitizeHtml` (DOMPurify, strict
  allowlist) before `dangerouslySetInnerHTML`.
- **Bundle:** `manualChunks` vendor splitting, lazy-loaded feature pages,
  tree-shaken `Icon` component. Initial route ~190 KB gzipped (< 250 KB budget).
- **Tests:** unit suite under `tests/unit/` (csv, format, inviteCode, pollLogic,
  telegramAuth, ticketLogic) runs and passes. E2E (`tests/e2e/smoke.spec.ts`)
  + `playwright.config.ts` are complete but **not executed** in the build
  sandbox (Playwright browser binaries couldn't be downloaded).
- **Cross-cutting UI:** auth/login, home feed, hubs, profile, 5-step onboarding
  wizard, apartment registry, and the admin feature-flag panel.

## 2. Features — implemented (UI end-to-end)

6 of 65 are fully interactive:

| Key | Title | What works |
|-----|-------|-----------|
| F01 | Anunțuri oficiale | Compose/publish, categories, read receipts, DOMPurify-sanitized HTML |
| F03 | Alertă de bloc (urgență) | Send flow with double-confirm bypassing quiet hours; recipient count |
| F08 | Calendar de evenimente | Upcoming list, RSVP toggle, counts |
| F09 | Vot rapid pe propuneri | Vote with confirm, live bars; quorum/majority tally logic unit-tested |
| F17 | Sesizări cu foto | Create with severity/category/location; SLA logic unit-tested; status badges |
| F56 | Numere de urgență localizate | Tap-to-call list, seeded contacts |

## 3. Features — remaining (schema + RLS + toggle only, no UI)

The other **59 features (F02, F04–F07, F10–F16, F18–F55, F57–F65)** each have
their database table(s) with RLS and appear in the admin toggles and navigation,
but opening one shows a clear "registered, page not in this build" state (no fake
data). See the tracking table in `FEATURES.md` (legend: ✅ UI done · 🟦 schema-only).

Notable clusters still to build:
- **Communication:** F02 discuții moderate, F04 mesagerie privată admin, F05
  mesaj anonim, F06 anunțuri vecini, F07 FAQ
- **Governance/voting:** F10 AGA digitală (Legea 196/2018 compliance, PV PDF),
  F11 procese verbale, F12 buget participativ, F13–F16
- **Maintenance:** F18 istoric reparații, F19 service programat, F20 citire
  contoare, F21 recurente, F22 RFP, F23 gardă, F24 împrumut
- **Shared spaces:** F25–F32 (rezervări, parcare, biciclete, boxe, curier)
- **Records:** F33–F40 (documente, furnizori, wiki, glosar, directories)
- **Projects:** F41–F48 (tracker, foto, contractori, crowdfunding, plan multianual)
- **Safety/compliance:** F49–F55 (coduri siguranță, evacuare, PSI, asigurare, chei)
- **Community:** F57–F65 (marketplace, carpool, sitting, barter, group buys,
  welcome kit, aniversări, copii, feedback)
- **Computed (no UI yet):** F46 fond reparații calculator helper

## 4. What to do next

1. **Run E2E once locally/in CI** — install Playwright browsers (blocked in the
   build sandbox) and execute `tests/e2e/` against demo mode to lock the baseline.
2. **Provision Supabase** — apply the three migrations + `seed.sql`, set creds so
   `isSupabaseConfigured` flips the app off demo mode, and smoke-test that the 6
   live features read/write against real tables and RLS.
3. **Wire the Telegram webhook** — deploy the Netlify function, register the bot
   webhook + Mini App, and verify `initData`/secret validation end-to-end.
4. **Build out the remaining feature**, reusing the established pattern
   (logic module → Zustand demo store seeded from `demoData.ts` → feature page →
   `registry.ts` toggle flipped to `implemented` → route → `/command` bot help →
   RO/EN locales → unit test → one E2E happy-path).
   - **F10 AGA digitală** — carries Legea 196/2018 compliance + PV PDF
     generation weight; implement it alone in its own session.
   - *(Done: F41 Project tracker + F42 Project photo journal — `projects` +
     `photojournal` slices. F49 Cod de siguranță + F50 Plan de evacuare —
     `safety` + `evacuation` slices. F21 Sesizări recurente — `recurring`
     slice, computed over `tickets`.)*
5. **Fill the last computed view** (F35 apartament info over
   apartments/readings/tickets/votes) — a read-only aggregation, no new table.
   *(Done: F21 recurring-ticket detection over `tickets`.)*

---
*Generated 2026-05-21 from `DECISIONS.md` and `FEATURES.md`.*
