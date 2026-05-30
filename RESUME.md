# RESUME — vecini.online

Terse machine-readable status log. Full history archived in `COMPLETED.md` (newest first). Drives `make progress` (see `BACKLOG.md` + `CLAUDE.md`).

## 0. Current status

- date: 2026-05-30
- last_task: T18 (P2) Performance & Lighthouse
- pipeline: green (lint + typecheck + test + build + build:pi + build:demo)
- counts: 179 files / 1733 tests
- stages: PROD/DEV/DEMO formalized (T171/T172); all three build green every task
- mvp_spine: complete (T168/T169/T92/T55/T115 done; T128 token hardening done)
- next: T108 rich per-card home widgets (prereq T12 done) or T51 activeRole() migration (prereq T28 done)
- features: 65/65 demo-complete (offline UI + pure logic + tests); live-wired to Supabase: F01/F02/F04/F05/F17/F33 + auth/invites/onboarding; rest offline-first pending the live-activation track. F28/F36/F66 cross-feature glue wired (T104)
- blockers: Playwright browser binaries not downloadable in sandbox; E2E runs in CI only

---

### T18 P2 ✅ 2026-05-30 -- Performance & Lighthouse
- updated: src/shared/lib/csv.ts (generateApartmentsXlsxTemplate + parseApartmentsXlsx async, dynamic import xlsx)
- updated: src/features/admin/ApartmentsPage.tsx (await xlsx functions)
- updated: vite.config.ts (xlsx manualChunk)
- updated: tests/unit/csv.test.ts (3 xlsx tests async)
- new: public/robots.txt, public/sitemap.xml
- updated: index.html (OG meta, Twitter card, canonical, robots meta)
- new: tests/unit/seo.test.ts (4 assertions)
- result: ApartmentsPage 451kB -> 27kB; 179 files / 1733 tests / build+pi+demo green

### T25 P2 ✅ 2026-05-30 -- Accessibility statement (Declaratie de accesibilitate)
- new: src/features/legal/accessibilityContent.ts (bilingual LegalDoc, 6 sections)
- new: src/features/legal/AccessibilityStatementPage.tsx
- new: tests/unit/accessibilityContent.test.ts (4 assertions)
- updated: src/app/router.tsx (route /accesibilitate)
- updated: src/app/AppLayout.tsx (footer link)
- updated: en.json + ro.json (consent.accessibilityLink)
- result: 178 files / 1729 tests / build+pi+demo green

### T17 P1 ✅ 2026-05-30 -- Accessibility audit WCAG 2.1 AA
- updated: Modal.tsx (focus trap, focus restore, aria-labelledby, initial focus on first interactive element)
- updated: Select.tsx (aria-invalid, aria-describedby, error id)
- updated: Input.tsx + Textarea (aria-describedby extended to hint text)
- updated: EmptyState.tsx (title div to p)
- updated: Button.tsx (aria-busy when loading)
- updated: AppLayout.tsx (skip-link, main id, workspace aria-label, search aria-label)
- updated: shell.css (.skip-link styles)
- updated: en.json + ro.json (skipToContent, switchWorkspace, searchLabel)
- new: tests/unit/Select.test.tsx (3 cases); expanded Input.test.tsx (+3 cases)
- result: 177 files / 1725 tests / build+pi+demo green

### T85 P1 ✅ 2026-05-30 -- Wire remaining state-changing features into audit trail
- updated: `auditLogic.ts` (+6 actions: ticket.submitted/aga.scheduled/aga.opened/aga.closed/budget.proposed/petition.created; +4 entities: ticket/aga/budget/petition)
- updated: `en.json` + `ro.json` (audit.action.* + audit.entity.* keys for all new entries)
- updated: `TicketsPage.tsx`, `BudgetPage.tsx`, `PetitionsPage.tsx`, `AgaPage.tsx` (recordAudit calls)
- updated: `AuditLogPage.tsx` (ACTION_TONE entries for 6 new actions)
- result: 176 files / 1719 tests / build+pi+demo green

### T107 P3 ✅ 2026-05-29 -- Touch-friendly pointer drag for the customizable home cards
- new: `useHomeReorder.ts` (pointer/touch/pen unified gesture, press-and-hold touch activation, scroll-intent cancel), `reorderGeometry.ts` (pure `insertionFromPoint`, DOM-free), `tests/unit/reorderGeometry.test.ts` (5 cases)
- updated: `homeLayoutLogic.ts` (`moveCardTo` + `moveCardToInsertion`), `homeLayoutLogic.test.ts` (+`moveCardTo`/`moveCardToInsertion` cases), `HomePage.tsx` (HTML5 dnd removed; pointer handlers + drop carets wired), `globals.css` (drag states, spring-in caret animation, reduced-motion guard)
- result: 175 files / 1704 tests / build+pi+demo green

