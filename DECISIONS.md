# Decisions — vecini.online

Compact, machine-readable log of non-trivial choices. Newest first. Format:
- choice / why / alternatives rejected (when non-obvious) / blast radius.

## 2026-05-29

### Asociatie accounting (intretinere / plati / restante) is out of product scope
- choice: vecini.online does not build internal accounting — no calcul intretinere / liste de plata, no payment processing, no restante/debtor ledger, no chitante/facturi generation. The product stays a communication / governance / maintenance / records / safety / community platform; associations keep their accounting in a dedicated external tool.
- why: Romanian asociatie accounting is a regulated, high-liability domain (Legea 196/2018 financial reporting, fond de rulment/reparatii, cenzor audit) that would dominate the roadmap and the compliance surface; the platform's value is the 65 community/governance features, not double-entry bookkeeping. F35 already shows a "finance-module-disabled" empty state for the payments card by design.
- alternatives rejected: (a) build a full billing/GL module — too large, regulated, off-mission; (b) light "track who paid" flags — partial truth invites misuse as the system of record.
- note: T19/T110 are **SaaS-subscription** billing (vecini.online charging the asociatie for the platform), unrelated to asociatie-internal resident accounting. No F68+ accounting feature is planned. Revisit only on explicit owner decision.

### Documentation status model corrected; stale task-number refs annotated (doc audit)
- choice: status is two-axis — **demo-complete** (offline UI + pure logic + tests, all 65) vs **live-wired** (reads/writes Supabase under RLS: F01/F02/F04/F05/F17/F33 + auth/invites/onboarding). `README.md`, `RESUME.md` §0 and the `FEATURES.md` legend were rewritten to say this; `FEATURES.md`'s "Implementation tracking" table is the single source of per-feature status (spec headings are no longer status-marked).
- why: the docs had drifted into three conflicting snapshots (README "6 features", RESUME "65/65 end-to-end", FEATURES table all-✅), because "implemented" silently meant "demo-built" in one place and "live-wired" in another. The audit also found the BACKLOG queue carried 21 already-archived ✅ tasks and 40/44 open tasks tagged P2; the queue was re-ranked and the duplicates removed.
- note on old task numbers: the **T88-T100 / T93** references in the dated blocks below were a 2026-05-23 planning pass and the original platform breakdown. They were later renumbered/resolved — platform-shell access E2E is now **T119**, the provisioning console live-wiring is **T120/T121**, and superadmin oversight is **T95-T99**; the platform app shell + provisioning (former T93/T94) are done. Those historical blocks are kept verbatim for the record; trust `BACKLOG.md` + `COMPLETED.md` for current numbering.
- em-dash rule scoped to code only (source/comments/strings); markdown prose may use it. Updated in `CLAUDE.md` + `BACKLOG.md` to match reality.

### Per-asociatie column vs grouping in the art. 15 export (T101)
- choice: add `asociatie` column to rows that carry an `asociatie_id` (tickets/discussions/adminchat); emit one profile row per asociație (not a grouped document-per-tenant); `asociatiiNames: Record<string, string>` + `apartments: Record<string, string|null>` in `CollectInput` replace the old single-string fields.
- why: flat sections with a labeling column work in both JSON and CSV without restructuring `DataSubjectExport`; one-profile-row-per-asociație is the clearest CSV representation for human reading; keeps `collectPersonalData` pure and its signature stable for future live activation.
- alternatives rejected: group by asociație (per-tenant block) would require changing `DataSubjectExport.sections` to nested structure, breaking the CSV `Papa.unparse` loop and all existing consumers.
- blast radius: `CollectInput` (two fields renamed+retyped), `DataSubjectExport.subject.asociatii` (was `asociatie`), `toExportCsv` header, `MyDataPage.buildExport`, and tests; no other consumers of these types outside `gdprLogic` + `MyDataPage`.

## 2026-05-28

### Three-stage deployment model (PROD / DEV / DEMO) (T171-T177)
- choice: three stages, not two; `VITE_APP_STAGE` enum at compile time.
- why: DEMO (frontend-only, seeded, no backend) and DEV (Pi backend, real auth/DB, no external email) are distinct from PROD; binary flag cannot express.
- alternatives rejected: separate demo entry point (router duplication for no benefit).
- blast radius: `VITE_APP_STAGE`, `isDemo()`, `build:prod`/`build:pi`/`build:demo`, existing `isSupabaseConfigured()` guards unchanged.

### Pi seeded user per role (T176)
- choice: `pi:seed` mints one Supabase user per role; `signInAsDevUser(role)` calls real `signInWithPassword`. Role switcher rendered only in DEV/DEMO, never PROD.
- why: `{role}@dev.local` accounts unreachable in cloud build; exercises real auth code path.
- alternatives rejected: fixed bypass cookie / dev token (would test a non-prod code path and hide auth bugs).

### Mail mode `log` for DEV (T175)
- choice: `MAIL_MODE=log` inserts row into `email_outbox` (admin-scoped RLS) and writes template body to function console.
- why: full invite/onboarding flow must remain testable on the Pi end-to-end.
- alternatives rejected: `disabled` mode (would break invite UX testability).
- blast radius: switch to `MAIL_MODE=resend` once Resend + sender domain ready.

### Production MVP launch hardening + hub isolation (T128, T100, T170)
- choice: T128 (hash onboarding/invite tokens at rest + rate-limit + audit redemption) and T100 (mandatory superadmin MFA) promoted into the `make mvp` spine and gate launch. Redemption rate-limit lives inside T128.
- why: live deployment handling residents' personal data; `RUNBOOK-MVP.md`'s "does not block presentation" note overridden.
- blast radius: spine order T170 -> T115 -> T128 -> T100; prereqs T55/T123/T91/T02/T93 done.

### T170 invite-id prefix fix (T170)
- choice: strip `inv-` prefix before posting to `invite-email` function.
- why: `sendInviteEmail` posted local `inv-<uuid>` while function only accepts bare UUID; every live resident-invite email returned 400.
- blast radius: superadmin admin-invite path unaffected (mints + sends server-side in `provision-asociatie`).

### Superadmin console origin = `hub.vecini.online`
- choice: hub Netlify site sets `VITE_APP_URL`=hub origin, `APP_URL`+`VITE_RESIDENT_APP_URL`=resident origin (`https://vecini.online`).
- why: onboarding links minted by console functions must land on resident app, not console.
- blast radius: hub-serving-the-main-app issue is a Netlify dashboard setting (Configuration file path=`netlify-platform.toml`), no repo change. Production Supabase = `https://zylfndjluunbtudtawzq.supabase.co`.

## 2026-05-27

