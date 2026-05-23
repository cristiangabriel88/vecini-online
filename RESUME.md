# RESUME — IntreVecini

A quick-start status summary so work can resume without re-reading the full spec.
Sourced from `DECISIONS.md` and `FEATURES.md` (both live at the repo root, not
under `docs/`, despite references to the contrary). The product ships as
**IntreVecini**; the docs use the earlier working title **BlocHub** but remain
accurate for architecture/data/feature specs.

> Scope note: the spec defines **65 features (F01–F65)**. This codebase is a
> production-shaped *foundation*: buildable, type-safe, lint-clean, unit-tested,
> with features being built end-to-end batch by batch and the rest registered,
> toggleable, and backed by schema so the platform is complete in shape.

---

> **Next work is driven by `BACKLOG.md`** (the ordered task queue) via the
> autonomous `make progress` protocol in `CLAUDE.md`. Trigger it by typing
> `make progress` (one task) or running `scripts/run-overnight.sh` (continuous,
> unattended, Git Bash). Section 4 below is historical context, not the live queue.

## 0. Current status (updated 2026-05-23, T21 DPA + records of processing)

- **2026-05-23 — T21 (P0) DPA + records of processing (art. 28 & 30 GDPR).**
  The asociație is the data controller and vecini.online the processor. New pure,
  unit-tested `ropaLogic` generates the per-asociație **Record of Processing
  Activities (art. 30) from the feature/data model**: a `ProcessingProfile` (data
  categories, lawful basis, retention, recipients) per `FeatureCategory` default,
  sharpened by per-feature overrides for the special cases (financial F12/F20/F44,
  opt-in/consent F36/F37/F49/F63/F64, the anonymous F05 carrying no identity), plus
  four always-present platform activities (account/auth, security log, consent
  records, data-subject requests). `buildRopa(enabledKeys)` returns the platform
  activities then one entry per enabled, implemented feature in registry order;
  `profileFor` shallow-merges the override without mutating the defaults;
  `ropaToCsv`/`ropaToJson` serialize the localized register (11 assertions, incl. a
  guard that every implemented feature resolves a non-empty profile so none falls
  outside the register). New `dpaContent.ts` ships the bilingual **DPA template
  (art. 28)** as structured `LegalDoc` content with the controller name interpolated
  and the art. 28(3)(a-h) processor obligations + `dpaToText`. New admin
  `ProcessingRecordsPage` at `/app/admin/prelucrare-date` (admin/președinte-gated,
  sidebar nav + `ClipboardList`, also linked from the privacy settings for
  controllers): a DPA card (controller/processor, rendered template, text download)
  and the art. 30 register as a 5-column table generated from `useAsociatieFlags()`
  with JSON/CSV export. Fully offline, bilingual `ropa.*`/`dpa.*` RO/EN with the
  art. 6 references, `/prelucrare` bot help. Decision recorded in `DECISIONS.md`.
  Pipeline green: lint, typecheck, 98 files / 622 tests, build. Surfaced T74
  (declare the processing profile on the registry as the single source for the
  ROPA) and T75 (live: persist a per-asociație ROPA snapshot + DPA adoption record).
- **2026-05-23 — T06 (P0) GDPR data-subject rights (export + erasure).** Finished
  the partially-built, uncommitted T06 work (pure `gdprLogic` + `gdprStore` +
  `MyDataPage` + locales + migration existed but were unwired/uncommitted) and
  wired it end-to-end. Pure, unit-tested `gdprLogic`: `collectPersonalData`
  assembles a per-section export filtered to rows genuinely the subject's
  (profile, tickets, marketplace, ideas, consent, security activity);
  `toExportJson`/`toExportCsv` (art. 15 + 20 machine-readable copy); `ERASURE_PLAN`
  (delete/anonymize/retain with a legal rationale per category); `RETENTION_POLICY`
  (period + lawful basis); `ANONYMIZED_NAME`; the `DataSubjectRequest` lifecycle
  (`makeRequest`/`actionRequest` immutable-after-action, `hasOpenRequest`,
  `pendingCount`, `sortRequests`) — 13 assertions. Resident self-service
  `MyDataPage` at `/app/datele-mele` (linked from privacy settings): one-tap
  JSON/CSV export, the retention table, the erasure plan with rationale, a
  dedup-guarded "request erasure" (art. 17), and the resident's own request
  history. New admin actioning surface `DsrAdminPage` at `/app/admin/cereri-date`
  (sidebar nav link, role-gated to admin/președinte with a bilingual restricted
  state): the per-asociație queue with a pending badge, optional note, and
  complete/reject stamping actor + time. Export is self-service but logged;
  erasure is admin-actioned. Persisted `gdprStore` keeps the queue + erased-id
  marker offline, mirroring to `data_subject_requests` when a backend exists.
  Additive migration `20260522000018_data_subject_requests.sql` (append/no-delete
  RLS: self files+reads own; admin/president reads+actions; no delete for anyone).
  New `DATA_RETENTION.md` documents the periods, the erasure plan, and that the
  cross-store mutation + periodic cleanup run server-side when provisioned.
  `/datele_mele` bot help, GDPR CSS, bilingual `gdpr.*` RO/EN, one E2E happy-path.
  Decision recorded in `DECISIONS.md`. Pipeline green: lint, typecheck, 97 files /
  612 tests, build. Surfaced T72 (live server-side erasure execution + retention
  cleanup) and T73 (broaden the export to the remaining personal-data stores).
