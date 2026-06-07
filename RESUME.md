# RESUME — vecini.online

Terse machine-readable status log. Full history archived in `COMPLETED.md` (newest first). Drives `make progress` (see `BACKLOG.md` + `CLAUDE.md`).

## 0. Current status

- date: 2026-06-07
- last_task: T281 Email delivery robustness -- sendEmail() retries 3x with exponential backoff on 5xx/network errors; new emailFailureReporter.ts records permanent failures to platform_error_reports (non-PII); 5 callers updated (invite-email, provision-asociatie, provision-additional-admin, admin-invite-action, mfa-otp-request); 10 new unit tests in emailRetry.test.ts; inviteDeliveryWebhook static-analysis test updated; all 322 test files / 3249 tests green; all 3 builds pass
- pipeline: green (lint + typecheck + test + build + build:pi + build:demo)
- counts: 322 test files / 3249 tests
- stages: PROD/DEV/DEMO formalized (T171/T172); all three build green every task. DEV now matches PROD exactly (no role switcher; switcher is DEMO-only)
- mvp_spine: complete (T168/T169/T92/T55/T115 done; T128 token hardening done)
- next: queue exhausted -- all Group A-H tasks complete; overnight script will audit+replenish
- features: 67/67 demo-complete (offline UI + pure logic + tests); live-wired to Supabase: F01-F24 + F28-F32 + F33-F55 + F57-F65 (60 features) + auth/invites/onboarding; remaining 7 features offline-first, live-activation queued (F25-F27 bookings already live-wired T208, F56 emergency contacts live-wired earlier). F28/F36/F66 cross-feature glue wired (T104). Platform console: T20 umbrella complete (T93/T94/T95/T96/T97/T98/T99/T119/T120/T121 all done).
- e2e: F01/F02/F03/F04/F05/F06/F07/F08/F09/F10/F11/F12/F13/F14/F15/F16/F17/F18/F19/F20/F21/F22/F23/F24/F25/F26/F27/F28/F29/F30/F31/F32/F33/F34/F35/F36/F37/F38/F39/F40/F41/F44/F47/F48/F50/F51/F52/F53/F57/F62/F63/F65/F66/F67 happy paths green on chromium + mobile (55 features / 82%). Platform shell + provisioning E2E (T119/T121) done. Full smoke harness reworked (T211 done). E2E closure continues T224+.
- blockers: none.
- completion_estimate: 85% of original product vision delivered end-to-end (updated 2026-06-04). Detail: all 67 features demo-complete and offline-functional; 60/67 live-wired (90%); security posture ~93% (T212 done, remaining: T141 JWT hook); GDPR surface ~91% (T72/T75/T76/T78 done, T95 cross-tenant audit viewer done); Telegram bot handlers + live /start resolver complete (T15 + T58 done); SaaS billing foundation complete (T19 done: 3-tier plans, subscription + invoice DB, admin billing page, platform subscriptions page, Stripe-stub checkout function); platform console 100% of planned features done (T20 umbrella + subscriptions page); E2E coverage 82% (55/67 features).

---

### T275 ✅ 2026-06-06 -- Visual-regression snapshots
- new: tests/e2e/visual.spec.ts (5 snapshot tests: login, dashboard x2 themes, announcements, component gallery)
- modified: playwright.config.ts (snapshotPathTemplate strips {platform}; expect.toHaveScreenshot maxDiffPixelRatio 0.03)
- modified: package.json (test:visual / test:visual:update scripts)
- new: tests/e2e/visual.spec.ts-snapshots/ (5 baseline PNG files: login-light-sage, dashboard-light-sage, dashboard-dark-ocean, announcements-light-sage, component-gallery-light-sage, all -chromium.png)

### T248 ✅ 2026-06-05 -- DEV role-selector removed (demo-only) + BACKLOG cleanup + dedup audit
- modified: src/shared/components/DevRoleSwitcher.tsx (gate `if (!isDemo())`; removed signInAsDevUser usage + dead else branch; dropped getStage import)
- modified: src/shared/store/authStore.ts (removed signInAsDevUser from AuthState interface + implementation)
- modified: tests/unit/devRoleSwitcher.test.tsx (env mock -> isDemo only; null-outside-demo test; enter-demo-as-clicked-role assertion; removed dead pure-logic block)
- modified: tests/unit/piSeed.test.ts (comment wording: dropped removed-function references)
- modified: PI_DEPLOYMENT.md + .env.pi.example (DEV is a PROD replica; log in via the form, no switcher)
- modified: DECISIONS.md (2026-06-05 entry: role switcher DEMO-only, revises T176)
- cleaned: BACKLOG.md (removed redundant `✅` blocks already archived in COMPLETED.md; queue now holds only open work)
- archived: COMPLETED.md (T248 cleanup note + T20 umbrella entry)
- queued: T244 (per-asociatie store factory), T245 (roleUtils), T246 (hydrate abstraction), T247 (frozen-empty-array helper)

### T79 P3 ✅ 2026-06-05 -- Guard that every RLS-enabled table carries at least one policy
- new: tests/unit/rlsPolicyCoverage.test.ts (5 assertions: parse sanity, macro/direct recognition, zero-policy guard, stale-allowlist guard, now-has-policies guard)

### T87 P3 ✅ 2026-06-05 -- Stronger cryptographic tamper-evidence for the audit chain
- new: netlify/functions/audit-hmac.ts (HMAC-SHA256 signing endpoint, bearer auth, rate limit, admin check)
- modified: src/features/audit/auditLogic.ts (added hmacCanonical export)
- modified: src/shared/store/auditStore.ts (chainHmacByAsociatie state + fetchChainHmac action)
- modified: src/features/audit/AuditLogPage.tsx (HMAC badge on audit page)
- modified: src/shared/locales/ro.json + en.json (audit.hmacSigned key)
- new: tests/unit/auditHmac.test.ts (6 assertions)

### T237 P3 ✅ 2026-06-05 -- Optional LLM-backed PhrasingEngine (constrained selection only)
- new: netlify/functions/assistant-phrase.ts (POST stub, bearer auth, per-IP rate limit, prompt contract docs)
- new: src/features/assistant/llmPhrasingEngine.ts (safeChoice validation + createLlmPhrasingEngine factory)
- new: tests/unit/assistant.llmPhrasingEngine.test.ts (13 assertions)

### T236 P2 ✅ 2026-06-05 -- Wire visible-first grounding into the assistant widget
- modified: src/features/assistant/AssistantWidget.tsx (replaced answerQuery with routeQuery+toMessage; added useVisibleContext snapshot; lastOffered from last bot chips)
- new: tests/unit/assistantWidget.visibleGrounding.test.tsx (2 assertions)

### T235 P2 ✅ 2026-06-05 -- Visible-first intent router with structured schema + pluggable phrasing engine
- new: src/features/assistant/intentRouter.ts (RouterIntent, RouterResult, PhrasingEngine, deterministicPhrasing, routeQuery, fromReply, toMessage)
- modified: src/features/assistant/engine.ts (export variants)
- modified: src/shared/locales/ro.json (assistant.visiblePrefix)
- modified: src/shared/locales/en.json (assistant.visiblePrefix)
- new: tests/unit/assistant.intentRouter.test.ts (19 assertions)

### T234 P2 ✅ 2026-06-05 -- Visible-state adapter for the assistant (DOM grounding foundation)
- new: src/features/assistant/visibleState.ts (VisibleContext, extractVisibleContext, visibleContextEntries, useVisibleContext)
- new: tests/unit/assistant.visibleState.test.ts (5 assertions: labelled field, headings/buttons, hidden exclusion, .assistant subtree exclusion, KbEntry shape)

### T243 P2 ✅ 2026-06-05 -- Memoize shared presentational primitives (Button/Card/Badge/Input/Select)
- modified: src/shared/components/Button.tsx (memo import; ButtonBase intermediate; Button = memo(ButtonBase))
- modified: src/shared/components/Card.tsx (memo import; Card = memo(function Card(...)))
- modified: src/shared/components/Badge.tsx (memo import; Badge = memo(function Badge(...)))
- modified: src/shared/components/Input.tsx (memo import; InputBase/TextareaBase intermediates; Input/Textarea = memo(...))
- modified: src/shared/components/Select.tsx (memo import; SelectBase intermediate; Select = memo(SelectBase))
- new: tests/unit/primitiveMemo.test.ts (8 assertions)

### T242 P2 ✅ 2026-06-05 -- App-wide render and scroll smoothness pass (profiling-driven)
- modified: src/styles/primitives.css (contain: layout style on .card; contain: content on .notif-row)
- modified: src/styles/legal.css (contain: layout style + content-visibility: auto + contain-intrinsic-size: 0 64px on .audit-row)
- modified: src/features/audit/AuditLogPage.tsx (memo import; AuditRow = memo(...) extracted; AuditEntry type imported)
- modified: src/features/profile/NotificationsPage.tsx (memo+useCallback imports; NotifRow wrapped with memo; handleRead stabilized via useCallback)
- modified: src/features/directory/DirectoryPage.tsx (useMemo import; others computation memoized)
- new: tests/unit/renderSmoothness.test.ts (8 assertions: 4 CSS containment + 4 React.memo)

