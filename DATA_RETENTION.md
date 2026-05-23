# Data retention & erasure policy

This document records how long vecini.online keeps each category of personal
data, the lawful basis for keeping it, and what happens to it when a resident
exercises their GDPR right to erasure (art. 17). It is the human-readable
counterpart of the machine-readable model in
`src/features/gdpr/gdprLogic.ts` (`RETENTION_POLICY`, `ERASURE_PLAN`), which
drives the in-app surfaces (the resident's "Datele mele personale" page and the
admin request queue). Keep the two in sync: the code is authoritative for what
the app shows, this document for the rationale.

The asociație is the **data controller**; vecini.online is the **processor**
(see `SECURITY.md` and `DECISIONS.md`). Retention obligations that flow from
Romanian law (Legea 196/2018 on asociații de proprietari; accounting law) bind
the controller, so the platform retains the minimum needed to let the controller
meet them and no more.

## Retention periods

| Category | Retained for | Lawful basis |
|----------|--------------|--------------|
| Profile / contact | Until account deletion | Performance of the contract |
| Tickets (sesizări) | Until resolution + 1 year | Legitimate interest (maintenance continuity) |
| Votes / governance decisions | For the association's mandate | Legal obligation (Legea 196/2018) |
| Financial records | 10 years | Legal obligation (accounting) |
| Consent records | 3 years after withdrawal | Compliance obligation (proof of consent) |
| Security / auth audit events | 12 months | Legitimate interest (account protection) |

## Erasure plan (right to be forgotten)

When a resident's account is erased, each category is handled per its integrity
and legal-retention needs:

- **Delete** — profile / contact data, marketplace listings: removed entirely.
- **Anonymize** — tickets, ideas: the record is kept for continuity/context but
  the subject's identity is stripped and replaced with the bilingual placeholder
  (`ANONYMIZED_NAME`: "Rezident anonimizat" / "Anonymized resident"). This keeps
  history intact without keeping the person identifiable.
- **Retain** — votes, financial records, consent proof, security log: kept as-is
  because erasing them would invalidate adopted decisions, breach accounting
  law, or destroy the very proof of lawful processing.

Erasure is therefore not a blanket delete: it cannot rewrite governance history
or destroy evidence the controller is obliged to keep. The resident is shown
this plan, per category with its rationale, before they request erasure.

## Cleanup routine

The data-subject request flow has two paths:

- **Export** (art. 15 / 20) is self-service: the resident downloads a complete
  JSON or CSV copy immediately in-app. The request is still logged to
  `data_subject_requests` so the controller has an accountability trail of who
  asked and when.
- **Erasure** (art. 17) is filed as a pending request and **actioned by an
  admin / president**, because it is irreversible and may require a manual check
  (e.g. outstanding debts) before the account is anonymized. Completing it
  records the actor + time on the request row (tamper-evident: no delete policy
  exists on the table) and marks the subject id as erased.

The actual cross-store mutation (delete vs. anonymize vs. retain per the plan
above) and the **periodic cleanup of expired records** (e.g. dropping resolved
tickets past their window, purging auth-audit events older than 12 months) run
**server-side** when a backend is provisioned: a scheduled Supabase routine /
Edge Function executing the `ERASURE_PLAN` and the retention windows under the
service role. In demo / local mode the request queue and the erased-id marker
work offline (the `gdprStore`), and no destructive mutation runs because there
is no backend store to mutate. Wiring the live routine is tracked alongside the
GDPR live-activation work (see `BACKLOG.md`).

## Where this lives in code

- `src/features/gdpr/gdprLogic.ts` — `RETENTION_POLICY`, `ERASURE_PLAN`,
  `ANONYMIZED_NAME`, the export collector/serializers, and the request model.
- `src/shared/store/gdprStore.ts` — persisted request queue + erased-id marker,
  best-effort mirrored to `data_subject_requests` when a backend is present.
- `supabase/migrations/20260522000018_data_subject_requests.sql` — the request
  table with append/no-delete RLS (resident files + reads own; admin/president
  reads + actions).
- `src/features/gdpr/MyDataPage.tsx` — resident self-service surface.
- `src/features/gdpr/DsrAdminPage.tsx` — admin request queue + audit trail.
