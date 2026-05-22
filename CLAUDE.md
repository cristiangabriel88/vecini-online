# CLAUDE.md — vecini.online

Multi-tenant SaaS for Romanian asociații de proprietari: React + Vite + TypeScript front end, Supabase (Postgres + Auth + Storage + Realtime) backend, Netlify (static + functions) hosting, and a Telegram bot. Runs fully offline in **demo mode** (seeded Romanian data) when Supabase creds are absent.

## Autonomous development: the `make progress` protocol

This project is built by a self-directed loop. **`BACKLOG.md` is the source of truth for what to do next.** There are two triggers, both running the *same one-task unit*:

1. The user types **`make progress`** → complete exactly **one** task from `BACKLOG.md` (commit + push), then stop and report.
2. The user runs **`scripts/run-overnight.ps1`** → that same unit runs repeatedly with no human input until there is nothing left to do.

When you receive **`make progress`**, follow the protocol defined in `BACKLOG.md` (`## The make progress protocol`) precisely:

1. Pick the first unchecked task in `BACKLOG.md` (if the pipeline is red, fixing it is the task).
2. Re-read `RESUME.md`, `FEATURES.md`, and relevant code; match existing conventions.
3. Implement it fully — no TODOs, no placeholders, no commented-out code.
4. Verify: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` must all be green. Never weaken a test to pass it.
5. Update docs: mark the task `✅` in `BACKLOG.md`, update `FEATURES.md` (if a feature) and `RESUME.md` status.
6. **Append new concrete follow-up tasks** to the bottom of the queue based on what this task surfaced toward a secure, polished SaaS.
7. Commit (conventional message + `Co-Authored-By` trailer) and `git push origin main`.
8. Stop after one task. Do not chain tasks in interactive mode — the overnight script handles repetition.

## Non-negotiables
- Work directly on `main`. Do not create feature branches.
- Never use the em dash character in code or docs.
- Every user-facing surface is **fully bilingual (RO + EN)** via i18n; code/backend stay English. Romanian uses real diacritics.
- Every new table has RLS scoped by `asociatie_id`. Personal data is handled per the GDPR tasks. Never log secrets or PII.
- Keep demo mode working so the app always runs offline and E2E stays executable.
- Hold the **premium-feel** bar: smooth eased motion, tasteful restraint, warm-graphite dark mode.
- Don't ask the user questions mid-task; decide, record in `DECISIONS.md`, continue.

## Commands
- `npm run dev` — local dev server
- `npm run lint` / `npm run typecheck` / `npm test` / `npm run build` — the verification pipeline (all must pass before commit)
- `npm run test:e2e` — Playwright (browsers must be installed; see task T16)

## Where things live
- Features: `src/features/*`; shared: `src/shared/*`; demo seed: `src/shared/demo/demoData.ts`; feature registry/toggles: `registry.ts`.
- Migrations + RLS: `supabase/migrations/`; seed: `supabase/seed.sql`.
- Telegram webhook: `netlify/functions/telegram-webhook.ts`.
- Status docs: `BACKLOG.md` (queue), `FEATURES.md` (feature truth table), `RESUME.md` (resume summary), `DECISIONS.md` (choices).