### Live MVP presentation flow (T168)
- choice: Supabase "Confirm email" OFF; invite link is the verification. Flow = one email (invite) -> set password -> in.
- why: invite/setup link is single-use, 24h, opaque, delivered to recipient inbox; possession proves control.
- blast radius: password reset still uses `<VITE_APP_URL>/reset-parola`.

### Run target = Netlify (two sites)
- choice: separate Netlify site pointed at `netlify-platform.toml` gives console its own origin.
- why: email links must resolve to a stable public URL; functions must run server-side.
- alternatives rejected: `netlify dev` + tunnel (fragile for live demo).

### APP_URL semantics on both sites
- choice: `APP_URL` = resident origin on both sites.
- why: `invite-email` builds onboarding link with `buildOnboardingLink(APP_URL, token)`; invitee always lands on resident/admin app.

### Provisioning checklist location
- choice: lives in `RUNBOOK-MVP.md`.
- why: human/infra steps (Supabase keys + auth config, Resend domain verification, Netlify env vars) reproducible in one place.

## 2026-05-26

### QR code library + surface (T90)
- choice: use existing `qrcode` package; wrap as `src/shared/components/QrCode.tsx` + `src/shared/lib/qr.ts`. Override decision T88-T100's `qrcode.react` choice.
- why: `qrcode` already in `dependencies` (added T153 for Netlify invite-email function).
- blast radius: QR only on `InvitesAdminPage` (T152 removed setup links from `PlatformAsociatiiPage`; T153 already embeds QR in admin invite email). Download uses programmatic `<a>` element.

### Invitation email delivery (T147)
- choice: bilingual email template lives in pure `src/shared/lib/inviteEmail.ts`, dependency-free; imported by both client and Netlify function.
- why: Netlify `invite-email` function bundled by esbuild cannot pull i18next/React; mirror Telegram `telegramStart.ts` pattern.
- blast radius: email keyed off recipient locale (`users.locale` live, inviter UI lang offline).

### Dual-mode delivery + send markers (T147)
- choice: `inviteEmailApi.sendInviteEmail` branches on `isSupabaseConfigured`. Split `emailSentAt` (offline + live) vs `emailDeliveredAt` (live-only via Resend webhook T149).
- why: keeps flow testable offline; delivered is a fact only provider can confirm.
- blast radius: `invite-email` function returns 503 until Resend configured; caller-authorization gate queued as T148 so endpoint is never deployed as open relay.

### Account-creation-on-redemption landing (T124)
- choice: one `AccountSetupPage` (`/configurare-cont`) serves both locatar invite + admin setup; pure `resolveOnboarding(value, invites, provisions)` returns `{kind, status, asociatieId, asociatieName, role}`.
- why: page is link-source-agnostic; manual short code works as fallback for both.
- blast radius: `ONBOARDING_REDEEM_PATH` moved from `/onboarding/alatura` to `/configurare-cont` in `inviteCode.ts`; old route kept as `<Navigate>` redirect.
- sub: offline submit links membership to demo user id, sets `demo:true`, discards credentials (real creation = T55); offline admin-setup-by-token reads `platformAsociatiiStore`, live uses T92 service-role function; single-use replay-safe via `inviteStore.consumeByToken` + `platformAsociatiiStore.consumeSetup` re-validating inside state update; provision gains `redeemedAt`, persist v3 with backfilling migrate; `LoginPage`'s inline `PasswordStrength` extracted to shared `PasswordStrengthMeter`.

### Easier 2FA channels: email + Telegram OTP (T139+)
- choice: add email + Telegram OTP channels alongside TOTP (T02). SMS out of scope (Twilio cost; `TWILIO_*` env vars unused). TOTP remains gold standard.
- why: elderly committee members + non-technical residents lack authenticator apps.

### Session elevation via custom JWT claim (T139+)
- choice: Supabase Custom Access Token Auth Hook injects `app_2fa_at` (epoch) + `app_2fa_channel` claim from service-role `session_elevations` table keyed by session id. Verify function writes row; client `refreshSession()`s to pick up. Both client gate + sensitive server functions trust `auth.jwt()`.
- why: native Supabase MFA grants AAL2 only for `totp`/`phone` factor types; email + Telegram not native factors. Tamper-proof + server-checkable signal needed.
- alternatives rejected: `app_metadata` update (account-wide, sticky, not session-bound); app-only sessionStorage flag (forgeable, kept only as demo equivalent).
- blast radius: T29 (live recovery-code login) should reuse same `session_elevations` + hook mechanism.

### Enforcement axis split + threat tiers (T139+)
- choice: `mfaEnforcementRedirect` gains optional `app2faSatisfied` axis (passes when native AAL2 OR app channel verified this session). Axis opt-in; resolved failure on both axes re-gates; unresolved never steers. Documented in `SECURITY.md`: TOTP strongest (elevates real `aal`); email/Telegram OTP protect against password-only compromise but NOT compromised mailbox or real-time relay; Telegram > email (separate device).
- why: user whose only second factor is email/Telegram not trapped on security page; honesty for non-technical users.

### OTP cross-device + offline parity (T139+)
- choice: elevation bound to `session_id`; email always carries typed code as universal cross-device fallback. Demo runs full OTP crypto (`otpChannelLogic`) offline; codes minted, hashed, expired, throttled locally; surfaced on screen.
- why: confirm page can't recognise pending session from different browser; demo parity with TOTP/recovery.
- blast radius: build order T139 pure -> T140 offline UI -> T141 migrations + hook -> T142 service-role functions -> T143 live wiring -> T144 server attempt-limit parity.

### Onboarding links use dedicated resident base URL (T133)
- choice: add `env.residentAppUrl` with chain `VITE_RESIDENT_APP_URL` → `VITE_APP_URL` → `window.location.origin`. Pure `resolveResidentAppUrl(residentUrl, appUrl)` (blank/whitespace falls back).
- why: platform console (own subdomain) has `env.appUrl` = platform origin; setup link minted there would point at wrong host.
- blast radius: link builders stay pure (`buildSetupLink`/`setupLinkFor`/`buildOnboardingLink` keep `baseUrl` param). `PlatformAsociatiiPage` passes `env.residentAppUrl`; `InvitesAdminPage` stays on `env.appUrl`.

### Anonymous messages anonymous at DB layer, not UI (T137)
- choice: F05 `anonymous_messages` blanket `apply_standard_rls` dropped; kept path is `owner manage` (`sender_user_id = auth.uid() and is_member`). Comitet access via two SECURITY DEFINER functions: `anonymous_messages_for_comitet(asociatie)` returns inbox without sender column; `set_anonymous_message_status(id, status)` flips only status. Both gate on `has_role(..., array['admin','presedinte','comitet'])` with fixed `search_path = public`.
- why: standard policies let every co-member SELECT the sender; sender is real PII (GDPR art. 15 export keys off it). RLS is row-level, not column-level; any direct comitet read/update policy would expose sender (view still needs SELECT; `update ... returning` leaks). Same false-anonymity class as T38.
- blast radius: F05 store offline-only; live read/triage must call functions, not table. Guarded by `tests/unit/anonymousMessagePrivacyRls.test.ts`.

