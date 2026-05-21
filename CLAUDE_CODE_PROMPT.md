# Master Prompt for Claude Code — IntreVecini

Paste this entire prompt into Claude Code in the root of an empty git repo. Then leave it running.

---

## Mission

Build **IntreVecini** — a complete, production-ready, multi-tenant React web application for Romanian _asociații de proprietari_, deployable to Netlify, that integrates with a Telegram bot for resident-facing interactions. The app must support buildings from 10 to 1000+ apartments with the same codebase. Every feature must be toggleable per asociație by the admin during onboarding and afterwards.

**You will work autonomously and continuously until the entire app is built, tested, and verified.** Do not stop to ask the user questions. Do not pause for confirmation. If you encounter ambiguity, make the most reasonable decision, document it in `DECISIONS.md`, and continue.

Read every file in the `/docs` directory before writing any code. The documentation in `/docs` is authoritative. If anything in this prompt conflicts with `/docs`, the docs win.

---

## Hard requirements

1. **Stack:** React 18 + Vite + TypeScript, TailwindCSS, React Router v6, Zustand for state, React Query for server state, Supabase (PostgreSQL + Auth + Storage + Realtime) as backend, Netlify Functions for Telegram webhook and any server-side logic that can't be done client-side.
2. **No Express server.** Everything runs on Netlify (static React + serverless functions). Supabase handles persistence, auth, file storage, and realtime subscriptions.
3. **Multi-tenant from line one.** Every table has `asociatie_id`. Every query is scoped. Use Supabase Row Level Security (RLS) policies — write them in `/supabase/migrations/`.
4. **Romanian UI by default**, but use `react-i18next` with `ro` and `en` locales structured so adding more languages is trivial. All user-facing strings go in locale files, never inline.
5. **Feature flags per asociație.** Every one of the 60+ features defined in `FEATURES.md` must be individually toggleable from the admin panel. Disabled features must not appear in the UI or send notifications.
6. **Telegram bot integration via webhook.** The bot itself runs as a Netlify Function (`/netlify/functions/telegram-webhook.ts`). The user will create the bot via BotFather and provide the token; you must produce a `BOT_SETUP.md` with exact instructions and all required environment variables.
7. **Mobile-first responsive design.** Most residents will use this from their phone, either via Telegram Mini App (some views) or directly in the browser.
8. **Accessibility:** WCAG 2.1 AA. Keyboard navigation, ARIA labels, sufficient contrast. Test with axe-core during the verification phase.
9. **No mock data left in production code.** Seed data must live in `/supabase/seed.sql` and only be loaded when explicitly running the dev seed script.

---

## Autonomous execution loop

Follow this loop until completion. Do not deviate.

### Phase 0 — Setup (do once)

1. Read `docs/ARCHITECTURE.md`, `docs/FEATURES.md`, `docs/DATA_MODEL.md`, `docs/UI_UX.md`, `docs/TELEGRAM_BOT.md`, `docs/TESTING.md`, `docs/DEPLOYMENT.md` in full.
2. Create the directory structure exactly as specified in `ARCHITECTURE.md`.
3. Initialize the project: `npm create vite@latest . -- --template react-ts`, install all dependencies listed in `ARCHITECTURE.md § Dependencies`.
4. Set up Tailwind, ESLint, Prettier, Vitest, Playwright.
5. Create `.env.example` with every required environment variable, well-commented.
6. Write the Supabase schema migrations and RLS policies in `/supabase/migrations/`. The schema must cover all 60+ features.
7. Commit: `chore: project scaffold and schema`.

### Phase 1 — Core platform (do once)

Build, in this order, committing after each:

1. Auth flow (admin login via Supabase Auth, email + password)
2. Asociație onboarding wizard (5-step: profile → import apartments from CSV → feature selection → branding → invite admins/comitet)
3. Apartment & resident management (CRUD, invite codes, Telegram linking flow)
4. Permission system (roles: super_admin, admin, comitet, cenzor, proprietar, chiriaș)
5. Feature flag system with admin toggle UI
6. Notification fan-out service (in-app + Telegram + email via Supabase) — one abstraction, three channels
7. Audit log (every state change recorded with actor, timestamp, before/after)
8. Base layout, navigation, theme system

