# COMPLETED — vecini.online

Permanent archive of finished `make progress` tasks, newest first.
Reference only — not read during a normal `make progress` task.
`RESUME.md` §0 is the dated chronological summary.

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
