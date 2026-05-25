# Architecture — vecini.online

## Overview

vecini.online is a multi-tenant SaaS-style web application for Romanian residential building associations (*asociații de proprietari*). One codebase serves many buildings (tenants). Each tenant gets isolated data, configurable features, and its own Telegram bot integration.

The stack is intentionally simple to keep hosting cheap and operations boring:

- **Frontend:** React 18 + Vite + TypeScript, deployed as a static site to Netlify
- **Backend:** Supabase (Postgres + Auth + Storage + Realtime + Edge Functions)
- **Serverless logic:** Netlify Functions for Telegram webhook, scheduled jobs, and any signed-server-side operations
- **Telegram integration:** A single bot per deployment, multi-tenant aware (the bot identifies which asociație a user belongs to via a verified link)

## Directory structure

```
/
├── docs/
│   ├── ARCHITECTURE.md          (this file)
│   ├── FEATURES.md              (60+ feature specs)
│   ├── DATA_MODEL.md            (schema and relationships)
│   ├── UI_UX.md                 (design system, patterns)
│   ├── TELEGRAM_BOT.md          (bot commands and flows)
│   ├── TESTING.md               (test strategy)
│   ├── DEPLOYMENT.md            (Netlify + Supabase setup)
│   └── DECISIONS.md             (running log of architectural decisions)
├── BOT_SETUP.md                 (user-facing Telegram setup guide)
├── CLAUDE_CODE_PROMPT.md        (the master prompt)
├── README.md                    (project overview)
├── public/
├── src/
│   ├── app/                     (routing, providers, layout)
│   ├── features/                (one folder per feature)
│   │   ├── announcements/
│   │   ├── polls/
│   │   ├── tickets/
│   │   └── ...
│   ├── shared/
│   │   ├── components/          (Button, Card, Modal, Form primitives)
│   │   ├── hooks/
│   │   ├── lib/                 (supabase client, telegram client, utils)
│   │   ├── locales/             (ro, en JSON)
│   │   └── types/
│   ├── pages/                   (top-level route components)
│   └── main.tsx
├── netlify/
│   └── functions/
│       ├── telegram-webhook.ts
│       ├── telegram-send.ts
│       ├── cron-reminders.ts
│       └── ...
├── supabase/
│   ├── migrations/              (versioned SQL)
│   ├── seed.sql
│   └── functions/               (Supabase Edge Functions if needed)
├── tests/
│   ├── unit/
│   ├── e2e/                     (Playwright)
│   └── fixtures/
├── netlify.toml
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── .env.example
```

## Dependencies

Production:
- `react`, `react-dom` (18.x)
- `react-router-dom` (6.x)
- `@supabase/supabase-js` (2.x)
- `@tanstack/react-query` (5.x)
- `zustand` (4.x)
- `react-hook-form` + `zod` + `@hookform/resolvers`
- `react-i18next`, `i18next`, `i18next-browser-languagedetector`
- `tailwindcss`, `@tailwindcss/forms`, `@tailwindcss/typography`
- `lucide-react` (icons)
- `date-fns` + `date-fns/locale/ro`
- `recharts` (charts)
- `react-hot-toast` (notifications)
- `papaparse` (CSV import)
- `clsx`, `tailwind-merge`

