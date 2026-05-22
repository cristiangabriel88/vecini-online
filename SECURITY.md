# Security policy — vecini.online

vecini.online is a multi-tenant SaaS for Romanian asociații de proprietari. It
handles personal data of residents (names, contact details, apartment data,
votes, financial records), so security and privacy are treated as product
requirements, not afterthoughts. This document records the threat model, the
controls in place, and how to report a vulnerability.

## Reporting a vulnerability

Report security issues privately. Do **not** open a public GitHub issue for a
suspected vulnerability.

- Email: security@vecini.online (or the maintainer address in `package.json`).
- Include: affected surface, reproduction steps, impact, and any logs (with
  personal data redacted).
- We aim to acknowledge within 72 hours and to ship a fix or mitigation for
  confirmed high/critical issues as a priority task (P0 in `BACKLOG.md`).
- Please give us a reasonable window to remediate before public disclosure.

Do not run intrusive or destructive tests (DoS, mass data extraction) against
shared infrastructure. Use demo mode (no Supabase credentials) for local
testing whenever possible.

## Supported versions

This is a continuously deployed application, not a versioned library. Only the
current `main` branch deployed to production is supported. Fixes land on `main`
and deploy forward.

## Threat model

Actors and the assets they must not reach:

| Actor | Must not be able to |
| --- | --- |
| Anonymous visitor | Read or write any tenant data; reach `/app/*` without a session. |
| Authenticated resident of asociație A | Read or write any data belonging to asociație B (cross-tenant). |
| Authenticated resident | Read another resident's private data within the same asociație beyond what a feature deliberately shares; mutate records they do not own; cast a vote/signature as someone else, or change one already cast. |
| Comitet/admin of asociație A | Act on asociație B; escalate to platform-owner capabilities. |
| Attacker with a stolen password | Bypass the second factor on a privileged account; brute-force the TOTP/login. |
| Any client | Bypass server-side authorization by calling the API directly (client checks are not the authority). |

Primary assets: resident personal data (GDPR), authentication credentials and
MFA secrets, financial/vote records (integrity), and tenant isolation itself.

## Controls

### Tenant isolation (the core control)

- Every table in `public` has Row Level Security **enabled** and is scoped by
  `asociatie_id`, directly or through its parent row. Coverage is 122/122
  tables as of the 2026-05-22 audit (T04/T34).
- Access is gated by two `security definer` helpers with a fixed
  `search_path = public`:
  - `is_member(asociatie_id)` — current user has an active membership in that
    asociație (`user_id = auth.uid()` **and** `asociatie_id = target` **and**
    `ended_at is null`).
  - `has_role(asociatie_id, roles[])` — same, plus role membership.
- Standard feature tables use `apply_standard_rls`: all members may `select`;
  only `admin`/`presedinte`/`comitet` may write.
- Owner-scoped data adds `apply_owner_rls(owner_col)` so users manage only their
  own rows; member-authored inserts use `apply_member_insert_rls`.
- Vote and signature junction tables (`budget_votes`, `idea_votes`,
  `petition_signatures`) resolve the owning asociație through their parent and
  grant **no** `update`/`delete`/`for all` policy, so a cast vote or signature
  is immutable; the composite primary key enforces one-per-apartment (T34).
- No policy uses `using (true)` or omits tenant scoping.

Regression guards run offline in CI:
`tests/unit/voteSignatureRls.test.ts` (T34) and
`tests/unit/rlsTenantIsolation.test.ts` (T04) parse the migration SQL and fail
if a tenant table loses its scoping or a vote/signature table gains a mutation
policy. A table-by-table coverage guard is queued as T35; live cross-tenant
tests against a provisioned Postgres are queued as T08.

### Authentication and session

- Supabase Auth with the **PKCE** flow; email verification required on sign-up;
  password reset via emailed recovery link.
- Password policy (`passwordPolicy`, T03): minimum length, bcrypt-72 cap,
  character variety, offline breached/common-password blocklist, email-echo
  rejection, strength scoring. Client-side today; server-side parity
  (Supabase minimum length + leaked-password protection) is queued as T32.
- Login rate limiting with escalating temporary lockout per normalised email
  (`loginThrottle`, T03). Server-backed lockout is queued as T33.
- Two-factor authentication (TOTP, RFC 6238) with single-use recovery codes
  stored only as SHA-256 hashes; **enforced** for privileged roles
  (`admin`/`comitet`/`cenzor`). MFA challenge throttling is queued as T31.
- `signOutEverywhere` revokes all sessions (`scope: 'global'`).
- Privacy-safe auth audit stream (`auth_audit_events`): login, failed login,
  MFA change, password change. Emails are masked (`a***@domain`); passwords,
  tokens, and codes are never stored.

### Transport and browser hardening (`netlify.toml`)

- `Strict-Transport-Security` (HSTS): `max-age=63072000; includeSubDomains;
  preload`, plus `upgrade-insecure-requests` in the CSP.
- `Content-Security-Policy`: `default-src 'self'`; `object-src 'none'`;
  `frame-ancestors 'none'`; `script-src 'self'` (no inline scripts);
  `connect-src` limited to `'self'` and the Supabase project
  (`https://*.supabase.co`, `wss://*.supabase.co`). Inline styles are permitted
  for the motion layer.
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive
  `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin`,
  `Cross-Origin-Resource-Policy: same-origin`, `X-DNS-Prefetch-Control: off`.

`tests/unit/securityHeaders.test.ts` parses `netlify.toml` and fails if any of
these headers is removed or weakened.

### Telegram bot

- Webhook authenticated by `TELEGRAM_WEBHOOK_SECRET`; Mini App requests
  validate `initData`. The client never calls the Telegram API directly (only
  the Netlify function does), so the bot token stays server-side.

### Secrets and data handling

- No secrets or PII are ever logged (enforced by the audit redaction model).
- Service-role keys live only in server-side env (`SUPABASE_SERVICE_ROLE_KEY`),
  never shipped to the client; the client uses the anon key under RLS.
- Demo mode runs fully offline with seeded synthetic data — no real personal
  data is needed to develop or run E2E.

### Dependency hygiene

- `npm audit` is part of the audit pass; it currently reports **0
  vulnerabilities**. Dependabot/manual review keeps it clean.

## GDPR / legal

Romania-specific privacy and consumer controls are tracked in `BACKLOG.md` and
`DECISIONS.md`: consent banner and records (T05, shipped), data-subject rights
(T06), DPA + records of processing (T21), breach procedure (T22), minors'
consent (T23), and the consumer-rights surface (T24). The asociație is the data
controller; vecini.online is the processor.

## Known gaps (tracked, not silent)

These are deliberate, queued follow-ups rather than accepted risks:

- Client-side auth policy/throttle is bypassable by a direct API call until
  server parity lands — T32, T33.
- MFA challenge step is not yet attempt-throttled — T31.
- Live recovery-code login needs a server routine to reach AAL2 — T29.
- Live cross-tenant isolation tests against real Postgres — T08; static
  RLS-coverage guard — T35.

Last reviewed: 2026-05-22 (T04 RLS & tenant-isolation security audit).
