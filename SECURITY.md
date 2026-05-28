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

**Within-tenant privacy** (a member of the right asociație still must not see
another member's private data): the blanket "members read" is dropped on the
sensitive tables and replaced with least-privilege policies plus attribution-free
`security definer` functions.
- Anonymous messages (`anonymous_messages`, F05) — the sender reads/manages only
  their own rows (`owner manage`); the comitet has **no** direct table policy and
  triages through `anonymous_messages_for_comitet(asociatie)` (returns the inbox
  **without** `sender_user_id`) and `set_anonymous_message_status(id, status)`
  (flips only the status column). The sender is never exposed at the database
  layer, not merely hidden in the UI (T137).
- Individual survey/poll/ranking rows (`survey_responses`, `votes`,
  `priority_rankings`) — a respondent reads only their own row; results are served
  as counts via `survey_tally` / `poll_tally` / `priority_ranking_turnout`; comitet
  attribution is limited to non-anonymous surveys (T38).
- Private admin threads (`private_threads`, `private_messages`, F04) — only the
  resident party and the building's admins/presedinti can read a thread
  (`20260525000002_private_threads_inbox.sql`).

Regression guards run offline in CI:
`tests/unit/voteSignatureRls.test.ts` (T34) and
`tests/unit/rlsTenantIsolation.test.ts` (T04) parse the migration SQL and fail
if a tenant table loses its scoping or a vote/signature table gains a mutation
policy; `tests/unit/rlsCoverage.test.ts` (T35) asserts every `public` table is
RLS-enabled; `tests/unit/responsePrivacyRls.test.ts` (T38) and
`tests/unit/anonymousMessagePrivacyRls.test.ts` (T137) lock in the within-tenant
privacy shape. Live cross-tenant tests against a provisioned Postgres are queued
as T08.

### Authentication and session

- Supabase Auth with the **PKCE** flow; email verification required on sign-up;
  password reset via emailed recovery link.
- **Password policy -- client layer** (`passwordPolicy`, T03): minimum 10 chars
  (`MIN_POLICY_LENGTH`), bcrypt-72 cap, character variety, offline common/breached-
  password blocklist, email-echo rejection, strength scoring (weak/fair/good/strong).
- **Password policy -- server layer** (T32, Supabase dashboard settings required):
  - `Authentication > Settings > Password Security > Minimum password length`: **10**
    (matches `MIN_POLICY_LENGTH`; rejects weak passwords at the API layer, bypassing
    the client UI is no longer sufficient).
  - `Authentication > Settings > Password Security > Password strength`: **Medium**
    (length + character variety enforced server-side).
  - `Authentication > Settings > Password Security > Prohibit use of leaked passwords`:
    **enabled** -- Supabase calls the HaveIBeenPwned (HIBP) k-anonymity API on every
    password-set/reset. Only the first 5 hex chars of the SHA-1 hash are sent (k-anon
    model; the full password never leaves the project). This is the server-authoritative
    complement to the offline `COMMON_PASSWORDS` blocklist.
  - Exact path and current values are also documented in `.env.example`.
- **Login rate limiting** (`loginThrottle`, T03): escalating client-side lockout --
  5 failures in a 15-minute sliding window triggers a 1-minute lockout, doubling on each
  subsequent exhaustion, capped at 30 minutes. Persisted in `localStorage` so it
  survives reload but can be cleared by an attacker. Server-backed lockout is queued
  as T33.
- **Server-side auth rate limits** (T32, Supabase dashboard settings required):
  - `Authentication > Rate Limits > Sign-in`: **30 per IP per hour** (Supabase default).
  - `Authentication > Rate Limits > Email rate limit` (password-reset / magic-link
    emails): set to **5 per IP per hour** (recommended; Supabase default 60 is too
    permissive for production abuse prevention).
  - These are the authoritative backstop; the client throttle gives immediate UX
    feedback but is bypassed by a direct API call.
- Two-factor authentication (TOTP, RFC 6238) with single-use recovery codes
  stored only as SHA-256 hashes; **enforced** for privileged roles
  (`admin`/`comitet`/`cenzor`). MFA challenge throttling (T31) is in place.
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

- **Server auth-policy settings (T32)**: the exact Supabase Auth settings (password
  minimum length 10, HIBP leaked-password check, email rate limit 5/hr) are documented
  in this file and in `.env.example`. They must be applied on the provisioned project's
  Auth dashboard before the server becomes the authoritative backstop. Until then a
  direct API call can bypass the client-side password/throttle policy.
- Client-side login throttle is clearable by an attacker (localStorage) -- T33
  queues a server-backed lockout once the backend is provisioned.
- Live recovery-code login needs a server routine to reach AAL2 -- T29.
- Live cross-tenant isolation tests against real Postgres -- T08; static
  RLS-coverage guard -- T35.

Last reviewed: 2026-05-29 (T32 server-side auth-policy parity documented; T137
anonymous-message within-tenant privacy 2026-05-26; T04 RLS audit 2026-05-22).
