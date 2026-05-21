# Testing — BlocHub

A 60+ feature multi-tenant app needs aggressive testing or it rots. We use three layers.

## Unit tests (Vitest)

Cover all non-trivial business logic. Targets:
- Permission checks (`canUserDo(userId, action, entity)`)
- Vote weight calculations (cota_parte aggregations)
- Quorum and majority decisions
- SLA timer logic
- Notification audience resolution
- Date/time utilities (especially around Romanian DST)
- Form validation schemas (Zod)
- Csv parsing and apartment list import
- Invite code generation and validation
- Telegram webhook signature verification
- Telegram Mini App initData validation

Aim for 80%+ coverage on `src/features/*/logic/` and `src/shared/lib/`. UI components don't need exhaustive unit tests — that's what E2E is for.

Location: `tests/unit/` mirrors `src/`.

Run: `npm test`.

## Component tests (React Testing Library)

For complex interactive components only (forms with conditional logic, the rich text editor wrapper, the file upload). Don't test every button.

Location: `tests/unit/components/`.

## E2E tests (Playwright)

One happy-path test per feature, plus targeted negative tests for permission boundaries.

For each feature in `FEATURES.md`, the minimum E2E coverage:
1. Admin enables the feature → it appears in resident UI
2. Admin disables the feature → it disappears
3. The primary user action works end-to-end (create, vote, submit, etc.)
4. RLS prevents cross-tenant access (a user from asociație A cannot read asociație B's data)

Critical cross-feature flows:
- Full onboarding wizard from blank state to first published anunț
- Invite code → Telegram link → first vote
- Sesizare creation → admin assigns → status updates → resident notified at each step
- AGA full lifecycle: convocare → RSVP → live vote → procesverbal generated

Location: `tests/e2e/`.

Run: `npm run test:e2e`.

### Fixtures

`tests/fixtures/` contains:
- `seed-asociatie.sql` — a fully-populated test asociație
- `users.ts` — pre-created users with known credentials
- `apartments.csv` — sample import file

E2E tests reset the DB to a known state before each test using a Supabase migration to a separate test schema.

## Bot tests

The Telegram webhook is tested by:
1. Replaying recorded Telegram updates (`tests/fixtures/telegram-updates/*.json`) into the webhook handler
2. Asserting the resulting database state and outbound Telegram API calls (mocked via msw)
3. For Mini App auth, generating valid signed `initData` with the test bot token and asserting JWT issuance

For end-to-end bot testing against the real Telegram API, we use Telegram's official test server (token from `t.me/BotFather` with `/newbot` in test mode). A separate npm script `npm run test:bot:live` runs these — they require credentials and don't run in CI by default.

## Accessibility tests

Every E2E test page runs `@axe-core/playwright` after the main interaction. Critical and serious violations fail the test. Moderate ones go to a report but don't fail.

Manual review checklist for the polish phase:
- Tab through every form, confirm logical order
- Screen reader spot-check on critical pages (announcements, polls, sesizări)
- Color contrast checked with a tool

## Performance tests

Lighthouse CI runs in the CI pipeline against the deployed preview URL. Budgets:
- Performance ≥ 85 (mobile)
- Accessibility ≥ 95
- Best Practices ≥ 90
- SEO ≥ 90 (for public pages)

Bundle size budget: 250KB gzipped for initial route. Per-feature chunks: < 50KB each.

## Security tests

- SQL injection: no raw SQL with user input — Supabase client only, parameterized queries
- XSS: all user content rendered with React's escaping; rich text sanitized with DOMPurify before render
- CSRF: not applicable for the SPA (token-based auth)
- File upload: MIME type allowlist, size limits, virus scan via ClamAV in Netlify Function (optional, configurable)
- Authorization: every E2E test for a resource includes a "cross-tenant denied" variant

## CI

GitHub Actions workflow:

```yaml
on: [push, pull_request]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - setup-node 20
      - npm ci
      - npm run lint
      - npm run typecheck
      - npm run test
      - npm run build
      - run supabase start
      - npm run test:e2e -- --reporter=html
      - upload Playwright report as artifact
      - run lighthouse CI against preview
```

PR cannot merge unless all jobs pass.

## Test data

Realistic Romanian sample data, not Lorem Ipsum:
- Apartment numbers like "12A", "15", "Mansardă"
- Names from a curated list of common Romanian names
- Addresses on real Bucharest streets
- Realistic ticket descriptions ("Bec ars pe casa scării, etajul 4")
- Romanian dates and currency

Generate with `tests/fixtures/generate-data.ts`. Same seed always produces the same data.

## Manual smoke test checklist

Before any production deploy, a human runs through this list (also documented in `DEPLOYMENT.md`):

1. Login as admin → sees admin panel
2. Login as proprietar → sees resident view, no admin features
3. Open as Telegram Mini App → loads without separate login
4. Publish an announcement → arrives in Telegram within 60 seconds
5. Submit a vote from Telegram → counted in admin panel
6. Submit a sesizare with photo → admin sees photo, assigns, resident gets notification
7. Toggle a feature off → it disappears for residents
8. Cross-tenant check: log into asociație A, can't query asociație B's data (use browser devtools)
9. PWA install on Android → works offline for already-viewed pages
10. Print a procesverbal → looks correct on A4