### Phase 2 — Features (loop until all 60+ done)

For each feature in `FEATURES.md`:

1. Read its spec section.
2. Add any missing database tables/migrations.
3. Add RLS policies.
4. Build the React components (admin views + resident views where applicable).
5. Wire up the Telegram bot commands/callbacks (see `TELEGRAM_BOT.md`).
6. Write unit tests for business logic.
7. Write at least one Playwright E2E test covering the happy path.
8. Update `FEATURES.md` with a ✅ next to the feature title and a one-line implementation note.
9. Commit: `feat(F##): <feature-name>` where F## is the feature number from FEATURES.md.

**Critical:** do not skip features. Do not collapse multiple features into one. If a feature seems redundant with another, build both — the admin can toggle one off.

### Phase 3 — Telegram bot (after Phase 2)

1. Implement every command and callback handler defined in `TELEGRAM_BOT.md`.
2. Implement the webhook signature verification.
3. Implement the Mini App authentication (validating `initData`).
4. Build the Mini App routes (a subset of the React app with `?source=telegram` flag, simplified UI).
5. Write integration tests using the Telegram Bot API test mode.

### Phase 4 — Verification (autonomous)

Run, fix, repeat:

1. `npm run lint` — fix everything until zero errors and zero warnings.
2. `npm run typecheck` — fix everything until zero errors.
3. `npm run test` — all unit tests must pass.
4. `npm run test:e2e` — all Playwright tests must pass. If a test reveals a real bug, fix the code, not the test.
5. `npm run build` — must succeed with no warnings.
6. Run `axe-core` against every page — fix all critical and serious issues.
7. Lighthouse CI: Performance ≥ 85, Accessibility ≥ 95, Best Practices ≥ 90, SEO ≥ 90 on the public pages.
8. Verify all 60+ features have ✅ in `FEATURES.md`.
9. Verify `BOT_SETUP.md` is complete and step-by-step.
10. Verify `DEPLOYMENT.md` is complete and step-by-step.
11. Generate `README.md` with project overview, quickstart, and links to all other docs.

### Phase 5 — Polish loop

Run this loop at least 3 times, more if you find issues:

1. Open every page in the app via Playwright with screenshots.
2. Inspect each screenshot. Note any visual issues: misalignment, broken layouts, illegible text, ugly empty states.
3. Fix them.
4. Re-run the entire test suite.
5. Commit fixes.

Stop only when:

- All 60+ features are built and toggleable
- All tests pass
- Lint and typecheck are clean
- Build succeeds
- Lighthouse scores meet thresholds
- `BOT_SETUP.md` and `DEPLOYMENT.md` are complete enough that a non-developer could follow them
- `DECISIONS.md` documents every non-trivial choice you made

---

## Rules of engagement

- **Do not ask questions.** Make decisions, document them in `DECISIONS.md`, continue.
- **Do not leave TODOs.** If something can't be finished, finish it differently.
- **Do not leave commented-out code.** Delete it.
- **Do not generate placeholder text.** Use realistic Romanian sample data.
- **Match existing conventions.** Once you pick a pattern for a feature, use it for all similar features.
- **Read before writing.** Before editing a file, view it. Before adding a dependency, check `package.json`.
- **Commit early and often.** Small, focused commits with conventional commit messages.
- **No comments in code unless explaining genuinely non-obvious logic.** Self-documenting names instead.
- **Romanian-language UI strings must use proper diacritics** (ă, â, î, ș, ț). Not s/t/a substitutes.
- **Currency:** lei (RON). Format as `1.234,56 lei` (Romanian locale).
- **Dates:** Format as `DD.MM.YYYY` and times as `HH:mm` (24h).
- **Phone numbers:** Accept and store as `+40 7XX XXX XXX`.

---

## What the user will do after you finish

The user (the developer who launched you) will:

1. Create a Supabase project and paste the keys into `.env`.
2. Create a Telegram bot via BotFather and paste the token into `.env`.
3. Run the migrations.
4. Deploy to Netlify.
5. Open their first asociație and start onboarding.

Everything else — every line of code, every test, every doc — is your job. Do not stop until it is done.

Begin.