### T240 P2 ✅ 2026-06-05 -- Memoize AppLayout feature filtering + shell components
- modified: src/app/AppLayout.tsx (memo+useMemo imports; useEnabledFeatures useMemo+fixed role selector; Sidebar groups useMemo; Sidebar/BottomNav/Topbar wrapped with React.memo)
- new: tests/unit/appLayoutMemo.test.ts (5 assertions)

### T233 P2 ✅ 2026-06-05 -- Touch-target sizing for in-table action buttons
- new: src/styles/primitives.css (.row-action-btn class + mobile 44px for .row-action-btn/.iconbtn; .btn--sm + .btn--icon.btn--sm bumped to 44px on mobile)
- modified: src/features/admin/ApartmentsPage.tsx (4 action buttons: inline style -> .row-action-btn class)
- modified: src/features/profile/ProfilePage.tsx (4 iconbtns: removed inline width/height overrides)
- modified: src/shared/components/Modal.tsx (close button: removed inline width/height override)
- new: tests/unit/touchTargets.test.ts (5 assertions)

### T232 P2 ✅ 2026-06-05 -- DatePicker bottom-sheet variant on phones
- modified: src/shared/components/DatePicker.tsx (isMobile state, openPicker mobile branch, handleAnimationEnd + iv-dp-sheet-out, calendarContent extract, conditional sheet overlay portal)
- modified: src/styles/primitives.css (dp-sheet-overlay, dp-popover--sheet, drag handle ::before, iv-dp-sheet-in/out keyframes, reduced-motion overrides)
- new: tests/unit/datePickerSheet.test.ts (7 assertions)

### T231 P2 ✅ 2026-06-04 -- Responsive data tables: horizontal scroll on phones
- modified: src/styles/legal.css (media query: .gdpr-table overflow-x:auto + .gdpr-table__row min-width:400px)
- modified: src/styles/primitives.css (media query: .billing-invoices-table display:block + overflow-x:auto)
- new: tests/unit/responsiveTables.test.ts (5 assertions)

### T230 P1 ✅ 2026-06-04 -- Tap-accessible status tooltips (hover-only info unreachable on touch)
- new: src/shared/components/InfoTip.tsx (button + click/Esc/blur-toggle tooltip; aria-label + aria-expanded)
- modified: src/features/admin/ApartmentsPage.tsx (ApartmentStatusCell: tipOpen state, tabIndex/handlers on wrapper, group-focus-within on tooltip)
- modified: src/features/admin/ApartmentFormPage.tsx (replaced 2 hover-only info spans with <InfoTip>)
- new: tests/unit/statusTooltip.test.tsx (14 assertions)

### T239 P1 ✅ 2026-06-04 -- Cut modal-open jank: optimize full-viewport backdrop blur
- modified: src/styles/primitives.css (blur(8px) saturate(1.1) -> blur(5px); will-change + contain; prefers-reduced-motion flat dim)

### T238 P1 ✅ 2026-06-04 -- Stop per-keystroke re-renders in compose modals (state isolation reference)
- modified: src/features/announcements/AnnouncementsPage.tsx (AnnouncementComposeModal + AnnouncementRow extracted; useMemo for sanitizeHtml + visibleAnnouncements; stable useCallback handlers)
- new: tests/unit/announcementsRenderIsolation.test.tsx (4 assertions)
- modified: DECISIONS.md (pattern documented for T241)

### T108 P3 ✅ 2026-06-04 -- Rich per-card home widgets (live at-a-glance state on shortcut cards)
- new: src/features/home/homeWidgets.ts (pure builders + widgetForFeature dispatcher; WidgetData discriminated union)
- new: tests/unit/homeWidgets.test.ts (25 assertions)
- modified: src/features/home/HomePage.tsx (WidgetContent renderer on expanded cards: F01 announcement / F08 event / F09 polls / F17 my open tickets, useMemo-derived from existing stores)
- modified: src/shared/locales/{en,ro}.json (home.widget.* bilingual, RO _few plural)
- modified: src/styles/globals.css (.home-widget-* styles)

### T229 P3 ✅ 2026-06-04 -- Health-check Netlify function + uptime-monitoring docs
- new: netlify/functions/health.ts (GET-only, 120 req/60 s per IP, returns {"status":"ok","stage":"<stage>"})
- new: tests/unit/healthFunction.test.ts (3 assertions)
- modified: RUNBOOK-MVP.md (section 6 uptime monitoring docs)

### T19 P2 ✅ 2026-06-04 -- SaaS billing & plans
- modified: src/shared/types/domain.ts (BillingPlan, Subscription, Invoice, SubscriptionStatus, BillingInterval)
- new: src/features/billing/billingLogic.ts (BILLING_PLANS, 12 pure helpers)
- new: src/features/billing/billingStore.ts (Zustand persist, demo seed, upgradePlan/setStatus)
- new: src/features/billing/billingApi.ts (hydrateBilling parallel query)
- new: src/features/billing/BillingPage.tsx (/app/admin/abonament: dunning banners, plan cards, usage meters, invoice table)
- new: src/platform/platformSubscriptionsStore.ts (3-asociatie demo, markPaid, useSubscriptionSummary)
- new: src/platform/PlatformSubscriptionsPage.tsx (/consola/abonamente: summary bar, filter, table with markPaid)
- modified: src/platform/PlatformLayout.tsx (subscriptions section, CreditCard icon, ready: true)
- modified: src/platform/platformRouter.tsx (abonamente route + PlatformSubscriptionsPage lazy import)
- modified: src/app/router.tsx (BillingPage lazy import + admin/abonament route under RequireAdmin)
- new: netlify/functions/billing-checkout.ts (POST: verify admin role, upsert subscription, insert invoice via service-role)
- new: supabase/migrations/20260604000006_billing.sql (billing_plans + subscriptions + invoices, RLS)
- modified: src/shared/locales/ro.json + en.json (billing.* + platform.sections.subscriptions.* + platform.subscriptions.*)
- new: tests/unit/billingLogic.test.ts (32 assertions)

### T99 P2 ✅ 2026-06-04 -- Admin <-> superadmin support messenger
- new: src/shared/types/domain.ts (SupportSender + SupportMessage + SupportThread types)
- new: supabase/migrations/20260604000005_support_threads.sql (support_threads + support_messages, RLS, admin policies + superadmin SELECT-only policies)
- new: netlify/functions/support-admin.ts (POST: reply + toggle-status via service-role, verifyBearerToken + re-check platform_admins)
- new: src/features/support/supportLogic.ts (pure helpers: isValidSubject/Message, lastActivityAt, awaitingReply, unreadFor, sortThreads)
- new: src/features/support/supportStore.ts (Zustand admin-side store, seeded, persisted)
- new: src/features/support/SupportPage.tsx (/app/admin/contact-platforma, admin/presedinte/comitet, full thread UI + new-thread modal)
- new: src/platform/platformMessengerStore.ts (Zustand platform-side store, 3 demo threads, reply/toggleStatus with live Netlify call)
- new: src/platform/PlatformMessengerPage.tsx (/consola/mesaje, cross-asociatie inbox, search filter, thread view + superadmin reply)
- modified: src/platform/PlatformLayout.tsx (messenger ready: true)
- modified: src/platform/platformRouter.tsx (mesaje route + PlatformMessengerPage lazy import)
- modified: src/platform/platformApi.ts (hydrateAllSupportThreads: SELECT support_threads + support_messages, group by asociatie_id)
- modified: src/app/router.tsx (admin/contact-platforma route under RequireAdmin)
- modified: src/shared/locales/ro.json + en.json (support.* + platform.messenger.* keys)
- new: tests/unit/platformMessenger.test.ts (20 assertions: logic helpers + store seed + actions)

### T98 P2 ✅ 2026-06-04 -- Audited superadmin impersonation (read-only)
- modified: src/features/audit/auditLogic.ts (impersonation.started/ended actions + impersonation entity)
- modified: src/platform/platformAuditStore.ts (recordEntry action)
- new: netlify/functions/impersonate.ts (POST-only: verify bearer, re-check platform_admins, validate action+id, fetch chain tail, insert audit row via service role)
- new: src/platform/platformImpersonationStore.ts (ImpersonationSession, startSession/endSession/clearError)
- new: src/platform/ImpersonationBanner.tsx (amber persistent banner with exit button)
- new: src/platform/PlatformImpersonatePage.tsx (/consola/impersonare: notice + session card + association list)
- modified: src/platform/PlatformLayout.tsx (banner in main, impersonation ready: true)
- modified: src/platform/platformRouter.tsx (impersonare route + lazy import)
- modified: src/features/audit/AuditLogPage.tsx + PlatformAuditPage.tsx (impersonation tone map entries)
- modified: src/shared/locales/ro.json + en.json (audit action/entity + platform.impersonation.* keys)
- new: tests/unit/platformImpersonation.test.ts (17 assertions)