### T105 P3 ✅ 2026-05-29 -- Drag-and-drop reorder for profile custom fields
- new: `reorderCustomField` in profileLogic.ts; tests in profileLogic.test.ts (+1 test / 6 cases)
- updated: ProfilePage.tsx (GripVertical drag handle, pointer capture, initial-rect hit-testing, displayFields preview, lifted visual)
- updated: ro.json + en.json (profile.dragReorder)
- result: 175 files / 1704 tests / build+pi+demo green

### T39 P2 ✅ 2026-05-29 -- CSP hardening: exact Supabase origin + violation reporting
- new: `scripts/cspHeaders.ts` (buildCsp, buildHeadersFileContent, CSP_REPORT_PATH)
- updated: `vite.config.ts` (cspHeadersPlugin writes dist/_headers in closeBundle)
- new: `netlify/functions/csp-report.ts` (CSP violation collector, handles both report formats)
- updated: tsconfig.node.json + tsconfig.app.json (scripts/ added to include)
- updated: `tests/unit/securityHeaders.test.ts` (+6 buildCsp unit tests)
- result: 175 files / 1703 tests / build+pi+demo green

### T104 P2 ✅ 2026-05-29 -- Wire F66 profile into F28 Parcare + F36 directory + admin profile view
- updated: parkingLogic.ts (residentPlateSuggestion); ParkingPage.tsx (pre-fill plate from profile, hint label)
- updated: directoryLogic.ts (DirectoryCustomField, VisibleEntry.customFields, visibleEntry signature, searchDirectory neighbourFieldsMap); DirectoryPage.tsx (look up neighbour-visible custom fields per entry, render them; admin ChevronRight button + ResidentProfileModal)
- updated: profileLogic.ts (canViewAnyProfile); profileStore.ts (DEMO_PROFILE_FALLBACKS for u-res2/u-res3; demoProfile carPlate)
- updated: locales (+2 RO/EN keys each: directory.viewProfile/residentProfile, parking.plateFromProfile)
- new tests: parkingLogic.test.ts (residentPlateSuggestion); directoryLogic.test.ts (customFields in VisibleEntry); profileLogic.test.ts (canViewAnyProfile)
- result: 179 files / 1696 tests / build+pi+demo green

### T89 P2 ✅ 2026-05-29 -- Live activation: Supabase Storage for F33 documents
- new: documentsApi.ts (hydrateDocuments, addDocumentLive, addDocumentMetadataLive, removeDocumentLive, getDocumentSignedUrl); all behind isSupabaseConfigured
- updated: documentsStore.ts (addRecord, replaceForAsociatie); DocumentsPage.tsx (live upload, signed-URL download, live delete, on-mount hydration, PendingFile keeps raw File ref); locales (+3 keys)
- result: 179 files / 1690 tests / build+pi+demo green

### T113 P3 ✅ 2026-05-29 -- Return-to through AAL2 step-up
- updated: useMfaEnforcement.ts (pass state.from = pathname+search when redirecting to security page); SecurityPage.tsx (read returnTo from location.state, navigate there after step-up)
- result: 178 files / 1690 tests / build+pi+demo green

### T26 P1 ✅ 2026-05-29 -- Consent-gate enforcement in the notification fan-out
- updated: notify-email.ts (replaced local isConsentAllowed with shared mayNotify; constructs ConsentRecord from DB choices); notificationStore.ts (added emitGated method); tsconfig.node.json (added @/ paths for netlify function type-checking)
- new: consentGateFanout.test.ts (+8 tests)
- result: 178 files / 1698 tests / build+pi+demo green

### T16 P1 ✅ 2026-05-29 — Realtime updates
- new: realtimeLogic.ts (8 pure apply helpers for INSERT/UPDATE/DELETE events on announcements, tickets, private_threads, private_messages); useRealtimeSync.ts (hook, subscribes to all 4 tables on one channel per asociatieId, no-op offline)
- updated: AppLayout calls useRealtimeSync(currentAsociatieId)
- tests: +25 realtimeSync.test.ts
- result: 177 files / 1682 tests / build+pi+demo green