### Superadmin routing as server-authoritative flag (T134)
- choice: `isPlatformSuperAdmin` on `authStore` populated from `is_super_admin()` RPC during `hydrate()`. Any error resolves false. Offline `enterDemo(role)` sets flag from previewed role; cleared on `SIGNED_OUT`. Routed to in-app `/app/platforma` preview; live separate-origin redirect deferred to T135 (behind `VITE_PLATFORM_URL`).
- why: must land in console without (fake) association membership; never push superadmin through tenant onboarding.
- alternatives rejected: keying off `activeRole() === 'super_admin'` (only worked in demo because demo seeded `super_admin` in `DEMO_ASOCIATIE`; conflicts with T111 which removes `super_admin` from membership enum).
- blast radius: `demoTenantContext('super_admin')` now seeds NO membership. Flag decides routing only; security boundary remains DB RLS + service-role re-checks. Pure `resolveAsociatieRoute({isPlatformSuperAdmin, hasActiveMembership})`.

### Asociație identity at provisioning (T122)
- choice: capture address, CUI/CIF, registration number, IBAN, contact phone + email at provisioning. Fields optional, format-checked when filled.
- why: operator may not have every number to hand; admin can complete in building settings (field parity).
- blast radius: IBAN structurally validated (2-letter country + 2 check digits + 11-30 alphanumerics, 15-34 total), stored normalised; CUI accepts optional `RO` + 2-10 digits; phone 7-15 digits. No mod-97. Two stores (platform console + main-app `asociatieStore`) do not sync offline. Migration `20260525000003_asociatie_identity.sql`.