### T97 P2 ✅ 2026-06-04 -- Platform usage/health metrics (superadmin app)
- new: supabase/migrations/20260604000004_usage_metrics_superadmin_rls.sql (super_admin SELECT on announcements/tickets/votes)
- new: src/platform/platformUsageStore.ts (AssocUsageMetric, deriveHealthStatus, computeRollup, seeded store)
- modified: src/platform/platformApi.ts (hydrateUsageMetrics: 7 parallel queries, 30-day activity window)
- new: src/platform/PlatformUsagePage.tsx (/consola/utilizare: summary bar, search filter, per-asociatie list)
- modified: src/platform/PlatformLayout.tsx (usage section ready: true)
- modified: src/platform/platformRouter.tsx (utilizare route + lazy import)
- modified: src/shared/locales/ro.json + en.json (platform.usage.* keys, all plural forms)
- new: tests/unit/platformUsage.test.ts (16 assertions: deriveHealthStatus, computeRollup, store seed)

### T96 P2 ✅ 2026-06-04 -- Platform error feed (superadmin app)
- new: supabase/migrations/20260604000003_platform_error_reports.sql (platform_error_reports table + super_admin SELECT RLS policy)
- modified: netlify/functions/error-report.ts (persist to platform_error_reports via supabaseAdmin when configured)
- modified: src/shared/lib/errorReporting.ts (100-report ring buffer + getReportBuffer export)
- new: src/platform/platformErrorStore.ts (PlatformErrorReport, ErrorGroup, groupReports(), Zustand store with 7-report demo seed)
- modified: src/platform/platformApi.ts (hydrateErrorReports: SELECT platform_error_reports, update store)
- new: src/platform/PlatformErrorsPage.tsx (/consola/erori: summary bar, text+date filters, grouped feed with count/first/last seen/refs)
- modified: src/platform/PlatformLayout.tsx (errors section ready: true)
- modified: src/platform/platformRouter.tsx (erori route added, PlatformErrorsPage lazy import)
- modified: src/shared/locales/ro.json + en.json (platform.errors.* keys)
- new: tests/unit/platformErrors.test.ts (14 assertions)

### T95 P2 ✅ 2026-06-04 -- Cross-asociatie audit viewer (platform app)
- new: src/platform/platformAuditStore.ts (seeded demo chains for 3 demo asociatii; setChains/setFetchError)
- modified: src/platform/platformApi.ts (hydrateAllAuditLogs: cross-tenant audit_log SELECT, group by asociatie_id, update store)
- new: src/platform/PlatformAuditPage.tsx (per-asociatie integrity badges, T09 filters + asociatie filter, JSON/CSV export, bilingual)
- modified: src/platform/platformRouter.tsx (audit route added)
- modified: src/platform/PlatformLayout.tsx (audit section ready: true)
- modified: src/shared/locales/ro.json + en.json (platform.audit.* keys)
- new: tests/unit/platformAudit.test.ts (9 assertions)

### T68 P2 ✅ 2026-06-04 -- In-app "Link Telegram" resident surface
- new: src/features/telegram/telegramDeepLink.ts (buildTelegramDeepLink pure helper)
- modified: src/features/profile/NotificationsPage.tsx (TelegramLinkPanel: issue code, show deep link + copy, show linked state + unlink)
- modified: src/features/auth/SecurityPage.tsx (Link Telegram hint -> /app/notificari)
- modified: src/shared/lib/env.ts (telegramBotUsername: VITE_TELEGRAM_BOT_USERNAME)
- modified: .env.example (VITE_TELEGRAM_BOT_USERNAME)
- modified: src/shared/locales/ro.json + en.json (telegram link panel strings)
- new: tests/unit/telegramLinkPanel.test.ts (7 assertions)

### T58 P2 ✅ 2026-06-04 -- Live activation: Telegram webhook /start CODE resolver
- new: supabase/migrations/20260604000002_telegram_link_codes.sql (telegram_link_codes table + RLS manage-own policy scoped by user_id + is_member)
- new: netlify/functions/_shared/telegramStartLive.ts (resolveAndPersistStartCode: DB-backed resolver for per-user link codes + invite codes; atomic consume + upsert telegram_users)
- modified: src/shared/server/telegramWebhook.ts (StartCodeResolver type + optional resolveStartCode in TelegramWebhookRequest; handleMessage/handleTelegramUpdate thread the resolver; falls back to replyChecking when absent/from is undefined)
- modified: netlify/functions/telegram-webhook.ts (inject resolveAndPersistStartCode when isSupabaseAdminConfigured)
- modified: tests/unit/telegramWebhook.test.ts (8 new tests: resolver injection for linked/already-linked/expired/used/revoked/unknown outcomes + invalid-code guard + from-absent fallback)

### T76 P2 ✅ 2026-06-04 -- Live activation: breach resident notice + audit stream
- new: tests/unit/breachFanout.test.ts (14 assertions)
- modified: src/features/audit/auditLogic.ts (3 new AUDIT_ACTIONS: breach.authority_notified, breach.residents_notified, breach.closed)
- modified: src/features/audit/AuditLogPage.tsx (ACTION_TONE entries for new actions)
- modified: src/features/notifications/notificationLogic.ts (breach.resident_notice kind + builder)
- modified: src/features/notifications/notificationsApi.ts (deriveConsentKind: breach.resident_notice -> essential)
- modified: src/features/notifications/notificationFanout.ts (emitBreachResidentNotice)
- modified: src/features/gdpr/BreachAdminPage.tsx (onNotifyAuthority + onNotifySubjects handlers with audit + live fan-out)
- modified: src/features/profile/NotificationsPage.tsx (aga.convoked + aga.voting_open + breach.resident_notice rendering)
- modified: src/shared/locales/ro.json + en.json (audit action labels + breach.subjectsNotified + notifications.breachResidentNotice)

### T78 P2 ✅ 2026-06-04 -- Erasure/export Storage photo objects
- new: supabase/migrations/20260604000001_photos_bucket.sql (photos bucket + member-read/write-own/delete-own RLS)
- modified: netlify/functions/gdpr-erasure.ts (Phase 0 collect photo_paths; Phase 1 null visitor_reports.photo_path; Phase 2.5 best-effort Storage remove)
- modified: src/features/gdpr/gdprLogic.ts (extractPhotoPaths pure helper)
- new: tests/unit/gdprStorageErasure.test.ts (6 assertions)

### T218 P2 ✅ 2026-06-03 -- Live-activate F49 Cod portari + F50 Evacuare + F51 PSI + F52 Asigurare + F53 Chei + F54 Vizitatori + F55 Alarmă
- new: src/features/safety/safetyApi.ts (hydrateSafetyProfile, persistSafetyProfile + AES-GCM encryption)
- new: src/features/evacuation/evacuationApi.ts (hydrateEvacuation, persistPetMarker, removePetMarker)
- new: src/features/psi/psiApi.ts (hydratePsiAssets, addPsiAssetLive, markPsiCheckedLive)
- new: src/features/insurance/insuranceApi.ts (hydrateInsurance, addInsurancePolicyLive)
- new: src/features/keys/keysApi.ts (hydrateKeys, addKeyLive, handoverKeyLive)
- new: src/features/visitors/visitorsApi.ts (hydrateVisitors, addVisitorReportLive, cycleVisitorStatusLive)
- new: src/features/alarm/alarmApi.ts (hydrateAlarm, addAlarmSystemLive, logAlarmTestLive, reportAlarmFaultLive)
- rebuilt: safetyStore/evacuationStore/psiStore/insuranceStore/keysStore/visitorsStore/alarmStore (all per-asociatie persisted)
- migration: supabase/migrations/20260603000010_f49_f55_columns.sql (route/equipment/apartment_label/user_id/holder_name/reporter_name columns + member-insert/owner-manage policies)
- fixed: MyDataPage migrated from useVisitorsStore().reports to useAsociatieVisitors()
- new: tests/unit/safetyApi.test.ts (4) + evacuationApi.test.ts (4) + psiApi.test.ts (3) + insuranceApi.test.ts (3) + keysApi.test.ts (4) + visitorsApi.test.ts (4) + alarmApi.test.ts (5) = 27 assertions

### T217 P2 ✅ 2026-06-03 -- Live-activate F41 Project tracker + F42 Photo journal + F43 Contractori + F44 Crowdfunding + F45 Plan multianual + F47 Energie + F48 Garantii
- new: src/features/projects/projectsApi.ts (hydrateProjects, addProjectLive, setProjectStatusLive)
- new: src/features/photojournal/photoJournalApi.ts (hydratePhotos, addPhotoLive)
- new: src/features/contractors/contractorsApi.ts (hydrateContractors, addContractorLive, rateContractorLive, toggleContractorAvailableLive)
- new: src/features/crowdfund/crowdfundApi.ts (hydrateCrowdfunds, createCrowdfundLive, pledgeLive)
- new: src/features/multiyear/multiyearApi.ts (hydrateMultiyear, addMultiyearItemLive)
- new: src/features/energy/energyApi.ts (hydrateEnergy, addEnergyRecordLive)
- new: src/features/warranties/warrantiesApi.ts (hydrateWarranties, addWarrantyLive)
- rebuilt: projectsStore/photoJournalStore/contractorStore/crowdfundStore/multiyearStore/energyStore/warrantiesStore (all per-asociatie persisted)
- new: tests/unit/projectsApi.test.ts (4) + photoJournalApi.test.ts (4) + contractorsApi.test.ts (5) + crowdfundApi.test.ts (5) + multiyearApi.test.ts (3) + energyApi.test.ts (4) + warrantiesApi.test.ts (3)

