# RESUME — vecini.online

Terse machine-readable status log. Full per-task history archived in `COMPLETED.md` (newest first). Drives `make progress` (see `BACKLOG.md` + `CLAUDE.md`). Only §0 below is read during a normal task.

## 0. Current status

- date: 2026-06-11
- last_task: T302 Surface comunicare rollback failures (toast on failed mirror writes) -- `deleteAnnouncements`, `togglePin`, `deleteThread`, `updateMessage`, `deleteMessage` all accept `onError?` callback; wired in AnnouncementsPage, DiscussionsPage, AdminChatPage with bilingual error toasts; 5 new i18n keys (announcements.deleteFailed, discussions.deleteFailed/pinFailed/editFailed, adminChat.deleteFailed); 13 new unit tests in comunicareRollback.test.ts; 341 test files / 3613 tests; all 3 builds green
- pipeline: green (lint + typecheck + test + build + build:pi + build:demo)
- counts: 341 test files / 3613 tests
- stages: PROD/DEV/DEMO formalized (T171/T172); all three build green every task. DEV now matches PROD exactly (no role switcher; switcher is DEMO-only)
- mvp_spine: complete (T168/T169/T92/T55/T115 done; T128 token hardening done)
- next: queue exhausted -- all main-queue tasks (T15-T302) complete; overnight script will audit+replenish
- features: 67/67 demo-complete (offline UI + pure logic + tests); live-wired to Supabase: F01-F24 + F28-F32 + F33-F55 + F57-F65 (60 features) + auth/invites/onboarding; remaining 7 features offline-first, live-activation queued (F25-F27 bookings already live-wired T208, F56 emergency contacts live-wired earlier). F28/F36/F66 cross-feature glue wired (T104). Platform console: T20 umbrella complete (T93/T94/T95/T96/T97/T98/T99/T119/T120/T121 all done).
- e2e: F01-F41/F44/F47/F48/F50-F53/F57/F62/F63/F65/F66/F67 happy paths green on chromium + mobile (55 features / 82%). Platform shell + provisioning E2E (T119/T121) done. Full smoke harness reworked (T211 done). E2E closure continues T224+.
- blockers: none.
- completion_estimate: 85% of original product vision delivered end-to-end (updated 2026-06-04). Detail: all 67 features demo-complete and offline-functional; 60/67 live-wired (90%); security posture ~93% (T212 done, remaining: T141 JWT hook); GDPR surface ~91% (T72/T75/T76/T78 done, T95 cross-tenant audit viewer done); Telegram bot handlers + live /start resolver complete (T15 + T58 done); SaaS billing foundation complete (T19 done: 3-tier plans, subscription + invoice DB, admin billing page, platform subscriptions page, Stripe-stub checkout function); platform console 100% of planned features done (T20 umbrella + subscriptions page); E2E coverage 82% (55/67 features).

---

## 1. Per-task history

Moved out of this file on 2026-06-11. The complete, authoritative task-by-task archive (every `### T## ✅` done-note, newest first) lives in `COMPLETED.md`. This file keeps only the §0 snapshot above; consult `COMPLETED.md` for the history of any specific task and `DECISIONS.md` for the rationale behind non-trivial choices.
