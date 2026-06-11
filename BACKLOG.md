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

MVP spine + three-stage deployment (PROD/DEV/DEMO) are done and green; archived in `COMPLETED.md`. All 67 features (F01–F67) are fully live-wired. E2E closure, live hardening, GDPR, Telegram go-live, the platform console shell (all 8 sections), SaaS billing, observability, PWA, perf/a11y, and code-health refactors (T15–T277) are all complete and archived. The queue was reset on 2026-06-06 to a final **production-readiness wave** (T278–T288) ahead of a pilot launch with 1–2 real buildings: security & abuse hardening, reliability (no silent failures), onboarding polish, low-end-device performance, and a code-side production-readiness self-check. Payments remain out of scope (`## On hold`, T254a/b).

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
> **Status (updated 2026-06-11):** The full T15–T302 build is complete and archived in `COMPLETED.md` (every MVP, hardening, GDPR, platform-console, billing, observability, PWA, perf, a11y, DX task, plus the production-readiness wave T278–T302 and the 2026-06-10 production-audit follow-ups). **The main queue is empty.** Only the two parked payment tasks remain (`## On hold`, T254a/b). The next `make progress` / overnight run hits the end-of-queue audit/replenish pass that generates the next wave.

## MVP presentation spine — complete (see COMPLETED.md)

## Three-stage deployment (PROD / DEV / DEMO) — complete (see COMPLETED.md)

## Main queue

> **Empty.** The production-readiness wave (T278–T302) and all prior work (T15–T277) are complete and archived in `COMPLETED.md` (newest first). No open `⬜` tasks remain. The next `make progress` / overnight run falls through to the end-of-queue audit/replenish pass, which generates the next priority-ranked wave. Parked payment work is in `## On hold` below.

---

## On hold

> Tasks parked indefinitely — not picked by any trigger until explicitly reinstated.

### ⏸ T254a — [P2] Platform-side subscription: change plan + comp / credit

`PlatformSubscriptionsPage` (`platformSubscriptionsStore.ts`) can only `markPaid`; a complete billing console needs to act on a tenant's plan. Add the two plan-mutating actions: **change plan** (move a tenant between the 3 canonical tiers with a prorated note) and **comp / apply credit** (set a tenant to a free or discounted plan with a reason, e.g. early adopter). Each privileged write is a service-role Netlify function re-checking `is_super_admin()`, audited into the tenant's chain, and mirrored to the `subscriptions` table. Demo drives the persisted `platformSubscriptionsStore`. Bilingual, premium-feel, unit tests for the new store actions + one E2E (change plan -> tier badge updates). Prereq: T19. (Split from the original T254; T254b covers payment + dunning.)

### ⏸ T254b — [P2] Platform-side subscription: record manual payment + trigger dunning

Building on T254a, add the two invoice/lifecycle actions: **record a manual payment** (offline bank transfer marks an invoice paid with a reference) and **trigger dunning** (move an overdue subscription into the grace/past-due flow that the T19 banners already render). Each privileged write is a service-role function re-checking `is_super_admin()`, audited, and mirrored to the `invoices`/`subscriptions` tables. Demo drives the persisted platform store. Bilingual, premium-feel, unit tests for the new store actions + one E2E (record payment -> invoice flips to paid). Prereq: T254a, T19.

### End of queue

When all groups clear, the overnight script's audit/replenish pass generates the next wave.
