# CLAUDE.md — vecini.online

Multi-tenant SaaS for Romanian asociații de proprietari: React + Vite + TypeScript front end, Supabase (Postgres + Auth + Storage + Realtime) backend, Netlify (static + functions) hosting, and a Telegram bot. Runs fully offline in **demo mode** (seeded Romanian data) when Supabase creds are absent.

## Autonomous development: the `make progress` protocol

This project is built by a self-directed loop. **`BACKLOG.md` is the source of truth for what to do next.** There are two triggers, both running the *same one-task unit*:

1. The user types **`make progress`** → complete exactly **one** task from `BACKLOG.md` (commit + push), then stop and report.
2. The user runs **`scripts/run-overnight.sh`** (Git Bash) → that same unit runs repeatedly with no human input; when the queue empties it switches to an audit/replenish pass that generates the next wave of tasks, so it keeps improving until a genuine stall, a budget, or an interrupt.

It is a **self-improving loop**: solving a task surfaces problems and ideas, which become new priority-ranked tasks, which raise the quality bar. The queue is sorted by priority and is meant to grow.

When you receive **`make progress`**, follow the protocol defined in `BACKLOG.md` (`## The make progress protocol`) precisely:

1. Pick the **highest-priority unchecked task whose prerequisites are met** (the topmost `⬜` in the priority-sorted queue). If the pipeline is red, fixing it is the task and outranks everything.
2. Re-establish only what the task needs: the relevant `RESUME.md` §0 status entry/counts, the relevant `FEATURES.md` row, and the relevant code. Read a doc only if the task touches its domain (skip `FEATURES.md` for a non-feature task; consult `COMPLETED.md` only when a prerequisite's history is needed). Match existing conventions.
3. Implement it fully — no TODOs, no placeholders, no commented-out code.
4. Verify: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` must all be green. Never weaken a test to pass it.
5. Update docs: mark the task `✅` and move its block (heading + done-note) to the top of `COMPLETED.md` (newest first), update `FEATURES.md` (if a feature) and `RESUME.md` status.
6. **Feed the loop:** every problem detected (bug, security gap, fragile code, missing test, a11y/UX/perf issue, tech debt) and every worthwhile improvement or feature becomes a **new task inserted at its priority position** in the queue (P0 critical/security/privacy → P1 stability/auth/features → P2 polish/SaaS → P3 later), with the next free `T##` id. Not just appended to the bottom.
7. Commit (conventional message + `Co-Authored-By` trailer) and `git push origin main`.
8. Stop after one task. Do not chain tasks in interactive mode — the overnight script handles repetition.

Two sibling triggers exist for the same one-task unit and are defined in `BACKLOG.md`:
- **`make task`** — identical to `make progress` except step 6 is skipped, so no new tasks are added to the queue. Use it to draw the queue down without growing it. See `## The make task protocol`.
- **`make mvp`** — picks from the dedicated `## MVP presentation spine` at the top of the queue and also never creates new tasks. See `## The make mvp protocol`.

## Non-negotiables
- Work directly on `main`. Do not create feature branches.
- Never use the em dash character in code or docs.
- Every user-facing surface is **fully bilingual (RO + EN)** via i18n; code/backend stay English. Romanian uses real diacritics.
- Every new table has RLS scoped by `asociatie_id`. Personal data is handled per the GDPR tasks. Never log secrets or PII.
- Platform/superadmin privileged operations (cross-tenant reads, account provisioning, impersonation) must be re-checked server-side (`is_super_admin()` + service-role Netlify functions); never trust a client-supplied role. The superadmin tier is a separate app on its own origin/subdomain (`src/platform/*`) and must never be reachable from the resident/admin origin.
- Keep demo mode working so the app always runs offline and E2E stays executable.
- Hold the **premium-feel** bar: smooth eased motion, tasteful restraint, warm-graphite dark mode.
- Don't ask the user questions mid-task; decide, record in `DECISIONS.md`, continue.

## Commands
- `npm run dev` — local dev server
- `npm run lint` / `npm run typecheck` / `npm test` / `npm run build` — the verification pipeline (all must pass before commit)
- `npm run test:e2e` — Playwright (browsers must be installed; see task T16)

## Where things live
- Features: `src/features/*`; shared: `src/shared/*`; demo seed: `src/shared/demo/demoData.ts`; feature registry/toggles: `registry.ts`.
- Superadmin app (planned, BACKLOG T20/T91-T100): `src/platform/*` — a separate Vite build deployed to its own subdomain, gated to `super_admin`, sharing the Supabase client + types + i18n with the main app.
- Migrations + RLS: `supabase/migrations/`; seed: `supabase/seed.sql`.
- Telegram webhook: `netlify/functions/telegram-webhook.ts`.
- Status docs: `BACKLOG.md` (protocol + open queue), `COMPLETED.md` (archive of finished tasks, newest first), `FEATURES.md` (feature truth table), `RESUME.md` (resume summary), `DECISIONS.md` (choices).