### T216 P2 ✅ 2026-06-03 -- Live-activate F34 Furnizori + F35 Apartament info + F36 Directory + F37 Animale + F38 Multumiri + F39 Wiki + F40 Glosar
- new: src/features/suppliers/suppliersApi.ts (hydrateSuppliers, addSupplierLive)
- new: src/features/directory/directoryApi.ts (hydrateDirectory, syncDirectoryConsent)
- new: src/features/pets/petsApi.ts (hydratePets, addPetLive, togglePetLostLive)
- new: src/features/thankyous/thankYousApi.ts (hydrateThankYous, postThankYouLive)
- new: src/features/wiki/wikiApi.ts (hydrateWiki, addWikiPageLive, updateWikiPageLive)
- new: src/features/glossary/glossaryApi.ts (hydrateGlossary)
- new: src/features/glossary/glossaryStore.ts (per-asociatie persisted + useAsociatieGlossary hook)
- new: supabase/migrations/20260603000009_f34_f40_member_policies.sql (owner_name/from_name denorm + member insert + consent profile columns)
- new: tests/unit/suppliersApi.test.ts (4) + directoryApi.test.ts (3) + petsApi.test.ts (5) + thankYousApi.test.ts (4) + wikiApi.test.ts (5) + glossaryApi.test.ts (3)
- updated: supplierLogic.ts, directoryLogic.ts, petLogic.ts, thankYouLogic.ts, wikiLogic.ts, glossaryLogic.ts (per-asociatie types + helpers)
- updated: suppliersStore.ts, directoryStore.ts, petsStore.ts, thankYousStore.ts, wikiStore.ts (rebuilt per-asociatie persisted + hooks)
- updated: SuppliersPage.tsx, DirectoryPage.tsx, PetsPage.tsx, ThankYousPage.tsx, WikiPage.tsx, GlossaryPage.tsx (hydrate + ErrorState retry)
- updated: MyDataPage.tsx (byAsociatie flatMap for thankYous/directory/pets), dataSources.ts (useAsociatieDirectory hook)
- result: 237 files / 2280 tests / lint + typecheck + build + build:pi + build:demo all green

### T215 P2 ✅ 2026-06-03 -- Live-activate F28 Parcare + F29 Bicicletaria + F30 Boxa + F31 Plante + F32 Acces curierat
- new: src/features/parking/parkingApi.ts (hydrateParking, addParkingSpot)
- new: src/features/bikes/bikesApi.ts (hydrateBikes, addBike, toggleBikeAbandoned)
- new: src/features/storage/storageApi.ts (hydrateStorageUnits, addStorageUnit)
- new: src/features/greenspace/greenApi.ts (hydrateGreenTasks, addGreenTask, signUpForTask, releaseTask)
- new: src/features/access/accessApi.ts (hydrateAccessCodes, persistAccessCode)
- new: supabase/migrations/20260603000008_f28_f32_columns.sql (denormalized columns + member policies)
- new: tests/unit/parkingApi.test.ts (4 assertions) + bikesApi.test.ts (6) + storageApi.test.ts (4) + greenApi.test.ts (6) + accessApi.test.ts (4)
- updated: parkingLogic.ts (ParkingByAsociatie types), parkingStore.ts (per-asociatie persisted + useAsociatieParking), ParkingPage.tsx (hydrate + ErrorState)
- updated: bikeLogic.ts (BikesByAsociatie types), bikesStore.ts (per-asociatie persisted + useAsociatieBikes), BikesPage.tsx (hydrate + ErrorState)
- updated: storageLogic.ts (StorageByAsociatie types), storageStore.ts (per-asociatie persisted + useAsociatieStorageUnits), StoragePage.tsx (hydrate + ErrorState)
- updated: greenLogic.ts (GreenByAsociatie types), greenStore.ts (per-asociatie persisted + useAsociatieGreenTasks), GreenSpacePage.tsx (hydrate + ErrorState)
- updated: accessLogic.ts (AccessByAsociatie types), accessStore.ts (per-asociatie persisted + useAsociatieAccessCodes), AccessPage.tsx (hydrate + ErrorState)
- updated: MyDataPage.tsx (useAsociatieBikes migration)
- result: 231 files / 2256 tests / lint + typecheck + build + build:pi + build:demo all green

### T214 P2 ✅ 2026-06-03 -- Live-activate F21 Sesizari recurente + F22 Solicitare oferte + F23 Vecin de garda + F24 Imprumutabile
- new: src/features/rfp/rfpApi.ts (hydrateRfps, addRfpItem, addRfpQuote, decideRfpItem)
- new: src/features/duty/dutyApi.ts (hydrateDutySlots, signUpForDuty, releaseFromDuty)
- new: src/features/lending/lendingApi.ts (hydrateLendingItems, addLendingItem, toggleLendingAvailable)
- new: supabase/migrations/20260603000007_duty_lending_rfp_member_policies.sql
- new: tests/unit/rfpApi.test.ts (6 assertions) + dutyApi.test.ts (6) + lendingApi.test.ts (6)
- updated: recurringLogic.ts (AcknowledgedByAsociatie types), recurringStore.ts (per-asociatie persisted), RecurringPage.tsx (scoped acks)
- updated: rfpLogic.ts (per-asociatie types), rfpStore.ts (rebuilt per-asociatie + useAsociatieRfps), RfpPage.tsx (hydrate + ErrorState)
- updated: dutyLogic.ts (per-asociatie types), dutyStore.ts (rebuilt + useAsociatieDuty), DutyPage.tsx (authStore user + hydrate + ErrorState)
- updated: lendingLogic.ts (per-asociatie types), lendingStore.ts (rebuilt + useAsociatieLending), LendingPage.tsx (authStore owner + hydrate + ErrorState)
- updated: MyDataPage.tsx (useAsociatieLending)
- result: 226 files / 2233 tests / lint + typecheck + build + build:pi + build:demo all green

### T213 P2 ✅ 2026-06-03 -- Live-activate F18 Istoric reparatii + F19 Calendar servicii + F20 Citire contoare
- new: src/features/repairs/repairRecordsStore.ts (per-asociatie persisted, useAsociatieRepairs hook)
- new: src/features/repairs/repairRecordsApi.ts (hydrateRepairs, addRepair)
- new: src/features/maintenance/scheduledMaintenanceApi.ts (hydrateMaintenance, addMaintenanceItem, markMaintenanceDone)
- new: src/features/meters/metersApi.ts (hydrateMeters, submitMeterReading)
- new: supabase/migrations/20260603000006_meter_readings_member_insert.sql (member insert policy)
- new: tests/unit/repairRecordsApi.test.ts (3 assertions) + scheduledMaintenanceApi.test.ts (7) + metersApi.test.ts (4)
- updated: repairLogic.ts (per-asociatie types + canManageRepairs), RepairsPage.tsx (store + hydrate + ErrorState + admin compose), maintenanceLogic.ts (per-asociatie types), maintenanceStore.ts (rebuilt per-asociatie), MaintenancePage.tsx (hydrate + ErrorState), meterLogic.ts (per-asociatie types), metersStore.ts (rebuilt per-asociatie), MetersPage.tsx (hydrate + ErrorState), ApartmentInfoPage.tsx (useAsociatieMeters)
- result: 224 files / 2214 tests / lint + typecheck + build + build:pi + build:demo all green

### T121 P2 ✅ 2026-06-03 -- E2E for the asociatii provisioning console (platform app)
- updated: tests/e2e/platform.spec.ts (2 new T121 tests: validation + happy path)
- result: 221 files / 2196 tests / lint + typecheck + build + build:pi + build:demo all green; 4/4 T121 E2E green (2 live-only skipped) on chromium + mobile

### T120 P2 ✅ 2026-06-03 -- Live activation: cross-tenant asociatii list read + server-mediated provisioning
- new: src/platform/platformApi.ts (hydrateAsociatiiList: reads asociatii + memberships + apartments + auth_audit_events, groups counts in JS, calls replaceAsociatii/setFetchError)
- new: supabase/migrations/20260603000005_platform_superadmin_auth_audit.sql (super admin read all auth audit events policy)
- updated: src/platform/platformAsociatiiStore.ts (fetchError + setFetchError + replaceAsociatii)
- updated: src/platform/PlatformAsociatiiPage.tsx (useEffect hydrate on mount, ErrorState retry, loading guard on empty state)
- new: tests/unit/platformApi.test.ts (6 assertions: offline no-op, replaceAsociatii, setFetchError)
- result: 221 files / 2196 tests / lint + typecheck + build + build:pi + build:demo all green

### T72 P2 ✅ 2026-06-03 -- Live activation: server-side erasure execution + retention cleanup
- new: netlify/functions/gdpr-erasure.ts (ERASURE_PLAN execution: anonymize FKs + delete rows + remove membership + optional auth delete)
- new: netlify/functions/gdpr-retention-purge.ts (monthly scheduled purge: auth_audit_events >12mo + resolved tickets >1yr)
- new: src/features/gdpr/gdprErasureApi.ts (client callers, no-op offline)
- updated: src/shared/store/gdprStore.ts (fires triggerErasure on completed erasure)
- updated: DATA_RETENTION.md (apply steps)
- new: tests/unit/gdprErasureApi.test.ts (7 assertions)
- result: 218 files / 2181 tests / lint + typecheck + build + build:pi + build:demo all green

