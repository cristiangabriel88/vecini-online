# vecini.online

A multi-tenant web app and Telegram bot for Romanian *asociații de proprietari*.

One codebase. Many buildings. 65 features the admin can mix and match. Works for
an 18-apartment bloc or a 1000-apartment complex.

> Built from `DevArchive/CLAUDE_CODE_PROMPT.md` (the original bootstrap prompt,
> archived now that the app is built). The spec docs (`ARCHITECTURE.md`,
> `FEATURES.md`, `DATA_MODEL.md`, …) describe the product, **vecini.online**
> (see `DECISIONS.md`).

## What it does

Residents use it from the browser or directly from Telegram. Administrators and
the comitet manage everything from a web admin panel. It covers communication,
governance & voting, maintenance, shared spaces, records, projects, safety, and
community life — every feature individually toggleable per asociație.

## Project status

This is a working **foundation** that builds, type-checks, lints clean, and
passes its unit tests:

- **Implemented end-to-end:** F01 Anunțuri, F03 Alerte, F08 Evenimente,
  F09 Voturi, F17 Sesizări, F56 Numere de urgență, plus the onboarding wizard,
  admin feature-flag panel, apartment registry, auth, and home/profile.
- **Full database:** core + all 65 feature tables with RLS in
  `supabase/migrations/`.
- **Telegram:** webhook function with secret + Mini App `initData` validation.
- **Registered (not yet built UI):** the remaining features are toggleable and
  appear in navigation with a clear "page not in this build" state.

See `DECISIONS.md` for the exact scope boundary and `FEATURES.md` for per-feature
status.

## Run it locally (no backend needed)

```bash
npm install
npm run dev        # opens the app in demo mode with sample Romanian data
```

Without Supabase credentials the app runs in **demo mode** so you can click
through everything. To wire a real backend:

```bash
cp .env.example .env   # fill in Supabase + Telegram values
npx supabase start     # or link a hosted project, then:
npx supabase db push   # apply migrations in supabase/migrations
```

## Scripts

```bash
npm run dev         # Vite dev server
npm run build       # typecheck (app + node) then production build
npm run preview     # serve the built app
npm test            # Vitest unit tests
npm run test:e2e    # Playwright E2E (needs browsers installed)
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
```

## Tech stack

React 18 + TypeScript + Vite · TailwindCSS · React Query · Zustand ·
React Hook Form + Zod · react-i18next (ro/en) · Supabase (Postgres + Auth +
Storage + Realtime) · Netlify (static + serverless functions) · Vitest +
Playwright.

## Documentation map

- `BOT_SETUP.md` — set up your Telegram bot (start here when deploying)
- `DEPLOYMENT.md` — deploy to Supabase + Netlify
- `ARCHITECTURE.md` — overall system design
- `FEATURES.md` — catalog and status of all 65 features
- `DATA_MODEL.md` — database schema
- `UI_UX.md` — design system and patterns
- `TELEGRAM_BOT.md` — bot implementation details
- `TESTING.md` — test strategy
- `DECISIONS.md` — log of decisions made during the build