- **2026-05-23 — T60 (P2) `invite_codes` schema parity for the T41 local invite
  model.** The offline invite model carries a granted `role` and a `singleUse`
  flag, but the live `invite_codes` table modelled neither (single-use only
  implicitly via `consumed_by_user_id`), so T55's live persistence could not
  round-trip the full model. New additive, idempotent migration
  `20260522000017_invite_codes_role_single_use.sql` adds `role text not null
  default 'proprietar'` and `single_use boolean not null default true` (both via
  `add column if not exists`), plus a dropped-then-re-added
  `invite_codes_role_check` restricting `role` to exactly the invitable roles
  (`proprietar`/`chirias`/`comitet`/`cenzor`/`presedinte`), so the DB itself
  refuses a founder/platform `admin`/`super_admin` grant. RLS unchanged.
  Backend-free guard `tests/unit/inviteCodesSchema.test.ts` (4 assertions) checks
  both columns + defaults and that the constraint admits exactly `INVITABLE_ROLES`
  (derived from the source constant, so app + schema can't drift). Pipeline green:
  lint, typecheck, 96 files / 599 tests, build.
- **2026-05-23 — T69 (P2) Least-privilege owner grants on governance tables.**
  `apply_owner_rls`'s `"owner manage"` is a blanket `for all` grant, fine for
  personal rows but too broad for `budget_proposals`/`ideas`/`petitions`: once
  residents cast votes/signatures the row is shared, yet the author could still
  update or delete it (a delete cascading the votes/signatures away). New
  migration `20260522000016_governance_owner_least_privilege.sql` adds an
  `apply_governance_owner_rls(tbl, owner_col, child_tbl, child_fk)` helper that
  replaces the blanket grant on those three tables with operation-scoped owner
  policies — `"owner insert"`, plus `"owner update unlocked"` / `"owner delete
  unlocked"` gated on a `not exists` lock against the vote/signature child — so
  the author keeps control only while no one has acted; comitet keeps full
  moderation via `"comitet write"` and members keep read via `"members read"`.
  The lock keys on child-row existence (uniform across all three; the author, a
  member, can see those rows under T34's read policy) rather than a status.
  Backend-free guard `tests/unit/governanceOwnerLeastPrivilege.test.ts` asserts
  the drop, the operation-scoped (never for-all) policies, the lock on both
  update + delete, and exact application to the three tables. Decision recorded
  in `DECISIONS.md`. Offline MVP-spine hardening is now complete (only the
  T55–T58 live-activation follow-ups remain on the spine). Pipeline green: lint,
  typecheck, 95 files / 595 tests, build.
- **2026-05-23 — T71 (P2) Tenant-consistency for apartment refs from junction
  tables without their own `asociatie_id`.** T46's composite-FK guard only
  covered child tables carrying their own `asociatie_id`; parent-scoped junction
  tables that reference `apartments` directly but have no tenant column
  (`aga_votes`, `aga_attendees` ×2, `budget_votes`, `idea_votes` found while
  auditing, `petition_signatures`) could still attach to a foreign-asociație
  apartment. New migration `20260522000015_apartment_ref_tenant_consistency.sql`
  adds a `security definer` `before insert or update` trigger
  (`check_apartment_parent_tenant`, generic via `to_jsonb(NEW)`) that enforces
  `apartment.asociatie_id = parent.asociatie_id`, applied to all 6 references via
  an idempotent `add_apartment_tenant_trigger` helper. A composite FK was not
  usable (no `asociatie_id` on the child); `apartment_residents` is excluded (the
  apartment is its only tenant anchor). New backend-free guard
  `tests/unit/apartmentRefTenantConsistency.test.ts` derives the qualifying set
  from the schema and asserts the migration covers exactly it. Decision recorded
  in `DECISIONS.md`. Pipeline green: lint, typecheck, 94 files / 589 tests, build.
- **2026-05-23 — T70 (P1) Fix `aga_votes` RLS referencing a non-existent
  `asociatie_id` column.** `20260121000002_features.sql` called
  `apply_standard_rls('aga_votes')`, but `aga_votes` carries no `asociatie_id`
  (it is scoped through its parent `agas`), so the generated
  `using (is_member(asociatie_id))` policy referenced a missing column and would
  abort the whole migration on a real Postgres — a live-deploy blocker demo mode
  hid. Replaced the macro call with parent-scoped policies through `agas`
  (`"members read votes"` select + `"comitet write votes"` for all), matching the
  sibling `aga_agenda_items`/`aga_attendees` and the batch-5 `"self cast aga
  vote"` insert policy. Edited the source migration rather than adding a
  follow-up, because an aborting migration cannot be repaired by a later one and
  no Supabase project has ever been provisioned (decision recorded in
  `DECISIONS.md`). New backend-free guard `tests/unit/rlsHelperColumns.test.ts`
  parses every `create table` and every RLS-macro call across the suite and
  asserts each target declares the columns its generated policy references;
  `aga_votes` was the only offender. Pipeline green: lint, typecheck, 93 files /
  581 tests, build.

- **2026-05-23 — T46 (P1) Parent-child tenant-consistency guards for child
  tables.** Additive, idempotent migration `20260522000014_tenant_consistency_fk.sql`
  adds an `add_tenant_fk(child, fk_col, parent)` helper and applies it to all 43
  parent-child references where both child and parent carry a direct
  `asociatie_id`. It enforces `child.asociatie_id = parent.asociatie_id`
  declaratively via a composite FK (parent `unique (id, asociatie_id)`; child FK
  on `(fk_col, asociatie_id) -> parent (id, asociatie_id)`), so a child can only
  attach to a parent in the same asociație. MATCH SIMPLE leaves NULL fk_cols
  unenforced; default `on delete no action` preserves the existing single-column
  FK delete behaviour. Chosen over a trigger (declarative, planner-enforced,
  unbypassable, no `security definer`) — recorded in `DECISIONS.md`. Backend-free
  guard `tests/unit/tenantConsistency.test.ts` (8 assertions) derives every
  qualifying pair from the schema and asserts the migration covers exactly that
  set, so a future tenant-scoped child can't be added without a guard. Pipeline
  green: lint, typecheck, 92 files / 577 tests, build. Surfaced T70 (`aga_votes`
  gets `apply_standard_rls` but has no `asociatie_id` column — the generated
  policy references a missing column and would fail to apply live) and T71
  (junction tables without their own `asociatie_id` can still reference a
  foreign-asociație apartment).

- **2026-05-23 — T45 (P0) Harden owner-scoped RLS to also require membership in
  the target asociatie_id.** Additive, idempotent migration
  `20260522000013_owner_rls_membership.sql` redefines `apply_owner_rls` so the
  generated `"owner manage"` (`for all`) policy now requires
  `%I = auth.uid() and is_member(asociatie_id)` in **both** `using` and
  `with check` (was owner-column only), closing the write-path gap where an owner
  could insert/keep a row stamped with another asociație's id. A new idempotent
  `reapply_owner_rls(tbl, owner_col)` helper drops + recreates the policy through
  the tightened generator, re-applied to all **25** owner-scoped tables in the
  schema. Every such table carries a direct `asociatie_id` (each also gets
  `apply_standard_rls`, except `pledges` which declares it explicitly).
  `apply_member_insert_rls` already required `is_member` — left unchanged.
  Backend-free regression guard `tests/unit/ownerRlsMembership.test.ts` (6
  assertions, incl. a catalogue check that the re-applied set is exactly the set
  of `apply_owner_rls` calls across the suite, so a future owner-scoped table
  can't be added without tightening). Pipeline green: lint, typecheck, 91 files /
  569 tests, build. Surfaced T69 (the `for all` owner policy still lets an author
  delete published governance rows — scope owner-delete least-privilege). Live
  cross-tenant write test folds into T08.

- **2026-05-23 — T54 (P1) One green E2E smoke for the MVP loop (demo mode).**
  New single cohesive spec `T54: the full MVP loop works end-to-end in demo mode`
  in `tests/e2e/smoke.spec.ts` walks the whole spine in one run, reusing the
  proven per-slice selectors: demo entry → active asociație + role (home subtitle
  shows the active asociație name) → create/join (admin issues an invite at
  `/app/admin/invitatii`, redeemed at `/onboarding/alatura`, lands back on `/app`)
  → an enabled module loads → publish + read an announcement (page + home widget)
  → start a discussion and reply → submit a sesizare → finally toggle F01 off and
  assert the direct `/app/anunturi` URL shows the "not enabled" notice (the
  disabled-module step runs last since demo enables every module, T44). Runs in
  demo mode with no backend; Playwright browser binaries can't download in this
  sandbox so it executes in CI (tracked with T08) but is authored to run locally
  unchanged. Pipeline green: lint, typecheck, 90 files / 563 tests, build. The
  **MVP spine is now complete and green end-to-end offline**; remaining spine
  items are the offline hardening tasks T45/T46, with live-activation follow-ups
  T55–T58 below them.

- **2026-05-23 — T50 (P1) Telegram mock/linking path with `/start CODE`.** New
  dependency-free `telegramStart` (`src/shared/lib/`, imports only the pure
  `inviteCode` helper so the esbuild-bundled Netlify webhook can use it without
  `@/` aliases or Zustand/React): `parseStartCommand` (tolerates `/start@bot`,
  whitespace, case; payload or null; null for non-`/start` text),
  `normalizeStartPayload`/`payloadLooksLikeCode`, and `replyForStart`/
  `replyChecking` (the bot's RO-only onboarding replies per outcome). New
  `telegramLinkLogic` (`src/features/telegram/`) reuses the T41/T42 invite
  lifecycle and adds a per-user link-code lifecycle (`TelegramLinkCode`,
  `createLinkCode`/`validateLinkCode`/`findLinkByCode`/`consumeLinkCode`,
  `buildLinkFromLinkCode` with a concrete `userId` / `buildLinkFromInvite` with a
  null `userId` provisioned live in T58) and the pure `resolveTelegramStart`
  resolver (precedence: no-code → already-linked → link code → invite code →
  unknown; a found-but-not-redeemable code reports its own status), returning the
  `telegram_users`-shaped `TelegramLink` + the matched code id to consume. New
  persisted `telegramLinkStore` (`intrevecini.telegram`) is the local/mock path:
  `issueLinkCode`, an atomic replay-safe `linkByPayload` (records + consumes the
  link-code path; the invite path validates but records nothing offline since the
  app user is provisioned live, T58), `linkFor`, `unlink`. The webhook `/start`
  handler now uses the shared parser + format check + replies; the existing
  webhook-secret + `initData` validation is untouched. Tests: `telegramStart`
  (11), `telegramLinkLogic` (17), `telegramLinkStore` (8). Pipeline green: lint,
  typecheck, 90 files / 563 tests, build. The MVP spine logic is complete; T54
  (one green E2E smoke for the whole loop) is the remaining spine item. Surfaced
  T68 (in-app "Link Telegram" resident surface). Live webhook resolution + deploy
  is T58.

- **2026-05-23 — T49 (P1) Sesizări / reclamații (F17) scoped to the active
  asociație.** Extended `ticketLogic` with the per-asociație model mirroring
  T47/T48 (`TicketsByAsociatie`; `seedTickets` → demo asociație gets
  `DEMO_TICKETS`; `ticketsForAsociatie` → stored list or a shared frozen empty
  default for a stable selector reference; `newTicket` builds a freshly-submitted
  `primit` ticket owned by the asociație + reporter, trimmed, SLA-dated from
  severity; pure `addTicketIn` prepends newest-first without mutating — 5 new
  assertions). `ticketsStore` is keyed by asociație (`byAsociatie`, seeded for
  demo); `add(asociatieId, reporterUserId, input)` submits only into that
  asociație's list, and a new `useAsociatieTickets()` hook resolves the active
  asociație's list via `authStore.currentAsociatieId`. `TicketsPage` resolves the
  active asociație + reporter (`profile`/live, `DEMO_CURRENT_USER_ID` offline)
  and guards submit on an active asociație; `ApartmentInfoPage` and
  `RecurringPage` (F21) were migrated off the removed `items` field to the new
  hook. One E2E added (submit a sesizare → see it listed). The MVP-spine content
  slices (T47/T48/T49) are now all green offline. Pipeline green: lint, typecheck,
  87 files / 530 tests, build. Surfaced T67 (comitet status-lifecycle surface, as
  a ticket is stuck at `primit` offline). Live `tickets` read/write under RLS is
  T57; offline persistence is in T65's scope.

- **2026-05-23 — T48 (P1) Discuții / forum (F02) scoped to the active asociație.**
  Extended `discussionLogic` with the per-asociație model mirroring T47
  (`ThreadsByAsociatie`; `seedThreads` → demo asociație gets `DEMO_DISCUSSIONS`;
  `threadsForAsociatie` → stored list or a shared frozen empty default for a stable
  selector reference; `newThread` builds an empty thread owned by the asociație
  with a `#general` topic default; `newMessage` attributes a body to a
  `MessageAuthor`; pure `addThreadIn` plus a private `mapThreads` backing pure
  `addMessageIn`/`togglePinIn`/`deleteMessageIn` that no-op for an unknown asociație
  — 8 new assertions). `discussionStore` is keyed by asociație (`byAsociatie`,
  seeded for demo); `addThread`/`postMessage`/`togglePin`/`deleteMessage` take an
  `asociatieId` (post takes an explicit author), and a new `useAsociatieThreads()`
  hook resolves the active asociație's list via `authStore.currentAsociatieId`.
  `DiscussionsPage` resolves the active asociație + author (`profile`/live, new
  `DEMO_CURRENT_USER_NAME` offline) and guards every write on an active asociație;
  the hardcoded `DEMO_USER` is gone. A11y: the icon-only reply send button gained
  an `aria-label`. One E2E added (open a thread → reply → see the message).
  Pipeline green: lint, typecheck, 87 files / 525 tests, build. Surfaced T66 (wire
  the `canPost` rate limit into the post flow). Live `discussion_threads`/
  `discussion_messages` read/write under RLS is T57.

- **2026-05-23 — T47 (P1) Anunțuri (F01) scoped to the active asociație.** New
  pure, unit-tested `announcementsLogic` (`seedAnnouncements` → demo asociație
  gets `DEMO_ANNOUNCEMENTS`; `announcementsForAsociatie` → stored list or a shared
  frozen empty default for a stable selector reference; `newAnnouncement` builds a
  published row owned by the asociație + author; pure `addAnnouncementIn` prepends
  newest-first — 6 assertions). `announcementsStore` is now keyed by asociație
  (`byAsociatie`, seeded for demo); `add(asociatieId, authorUserId, input)`
  publishes only into the active asociație's list, and a new
  `useAsociatieAnnouncements()` hook resolves it via `authStore.currentAsociatieId`
  (T43 `useAsociatieFlags` pattern). `AnnouncementsPage` resolves the active
  asociație + publishing author and guards publish on an active asociație;
  `HomePage`'s recent widget reads the scoped selector. Demo unchanged
  (`currentAsociatieId='demo-asoc'` holds the seeded list). Pipeline green: lint,
  typecheck, 87 files / 517 tests, build. Surfaced T65 (persist content stores
  offline so a publish survives reload). Live `announcements` read/write is T57.

- **2026-05-23 — T44 (P1) gate direct routes for disabled modules.** New pure,
  unit-tested `featureRouteLogic` (`PATH_TO_FEATURE` from the registry,
  `appRouteSegment` for the first segment under `/app`, `featureKeyForRoute`,
  `isFeatureRouteBlocked(flags, pathname)` — 8 assertions). New `FeatureRouteGuard`
  (`src/app/`) wraps the `/app` `<Outlet />` in `AppLayout`: a route mapping to a
  disabled feature renders a bilingual "module not enabled" notice (`common.featureDisabled`,
  lock icon, back-to-home link) instead of the page; non-feature routes and enabled
  features pass through. A disabled module is now hidden from nav **and**
  unreachable by URL. Since flags now gate URL access, the **demo asociație enables
  every implemented module** (`DEMO_FEATURES` = all `implemented`, was the curated
  `RECOMMENDED_FEATURES` 10) so demo stays fully explorable and the per-feature E2E
  reach each page; a real new asociație keeps `RECOMMENDED_FEATURES` at onboarding.
  Decision in `DECISIONS.md`. One E2E added (disable F01 → `/app/anunturi` shows the
  notice). Pipeline green: lint, typecheck, 86 files / 511 tests, build. Surfaced
  T64 (enforce feature `audience`/role in the guard + nav); T54 must disable a
  module before asserting the URL block since demo now enables all.

- **2026-05-23 — T43 (P1) per-asociație feature flags from a local store.** New
  pure, unit-tested `featureFlagsLogic` (`seedFlags` → demo asociație gets
  `DEMO_FEATURES`; `flagsForAsociatie` returns the stored map or a shared frozen
  empty default for a stable selector reference; `isFeatureEnabled`; pure
  `setFlagIn`/`setAllIn`; `migrateFlatFlags` carrying the old flat shape onto the
  demo asociație). `featureStore` is now keyed by asociație (`byAsociatie`),
  persisted at `intrevecini.features` with `version: 2` + a migrate; `setFlag`/
  `setAll` take an asociație id, and a new `useAsociatieFlags()` hook resolves the
  active asociație's set from `authStore.currentAsociatieId` (no store cycle).
  `useFeature`/`FeatureGate` and all nav/home/assistant/admin consumers now read
  the active asociație's flags; `FeaturesAdminPage` toggles scope to the active
  asociație; `OnboardingWizard.finish()` scopes its chosen set to the new asociație
  id. Demo unchanged (demo entry → `currentAsociatieId='demo-asoc'`). Single source
  for T44 route gating. Pipeline green: lint, typecheck, 85 files / 503 tests,
  build. Surfaced T63 (show the active asociație + empty-state on
  `FeaturesAdminPage`). Live `asociatie_features` read/write is T56.

- **2026-05-23 — T42 (P1) resident join via invite code.** New pure
  `buildMembershipFromInvite(userId, invite)` in `inviteLogic` (joiner enters the
  code's asociație with the granted role; the code's `apartmentId` rides along to
  the live join RPC, the offline membership carries only role+asociație).
  `authStore.joinByInvite(code)` peeks the code first (an already-member retry
  re-selects without wasting a single-use code), consumes it via the replay-safe
  `inviteStore.consume`, builds the membership and selects the asociație,
  returning the `InviteStatus` so the UI reports `expired`/`used`/`revoked`/
  `unknown`. New bilingual `JoinAsociatiePage` at `/onboarding/alatura` (reachable
  from a link on the onboarding wizard's first step, reciprocal create link back),
  `/alatura` bot help. Tests: +2 `buildMembershipFromInvite` assertions and a new
  `joinByInvite.test.ts` (6 store-integration cases incl. replay-safety and
  already-member no-waste); two E2E happy-paths (issue→redeem→/app; invalid code
  rejected). Pipeline green: lint, typecheck, 84 files / 495 tests, build. Surfaced
  T62 (record/resolve the joined asociație's display name, folds into T59). Live
  replay-safe consume RPC under RLS is T55.

- **2026-05-23 — T41 (P1) invite-code generation + admin surface.** New pure,
  unit-tested `inviteLogic` (`createInvite` reusing `generateInviteCode` with
  collision-regeneration; `validateInvite` → `ok`/`expired`/`used`/`revoked`/
  `unknown`; `consumeInvite`/`revokeInvite` non-mutating; `findByCode`;
  `isRedeemable`; `expiryFromPreset`; `INVITABLE_ROLES` minus founder/platform
  roles). Persisted `inviteStore` (`intrevecini.invites`): `issue`, `revoke`, an
  atomic double-spend-safe `consume`, and a `forAsociatie` selector. New
  `InvitesAdminPage` at `/app/admin/invitatii` (admin nav link) to issue (role,
  optional apartment, expiry preset, single-use) / list / copy / revoke codes,
  scoped to the active asociație. Fully offline, bilingual `invites.*`,
  `/invitatii` bot command. Pipeline green: lint, typecheck, 83 files / 487 tests,
  build. Surfaced T60 (extend `invite_codes` with `role`+`single_use`) and T61
  (wire/remove the ApartmentsPage generate-codes button). Unblocks T42 (resident
  join via invite code). Live persistence is T55.


- **MVP milestone reframed: "One real asociație works end-to-end."** `BACKLOG.md`
  gained a `## Current MVP milestone` section and an `## MVP spine` block at the top of
  the task queue: the autonomous worker now drives one real, live vertical slice (admin
  sign-up → create/access asociație → hydrate context → invite codes → resident join →
  per-asociație feature flags → route gating → announcements → discussions → sesizări →
  Telegram `/start CODE`) before adding more breadth. New spine tasks T41–T50 + reprioritised
  T27/T28; the GDPR/security/legal queue (T06, T21, T22, …) is kept intact right below.
  New MVP rules: no new feature modules until the spine is green; one complete slice over many
  half-wired ones; blockers go above the work they block; every task notes its commands/verification;
  demo stays useful but critical paths need a live Supabase path.

- **2026-05-22 — T28 (P0) profile + membership + active-asociație hydration.** New pure,
  unit-tested `hydrationLogic` (`activeMemberships`, `sortByPrivilege`, `pickActiveAsociatieId`,
  `roleFor`, `hasNoActiveAsociatie`, `ROLE_RANK`). `authStore` now loads the `users` profile +
  active `memberships` (under RLS) on session and `SIGNED_IN`, exposes `currentAsociatieId`,
  `activeRole()` and a member-checked `setActiveAsociatie`, and clears tenant state on sign-out.
  Demo mode unchanged as the offline fallback. Pipeline green: lint, typecheck, 80 files / 456
  tests, build. Surfaced T51 (migrate consumers to the new selectors) and T52 (hydration loading
  flag). E2E core-flow smoke runs in CI (Playwright binaries can't download in this sandbox; T08).

### Earlier this cycle (T04 RLS & tenant-isolation security audit)

- **Original-vision coverage: ~58% delivered end-to-end.** The CLAUDE.md vision is a
  "secure, stable, well-polished, GDPR-compliant, multi-tenant SaaS with 2FA, a live
  Telegram bot, and robust handling of real building problems." Honest per-dimension
  read: **feature set ~95%** (all 65 built end-to-end, but exercised only in demo mode —
  not yet verified live against a provisioned backend); **auth/2FA ~70%** (T01/T02/T03
  wired, server-side parity T32 and live recovery T29 pending); **tenant-isolation
  security ~75%** (T04 done: all 122 tables RLS-covered and `asociatie_id`-scoped, CSP + HSTS +
  cross-origin headers shipped, `npm audit` clean, `SECURITY.md` authored, isolation invariants
  regression-guarded — remaining is live cross-tenant verification T08 and the static coverage
  guard T35); **GDPR/privacy ~35%** (consent + legal surface T05 done;
  data-subject rights T06, DPA/ROPA T21, breach procedure T22, minors enforcement T23 all
  pending); **stability/resilience ~40%** (no global error boundary, no standardized
  loading/empty/error states, E2E not yet run in CI — T07/T08); **Telegram bot ~30%**
  (170-line webhook skeleton with secret + initData validation, not go-live — T15);
  **premium feel ~70%** (polished in demo; a11y audit T17 and Lighthouse T18 pending);
  **SaaS readiness ~25%** (no billing T19, no super-admin console T20, live onboarding T27
  and profile hydration T28 pending). The features dominate the build effort and are done,
  which pulls the number up; the "deployable for real residents" gates (GDPR rights, live
  backend verification) pull it back down. Phase-2 task progress: **6 of ~33 hardening
  tasks complete** (T05, T01, T02, T03, T34, T04).

- **2026-05-22 audit/replenish pass (no feature built).** Swept RLS coverage across all
  122 tables: `apply_standard_rls`/`apply_owner_rls` cover 119, but **`budget_votes`,
  `idea_votes` and `petition_signatures` have RLS never enabled and zero policies** — a
  real cross-tenant exposure (who voted / who signed, visible to any authenticated user in
  any asociație). Fed in **T34 [P0]** (additive migration: enable RLS + parent-scoped
  policies on those three), **T35 [P1]** (a static, offline RLS-coverage guard test so the
  class of bug cannot recur), **T37 [P2]** (server-rendered proces-verbal PDF for F10), and
  sharpened **T04** (CSP + HSTS specifics, cross-reference to T34). Resolved two stale queue
  entries that duplicated already-shipped features (**T10**/F35, **T13**/F10). i18n RO/EN
  parity is clean (the only RO-only keys are correct `_few` Romanian plural forms). Pipeline
  green throughout: lint, typecheck, 76 test files / 425 tests, build.

- **2026-05-22 — T34 (P0) closed the vote/signature tenant-isolation hole.** Additive,
  idempotent migration `20260522000012_vote_signature_rls.sql` enables RLS on `budget_votes`,
  `idea_votes` and `petition_signatures` and adds parent-scoped `select` + `insert` policies
  that resolve the owning asociație through the parent (`budget_proposals` / `ideas` /
  `petitions`) and gate on `is_member(...)`. No `update`/`delete`/`for all` policy is granted,
  so a cast vote or signature is immutable under RLS. A backend-free regression test
  (`tests/unit/voteSignatureRls.test.ts`, 9 assertions) parses the migration SQL and fails if
  any of the three loses RLS, parent-scoping, or gains a mutation policy. The general
  table-by-table coverage guard remains T35. Pipeline green: 77 test files / 434 tests.

- **2026-05-22 — T04 (P0) RLS & tenant-isolation security audit closed.** Swept all 122
  `public` tables across the migration suite: every one has RLS enabled and is
  `asociatie_id`-scoped (directly, via `is_member`/`has_role` + the `apply_standard_rls`/
  `apply_owner_rls`/`apply_member_insert_rls` helpers, or through a parent row); no table is
  uncovered post-T34, no policy uses `using (true)`, and the membership helpers are `security
  definer` with a fixed `search_path`. Hardened `netlify.toml` with `Strict-Transport-Security`
  (2y/includeSubDomains/preload), a strict `Content-Security-Policy` (`default-src 'self'`,
  `script-src 'self'`, `object-src`/`frame-ancestors 'none'`, `connect-src` limited to self +
  the Supabase project, `upgrade-insecure-requests`), `Cross-Origin-Opener-Policy`/
  `Cross-Origin-Resource-Policy: same-origin`, and a tightened `Permissions-Policy`; verified
  the production `index.html` has no inline script/style so the CSP holds. `npm audit` clean
  (0 vulnerabilities). Authored `SECURITY.md` (threat model, controls, reporting, tracked
  gaps). Two backend-free regression guards added: `rlsTenantIsolation.test.ts` and
  `securityHeaders.test.ts`. Surfaced T39 (CSP tightening + violation reporting). Pipeline
  green: 79 test files / 444 tests.

- **Two phases. Phase 1 (features): 65 / 65 built end-to-end (100%, `BUILD_COMPLETE`).
  Phase 2 (production + legal readiness, `BACKLOG.md`): 6 tasks done (T05, T01, T02, T03, T34, T04);
  plus T10/T13 resolved as already-delivered features in the 2026-05-22 audit.**
  The app is feature-complete but not yet legally deployable for real residents:
  remaining go-live blockers are GDPR data-subject rights — export + erasure
  (T06), and the DPA + records of processing / breach procedure (T21/T22). The
  RLS/tenant-isolation audit (T04) is now done. T01 (live Supabase auth), T02
  (2FA/MFA) and T03 (auth & session hardening) are now wired; their follow-ups
  T27 (post-auth association onboarding), T28 (profile/membership hydration), T29
  (live recovery-code login), T30 (live MFA enforcement E2E), T31 (MFA challenge
  throttling), T32 (server-side auth-policy parity) and T33 (server-backed login
  lockout) are queued at P1/P2. Honest "ready to run legally" estimate: feature
  surface ~100%, production/legal hardening ~4 of 33 tasks.
- **Completed most recently (T03): auth & session hardening.** Three pure,
  unit-tested modules: `passwordPolicy` (min-10 + bcrypt-72 cap + character
  variety + offline breached/common-password blocklist + email-echo rejection +
  strength score), `loginThrottle` (sliding-window failed-attempt counting with
  escalating, capped temporary lockout per normalised email), and `authAudit`
  (privacy-safe event model — `redactEmail` masks to `a***@domain`, and the event
  shape cannot carry a password/token/code/full email). A persisted
  `securityStore` wraps the throttle map + recent-activity log and mirrors each
  event, best-effort, into the new append-only `auth_audit_events` table
  (owner-read + admin-read RLS) when a backend is present. `authStore` gained
  `signOutEverywhere` (`scope:'global'`), a throttle-gated `signIn` returning
  `lockedMs`, and audit logging across sign-in/out, password change, reset
  request and demo entry; the Supabase client uses the PKCE flow. `LoginPage`
  shows a live strength meter + bilingual lockout toast; `SecurityPage` adds an
  active-sessions / sign-out-everywhere card and a recent-activity list;
  `mfaStore` logs enable/disable/recovery-regenerate. RO/EN
  `auth.pwd.*`/`auth.sessions.*`/`auth.audit.*`/`auth.lockout`. 32 new unit tests
  + one E2E. New tasks fed in: T32 server-side auth-policy parity, T33
  server-backed login lockout.
- **The autonomous loop now drives Phase 2.** `run-overnight.sh` runs the
  `make progress` one-task protocol off `BACKLOG.md` (not the finished
  FEATURES.md build). When the queue empties it does not stop: it runs an
  audit/replenish pass that measures vision coverage and writes the next wave of
  tasks, so the loop keeps raising the quality bar until a genuine stall, a
  task/time budget, or an interrupt. Trigger continuously with the script, or one
  task at a time by typing `make progress`.
- **Completed most recently (T02): 2FA / MFA (TOTP).** Account-level second
  factor built on Supabase MFA, with a fully-offline demo path. Pure `mfaLogic`
  is a self-contained RFC 6238 / RFC 4226 implementation over Web Crypto (base32
  codec, HOTP/TOTP, drift window) plus single-use recovery-code
  generation/SHA-256 hashing/consumption, the `requiresMfa` role rule, the
  `challengeNeeded` AAL state machine and `mfaErrorKey` — unit-tested against the
  published RFC vectors. `mfaStore` orchestrates both paths (Supabase MFA
  enroll/challenge/verify/unenroll live; real TOTP verification + working
  recovery codes in demo, persisted). `SecurityPage` (`/app/securitate`) does
  enroll (QR live / manual setup key demo) → 6-digit confirm → ten recovery codes
  shown once (copy/download) → regenerate / disable. `LoginPage` gained a
  post-password TOTP/recovery challenge; `AppLayout` steers privileged
  un-enrolled users to the security page in the live path (demo stays unblocked).
  Recovery codes are stored only as SHA-256 hashes (`mfa_recovery_codes`
  migration, owner-only RLS), consumed single-use. RO/EN `auth.mfa.*` locales,
  `/securitate` bot command, UserMenu link. Unit test + one E2E happy-path
  (enrol → recovery codes → challenged at next sign-in). New tasks fed into the
  queue: T29 live recovery-code login, T30 live enforcement E2E, T31 MFA
  challenge throttling.
- **Completed earlier (T01): live Supabase auth wiring.** Real email +
  password sign-up/login, email verification, and password reset on Supabase
  Auth, with the `isSupabaseConfigured` demo fallback fully intact. Pure
  `authLogic` (email/password validation, per-mode `canSubmit`, `mapAuthError`
  → stable bilingual `auth.err.*` keys; unit-tested) + `authStore` extended with
  `signUp` (email-confirmation aware), `requestPasswordReset`, `updatePassword`,
  `resendVerification`, and a `PASSWORD_RECOVERY` → `recovery` flag in `init`.
  `LoginPage` became a mode-switching form (sign in / sign up / forgot) with
  "check your email" + reset-sent confirmation panels; new `ResetPasswordPage`
  at `/reset-parola` consumes the recovery session. RO/EN locales, `.auth-link`
  style, and `.env.example` documents the Supabase Auth dashboard config (Confirm
  email ON, Site URL + `/reset-parola` redirect allow-list) and `VITE_APP_URL`.
  One E2E happy-path (mode switching + demo entry). New tasks fed into the queue:
  T27 post-auth association onboarding, T28 profile/membership hydration.
- **Completed earlier (T05): GDPR consent & legal surface.** Global
  `ConsentBanner` (Accept all / Doar esențiale / Personalizează with per-category
  switches), public bilingual `/confidentialitate`, `/termeni`, `/cookies` pages
  (`legalContent.ts`: controller-vs-processor split, lawful bases under Legea
  196/2018 + GDPR, ANSPDCP and ANPC/SOL routes), in-app `/app/confidentialitate`
  consent management with decision history, `consentLogic` + `consentGate`
  (`mayNotify` fan-out gate) unit-tested (16 tests), persisted `consentStore`,
  additive `consent_records` migration (owner RLS + admin read), legal links in
  the app footer + login, lawful-basis notes in `DECISIONS.md`, one E2E
  happy-path. New tasks fed into the queue: T21 DPA + records of processing, T22
  breach procedure, T23 minors' consent guardrails, T24 consumer-rights surface,
  T25 accessibility statement, T26 consent-gate enforcement in the fan-out.
- **Previously: F35 Informații apartament** — a read-only
  per-apartament aggregation with no table of its own, folded over the existing
  meters/tickets/polls stores. The page shows the apartment card (owner, location,
  suprafață utilă, cotă-parte indiviză as a Romanian percent, persoane), each
  meter with its latest index and full reading history (newest-first), the
  resident's tickets (matched by apartment or reporter, de-duplicated, newest
  first) with an open/resolved summary and status badges, and per-poll vote
  summaries (the chosen option label, or a "votează acum" link) with a cast/total
  count; the payments card shows a finance-module-disabled empty state. Wired
  end-to-end: `apartmentLogic` (meters/tickets/votes folding + cota-parte percent +
  short-label + open-ticket classing + option-label, unit-tested) + `ApartmentInfoPage`
  + registry toggle flipped + route `apartament-info` + `/apartament_meu` bot
  command + RO/EN locales + demo current-user/apartment constants + one E2E
  happy-path. No migration (computed view over existing tables).
- **Completed previously: F10 AGA digitală** — the formal General Assembly
  (Legea 196/2018). A comitet convokes an assembly (datetime, location or online)
  and adds agenda items; the lifecycle runs convocată → în desfășurare →
  încheiată via an advance-status button. A live **quorum tracker** shows
  represented apartments vs. the required percent, fed by each resident's **RSVP**
  (prezent / procură / absent — a proxy still represents an apartment). While an
  assembly is in progress, residents **vote per agenda item** (pentru / contra /
  abținere) with live tally bars; each item carries a **majority rule** (simplă /
  absolută / două treimi, reused from the polls engine) that, once quorum is met,
  resolves the item to adoptat / respins / în-așteptare. A concluded assembly
  offers a one-tap **proces-verbal** download (structured Romanian minutes as
  plain text — see `DECISIONS.md` for why text not a rendered PDF). Wired
  end-to-end: `agaLogic` (quorum/present/tally/percent/outcome/sort/lifecycle/PV,
  14 unit tests) + `agaStore` + `AgaPage` + registry toggle flipped + route `aga`
  + `/aga` bot command + RO/EN locales + three demo assemblies (live/upcoming/
  concluded) + additive owner-RLS migration (batch5) for resident RSVP + vote +
  one E2E happy-path (vote on a live item).
- **Previously:** Help assistant (cross-cutting, not a numbered
  feature) — a floating corner chat widget that answers "what is X / how do I X /
  where is X" using a **local, rule-based grounded matcher (no LLM, no network)**.
  It returns only pre-written, role-filtered answers from a knowledge base derived
  from the feature registry (+ a few how-to/concept entries), so it cannot
  hallucinate or leak; "no admin access" is enforced by filtering entries to the
  viewer's role (demo/unknown → resident) and only describing enabled features,
  and it is info-only. It also answers **concrete data lookups** (e.g. "numărul
  de telefon al președintelui") from user-visible sources only — emergency
  contacts (F56) and the opt-in directory (F36) through the existing
  `visibleEntry` consent mask — with prefix matching for Romanian inflections.
  Bilingual RO/EN. Files under `src/features/assistant/*` (`knowledge`/`match`/
  `visibility`/`engine`/`dataSources` + `AssistantWidget`) + `assistantStore` +
  `assistant.css`, mounted in `AppLayout`, with match + visibility + data-lookup
  unit tests (incl. a consent-masking privacy test). A **human-feel layer** (also
  fully non-generative, so still jailbreak-proof) adds small talk (`smalltalk.ts`:
  greetings/thanks/identity/capabilities), turn-seeded varied phrasing of social/
  clarify/fallback lines, typo tolerance (bounded one-edit incl. transposition),
  "la care te referi?" clarification on near-ties, and a brief typing indicator;
  factual answers stay concise. **Phase 2 (planned):** broaden live data answers
  and swap `dataSources` to Supabase under RLS.
- **Previously (F21):** Sesizări recurente — a comitet/admin view
  computed entirely over `tickets` (no table of its own). The detector groups
  recent tickets by category+location (accent/case-insensitive), surfaces any
  group that repeats ≥3 times within a 90-day window, takes the max severity,
  and suggests a course of action (severity≥high or ≥4 occurrences → structural
  fix; otherwise routine maintenance). The page shows an attention banner with
  the active-pattern count, per-pattern cards (count badge, severity, first/last
  date range, colour-coded recommendation), and a mark-known/reactivate toggle
  that floats acknowledged patterns faded to the bottom. Wired end-to-end (logic
  module + small acknowledgement Zustand store + page + registry toggle + route
  `sesizari-recurente` + `/sesizari_recurente` bot command + RO/EN locales with
  plural forms + recurring demo tickets + 11 unit tests + one E2E). Seeded
  `DEMO_TICKETS` with a recurring lift breakdown (structural) and a recurring
  stairwell light fault (maintenance) so the demo shows live patterns.
- **Previously (F49+F50):** Cod de siguranță + Plan de evacuare — the safety
  pair (`safety` + `evacuation` slices).
- **Previously (F41+F42):** Urmărire proiecte + Jurnal foto lucrări — `projects`
  + `photojournal` slices sharing the `projects` domain.
- **Previously (F64):** Activități copii și adolescenți — `kids` slice
  (privacy-preserving children registry + coordinated activities).
- **Previously (F62):** Kit de bun-venit — `welcomekit` slice (new-resident
  onboarding checklist with progress bar + comitet add/delete steps).
- **Previously (F04):** Mesagerie privată cu administratorul — `adminchat` slice
  (private resident↔admin channel, chat timeline, SLA hint, resolve/reopen).
- **Previously (F27):** Rezervare sală comună / terasă — `venue` slice on the
  F25/F26 booking pattern. Note: the working tree is clean — F21, the help
  assistant, and all earlier slices are committed (latest: `bfabf0e` help
  assistant; `83119ed` F21 + polish).
- **Pipeline:** `npm run lint`, `npm run typecheck`, `npm test` (76 files / 425
  unit tests), and `npm run build` all pass.
- **Remaining (0 of the original 65):** none — all F01–F65 are ✅.
- **Planned for the future (2, not yet specced into schema):** F66 Profil complet
  (rich full-page profile editor — photo + structured standard fields + user-added
  typed custom fields via a `+ Adaugă câmp` button) and F67 Acasă personalizabil
  (pencil-icon edit mode on the home screen to show/hide, reorder and size the
  feature cards each resident wants). These are new Category 9 entries in
  `FEATURES.md`, marked ⬜ planned.
- **Source of truth:** the **FEATURES.md** tracking table (legend: ✅ UI done ·
  🟦 schema-only) is authoritative for per-feature status — sections 2–3 below are
  historical and undercount what's shipped. Trust the table.
- **Blockers:** none. Playwright browser binaries still can't be downloaded in
  the build sandbox, so E2E specs are written/wired but executed only locally/CI.

---

## 1. Scaffolding — done

- **Build & tooling:** Vite 6 + React + TypeScript, Tailwind, ESLint (clean),
  Vitest 3 (passing). `tsc -p tsconfig.app.json` + `tsconfig.node.json --noEmit`
  type checks (deliberately avoids `tsc -b` project references).
- **App structure:** feature-sliced `src/` — `src/app`, `src/features/*`
  (admin, alerts, announcements, auth, emergency, events, home, onboarding,
  polls, profile, tickets), `src/shared/*` (components, demo, features, lib,
  locales, store, types, styles).
- **Database:** complete schema with RLS for **all 65 features' tables** in
  `supabase/migrations/` (`..._init_core`, `..._features`, `..._storage`),
  plus `supabase/seed.sql`. Full-text (GIN) search where relevant.
- **State management:** React Query for server/async state; per-feature Zustand
  stores seeded from `src/shared/demo/demoData.ts`; persisted `featureStore`
  feature-flag store (hydrated from `asociatie_features` when a backend exists).
- **Demo mode:** app detects missing Supabase creds (`isSupabaseConfigured`) and
  runs fully offline on seeded Romanian sample data — no backend needed to demo
  or E2E-test. No mock data ships in the Supabase path.
- **Telegram:** Netlify function `netlify/functions/telegram-webhook.ts` with
  secret verification + Mini App `initData` validation (both unit-tested via
  shared `telegramAuth` helpers); command/callback routing skeleton.
- **i18n:** single `translation` namespace per locale (`ro.json`, `en.json`);
  Romanian is source of truth, English covers the admin surface.
- **Security:** stored HTML routed through `sanitizeHtml` (DOMPurify, strict
  allowlist) before `dangerouslySetInnerHTML`.
- **Bundle:** `manualChunks` vendor splitting, lazy-loaded feature pages,
  tree-shaken `Icon` component. Initial route ~190 KB gzipped (< 250 KB budget).
- **Tests:** unit suite under `tests/unit/` (csv, format, inviteCode, pollLogic,
  telegramAuth, ticketLogic) runs and passes. E2E (`tests/e2e/smoke.spec.ts`)
  + `playwright.config.ts` are complete but **not executed** in the build
  sandbox (Playwright browser binaries couldn't be downloaded).
- **Cross-cutting UI:** auth/login, home feed, hubs, profile, 5-step onboarding
  wizard, apartment registry, and the admin feature-flag panel.

## 2. Features — implemented (UI end-to-end)

6 of 65 are fully interactive:

| Key | Title | What works |
|-----|-------|-----------|
| F01 | Anunțuri oficiale | Compose/publish, categories, read receipts, DOMPurify-sanitized HTML |
| F03 | Alertă de bloc (urgență) | Send flow with double-confirm bypassing quiet hours; recipient count |
| F08 | Calendar de evenimente | Upcoming list, RSVP toggle, counts |
| F09 | Vot rapid pe propuneri | Vote with confirm, live bars; quorum/majority tally logic unit-tested |
| F17 | Sesizări cu foto | Create with severity/category/location; SLA logic unit-tested; status badges |
| F56 | Numere de urgență localizate | Tap-to-call list, seeded contacts |

## 3. Features — remaining (schema + RLS + toggle only, no UI)

The other **59 features (F02, F04–F07, F10–F16, F18–F55, F57–F65)** each have
their database table(s) with RLS and appear in the admin toggles and navigation,
but opening one shows a clear "registered, page not in this build" state (no fake
data). See the tracking table in `FEATURES.md` (legend: ✅ UI done · 🟦 schema-only).

Notable clusters still to build:
- **Communication:** F02 discuții moderate, F04 mesagerie privată admin, F05
  mesaj anonim, F06 anunțuri vecini, F07 FAQ
- **Governance/voting:** F10 AGA digitală (Legea 196/2018 compliance, PV PDF),
  F11 procese verbale, F12 buget participativ, F13–F16
- **Maintenance:** F18 istoric reparații, F19 service programat, F20 citire
  contoare, F21 recurente, F22 RFP, F23 gardă, F24 împrumut
- **Shared spaces:** F25–F32 (rezervări, parcare, biciclete, boxe, curier)
- **Records:** F33–F40 (documente, furnizori, wiki, glosar, directories)
- **Projects:** F41–F48 (tracker, foto, contractori, crowdfunding, plan multianual)
- **Safety/compliance:** F49–F55 (coduri siguranță, evacuare, PSI, asigurare, chei)
- **Community:** F57–F65 (marketplace, carpool, sitting, barter, group buys,
  welcome kit, aniversări, copii, feedback)
- **Computed (no UI yet):** F46 fond reparații calculator helper

## 4. What to do next

1. **Run E2E once locally/in CI** — install Playwright browsers (blocked in the
   build sandbox) and execute `tests/e2e/` against demo mode to lock the baseline.
2. **Provision Supabase** — apply the three migrations + `seed.sql`, set creds so
   `isSupabaseConfigured` flips the app off demo mode, and smoke-test that the 6
   live features read/write against real tables and RLS.
3. **Wire the Telegram webhook** — deploy the Netlify function, register the bot
   webhook + Mini App, and verify `initData`/secret validation end-to-end.
4. **Build out the remaining feature**, reusing the established pattern
   (logic module → Zustand demo store seeded from `demoData.ts` → feature page →
   `registry.ts` toggle flipped to `implemented` → route → `/command` bot help →
   RO/EN locales → unit test → one E2E happy-path).
   - **F10 AGA digitală** — carries Legea 196/2018 compliance + PV PDF
     generation weight; implement it alone in its own session.
   - *(Done: F41 Project tracker + F42 Project photo journal — `projects` +
     `photojournal` slices. F49 Cod de siguranță + F50 Plan de evacuare —
     `safety` + `evacuation` slices. F21 Sesizări recurente — `recurring`
     slice, computed over `tickets`.)*
5. **Fill the last computed view** (F35 apartament info over
   apartments/readings/tickets/votes) — a read-only aggregation, no new table.
   *(Done: F21 recurring-ticket detection over `tickets`.)*

---
*Generated 2026-05-21 from `DECISIONS.md` and `FEATURES.md`.*