### T106 P2 ✅ 2026-06-03 -- Live activation: per-resident home layout (home_layouts)
- new: src/features/home/homeLayoutApi.ts (hydrateHomeLayout, persistHomeLayout, deleteHomeLayout)
- updated: src/features/home/HomePage.tsx (useEffect hydrate on mount; persistHomeLayout in apply(); deleteHomeLayout on reset)
- new: tests/unit/homeLayoutApi.test.ts (5 assertions: offline-path no-ops)
- no migration needed: home_layouts table + owner-RLS already in 20260524000001_home_layouts.sql
- result: 217 files / 2174 tests / lint + typecheck + build + build:pi + build:demo all green

### T103 P2 ✅ 2026-06-03 -- Live activation: profile + custom fields + Storage avatar
- new: src/features/profile/profileApi.ts (hydrateProfile, persistProfile, uploadProfileAvatar, clearProfileAvatar, getAvatarSignedUrl)
- updated: src/features/profile/ProfilePage.tsx (useEffect hydrate on mount; debounced persistProfile in update(); uploadProfileAvatar in onPickPhoto; onRemovePhoto calls clearProfileAvatar)
- new: tests/unit/profileApi.test.ts (11 assertions: offline-path no-ops for all API functions)
- no migration needed: avatars bucket + owner RLS already in 20260121000003_storage.sql
- result: 216 files / 2169 tests / lint + typecheck + build + build:pi + build:demo all green

### T211/T232 P1 ✅ 2026-06-03 -- E2E harness closed (T140 fix + T231/T233 verified passing)
- fixed: tests/e2e/smoke.spec.ts T140: demo-build detection moved before email-channel enable (before sign-out), detecting via "modul demonstrativ" button count at '/' — prevents page-context crash on both chromium + mobile
- verified passing (no change): T09, T54 (T231); F04, F10, F13 (T233)
- T211 closed: all leaf tasks T230-T233 green; T16 blocker cleared from RESUME.md
- result: 214 files / 2141 tests / lint+typecheck+build+pi+demo green; 2/2 T140 green chromium + mobile

### T230 P1 ✅ 2026-06-03 -- E2E invite-redeem welcome redirect (smoke T42 + T126)
- fixed: tests/e2e/smoke.spec.ts line 684: `getByRole('heading', { name: /Notificări/i })` -> `{ name: 'Notificări', level: 1 }` (strict-mode violation: page has h1 + h3 both matching)
- result: 214 files / 2141 tests / lint+typecheck+build+pi+demo green; 6/6 E2E green (T42 x2 + T126 x2 + T42/T124 x2) chromium + mobile

### T210 P3 ✅ 2026-06-03 -- E2E coverage for F33 Document archive (admin upload + download + delete)
- new: tests/e2e/features.spec.ts (+2 happy paths: admin upload+download+delete; resident read-only access with download visible but no manage controls)
- result: 215 files / 2138 tests / lint+typecheck+build+pi+demo green; 4/4 E2E green (chromium + mobile)

### T209 P3 ✅ 2026-06-03 -- Assistant widget live data sources (F56 contacts + F36 directory from real stores)
- refactored: src/features/assistant/dataSources.ts (buildEmergencyEntries/buildDirectoryEntries parameterized; useAsociatieEmergencyContacts hook queries emergency_contacts under RLS; useDataEntries hook reads live emergency contacts + reactive directoryStore)
- updated: src/features/assistant/AssistantWidget.tsx (DATA_ENTRIES static replaced with useDataEntries() hook; dataEntries added to useMemo deps)
- extended: tests/unit/assistant.engine.test.ts (+4 assertions: buildEmergencyEntries live data, buildDirectoryEntries consent masking x3)
- result: 215 files / 2138 tests / lint+typecheck+build+pi+demo green

### T208 P3 ✅ 2026-06-03 -- E2E coverage for shared-resource booking features (F25/F26/F27)
- new: tests/e2e/bookings.spec.ts (3 happy paths: F25 laundry book+cancel, F26 elevator book+cancel, F27 venue book+cancel)
- result: 215 files / 2134 tests / lint+typecheck+build+pi+demo green; 6/6 E2E green (chromium + mobile)

### T207 P2 ✅ 2026-06-03 -- Recovery codes view + regenerate in SecurityPage
- extended: src/shared/store/mfaStore.ts (recoveryCodesRemaining state; loadRecoveryCodesCount action; confirmEnroll/disable/regenerateRecoveryCodes/verifyChallenge all update count)
- updated: src/features/auth/SecurityPage.tsx (new "Coduri de recuperare" card with count + gated regenerate button + confirmation modal; regenerate removed from TOTP status card)
- updated: src/shared/locales/en.json + ro.json (11 new auth.mfa keys: codesCardTitle/Body, codesRemaining_zero/one/few/other, codesStepUpHint, regenConfirmTitle/Body/Confirm)
- updated: tests/unit/securityPageStepUp.test.tsx (supabase stub extended to support .eq chain)
- new: tests/unit/recoveryCodesView.test.ts (5 assertions)

### T206 P2 ✅ 2026-06-03 -- F17 Sesizări: photo attachments live wiring
- new: src/shared/types/domain.ts (TicketAttachment type; Ticket.attachments optional field)
- extended: src/features/tickets/ticketLogic.ts (TICKET_ATTACHMENT_MAX_BYTES/MAX_FILES/ACCEPT/TYPES + validateTicketFile)
- rewritten: src/features/tickets/ticketsApi.ts (hydrateTickets joins ticket_attachments; uploadTicketAttachments; getTicketAttachmentUrl; submitTicket accepts offlineAttachments + liveFiles)
- rewritten: src/features/tickets/TicketsPage.tsx (file input, pending list, async submit, attachment download buttons on cards)
- new: supabase/migrations/20260603000003_ticket_attachments_insert.sql (file_name/file_size columns + reporter insert policy)
- updated: en.json + ro.json (10 new tickets.* keys each)
- new: tests/unit/ticketAttachments.test.ts (8 assertions)
- updated: tests/e2e/features.spec.ts (new F17 photo upload happy path)

### T205 P2 ✅ 2026-06-03 -- Petition comitet-response surface (public reply after auto-forward)
- extended: src/shared/types/domain.ts (Petition: response/responded_at/responded_by_name optional fields)
- extended: src/features/petitions/petitionLogic.ts (petitionHasResponse, isValidPetitionResponse, addPetitionResponse)
- updated: src/features/petitions/petitionStore.ts (addResponse action + addPetitionResponse import)
- updated: src/features/petitions/petitionApi.ts (PetitionRow + rowToPetition + hydratePetitions select + savePetitionResponse)
- updated: src/features/petitions/PetitionsPage.tsx (role gate + inline response form + response display)
- updated: src/shared/demo/demoData.ts (DEMO_PETITIONS: pt-2 forwarded petition added)
- new: supabase/migrations/20260603000002_petition_response_columns.sql (responded_at + responded_by_name columns)
- updated: en.json + ro.json (petition.response/respond/responded/awaitingResponse/responseBy keys)
- extended: tests/unit/petitionLogic.test.ts (+9 assertions)
- extended: tests/unit/petitionsApi.test.ts (+2 assertions for savePetitionResponse offline path)
- updated: tests/e2e/features.spec.ts (T205 E2E: comitet posts response, resident sees it)
- result: 213 files / 2128 tests / lint+typecheck+build+pi+demo green

### T204 P2 ✅ 2026-06-03 -- In-app notification fan-out for ticket.status_changed and discussion.reply
- new: src/features/notifications/notificationFanout.ts (emitTicketStatusChanged + emitDiscussionReply; store-first + persistAndFanOut live)
- updated: notificationLogic.ts (ticket.status_changed + discussion.reply kinds + factories)
- updated: TicketsPage.tsx (handleAdvanceDirect + confirmAdvance emit on status change)
- updated: DiscussionsPage.tsx (send() emits reply notification to thread author, skip self)
- updated: NotificationsPage.tsx (render two new kinds via i18n)
- updated: en.json + ro.json (ticketStatusChanged/Body + discussionReply/Body keys)
- new: tests/unit/notificationFanout.test.ts (11 assertions)
- result: 212 files / 2112 tests / lint+typecheck+build+pi+demo green

### T203 P2 ✅ 2026-06-03 -- E2E happy path for F01 Anunțuri (compose + scheduled badge + attachment)
- updated: tests/e2e/features.spec.ts (3 new tests -- immediate publish, scheduled badge + resident visibility, file attachment download)
- result: 210 files / 2101 tests / lint+typecheck+build+pi+demo green; 6/6 E2E passes (chromium + mobile)