Dev:
- `vite`, `@vitejs/plugin-react`
- `typescript`, `@types/*`
- `eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `@typescript-eslint/*`
- `prettier`, `prettier-plugin-tailwindcss`
- `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
- `@playwright/test`
- `@axe-core/playwright`

## Multi-tenancy model

**Shared database, shared schema, tenant_id discriminator** — every domain table has `asociatie_id uuid not null references asociatii(id)`. Postgres Row Level Security policies enforce isolation at the database level: a user can only see rows where `asociatie_id` matches an asociație they belong to via the `memberships` table.

This means even if frontend code has bugs, the database refuses unauthorized reads/writes.

### Roles

| Role | Scope | Description |
|------|-------|-------------|
| `super_admin` | Platform | vecini.online operators only — used for billing and platform support |
| `admin` | Asociație | Administrator (usually a paid professional) — full configuration access |
| `presedinte` | Asociație | President of the comitet — can call AGAs, approve big decisions |
| `comitet` | Asociație | Comitet members — can manage tickets, polls, announcements |
| `cenzor` | Asociație | Auditor — read-only access to all financial and governance data |
| `proprietar` | Apartament | Owner — can vote, see official documents, submit tickets |
| `chirias` | Apartament | Tenant — limited access, configurable per-feature by asociație |

One person can have multiple roles (e.g., proprietar in one apartment, comitet member of the asociație).

### Apartment linking

The trust anchor of the entire system is binding a Telegram user identity to a specific apartament.

Flow:
1. Admin imports CSV with apartment list (`scara, etaj, numar_apartament, nume_proprietar, suprafata, cota_parte`).
2. System generates a unique 8-character alphanumeric invite code per apartament.
3. Admin prints invite slips (the app generates a PDF) and distributes them physically (under doors or at AGA).
4. Resident opens the Telegram bot, sends `/start <code>`, bot verifies the code, marks it consumed, links `telegram_user_id` → `apartament_id`.
5. From that point, the resident's Telegram account is the apartment's authenticated identity. A resident can also create a web account linked to the same apartament.

Co-owners can both link if the admin enables `multi_owner_login` for that asociație.

## Feature flag system

Every feature in `FEATURES.md` has a unique key (`F01`, `F02`, …). The `asociatie_features` table stores `(asociatie_id, feature_key, enabled bool, config jsonb)`. The `config` column lets a feature have per-tenant settings (e.g., for the booking feature, what shared spaces exist).

Frontend exposes `useFeature(featureKey)` hook. Components return `null` when their feature is disabled. Routes are filtered in the router config.

Telegram bot commands and inline buttons are also feature-flag-aware: disabled features don't get shown in `/menu` and their callback handlers refuse with a polite "această funcționalitate nu este activată".

## State management

- **Server state:** React Query. Every data fetch goes through a hook like `useAnnouncements()` that internally calls `supabase.from('announcements').select(...)`.
- **Client state:** Zustand. Used sparingly — auth user, current asociație context, UI ephemera (modals, drawers).
- **Form state:** React Hook Form with Zod validation.
- **Realtime:** Supabase Realtime subscriptions for the few features that need live updates (announcements feed, poll results during active voting).

## Notifications fan-out

A single abstraction:

```ts
notify({
  asociatie_id,
  audience: { type: 'all' } | { type: 'apartament', ids: string[] } | { type: 'role', role: 'comitet' } | { type: 'scara', scari: string[] },
  channels: ('inapp' | 'telegram' | 'email')[],
  template: 'announcement.new',
  data: { ... },
  priority: 'low' | 'normal' | 'urgent'
})
```

The implementation:
1. Resolves the audience to a list of recipient user IDs.
2. For each recipient, checks their notification preferences and the asociație's feature flags.
3. Writes a row to `notifications` (in-app).
4. Enqueues Telegram message(s) for users with linked telegram_user_id.
5. Enqueues email(s) via Supabase Auth's email hook or Resend (configurable).

Urgent priority bypasses quiet hours.

## Telegram integration

The webhook lives at `/.netlify/functions/telegram-webhook`. The bot token is in env (`TELEGRAM_BOT_TOKEN`). Webhook signature is validated using the secret token (`X-Telegram-Bot-Api-Secret-Token` header).

The bot is **single-instance, multi-tenant**: one bot serves all asociații. The bot identifies the user's asociație by looking up `telegram_user_id` in the `telegram_users` table, which has a foreign key to `apartament` (and thus `asociatie_id`).

Mini Apps: when the user opens a button-launched Mini App, Telegram includes signed `initData`. The Netlify function `/auth-telegram-miniapp` validates the signature, looks up the user, and returns a short-lived Supabase JWT. The Mini App then loads the React app with this token.

## Scheduled jobs

Netlify Scheduled Functions run cron-style:
- Daily 08:00 Europe/Bucharest: send maintenance reminders, poll deadline warnings, anode replacement reminders (and similar)
- Hourly: process pending notifications retry queue
- Weekly Monday 09:00: digest summary to admins
- Monthly 1st: archive old data, run usage analytics

## Internationalization

`i18next` with namespace per feature (`announcements.json`, `polls.json`, etc.). Romanian is the default and source of truth. English translations are maintained for the admin panel only (residents typically only see Romanian). The bot also uses i18next for its replies.

## Security

- All database access through RLS. Service role key only used in Netlify Functions, never exposed to client.
- Telegram webhook secret rotated on each deploy via env var.
- File uploads sanitized: only specific MIME types allowed per feature (photos for tickets, PDFs for documents).
- Storage policies mirror DB RLS — a user can only download files belonging to their asociație.
- Rate limiting on Netlify Functions (10 requests/minute per IP for bot webhook).
- Audit log captures every mutation with `actor_user_id`, `actor_role`, `asociatie_id`, `entity`, `entity_id`, `action`, `before_state`, `after_state`, `created_at`.

## Performance targets

- First Contentful Paint < 1.5s on 4G
- Bundle < 250KB gzipped for initial route
- Code-splitting per feature (each feature lazy-loaded)
- Image optimization: Supabase image transforms + lazy loading
- Database queries use indexes documented in `DATA_MODEL.md`

## Scalability ceiling

This architecture comfortably handles:
- ~500 asociații
- ~50,000 apartments
- ~100,000 monthly active residents
- ~10 million notifications per month

Beyond that, the migration path is clear: separate Supabase project per region, dedicated bot per asociație, move to schema-per-tenant. None of these require rewriting the application code — only operational changes.
