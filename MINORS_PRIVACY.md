# Minors' privacy — the rule, and how it is enforced (T23)

vecini.online is built for adult residents of an asociație de proprietari. The
platform's standing rule is simple:

> **No feature collects data that identifies a child.** Information about minors
> is processed only in aggregate — counts per age group — and never identifies an
> individual child. Any future minor-facing identifying data must be gated behind
> the consent of a parent or legal representative.

This document records the legal basis and, crucially, **how the rule is enforced
in code** so it is a guarantee, not just a statement in the privacy policy.

## Legal basis

- **GDPR (Regulation (EU) 2016/679) art. 8** — conditions for a child's consent
  in relation to information-society services.
- **Legea nr. 190/2018 art. 8** — the Romanian implementing measures for minors'
  consent.

The privacy policy states the position to residents (the "Minori" / "Children"
section in `src/features/legal/legalContent.ts`, RO + EN). This document and the
code below make it enforced.

## The only minor-facing feature today: F64 Activități copii

F64 lets the building coordinate children's activities **without ever naming a
child**. Its data model is aggregate by construction:

- **`KidsAgeRange`** (`kids_age_ranges`) — a parent's registration is
  `{ id, asociatie_id, user_id, bucket, count }`. The building can see "3 copii
  7-10 ani"; it can never see which children, or whose. No name, photo, date of
  birth, CNP, school or any other child identifier exists in the shape.
- **`KidsEvent`** (`kids_events`) — a coordinated activity carries the **adult**
  organizer (`organizer_user_id` / `organizer_name`), a target age `bucket`, and
  logistics (title, date, time, location, note). Attendance is tracked as a
  count (`interested`), never a roster of children.

The SQL schema is likewise aggregate (`age_min`/`age_max` integers, no identity
columns).

## How the rule is enforced (not just declared)

`src/shared/lib/minorsGuard.ts` codifies the rule and provides the enforcement:

1. **Runtime guard.** Every write into the F64 store
   (`src/features/kids/kidsStore.ts`) calls `assertAggregateOnly(record, allowed,
   context)`. If a record ever carries a field outside the allowlisted aggregate
   set, or a field whose name looks like a child identifier, it throws
   `MinorIdentityError` before the record can be stored.
2. **Field allowlists.** `KIDS_AGE_RANGE_FIELDS` / `KIDS_EVENT_FIELDS` are the
   exact permitted fields. Adding a field to a kids record forces a deliberate
   change here — where this rule is in view — rather than slipping an identifier
   in unnoticed.
3. **Identity-name detector.** `MINOR_IDENTITY_FIELD_PATTERNS` /
   `minorIdentityFields()` flag field names that would identify a child
   (`child_name`, `data_nasterii`, `cnp`, `școală`, `birthday`, …). This is the
   platform-wide net for any future minor-facing record that has no allowlist yet.
4. **Regression tests** (`tests/unit/minorsGuard.test.ts`) lock all of the above:
   the detector's positives/negatives, the runtime guard, a **structural lock**
   parsing `domain.ts` (the `KidsAgeRange`/`KidsEvent` types must equal the
   aggregate field sets), a **schema lock** parsing the migration (no
   child-identifying column on `kids_age_ranges`/`kids_events`), and that the
   live store + the demo seed hold no child identity. A change that introduced a
   child identifier would fail the unit suite.

## Adding a future minor-facing feature

If a new feature would touch data about minors:

- **Prefer aggregate.** If the building's need can be met with counts / age
  groups (as F64 does), keep it aggregate and add its record's allowed fields to
  `minorsGuard.ts`, calling `assertAggregateOnly` on every write.
- **If identifying data is genuinely required**, it must be processed only with
  the verifiable consent of a parent or legal representative (GDPR art. 8 /
  Legea 190/2018 art. 8), with a documented lawful basis in `DECISIONS.md`, a
  retention entry in `DATA_RETENTION.md`, and an entry in the art. 30 register
  (ROPA). Do **not** widen `MINOR_IDENTITY_FIELD_PATTERNS` to let it through
  silently — the consent path is a deliberate, reviewed addition.