### T14 P1 ✅ 2026-05-29 — Email notification channel (live)
- new: notifPrefsLogic.ts (shouldSendEmailNotif, hourInTimezone, isInQuietHours, isValidQuietHour), notificationEmail.ts (3-kind bilingual builders + unsubscribe footer), notifPrefsStore.ts (persisted prefs per user), notify-email.ts (service-role Netlify function with consent gate + MAIL_MODE tri-modal), migration 20260529000004_notification_preferences.sql
- updated: NotificationsPage with NotifPrefsPanel (email toggle + quiet-hours form + one-click unsubscribe); RO+EN pref* locale strings
- tests: +26 notifPrefsLogic.test.ts + +16 notificationEmail.test.ts
- result: 173 files / 1657 tests / build+pi+demo green

### T144 P2 ✅ 2026-05-29 — Server-side OTP attempt-limit parity
- new: `mfaOtpServerLockReconcile.test.ts` (+5 tests): confirmed `challenge-locked` from server returns `channel-locked` lockedMs > 0; otpThrottles NOT updated on server lock; localStorage wipe doesn't bypass server lock; invalid-code increments client throttle; success resets it
- result: 176 files / 1630 tests / build+pi+demo green

### T143 P2 ✅ 2026-05-29 — Live activation: wire mfaStore to OTP functions + claim-aware enforcement
- new: `otpChannelApi.ts` (requestOtpLive/verifyOtpLive Netlify wrappers + hasAppElevation JWT decoder)
- store: loadChannels reads mfa_channels; enableChannel/disableChannel write/delete live (email only); requestOtp/verifyOtp/verifyConfirmToken use live functions + refreshSession on success; challengeRequired checks app_2fa_at before native AAL; enabledChannels uses liveEnabledChannels
- hook: useMfaEnforcement passes app2faSatisfied (decoded from JWT) to mfaEnforcementRedirect
- ui: SecurityPage calls loadChannels on mount; step-up/channel display reads liveEnabledChannels in live mode
- tests: +16 otpChannelApi.test.ts; updated mfaEnforcement + securityPageStepUp mocks
- result: 175 files / 1625 tests / build+pi+demo green

### T81 P2 ✅ 2026-05-29 — Server-side MFA challenge attempt limiting
- mig: `mfa_recovery_attempt_counts` table + `increment_recovery_attempts` SECURITY DEFINER RPC (atomic upsert-increment)
- fn: `mfa-recovery-verify.ts` now reads DB attempt count and increments via RPC on wrong code; removed in-memory `_attemptStore`
- store: `mfaStore.verifyChallenge` returns `lockedMs = 15min` when server signals `attempt-limit-exceeded`; `challengeThrottle` intentionally not updated (TOTP must not be blocked by recovery lock)
- fix: `env.ts` `window.location.origin` guard for node-environment tests
- tests: new `mfaServerLockReconcile.test.ts` (+4); updated `mfaRecoveryVerify.test.ts`
- result: 173 files / 1607 tests / build+pi+demo green

### T29 P1 ✅ 2026-05-29 — Live recovery-code login server routine
- new: `mfa-recovery-verify.ts` (bearer-auth, per-session rate limit, constant-time hash compare, delete consumed code, upsert session_elevations/recovery); `recoveryVerifyApi.ts` (client API module)
- wire: `mfaStore.verifyChallenge` live branch now calls the function for non-TOTP input + refreshes session on success
- cleanup: removed `recoveryLiveUnavailable` dead code from `MfaErrorKey`, `mfaErrorKey`, locale strings, test
- tests: +10 in `mfaRecoveryVerify.test.ts`
- result: 172 files / 1572 tests / build+pi+demo green

### T142 P2 ✅ 2026-05-29 — Email OTP service-role functions
- new: `otpEmail.ts` (bilingual template), `mfa-otp-request.ts` (mint+deliver), `mfa-otp-verify.ts` (verify+elevate session); reuses existing `supabaseAdmin.ts`, `resend.ts`, `otpChannelLogic.ts`
- fix: pre-existing TS error in `otpChannelLogic.ts` (removed `: Crypto` return type annotation)
- live activation: needs 4 env vars + Custom Access Token Hook enabled; documented in SECURITY.md
- tests: +27 in `mfaOtpFunctions.test.ts`
- result: 169 files / 1562 tests / build+pi+demo green