### T202 P2 ✅ 2026-06-03 -- Fix locale plural-form asymmetry (EN plural keys missing from en.json)
- updated: src/shared/locales/en.json (16 _few keys added: apartments x8, breach.awaitingBanner, recurring.banner + timesInWindow, platform.asociatii x5)
- new: tests/unit/localeKeys.test.ts (4 assertions: key-set parity guard between en.json and ro.json)
- result: 210 files / 2101 tests / lint+typecheck+build+pi+demo green

### T200 P2 ✅ 2026-06-03 -- Live hydration + write for asociație identity (BuildingSettingsPage)
- new: src/features/admin/asociatieApi.ts (hydrateAsociatie reads asociatii row under RLS, calls hydrateFromRemote; saveAsociatie local update + DB write with conflict detection)
- refactored: src/features/admin/asociatieStore.ts (hydrateFromRemote action added; Supabase write removed from update, moved to API)
- updated: src/features/admin/BuildingSettingsPage.tsx (useEffect mount-hydrate; dirty state to guard form sync; async save via saveAsociatie; cuiConflict toast; loading button)
- updated: src/shared/locales/en.json + ro.json (building.err.cuiConflict key)
- new: tests/unit/asociatieApi.test.ts (4 assertions: offline no-ops + synchronous store updates)
- result: 209 files / 2097 tests / lint+typecheck+build+pi+demo green

### T199 P1 ✅ 2026-06-03 -- F17 Sesizări: E2E happy paths (resident submit + admin lifecycle + resolution rating)
- updated: tests/e2e/features.spec.ts (2 new tests: resident submit → Primit badge; admin advance primit→asignat→in_lucru→rezolvat + reporter rates 4 stele → stars saved)
- result: 208 files / 2091 tests / lint+typecheck+build+pi+demo green; 4/4 E2E pass (chromium+mobile)

### T196 P2 ✅ 2026-06-03 -- F16 Petiții interne: live activation + auto-forward at threshold + E2E
- extended: src/features/petitions/petitionLogic.ts (canManagePetitions, PetitionCatalog/PetitionsByAsociatie, seedPetitions, petitionsForAsociatie, migratePetitionsState, newPetition, addPetitionIn)
- rebuilt: src/features/petitions/petitionStore.ts (per-asociație persisted store: byAsociatie + mySigned + fetchError; addPetition/signPetition/replaceForAsociatie/setFetchError; version 1 reseeds demo; useAsociatiePetitions hook)
- new: src/features/petitions/petitionApi.ts (hydratePetitions reads petitions+petition_signatures under RLS tallied in JS; createPetition store+live insert; signPetition optimistic+live+auto-forward: DB status 'inaintata' + petition.forwarded audit + demo notification)
- rebuilt: src/features/petitions/PetitionsPage.tsx (hydrate on mount; ErrorState retry; findVoterApartmentId; mySigned; progressbar aria roles)
- updated: src/features/audit/auditLogic.ts (petition.forwarded added to AUDIT_ACTIONS)
- updated: src/features/audit/AuditLogPage.tsx (petition.forwarded tone: success)
- updated: src/shared/locales/en.json + ro.json (petition.forwarded audit.action locale keys)
- fixed: src/features/gdpr/MyDataPage.tsx (migrated from removed s.petitions to flatMap byAsociatie)
- extended: tests/unit/petitionLogic.test.ts (+12 assertions)
- new: tests/unit/petitionsApi.test.ts (offline path: 7 assertions)
- updated: tests/e2e/features.spec.ts (F16 happy path: sign + progress bar + button disabled)
- result: 204 files / 2041 tests / lint+typecheck+build+pi+demo green

### T194 P2 ✅ 2026-06-03 -- F14 Cutie de idei: live activation + auto top-N promotion + E2E
- new migration: supabase/migrations/20260603000001_idea_votes_rls.sql (RLS on idea_votes: SELECT+INSERT for members, no DELETE/UPDATE per T34 immutability guard)
- extended: src/features/ideas/ideaLogic.ts (isPromoted, canManageIdeas, IdeaCatalog/IdeasByAsociatie, seedIdeas, ideasForAsociatie, migrateIdeasState, newIdea, addIdeaIn)
- rebuilt: src/features/ideas/ideasStore.ts (per-asociație persisted store: byAsociatie + myVotes + fetchError; addIdea/toggleVote/replaceForAsociatie/setFetchError; useAsociatieIdeas hook)
- new: src/features/ideas/ideasApi.ts (hydrateIdeas reads ideas+idea_votes under RLS, tallies in JS; submitIdea store+live insert; castIdeaVote optimistic toggle + live insert-only on first vote)
- updated: src/features/ideas/IdeasPage.tsx (hydrates on mount; ErrorState retry; isPromoted badge; castIdeaVote wired; findVoterApartmentId for apartmentId)
- fixed: src/features/gdpr/MyDataPage.tsx (flatMap all-asociatii ideas instead of removed s.items)
- added: ideas.promoted locale key in EN + RO
- extended: tests/unit/ideaLogic.test.ts (+16 assertions)
- new: tests/unit/ideasApi.test.ts (offline path: 7 assertions)
- updated: tests/e2e/features.spec.ts (F14 upvote + promoted badge E2E)
- result: 202 files / 2012 tests / lint+typecheck+build+pi+demo green

### T193 P2 ✅ 2026-06-03 -- F13 Prioritizare proiecte: live activation + drag-and-drop + E2E
- installed: @dnd-kit/core + @dnd-kit/sortable + @dnd-kit/utilities
- new migration: supabase/migrations/20260602000007_priority_rank.sql (adds `rank` column to project_priorities with back-fill, adds member-insert policy to priority_rankings)
- updated: src/features/priorities/priorityLogic.ts (added applyReorder, canManagePriorities, PriorityCatalog/PrioritiesByAsociatie types, seedPriorities, prioritiesForAsociatie, migratePrioritiesState)
- rebuilt: src/features/priorities/priorityStore.ts (per-asociație persisted store: byAsociatie + fetchError, addProject/reorderProjects/replaceForAsociatie/setFetchError; useAsociatiePriorities hook)
- new: src/features/priorities/priorityApi.ts (hydratePriorities reads project_priorities under RLS ordered by rank; addPriorityProject store+live insert; saveRanking store+batch rank update+priority_rankings insert; re-exports fetchPriorityTurnout)
- rebuilt: src/features/priorities/PrioritiesPage.tsx (DnD via @dnd-kit/sortable SortableContext + useSortable drag handles + keyboard up/down arrows; turnout from fetchPriorityTurnout shown in subtitle; ErrorState retry; canManagePriorities gates Add button; hydrate on mount via hydratePriorities)
- updated: tests/unit/priorityLogic.test.ts (+14 new assertions: applyReorder, canManagePriorities, seedPriorities, prioritiesForAsociatie, migratePrioritiesState)
- new: tests/unit/priorityApi.test.ts (offline path: hydratePriorities no-op, addPriorityProject appends synchronously, saveRanking applies new order)
- updated: tests/e2e/features.spec.ts (F13 happy path: open page, use keyboard moveUp, verify ranks)
- result: 201 files / 1993 tests / lint+typecheck+build+pi+demo green

### T192 P2 ✅ 2026-06-02 -- F12 Buget participativ: live activation + E2E
- updated: src/features/budget/budgetLogic.ts (added BudgetCatalog/BudgetsByAsociatie types, seedBudget, budgetForAsociatie, migrateBudgetState, activeCycle, EMPTY_CATALOG)
- updated: src/features/budget/budgetStore.ts (rebuilt: per-asociație persisted byAsociatie + fetchError, addProposal/toggleVote/replaceForAsociatie/setFetchError actions, version 1 reseeds demo on migrate; useAsociatieBudget/useActiveBudgetCycle hooks)
- new: src/features/budget/budgetApi.ts (hydrateBudget reads budget_cycles/budget_proposals/budget_votes under RLS, tallies vote counts in JS; proposeItem store-first + live insert; castBudgetVote store-first + live insert into budget_votes)
- updated: src/features/budget/BudgetPage.tsx (hydrate on mount, ErrorState retry, author_name from profile.full_name, apartment via findVoterApartmentId, DEMO_AUTHOR removed)
- updated: tests/unit/budgetLogic.test.ts (+7 per-asociație model assertions: seedBudget, budgetForAsociatie, migrateBudgetState, activeCycle)
- new: tests/unit/budgetApi.test.ts (offline path: hydrateBudget no-op, proposeItem appends synchronously, castBudgetVote increments + idempotent toggle)
- updated: tests/e2e/features.spec.ts F12 (propose idea, vote on first proposal, see funded badge), green chromium + mobile
- result: 200 files / 1976 tests / lint+typecheck+build+pi+demo green