### Onboarding flow data-model decisions (T122-T128, T90/T92/T55)
- choice D1 (invite delivery): secure link + QR, short code as fallback. Live token hashed at rest (T128). QR encodes link.
- choice D2 (account created on redemption): invitee not pre-created; opens link, enters email, sets password twice (reuses `passwordPolicy.ts`); account + membership created at redemption.
- choice D3 (link expiry): admin-setup and locatar-invite hard-fixed to 24h, single-use. `24h` preset added to `EXPIRY_PRESETS_MS` (alongside 7d/30d/90d/never). User initially said 6h, revised to 24h fixed.
- choice D4 (admin notified): unused `notifications` table built out into per-user inbox (replaces `NotificationsPage` stub); locatar redemption emits "locatar joined" event to admins.
- alternatives rejected: reusing F04 private messaging for D4 (that's support chat, not system events).
- blast radius: `ONBOARDING_FLOW.md`.

### In-app superadmin preview persona (no task id; planning context)
- choice: `super_admin` demo persona gets its own `/app/platforma/*` surface with `RequireSuperAdmin` gate. Reuses platform store + provisioning logic + shared `platform.*` strings.
- why: previewing "superadmin" by entering `/app` just rendered admin chrome.
- alternatives rejected: hard hand-off to `platform.html` (all three demo buttons should behave alike in one app).
- blast radius: production security unchanged; real superadmin remains separate-origin (T93) gated by server `is_super_admin()`.

## 2026-05-25

### Superadmin provisioning offline-local + audited (T94)
- choice: build offline/local `platformAsociatiiStore.provision` now; defer privileged live write to T92. Offline mints one-time setup code via `generateInviteCode` (regenerated on collision). Audited via `useAuditStore.record` against NEW asociație id (not platform-global), as two entries `asociatie.provisioned` + `admin.provisioned` with operator as actor (`recordAudit`'s active-asociație resolution, null in platform app, deliberately bypassed). Page only creates asociație + first admin; that admin onboards residents via existing invite lifecycle (T41/T42).
- why: client is never trusted with `super_admin` (CLAUDE.md); live path needs service-role Netlify function re-verifying `super_admin` server-side, creating asociație + admin auth user, plus cross-tenant list read under T91 RLS. Appears in asociație's T09 trail + T95 cross-asociație viewer. Operator-provisions-admins keeps platform tier blast radius minimal.
- blast radius: a live environment never gets phantom local-only asociație.

### Superadmin app shell = multi-page Vite build (T93)
- choice: `vite.config.ts` `build.rollupOptions.input` lists both `index.html` (resident/admin) and `platform.html` (operator console → `src/platform/main.tsx`). Single `npm run build` emits both SPAs into `dist/`.
- why: avoids duplicating Supabase client/types/i18n/build of separate repo; verification pipeline stays one command.
- alternatives rejected: separate Vite config + build script; brand-new repo.
- blast radius: Rollup code-splits; resident `index.html` only loads resident entry, so superadmin bundle never served to regular users. Separate origin at deploy time via `netlify-platform.toml` (second Netlify site, `/* → /platform.html`, tightest CSP self + Supabase only, COEP `require-corp`, noindex).

### Platform gate trusts only the server (T93)
- choice: `RequirePlatformAdmin` renders from pure `resolvePlatformAccess`; live grant from `supabase.rpc('is_super_admin')` (T91 SECURITY DEFINER). Unknown holds on `verifying` (never flashes console or denial); error/false denies.
- why: offline demo path is only client-asserted grant, solely for showcase.
- blast radius: MFA on platform login deferred to T100.

### Admin apartment registry + building settings (T114)
- choice: named occupants embedded on apartment (`persons` jsonb with `{id, name, role, is_primary}`), separate from `apartment_residents`. `numar_persoane` defaults to named count when blank, explicit value always wins.
- why: admin configures units before any resident holds account; `apartment_residents` stays for account-linked residency (keyed by `user_id`) as later live-activation path.
- blast radius: migration additive + idempotent; writes covered by existing "admins write apartments" RLS.

### Edit-apartment is dedicated page, not modal (T114)
- choice: `/app/admin/apartamente/:id` for edit, `/app/admin/apartamente/adauga` for first-time pick-a-count grid; list page shows first-setup CTA when empty.
- why: per user request — owners/occupants change over time; full page hosts person-list editor comfortably.

### `asociatieStore` for building profile (T114)
- choice: self-contained `asociatieStore` keyed by asociație id (seeded from `DEMO_ASOCIATIE`), exposes `useCurrentAsociatie()`, mirrors to `asociatii` when configured. Stairwells (`scari`) in flexible `Asociatie.settings` bag.
- why: avoid expanding `authStore`; asociație otherwise stored only as `{id, name}` offline.

### Dual-mode persistence via thin repository (T114)
- choice: `apartmentsApi.ts` over persisted zustand store; store is synchronous source of truth UI reads; repository applies mutation there and mirrors to `apartments` table when `isSupabaseConfigured`.
- alternatives rejected: react-query (would be only consumer in app).
- blast radius: matches existing `auditStore` mirroring strategy.

## 2026-05-24

### In-app AAL2 step-up on security page (T112)
- choice: conditional challenge `Card` on `/app/securitate` (shown only when `challengeRequired()` true for enrolled live session); reuses `verifyChallenge` + T31 throttle + `auth.mfa.challenge*` strings.
- why: T102 re-gated enrolled-but-AAL1 session, but TOTP/recovery challenge lived only in login flow.
- blast radius: gated on `isSupabaseConfigured` (demo never gated).

### useMfaEnforcement re-resolves AAL per navigation (T112)
- choice: single async effect keyed on `pathname` re-reads AAL (only for enrolled live privileged role) and feeds unchanged pure `mfaEnforcementRedirect`.
- why: previous cached `aalSatisfied` state bounced stepped-up session back; stale `false` after successful step-up.
- blast radius: pure decision + unit tests untouched. Recovery-code step-up still needs T29 (live recovery cannot step session to AAL2 client-side). Return-to after step-up = T113.

### Platform superadmin via `platform_admins` + `is_super_admin()` (T91)
- choice: marker table `platform_admins` (PK `user_id`, no `asociatie_id`); `is_super_admin()` SECURITY DEFINER + `set search_path = public`, stable, no args.
- why: super_admin is platform-wide, not per-asociație; keeping out of `memberships` avoids polluting `is_member`/tenant-consistency guards; single deliberate roster.
- alternatives rejected: a `memberships` row for super_admin (legacy enum value kept; tightening = T111).
- blast radius: definer attribute lets it read `platform_admins` regardless of RLS (mirrors `is_member`).

### Cross-tenant grants are additive permissive SELECT policies (T91)
- choice: separate permissive SELECT policies on `asociatii`, `memberships`, `audit_log` gated on `is_super_admin()`; Postgres ORs permissive policies so member scope unchanged. Platform tier read-only client-side; no cross-tenant write/update/delete policy; `platform_admins` carries no write policy.
- why: privileged writes (create asociație, provision admin, grant role) run through service-role function (T92) re-verifying caller; service role bypasses RLS; roster cannot self-escalate from browser.
- blast radius: `users` deliberately NOT granted cross-tenant read (resident PII least privilege); console reads identities via T92 or later scoped task. T96 (error feed) + T97 (usage) get same policy when they land.

### Consumer-rights as dedicated legal page (T24)
- choice: own informational `LegalDoc` (`consumerRights`) at `/protectia-consumatorului`, mirroring privacy/terms/cookies. Terms keep short "Consumer rights" section pointing to dedicated page.
- why: body is long, legally self-contained, linkable on its own; will be single content source billing checkout reuses (T110).
- blast radius: cites OUG 34/2014 (Directive 2011/83/UE) for withdrawal, OG 38/2015 for SAL. Pre-contractual info + express-consent at purchase = T110.

### ROPA processing profile on registry (T74)
- choice: processing vocabulary (`RopaDataCategory`, `ProcessingProfile`, recipient-key constants, `CATEGORY_DEFAULTS`, optional `FeatureDef.processing`) lives in `registry.ts`; `ropaLogic` imports them. `ropaLogic` re-exports for import-site stability.
- why: T21's parallel `FEATURE_OVERRIDES` map was second source of truth; new feature silently inherited category default. Dependency direction forces this — `ropaLogic` imports registry; shared registry must never import a feature module.
- blast radius: `processing?: Partial<ProcessingProfile>` shallow-merges over `CATEGORY_DEFAULTS[category]`; override list = exhaustive set of "differs from norm". Semantic safety net (heuristic/per-feature "reviewed" flag) = T109.

### Minors privacy aggregate-only enforcement (T23)
- choice: `src/shared/lib/minorsGuard.ts` provides `assertAggregateOnly(record, allowed, context)` throwing `MinorIdentityError`. Regression test parses `domain.ts` (`KidsAgeRange`/`KidsEvent` must equal allowlisted field sets) and migration (no child-identifying column on `kids_age_ranges`/`kids_events`).
- why: trust documentation only would let F64 drift; teeth required.
- blast radius: structural + schema locks; aligns with T35/T46/T70 parse-based guard pattern.

### Minor identity detector targets child not adult (T23)
- choice: `MINOR_IDENTITY_FIELD_PATTERNS` flags child-scoped (`child_name`, `copil_*`, `data_nasterii`, `cnp`, `școală`, `birthday`); does NOT flag bare `name`/`email`/`user_id`/`organizer_name`.
- why: adult parent/organizer identity is legitimate.

### Future minor data needs parental consent (T23)
- choice: documented in `MINORS_PRIVACY.md` — prefer aggregate; future minor identifying data only with verifiable parent/legal-rep consent (GDPR art. 8 / Legea 190/2018 art. 8), with lawful-basis + retention + ROPA entries.

### F66 rich profile editor (T11)
- choice: profile scalars (`display_name`/`scara`/`etaj`/`car_plate`/`address`/`date_of_birth`/`emergency_contact` jsonb) added to global `users`; apartment link stays in `apartment_residents`. `profile_custom_fields` owner-only via `user_id = auth.uid()` single for-all policy; RLS enabled directly (not `apply_standard_rls`). Avatar = deterministic center crop downscaled to 256 px JPEG data URL (cap 5 MB source); pure crop maths unit-tested. Autosave persists partially-invalid drafts (transient "Salvat" indicator); validation advisory inline. Custom field reorder via up/down buttons backed by pure `moveCustomField`.
- why: `users` is global identity (references `auth.users`, no `asociatie_id`); apartment ownership per-association — `apartment_id` FK on `users` would drag it into T71 guard. Custom fields are global identity attrs, not tenant data. Resident never loses draft mid-edit.
- alternatives rejected: interactive drag-crop UI (gold-plating).
- blast radius: offline `apartmentId` is UI convenience persisted locally. Custom fields kept out of tenant-consistency/apartment-ref guards but caught by T35 RLS-coverage. F36 directory visibility + admin cross-association profile reads = T104. Avatar live = Storage object whose path goes in `users.avatar_url`; bucket + RLS = T103 (mirrors F33 T88/T89 split). Drag-reorder = T105.

## 2026-05-23

### Invite-code lifecycle + admin surface (T41)
- choice: pure `inviteLogic` owns lifecycle (create/validate/consume/revoke); persisted `inviteStore` (`vecini.invites`) keeps issued codes across all asociații and filters by active. Codes via `generateInviteCode` (unambiguous 8-char alphabet, regenerated on collision).
- why: offline loop complete; live path is thin follow-up.
- blast radius: `validateInvite` returns `ok | expired | used | revoked | unknown` (precedence: unknown -> revoked -> used -> expired -> ok). Timestamps as epoch ms. `INVITABLE_ROLES` excludes `admin`/`super_admin`. Local model adds `role` + `singleUse` not in `invite_codes` table; additive migration = T60. `consume` re-validates inside state update (replay-safe gate). Membership creation = T42.

### Resident join via invite code (T42)
- choice: `authStore.joinByInvite(code)` peeks (`findByCode` + `validateInvite`) before consuming; already-member retry re-selects asociație. Returns `InviteStatus` rather than throwing.
- why: avoid burning single-use code; UI maps statuses to precise bilingual copy.
- blast radius: invite's `apartmentId` NOT written to local store on join (offline `Membership` carries only role + asociație; no writable apartment-ownership store). Apartment link rides to live RPC (T55). Join page = `/onboarding/alatura`. Joined-name resolution = T62 folding into T59.

### Disabled-module route gating + demo as showcase (T44)
- choice: single `FeatureRouteGuard` wraps `/app` `<Outlet />`; resolves pathname via pure `featureRouteLogic.PATH_TO_FEATURE` (built from registry).
- why: hidden-in-nav but mounted-in-router pages were reachable by URL.
- blast radius: `DEMO_FEATURES` now = all `implemented` features (was curated 10); demo must be fully explorable + per-feature E2E reach by direct URL. Newly created asociație still seeds `RECOMMENDED_FEATURES`. Guard gates on enabled flag only; per-feature `audience`/role = T64.

### Telegram /start CODE dual-code (T50)
- choice: same `/start <payload>` resolves with defined precedence — per-user link code first, then invite code. Pure `resolveTelegramStart` resolver.
- why: invite onboards new joiner (offline `TelegramLink` carries null `userId` — invite path mints user server-side in T58); link code binds Telegram chat to existing account (fully offline-testable).

### Telegram parsing layer dependency-free (T50)
- choice: `telegramStart` in `src/shared/lib/` imports only pure `inviteCode` helper — no `@/` aliases, no Zustand/React. `telegramLinkLogic` lives separately in `src/features/telegram/` (app + tests only).
- why: Netlify webhook bundled by esbuild (`node_bundler = "esbuild"`) imports relative paths only, no alias resolution.
- blast radius: bot replies Romanian only (backend surface, not localized UI). In-app "Link Telegram" UI = T68.

### Parent-child tenant consistency via composite FK (T46)
- choice: child's `(fk_col, asociatie_id) -> parent (id, asociatie_id)`; parent gets `unique (id, asociatie_id)` target. Generic `add_tenant_fk(child, fk_col, parent)` helper applies to 43 pairs. Migration `20260522000014_tenant_consistency_fk.sql`.
- why: nothing previously stopped child pointing at parent in another asociație (RLS only checks `is_member(child.asociatie_id)`).
- alternatives rejected: per-row `before insert/update` trigger (composite FK is declarative, enforced by planner, cannot be bypassed even by `security definer` routine).
- blast radius: MATCH SIMPLE default (NULL `fk_col` not enforced — matches nullable refs like `tickets.apartment_id`). Keeps `on delete no action`. Junction tables without own `asociatie_id` = T71. Latent `aga_votes` RLS-on-missing-column bug = T70.

### Apartment-ref tenant consistency via trigger (T71)
- choice: `before insert or update` trigger `check_apartment_parent_tenant` resolves parent's + apartment's `asociatie_id`, rejects mismatch. `security definer` + fixed `search_path = public`; reads `NEW` via `to_jsonb` so one generic function serves every table. NULL apartment ref allowed. Migration `20260522000015_apartment_ref_tenant_consistency.sql`.
- why: composite FK unavailable — child has no `asociatie_id` to put in key; denormalised column would need trigger anyway.
- blast radius: covers `aga_votes.apartment_id`, `aga_attendees.apartment_id`+`proxy_for_apartment_id`, `budget_votes.apartment_id`, `idea_votes.apartment_id`, `petition_signatures.apartment_id`. `apartment_residents` excluded (only tenant anchor IS apartment).

### Least-privilege owner grants on governance tables (T69)
- choice: `apply_governance_owner_rls(tbl, owner_col, child_tbl, child_fk)` replaces blanket `"owner manage"` on `budget_proposals`/`ideas`/`petitions` with `"owner insert"` + `"owner update unlocked"` + `"owner delete unlocked"`. Migration `20260522000016_governance_owner_least_privilege.sql`.
- why: once others cast votes/signatures, row stops being author's alone; blanket grant still let them delete (cascading votes/signatures).
- blast radius: lock condition = existence of child vote/signature row (uniform across all three; `budget_proposals` has no status column). Comitet/președinte/admin keep moderation via `"comitet write"`; members keep read.

### Fix `aga_votes` RLS by editing source migration (T70)
- choice: replace `apply_standard_rls('aga_votes')` with parent-resolved policies through `agas`: `"members read votes"` (select, parent `is_member`) and `"comitet write votes"` (`for all`, parent `has_role`).
- why: `aga_votes` carries no `asociatie_id` (tenant-scoped through parent `agas`); macro generates `using (is_member(asociatie_id))` which raises `column "asociatie_id" does not exist` at `CREATE POLICY` time, aborting migration. Demo never runs SQL.
- alternatives rejected: adding `asociatie_id` column to `aga_votes` (would need trigger to sync with parent).
- blast radius: deliberate one-off exception to additive-migrations rule (prior migration aborts, no later migration would ever run; no Supabase project ever provisioned). Regression guard `tests/unit/rlsHelperColumns.test.ts` parses every `create table` + every helper call asserting target table declares referenced columns.

### GDPR data-subject rights (T06)
- choice: export (art. 15 + 20) self-service; erasure (art. 17) filed pending and actioned by admin/president. Both logged.
- why: access/portability is a risk-free read; deletion is irreversible.

### Erasure as per-category plan (T06)
- choice: profile/contact + marketplace deleted; tickets/ideas anonymized (kept for continuity, identity stripped to bilingual placeholder); votes + financial + consent proof + security log retained (Legea 196/2018, accounting law, lawful-processing proof).
- why: resident sees plan with per-category rationale before requesting.
- blast radius: pure `ERASURE_PLAN`/`RETENTION_POLICY` in `gdprLogic.ts` is single source; `DATA_RETENTION.md` is human counterpart. Cross-store mutation + periodic cleanup deferred to service-role Supabase routine.

### `data_subject_requests` append-only RLS (T06)
- choice: resident files + reads own; admin/president read asociație queue + may only advance pending status; no delete policy for anyone.
- why: accountability trail cannot be rewritten.
- blast radius: row carries metadata only; `actioned_by` is admin display name.

### ROPA generated from feature model (T21)
- choice: per-`FeatureCategory` default processing profile + small `FEATURE_OVERRIDES` map in `ropaLogic` for genuinely-different cases (financial F12/F20/F44 with 10-year retention; consent F36/F37/F49/F63/F64; anonymous F05). `buildRopa(enabledKeys)` lists four platform activities + one entry per enabled feature.
- why: hand-maintained register would drift the moment a module toggles.
- blast radius: unit guard asserts every implemented feature resolves non-empty profile. Override map moved to registry in T74. DPA = informational template in `dpaContent.ts` downloadable as text (reviewed before use). Snapshot + adoption record under RLS = T75.

### Breach procedure surface (T22)
- choice: `/app/admin/incidente-date` (controller-role only) records breach + classifies risk + generates notifications.
- why: art. 33 (ANSPDCP within 72h) + art. 34 (residents on high risk) require it.

### Risk drives duty, not admin choice (T22)
- choice: `classifyRisk` maps WP29/EDPB factors (sensitivity, scale, identifiability, neutralisation via art. 34(3)(a) encryption) to `low`/`risk`/`high`; admin may override but default is computed.
- why: obligation must not be under-stated by omission.

### Notifications as downloadable bilingual text (T22)
- choice: plain text, not PDF or automated submission.
- why: same bundle-budget reason as T13 AGA proces-verbal. Submission + delivery remain controller's act.
- blast radius: live in-app delivery via notification fan-out = T76.

### Breach log append-only (T22)
- choice: `data_breaches` has insert/select/update for controller roles; NO delete for anyone.
- why: art. 33(5) documentation must stay tamper-evident.
- blast radius: only breach description, scope (categories as i18n keys, affected count), handling trail; reporter by display name; no breached data stored. Folds into T09 audit stream when ready (= T76).

### Data-subject export driven by one section spec (T73)
- choice: 26 sections derived from single private `SUBJECT_SECTIONS` array in `gdprLogic`. Each entry declares `select` (subject's rows), erasure `action` + rationale key, retention period + basis key.
- why: maintaining export + erasure + retention as three parallel lists would drift; new feature must be part of all three or none.
- blast radius: `collectPersonalData` stays pure (takes store arrays as input); each section's `select` filters by real attribution field (`user_id`/`owner_user_id`/`author_user_id`/`reporter_user_id`/`sender_user_id`/`from_user_id`/`organizer_user_id`/`resident_user_id`). `votes` + `financial` retain-only (no export section). Parking excluded (no `user_id`). Feedback exports only non-anonymous (`!anonymous && user_id === me`). `gdprLogic.test.ts` locks `EXPORT_SECTION_KEYS` + every label/reason/period/basis resolves in ro.json + en.json.

### Least-privilege RLS for response rows (T38)
- choice: additive migration `20260522000020_response_privacy.sql` drops over-permissive `"members read"`/`"comitet write"` on `survey_responses`, `votes`, `priority_rankings`; replaces with least-privilege.
- why: standard `apply_standard_rls` let any member read every individual row (who answered anonymous survey, how each neighbour voted). Within-tenant privacy leak.
- alternatives rejected: source edit like T70 (standard policies here apply cleanly; additive is correct).

### Self-read only + narrow comitet exception (T38)
- choice: respondent reads only own row. Comitet reads `survey_responses` ONLY when `surveys.anonymous = false`; anonymous surveys nobody (not comitet) can read attributed rows.
- blast radius: aligns with T34/T45/T46/T71.

### Votes default to ballot secrecy (T38)
- choice: `polls` carries no per-poll secrecy flag; voter reads only own vote; everyone else sees aggregate.
- why: privacy-preserving default. Formal AGA votes (`aga_votes`) remain attributable per Legea 196/2018 — comitet visibility unchanged.

### Cast rows immutable; rankings revisable (T38)
- choice: `survey_responses`/`votes` get no update/delete/for-all policy. `priority_rankings` gets single `for all` self policy scoped through `apartment_residents`.
- blast radius: matches `event_rsvps` "self rsvp" precedent.

### Aggregates via SECURITY DEFINER (T38)
- choice: `survey_tally`, `poll_tally`, `priority_ranking_turnout` read past RLS, return counts only (never user/voter/apartment id). Gated on `is_member`, fixed `search_path`.
- blast radius: ranked polls aggregate `ranked_options` jsonb at app layer; functions cover option-selection types. `responsePrivacyRls.test.ts` locks.

### MFA challenge attempt throttling (T31)
- choice: reuse T03 `loginThrottle` (sliding window + escalating lockout); single per-device challenge channel (not keyed by account).
- why: same primitive simplifies tuning; only one challenge in flight per browser; cannot be sidestepped by varying identifier.

### Throttle only on wrong-credential guess (T31)
- choice: failure counts only when `mfaErrorKey(error) === 'invalidCode'` (demo `invalid-code` + live Supabase "invalid...").
- why: config/availability errors (`not-enrolled`, `recovery-live-unavailable`, `challenge-failed`) are not attacker probes; brute-force surface is exactly the 6-digit space.

### Throttle persisted client-side (T31)
- choice: `challengeThrottle` persisted so reload cannot reset lockout; localStorage wipe still can.
- blast radius: server-side parity = T81 (with T29 live recovery + T33 server-backed login lockout). Audit events `mfaChallengeFailed`/`mfaChallengeLocked` join privacy-safe auth stream; no migration needed (`event_type` unconstrained text).

### Audit log surface (T09)
- choice: tamper-evidence two-layered. (1) Storage append-only: `audit_log` RLS grants admin/președinte read + member self-append; NO update/delete for anyone (admins included). (2) Each entry carries `seq`, `prev_hash`, own `hash` over content + link; `verifyChain` re-derives on every view.
- why: chain detects honest-but-careless mutation; append-only grant stops deliberate one.

### Non-cryptographic hash deliberately (T09)
- choice: cyrb53 fast synchronous 64-bit, not SHA/HMAC.
- why: hashing is synchronous + demo path has no secret to key HMAC; non-crypto digest sufficient for ordering/integrity given append-only store.
- blast radius: keyed/Merkle-anchored evidence = T87.

### Audit persisted; emitted from pages, not stores (T09)
- choice: `auditStore` uses `persist` (`vecini.audit`); `recordAudit` called from event handlers of admin/content pages where actor + active asociație are resolved.
- why: audit trail must survive reload; emitting from stores would couple every store to `auditStore` and risk import cycles.
- blast radius: page is natural authorization boundary; `auditStore` stays a leaf. Server-authoritative seq/hash stamping = T86 behind `isSupabaseConfigured`.

## 2026-05-22

### GDPR consent & legal surface — scope, ordering, lawful bases (T05)
- choice: reordered ahead of T01-T04. Legal copy in typed content module (`legalContent.ts`), not i18n JSON. Notification consent reuses cookie-consent categories: `essential` -> always; `community` -> `preferences`; `marketing` -> `marketing`.
- why: T01-T04 (live auth/2FA/session/RLS) only meaningfully verifiable against provisioned Supabase; T05 is pure FE + demo-backed store, fully exercisable now. Privacy/Terms/Cookies are long paragraph documents — typed module clearer than hand-maintained arrays.
- blast radius: live channels (T14/T15) must call `mayNotify(record, kind)` gate = T26.

### Lawful basis per data category (T05)
- choice: Identity/contact/apartment/building-life (meters, tickets, votes, attendance, bookings, documents, messages) = art. 6(1)(b) + 6(1)(c) Legea 196/2018. Security alerts (F03) + audit log = art. 6(1)(f) legitimate interest (vital for emergencies). Directory (F36), birthdays (F63), car plate, custom fields, non-essential cookies/analytics/marketing, optional notifications = art. 6(1)(a) consent. Children (F64) aggregate-only, never identifying.

### F10 AGA digitală — PV scope + quorum modeling
- choice: proces-verbal as downloadable plain text (not PDF). Always Romanian regardless of UI language.
- why: client PDF engine (pdfmake/jsPDF, ~hundreds of KB) blows bundle budget for one document. PV is a legal document.
- blast radius: swapping Blob for server-side PDF render = later isolated change.

### F10 quorum + voting modeled per-apartment
- choice: meeting carries `represented_apartments` + `my_rsvp`; `presentApartments` adds current apartment when `prezent`/`procura`. Each item carries `votes` + `my_vote`; `itemTally` folds current vote. Outcomes require quorum then `MajorityRule`: `simple`/`absolute`/`qualified_2_3`.
- why: reused polls engine's `MajorityRule`.
- blast radius: RSVP + voting independent in demo (don't force presence before vote); backend `aga_votes` insert policy scopes voting to `in_desfasurare` assembly within asociație.

### Product name = vecini.online
- choice: `vecini.online` everywhere; no other brand in codebase/docs/package name/storage keys; `vecini.*` localStorage prefix.
- why: product name is a branding decision; repo authoritative over older spec text.

### Scope: production-shaped foundation, not all 65 features
- choice: fully implemented UI: F01, F03, F08, F09, F17, F56 + admin feature-flag panel, apartment registry, 5-step onboarding wizard, auth/login, home, hubs, profile. Database: all 65 features' tables + RLS. Telegram webhook with secret + initData validation. Other ~59 features registered, toggleable; opening shows "registered, page not in this build" notice.
- why: avoid fake data; keep feature-flag system honest while making roadmap visible.
- blast radius: documented per-feature in `FEATURES.md` tracking table.

### Demo mode = no backend required
- choice: `isSupabaseConfigured` detects missing creds; runs offline with Zustand stores seeded from `src/shared/demo/demoData.ts`. No mock data in Supabase path; seed only in `supabase/seed.sql` + client demo module gated behind not-configured check.

### State management
- choice: server/async = React Query; demo = per-feature Zustand stores seeded from `demoData.ts`. Feature flags persisted in `featureStore` keyed by asociație (`byAsociatie: Record<asociatieId, flags>`), seeded with `RECOMMENDED_FEATURES` (T43). Resolved via `useAsociatieFlags()` from `authStore.currentAsociatieId`. Pure resolution in `featureFlagsLogic`. Persisted at `vecini.features` with `version: 2` migrate carrying pre-T43 flat map onto demo asociație. Live: hydrate from `asociatie_features` (= T56).

### i18n structure
- choice: single `translation` namespace per locale (`ro.json`, `en.json`) with nested keys. Romanian source of truth; English covers admin surface.
- alternatives rejected: one file per feature.

### Rich text + XSS
- choice: all stored HTML passes through `sanitizeHtml` (DOMPurify) strict allowlist before `dangerouslySetInnerHTML`.
- blast radius: announcements.

### Bundle splitting
- choice: `manualChunks` separates `react`, `@supabase/supabase-js`, React Query, i18n vendors; feature pages lazy-loaded. `Icon` imports only lucide icons referenced by registry (full `icons` map added ~700 KB).
- blast radius: initial route ~190 KB gzipped, under 250 KB budget.

### TypeScript build
- choice: explicit `tsc -p tsconfig.app.json` + `tsconfig.node.json` `--noEmit`. Netlify function reuses `src/shared/lib/telegramAuth.ts` via relative import.
- alternatives rejected: `tsc -b` project references (composite/`noEmit` friction).
- blast radius: signature logic unit-tested once.

### Tooling versions
- choice: Vitest v3 (shares Vite 6); Vitest 2 pulled nested Vite 5 conflict.

### Testing environment limitation
- note: Playwright binaries cannot download in build sandbox (`cdn.playwright.dev` outside allowlist); specs in `tests/e2e/` run locally/CI. Unit tests (Vitest) run + pass.

### Live Supabase auth wiring (T01)
- choice: email + password only first-party method (magic-link/OAuth out of scope). Sign-up assumes "Confirm email" ON; no-session return treated as "check your email". Password reset via `resetPasswordForEmail` redirect to `<VITE_APP_URL>/reset-parola`; resulting `PASSWORD_RECOVERY` (via `detectSessionInUrl`) sets `recovery` flag.
- why: maps cleanly to Supabase Auth; keeps demo unchanged.
- blast radius: opaque errors mapped to stable keys via `mapAuthError` (UI bilingual, never leaks raw text). "same as old password" matched before weak-password rule (both contain "should be"). Length-only (8) validation here; full policy + breach rejection = T03; role-gated profile/membership = T28.

### Auth & session hardening (T03)
- choice: breach rejection offline via curated normalised blocklist (commonly-breached, trivially-guessable, Romanian + product-specific); applies only at password-set time (sign-up/reset); sign-in keeps looser min-length gate. Login lockout via pure `loginThrottle` (sliding 15-min window, 5-failure budget, doubling 60s to 30-min cap, per normalised email), persisted localStorage, gates `signIn` pre-network (demo not throttled). Auth audit privacy-safe at type level: `authAudit.buildAuthEvent` accepts only event type + optional email — no param for password/token/code; `redactEmail` masks to `a***@domain`; local log capped 50; live mirrored to `auth_audit_events` (owner-read + admin-read, no update/delete). Session: PKCE flow; auto-refresh; `SIGNED_OUT` clears derived state; `signOutEverywhere` uses `scope:'global'`. Cross-store wiring via lazy `getState()` inside actions, never at module top level.
- why: deterministic + private (password never leaves device); demo-runnable; first line of defence layered on Supabase server rate-limiting; "no PII or secrets in logs" enforced by shape; intercepted authorization code cannot be redeemed elsewhere; import cycle resolved at call time.
- blast radius: online HIBP via Supabase Auth = T32; server-backed login counters = T33. Active-sessions control on security page.

### 2FA/MFA — TOTP (T02)
- choice: RFC 6238; demo verifies codes offline via Web Crypto (`mfaLogic`); live delegates challenge/verify to Supabase. Unit tests against RFC 4226/6238 vectors. Enforced roles: super_admin, admin, președinte, comitet, cenzor (spec named only admin/comitet/cenzor; președinte + super_admin added because same/greater privilege). Enforcement = redirect to `/app/securitate`, live only. QR: live `<img src=data:...>` (SVG via `<img>` cannot execute scripts; no encoder dep). Demo shows base32 setup key. Recovery codes: 10 single-use, shown once at enrollment, stored SHA-256 hashed in `mfa_recovery_codes` with owner-only RLS (no admin read).
- why: demo genuinely verifies standard authenticator offline (E2E-executable); secret never trusted client-side in prod; recovery codes are credentials.
- blast radius: E2E harness = T30. Live cannot client-side elevate to AAL2 (Supabase grants AAL2 only via MFA verify); live recovery-code login = T29. Until then live challenge accepts only authenticator code with clear bilingual message.

### RLS & tenant-isolation audit + CSP (T04)
- choice: full sweep found no uncovered/over-permissive table beyond three fixed in T34; T04 adds no migration. Deliverable = audit conclusion + `rlsTenantIsolation.test.ts` + `securityHeaders.test.ts` (parse SQL + `netlify.toml`, no DB). CSP: `script-src 'self'` (no `unsafe-inline`; prod `index.html` only has external module script); `style-src` allows `'unsafe-inline'` (motion layer sets element style attrs); `connect-src` uses `https://*.supabase.co` / `wss://*.supabase.co` wildcard. HSTS 2-year `max-age` + `includeSubDomains; preload`.
- why: Supabase URL is env-specific; header is static in `netlify.toml`.
- blast radius: live cross-tenant checks against Postgres = T08; table-by-table coverage = T35; build-time tightening + violation reporting = T39. `npm audit` 0 vulnerabilities.

## Appendix: earlier blocks placed retrospectively

The two blocks below were captured at the bottom of the original DECISIONS.md without dated headers. T123 was implemented 2026-05-26 (before T124 above); T88-T100 was a 2026-05-23 planning pass for tasks later resolved on 2026-05-24/25/26. Kept separate to preserve the original "bottom of file" ordering.

### T123 Secure tokenized onboarding links (2026-05-26, precedes T128 hashed-at-rest)
- choice: token = 256-bit CSPRNG rendered as 64 lower-case hex; generated client-side for offline path. Short 8-char `generateInviteCode` kept as manual-entry fallback. One `ONBOARDING_REDEEM_PATH` constant + one `buildOnboardingLink` in `src/shared/lib/inviteCode.ts`; `buildInviteLink` (locatar, in `inviteLogic`) and `buildSetupLink` (admin, in `platformProvisioningLogic`) are thin wrappers. Builders take `baseUrl` param (callers pass `env.appUrl`). TTL fixed 24h via `ONBOARDING_LINK_TTL_MS` + `onboardingExpiry`; standing admin invites may pick longer.
- why: hex (not base64url) trivially URL-safe + unambiguous; `crypto.getRandomValues` gives real entropy. Link rules in one place; T124 can move route target once. Builders pure + unit-testable. 24h fixed limits blast radius of leaked link.
- blast radius: at-rest hashing = T128. Path currently `/onboarding/alatura` (existing working route); nothing consumes `?token=` until T124. Surfaced platform-origin issue = T133. `24h` preset added at top of `EXPIRY_PRESETS_MS`.

### Session persistence + idle timeout (2026-05-26, same block as T123)
- choice: default `sessionStorage` (cleared on browser close); "remember me" opts into `localStorage` with 30-day absolute cap enforced in `authStore.init`. `useIdleTimeout` hook in `AppLayout` signs out non-remembered sessions after 30 min inactivity. Superadmin console always non-remembered. Single `rememberStorage` adapter (`sessionPersistence.ts`, fixed at client creation).
- why: previous setup kept every session in localStorage forever; too sticky for app holding financial + GDPR data on shared admin devices.
- blast radius: existing localStorage sessions not force-logged-out; reads consult both stores, migrate to sessionStorage on next token refresh.

### T88-T100 owner-requested capability areas (2026-05-23 planning pass, no code)
- choice (T88/T89 documents): real file upload on F33 (admin/comitet upload; every member views + downloads). Offline = size-capped, type-allowlisted base64 data URL. Live (T89) = per-asociatie Supabase Storage bucket + signed URLs + Storage RLS.
- why: owner's "page where admin loads building's contracts" is F33 Document arhivă's scope; rather than parallel feature, add file upload. Splitting offline (T88) from Storage (T89) follows MVP rule (overnight work must never require provisioning).
- choice (T90 QR): use `qrcode.react` (against usual dependency-light ethos). QR encodes redeem link (`/onboarding/alatura` deep link), not bare code. Note: T90 implementation later overrode to existing `qrcode` package — see T90 above.
- choice (T91-T100 superadmin): separate app on own subdomain, not a route in main app.
  - real security boundary = DB RLS + server-side `super_admin` re-checks (T91/T92), not FE.
  - separate origin worth it for session isolation: XSS in resident/admin app cannot read superadmin session token.
  - alternatives rejected: same-origin `/platforma` route (shared session storage = weakest); brand-new repo (duplicates Supabase client/types/i18n/build, falls outside backlog loop).
  - same monorepo under `src/platform/*`, own Vite build + demo mode, separate subdomain (T93).
  - privileged ops server-side: account creation + impersonation via Netlify functions + service role re-verifying `super_admin` (T92/T98). Mandatory non-removable MFA (T100).
  - division of labour: superadmin creates asociatii + provisions admins (T94); each admin adds residents via invite lifecycle (T41/T42). Oversight read-only cross-tenant: T95 audit viewer, T96 platform error feed, T97 usage/health, T98 audited read-only impersonation. Admin↔superadmin messenger (T99) reuses F04 thread/message shape.