### T33 P2 ✅ 2026-05-29 — Server-backed login lockout
- mig: `login_attempt_locks` table + SECURITY DEFINER RPCs `check_login_lock`/`record_login_failure`/`clear_login_lock`; RLS enabled; escalating lock mirrors client constants (5 failures/15min, 1min base doubling to 30min cap)
- api/code: `serverLockout.ts` -- `hashEmail` (SHA-256 of normalized email) + `reconcileLockMs` (max of client+server); `securityStore` gains 3 async server methods; `authStore.signIn` reconciles both locks pre-attempt and post-failure
- tests: +10 in `serverLockout.test.ts`
- result: 166 files / 1535 tests / build+pi+demo green

### T109 P3 ✅ 2026-05-29 — Semantic ROPA guards
- api/code: `ropaLogic.ts` adds `financialBasisViolations` + `consentOptionalViolations` -- two pure guard functions that scan the resolved processing profile of every implemented feature and return violation messages; guards check that `financial` data only appears with `legal`/`contract` basis and that `consent` basis always includes `optional` data
- tests: +6 in `ropaLogic.test.ts` -- zero-violation assertions on all current FEATURES; synthetic bad/good feature pairs for each rule; guard ignores non-implemented features
- result: 165 files / 1531 tests / build+pi+demo green

### T88 P2 ✅ 2026-05-29 — F33 real file upload, role-gated
- api/code: `DocumentRecord` gains `file_name/file_size/file_type/file_data_url` fields; `documentLogic.ts` adds `DOCUMENT_MAX_BYTES` (10 MB), `DOCUMENT_ALLOWED_TYPES`, `DOCUMENT_ACCEPT`, `validateDocumentFile`, `canManageDocuments`, `formatFileSize`, `readFileAsDataUrl`; `documentsStore` converted to persisted store with `remove(id)` + updated `add(asociatieId, input)`; `DocumentsPage` role-gated upload (admin/presedinte/comitet), hidden `<input type="file">`, download button for all, delete with confirm modal; `document.uploaded`/`document.deleted` audit events + `'document'` entity in `auditLogic` + `ACTION_TONE`; DEMO_DOCUMENTS updated
- locales: `documents.fileLabel/fileHint/chooseFile/removeFile/download/delete/deleteTitle/deleteBody/deleted/too_large/bad_type/readFailed` RO+EN; `audit.action.document.uploaded/deleted` + `audit.entity.document` RO+EN
- tests: +7 in `documentLogic.test.ts` (validateDocumentFile x4, canManageDocuments x2, formatFileSize x1); E2E T88 happy path
- result: 165 files / 1525 tests / build+pi+demo green

### T101 P3 ✅ 2026-05-29 — Per-asociatie labeling in art. 15 export
- api/code: `CollectInput` gains `apartments: Record<string,string|null>` + `asociatiiNames: Record<string,string>` (replacing single-string fields); `DataSubjectExport.subject.asociatii: string[]` (was singular); profile section emits one row per asociatie; tickets/discussions/adminchat rows gain `asociatie` column; `toExportCsv` header joins all names; `MyDataPage.buildExport` builds both maps
- tests: 4 new T101 tests; emptyInput + 2 existing assertions updated
- result: 165 files / 1542 tests / build+pi+demo green

### T32 P1 ✅ 2026-05-29 — Server-side auth-policy parity
- docs: `.env.example` + `SECURITY.md` updated with exact Supabase Auth dashboard settings (min password length 10, HIBP check, rate limits); Known gaps updated
- no code changes (documentation task; settings applied operationally on the provisioned project)
- result: 165 files / 1538 tests / build+pi+demo green

### T180 P0 ✅ 2026-05-28 — Gate /onboarding to provisioned admins only in PROD
- api/code: `onboardingGateLogic.ts` (`PROVISIONAL_ASOCIATIE_NAME` + `findProvisionalAdminMembership`); `RequireOnboardingEntry` route guard; `RequireAsociatie` sends member-less PROD users to / with toast; defensive guard in `OnboardingWizard`
- locales: `auth.noValidInvite` EN+RO
- tests: 8 cases in `onboardingGateLogic.test.ts`
- result: 165 files / 1538 tests / build+pi+demo green

### T179 P0 ✅ 2026-05-28 — Invalid invite token: error-only state + remove create-asoc CTA
- api/code: `isInvalidTokenState` pure helper in `accountSetupLogic.ts`; `AccountSetupPage` shows error-only UI (icon + title + status body + contactAdmin) when token is invalid, no form, no create-asoc link; create-asoc CTA removed unconditionally
- locales: `setup.invalidTitle` + `setup.contactAdmin` EN+RO
- tests: +7 `isInvalidTokenState` cases in `accountSetupLogic.test.ts`
- result: 165 files / 1536 tests / build+pi+demo green

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