### T191 P2 ✅ 2026-06-02 -- F11 Procese verbale: live activation + admin upload surface + E2E
- new: supabase/migrations/20260602000005_pv_category.sql (add category column to pv_documents)
- updated: src/features/pv/pvLogic.ts (added PvsByAsociatie type, seedPvs, pvForAsociatie, NewPvInput, newPvDocument, addPvIn, migratePvsState, canManagePv)
- updated: src/features/pv/pvStore.ts (rebuilt: per-asociație persisted byAsociatie + fetchError, replaceForAsociatie/setFetchError actions, version 1 reseeds demo on migrate; useAsociatiePvDocs() hook)
- new: src/features/pv/pvApi.ts (hydratePvDocuments reads pv_documents under RLS; addPvDocument store-first + live insert + optional Storage upload to attachments bucket; getPvSignedUrl 1-hour signed URL)
- updated: src/features/pv/PvDocumentsPage.tsx (hydrate on mount, canManagePv role gate on Add button + upload form, file input PDF/image max 10 MB, download button on cards with storage_path, ErrorState with retry)
- updated: src/shared/locales/en.json + ro.json (pv.file/fileHint/fileTooLarge/fileBadType/download)
- updated: tests/unit/pvLogic.test.ts (+15 assertions: canManagePv, per-asociație model, newPvDocument, addPvIn, migratePvsState)
- new: tests/unit/pvApi.test.ts (offline path: hydrate no-op, addPvDocument prepends synchronously + idempotent + defaults category)
- updated: tests/e2e/features.spec.ts F11 (search "Comitet" narrows results -> clear restores all), green chromium + mobile
- result: 199 files / 1963 tests / lint+typecheck+build+pi+demo green

### T190 P2 ✅ 2026-06-02 -- F10 AGA: live activation + procură (proxy-vote) flow + E2E
- updated: src/features/aga/agaLogic.ts (added AgasByAsociatie type, cloneAgas, seedAgas, agasForAsociatie [stable empty], migrateAgasState, isValidProxy, proxyVotesFor)
- updated: src/features/aga/agaStore.ts (rebuilt: per-asociație persisted byAsociatie + fetchError, addProxy/castProxyVote actions, version 1 reseeds demo on migrate; useAsociatieAgas() hook)
- new: src/features/aga/agaApi.ts (hydrateAgas reads agas/aga_agenda_items/aga_attendees/aga_votes under RLS; convokeMeeting/addAgendaItem/setRsvp/castVote/castProxyVote/advanceStatus/recordProxy all store-first + live mirror behind isSupabaseConfigured)
- updated: src/features/aga/AgaPage.tsx (hydrate on mount, full procura surface with document upload, proxy list with download, proxy-vote buttons per item, ErrorState retry)
- updated: src/shared/types/domain.ts (AgaProxy gains document_url; AgaVoteCounts type extracted)
- updated: src/shared/locales/en.json + ro.json (proxy UI keys)
- tests: tests/unit/agaLogic.test.ts (+10 assertions: isValidProxy, per-asociație model, migration); new tests/unit/agaApi.test.ts (offline path: hydrate no-op, all write ops offline-safe); tests/e2e/features.spec.ts F10 (designate procura holder -> verify in list), green chromium + mobile
- result: 198 files / 1951 tests / lint+typecheck+build+pi+demo green

### T189 P2 ✅ 2026-06-02 -- F09 Voturi: live hydrate/recordVote path + E2E
- updated: src/features/polls/pollLogic.ts (per-asociație catalog model added alongside tallyYesNo: PollCatalog/PollsByAsociatie, seedPolls/seedVoteCounts, catalogForAsociatie [stable frozen empty], optionsForPoll [filter+sort], quorumApartmentCount [active apts, replaces hardcoded 24], findVoterApartmentId, applyVote [pure], migratePollsState)
- updated: src/features/polls/pollsStore.ts (rebuilt: per-asociație persisted byAsociatie catalog + counts + myVotes + fetchError, version 1 reseeds demo on migrate; old global polls/pollOptions exports -> useAsociatiePolls() hook)
- new: src/features/polls/pollsApi.ts (hydratePolls reads polls/poll_options under RLS + merges per-option counts from the T80 poll_tally RPC, fetchError on fail; recordVote optimistic + per-apartment votes insert behind isSupabaseConfigured, offline store fallback)
- updated: src/features/polls/PollsPage.tsx (hydrate on mount, quorum denominator from useAsociatieApartments, ErrorState retry, cast via recordVote)
- updated: src/features/home/HomePage.tsx + src/features/apartment/ApartmentInfoPage.tsx (migrated off the removed global polls/pollOptions exports to useAsociatiePolls())
- tests: tests/unit/pollLogic.test.ts (+12 catalog-model assertions); new tests/unit/pollsApi.test.ts (offline path: hydrate no-op unconfigured/empty id, optimistic + idempotent recordVote); tests/e2e/features.spec.ts F09 (cast a vote -> result progressbar), green chromium + mobile
- result: 197 files / 1935 tests / lint+typecheck+build+pi+demo green
- note: polls/poll_options/votes tables + RLS already existed (features migration), no new migration. Live execution needs a provisioned backend; demo/offline is the default fallback

### T80 P2 ✅ 2026-06-02 -- wire the attribution-free tally functions for F09/F15/F13
- new: supabase/migrations/20260602000004_tally_grants_ranked.sql (grant execute on survey_tally/poll_tally/priority_ranking_turnout to authenticated -- T38 never granted them; + poll_ranked_tally(p_poll_id) aggregating ranked_options jsonb via jsonb_each_text into per-option votes/rank_total/weight_total, security definer, fixed search_path, is_member-gated, no voter identity; granted too)
- new: src/shared/lib/tallyApi.ts (fetchSurveyTally/fetchPollTally/fetchPollRankedTally/fetchPriorityTurnout -- call the RPCs behind isSupabaseConfigured, return null offline/on-error so the caller keeps the client-side tally; reportError on failure)
- tests: tests/unit/tallyApi.test.ts (offline path: every helper null when unconfigured / empty id) + tests/unit/tallyGrants.test.ts (migration guard: 4 grants present, poll_ranked_tally security-definer + jsonb-aggregating + is_member-gated + attribution-free returns)
- result: 200 files / 1921 tests / lint+typecheck+build+pi+demo green
- note: page wiring to render via these RPCs folds into T189 (F09) / T193 (F13) / T195 (F15); live execution needs a provisioned backend. No FEATURES.md change (cross-feature infra, not a single feature row)

### T188 P3 ✅ 2026-06-02 -- F01 Anunțuri: scheduled publish + attachments
- new: src/shared/lib/file.ts (readFileAsDataUrl, formatFileSize, validateFile(file, maxBytes, allowedTypes) -- shared upload helpers; documentLogic now re-exports/delegates to it, removing the duplicated copies)
- updated: src/shared/types/domain.ts (AnnouncementAttachment interface + optional Announcement.attachments)
- updated: src/features/announcements/announcementsLogic.ts (canManageAnnouncements; ATTACHMENT_MAX_BYTES/ALLOWED_TYPES/ACCEPT + validateAttachmentFile; newAnnouncement now takes optional scheduled_at -> future schedule holds published_at null, past/absent publishes now, + attachments; isAnnouncementDue/isScheduledPending/visibleAnnouncements visibility helpers)
- updated: src/features/announcements/announcementsApi.ts (hydrate also loads attachments grouped from `attachments` table; uploadAnnouncementAttachments uploads to `attachments` Storage bucket w/ rollback; publish mirrors scheduled_at/published_at + inserts attachment rows; getAttachmentSignedUrl)
- updated: src/features/announcements/AnnouncementsPage.tsx (compose gated to managers; datetime-local schedule field; multi-file attachment picker w/ validation; Programat badge + scheduled-for line; residents see only due via visibleAnnouncements; attachment download via signed URL live / data URL offline)
- updated: src/features/announcements/announcementsStore.ts (version 1->2 to reseed demo w/ the new scheduled seed)
- updated: src/shared/demo/demoData.ts (an-0 future-scheduled demo announcement to showcase the Programat state)
- updated: src/shared/locales/{en,ro}.json (announcements: schedule/scheduled/scheduledBadge/scheduledFor/attachments*/upload*/download*/file errors)
- tests: announcementsLogic.test.ts (+role, attachment validation, scheduling, visibility helpers); announcementsApi.test.ts (+future-schedule held back, offline attachment carried)
- result: 197 files / 1909 tests / lint+typecheck+build+pi+demo green
- note: scheduled-row hide is client-gated (visibleAnnouncements); true server-side hold-back (cron flip / RLS on scheduled_at) remains a live-activation follow-up

### T187 P2 ✅ 2026-06-02 -- E2E happy-path coverage for F02/F04/F05 + e2e harness fixes
- new: tests/e2e/features.spec.ts F02 (create discussion thread, post message, pin -> Fixat badge), F04 (open seeded unread admin inbox thread so badge clears, reply, start new admin->resident thread), F05 (submit anonymous message -> lands in comitet queue as Nou)
- new: src/shared/lib/demoRole.ts (DEMO_ROLES + readLastDemoRole extracted to break router<->RequireAuth import cycle; re-exported from @/app/router so importers + demoEntry.test.ts unchanged)
- updated: src/app/RequireAuth.tsx (product fix: in demo stage, re-enter the persisted demo persona on a deep-link hard refresh instead of bouncing to /; preserves the requested route per T174 intent)
- updated: src/app/router.tsx (use shared readLastDemoRole; removed local DEMO_ROLES/Role import)
- updated: tests/e2e/features.spec.ts enterDemo helper made build-agnostic (login button when present, else accept demo auto-redirect to /app)
- updated: src/styles/shell.css (hide .dev-role-switcher--floating on mobile layout; it overlapped content and intercepted clicks)
- verify: installed Playwright Chromium (T16 never run); F02/F04/F05 green on chromium + mobile; features.spec.ts now 22/32 (was fully broken)
- result: 196 files / 1896 tests / lint+typecheck+build+pi+demo green
- note: 5 pre-existing feature E2E (F07/F18/F35/F36/F40) fail on stale search selectors -- untouched, belongs to T16

### T186 P2 ✅ 2026-06-02 -- F06 Locator + F07 FAQ explicit live hydration + FAQ admin manage UI
- new: supabase/migrations/20260602000003_faq_archive_tally.sql (faq_entries.archived + faq_tally SECURITY DEFINER RPC, grant to authenticated)
- new: src/features/faq/faqApi.ts (hydrateFaq reads faq_entries + faq_tally in parallel, merges counts; create/update/archive mirror behind isSupabaseConfigured)
- new: src/features/locator/locatorApi.ts (hydrateLocator reads resident_posts + users(full_name); createPost mirror)
- updated: src/features/faq/faqLogic.ts (visibleFaq/nextSortOrder/isSavableFaq/newFaqEntry/FaqEntryInput)
- updated: src/features/faq/faqStore.ts (fetchError/replace/setFetchError + addEntry/updateEntry/archiveEntry)
- updated: src/features/faq/FaqPage.tsx (hydrate on mount, ErrorState retry, comitet/admin manage UI gated via roleMatchesAudience per T64)
- updated: src/features/locator/locatorStore.ts (fetchError/replace/setFetchError; add takes asociatieId+author+input)
- updated: src/features/locator/LocatorPage.tsx (hydrate on mount, author from profile w/ demo fallback, ErrorState)
- updated: src/shared/types/domain.ts (FaqEntry.archived) + demoData.ts (DEMO_FAQ archived:false)
- updated: src/shared/locales/en.json + ro.json (faq.add/edit/archive/category/question/answer/created/saved/archived)
- tests: faqLogic.test.ts extended (visibleFaq/nextSortOrder/isSavableFaq/newFaqEntry) + new faqApi.test.ts + locatorApi.test.ts offline-path suites
- result: 196 files / 1896 tests / build+pi+demo green

### T185 P2 ✅ 2026-06-02 -- F08 Calendar de evenimente store + API + agenda/month view + ICS export
- new: src/features/events/eventsLogic.ts (seed/seedAttendees/forAsociatie/migrate, sortByStart/isUpcoming/splitEvents/groupByMonth, toggleRsvp/isAttending/attendeeCount, toIcsDate/escapeIcsText/buildEventIcs/icsFileName)
- new: src/features/events/eventsStore.ts (per-asociatie seeded + persisted store; rsvps + attendees maps)
- new: src/features/events/eventsApi.ts (hydrateEvents reads events + event_rsvps; rsvpEvent upsert/delete; behind isSupabaseConfigured)
- updated: src/features/events/EventsPage.tsx (agenda/month toggle, RSVP wired, per-event .ics download, ErrorState retry)
- updated: src/shared/demo/demoData.ts (DEMO_EVENT_ATTENDEES seed)
- updated: src/shared/lib/format.ts (formatMonthYear)
- updated: src/shared/locales/en.json + ro.json (events.viewToggle/viewAgenda/viewMonth/upcoming/noUpcoming/past/exportIcs)
- new tests: tests/unit/eventsLogic.test.ts (21 assertions) + tests/unit/eventsApi.test.ts (6); F08 E2E in tests/e2e/features.spec.ts
- note: events + event_rsvps tables/RLS already existed (features migration) -- no new migration
- result: 194 files / 1884 tests / build+pi+demo green

### T184 P2 ✅ 2026-06-02 -- F03 Alerte live activation + quiet-hours bypass + real recipient count
- new: src/features/alerts/alertsLogic.ts (seed/forAsociatie/newAlert/addAlertIn/migrate, isSendableAlert, recipientCount, shouldDeliverAlert quiet-hours bypass)
- new: src/features/alerts/alertsStore.ts (per-asociatie seeded + persisted store)
- new: src/features/alerts/alertsApi.ts (hydrateAlerts + sendAlert behind isSupabaseConfigured)
- updated: src/features/alerts/AlertsPage.tsx (store-backed, hydrate on mount, recipient count from apartments, ErrorState retry)
- updated: src/shared/demo/demoData.ts (DEMO_ALERTS seed + Alert import)
- updated: src/shared/locales/en.json + ro.json (alerts.recipients)
- new tests: tests/unit/alertsLogic.test.ts (20 assertions) + tests/unit/alertsApi.test.ts (7); F03 E2E in tests/e2e/features.spec.ts
- note: alerts + alert_acknowledgments tables/RLS already existed (F03 features migration) -- no new migration
- result: 190 files / 1863 tests / build+pi+demo green

### T130 P2 ✅ 2026-06-02 -- Link admin-initiated F04 threads to the resident's account
- updated: src/features/admin/apartmentsLogic.ts (pickAdminThreadResident, apartmentHasLinkedResident)
- updated: src/features/adminchat/AdminChatPage.tsx (uses resolved residentUserId; refuses live writes when pending; picker badge + inline warning)
- updated: src/shared/locales/en.json + ro.json (adminChat.noLinkedResident, adminChat.apartmentUnlinked)
- new: tests/unit/adminThreadResident.test.ts (11 assertions)
- result: 189 files / 1844 tests / build+pi+demo green

### T67 P2 ✅ 2026-06-01 -- Comitet/admin ticket status-lifecycle surface (offline)
- updated: src/features/tickets/ticketLogic.ts (STATUS_TRANSITIONS, allowedTransitions, applyStatusTransition, canRateTicket, applyRating, updateTicketIn)
- updated: src/features/tickets/ticketsStore.ts (updateTicket action)
- updated: src/features/tickets/TicketsPage.tsx (manager action bar, resolution-notes modal, reporter rating modal, inline notes/stars)
- updated: src/features/audit/auditLogic.ts + AuditLogPage.tsx (ticket.advanced action + tone)
- updated: src/shared/locales/en.json + ro.json (tickets.advance_*/rate*/resolutionNotes + audit ticket.advanced)
- new tests: 16 assertions in tests/unit/ticketLogic.test.ts; E2E in tests/e2e/features.spec.ts
- note: ported onto current main from stale phone-session branch claude/mvp-QKqHQ (post-4.8-refactor); the branch's other commits (T129, T174-T178) were already on main
- result: 188 files / 1799 tests / build+pi+demo green

### T66 P2 ✅ 2026-05-30 -- Enforce the discussion post rate limit (anti-spam)
- updated: src/features/discussions/discussionLogic.ts (POST_RATE_WINDOW_MS, prunePostTimestamps, isVettedRole)
- updated: src/features/discussions/discussionStore.ts (postTimestamps state, recordPost action)
- updated: src/features/discussions/DiscussionsPage.tsx (rate-limit check in send + submitThread, recordPost calls)
- updated: src/shared/locales/en.json + ro.json (discussions.rateLimited key)
- new: tests/unit/discussionRateLimit.test.ts (9 assertions)
- result: 188 files / 1783 tests / build+pi+demo green

### T65 P2 ✅ 2026-05-30 -- Persist the content stores offline (publish survives reload)
- updated: src/features/announcements/announcementsLogic.ts (migrateAnnouncementsState)
- updated: src/features/tickets/ticketLogic.ts (migrateTicketsState)
- updated: src/features/discussions/discussionLogic.ts (migrateThreadsState)
- updated: src/features/announcements/announcementsStore.ts (persist, version 1, partialize, migrate)
- updated: src/features/tickets/ticketsStore.ts (persist, version 1, partialize, migrate)
- updated: src/features/discussions/discussionStore.ts (persist, version 1, partialize, migrate)
- new: tests/unit/contentStorePersist.test.ts (9 assertions)
- result: 187 files / 1774 tests / build+pi+demo green

### T86 P2 ✅ 2026-05-30 -- Live activation: audit_log read + server-authoritative chain
- new: supabase/migrations/20260530000001_audit_log_chain_trigger.sql (actor_name column + seq-stamp trigger)
- updated: src/shared/store/auditStore.ts (liveByAsociatie, hydrateForAsociatie, rowToEntry, mirrorLive actor_name, partialize, useEffect in hook)
- new: tests/unit/auditStore.test.ts (7 assertions)
- result: 186 files / 1765 tests / build+pi+demo green

### T82 P2 ✅ 2026-05-30 -- Wire a live error sink (Sentry-ready) + CSP report endpoint
- new: netlify/functions/error-report.ts (rate-limited collector; logs ref/name/source/at only)
- new: src/shared/lib/errorSink.ts (buildFetchSink + initErrorSink; session cap 10; no-op in DEV)
- updated: src/main.tsx (initErrorSink() called at startup)
- updated: netlify.toml (report-to + report-uri in CSP; Report-To + Reporting-Endpoints headers)
- updated: netlify-platform.toml (same CSP + header additions)
- new: tests/unit/errorSink.test.ts (5 assertions)
- updated: tests/unit/securityHeaders.test.ts (2 new assertions for report-to/report-uri and headers)
- result: 184 files / 1758 tests / build+pi+demo green

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
