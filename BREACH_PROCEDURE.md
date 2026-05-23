# Personal data breach procedure (GDPR art. 33 & 34)

This document is the reference procedure the asociație (the **data controller**)
follows when a personal data breach is suspected or confirmed. It is the
human-readable counterpart of the model in
`src/features/gdpr/breachLogic.ts` and `src/features/gdpr/breachContent.ts`,
which drive the in-app admin surface (`/app/admin/incidente-date`). Keep the two
in sync: the code is authoritative for what the app generates, this document for
the rationale.

The asociație is the **data controller**; vecini.online is the **processor**
(see `SECURITY.md`, `DATA_RETENTION.md` and the DPA in
`src/features/legal/dpaContent.ts`). The processor must notify the controller
without undue delay after becoming aware of a breach; the controller then runs
the procedure below.

## When the 72-hour clock starts

A "personal data breach" is a breach of security leading to the accidental or
unlawful destruction, loss, alteration, unauthorised disclosure of, or access
to, personal data (art. 4(12)). The 72-hour clock for notifying the supervisory
authority starts the moment the **controller becomes aware** of the breach, not
when it occurred.

## The procedure

1. **Detect and contain.** Record the breach in the app as soon as it is
   suspected (what happened, when you became aware, which data may be involved).
   Take immediate containment measures (revoke access, reset credentials,
   restore from backup).
2. **Assess the risk.** Classify the risk to residents from the data involved,
   its sensitivity and volume, and whether individuals can be readily
   identified. If the data was unintelligible (e.g. encrypted) the risk may be
   neutralised (art. 34(3)(a)). The app suggests a risk level from these factors:
   - `low` — unlikely to result in a risk; no notification required, but the
     breach is still logged.
   - `risk` — likely to result in a risk; notify the supervisory authority.
   - `high` — likely to result in a high risk; notify the authority **and** the
     affected residents.
3. **Notify the authority (within 72 hours).** Unless the breach is unlikely to
   result in a risk, notify the **ANSPDCP** (Autoritatea Națională de
   Supraveghere a Prelucrării Datelor cu Caracter Personal) within 72 hours of
   becoming aware, using the generated art. 33 notification. The notification
   contains: the nature of the breach and the categories and approximate number
   of data subjects and records concerned (art. 33(3)(a)); the contact point
   (art. 33(3)(b)); the likely consequences (art. 33(3)(c)); and the measures
   taken or proposed (art. 33(3)(d)). If you cannot notify within 72 hours, the
   notification must state the reasons for the delay (art. 33(1)).
4. **Inform the residents (high risk).** Where the breach is likely to result in
   a high risk to residents, inform them without undue delay using the generated
   art. 34 notice, in clear and plain language (art. 34(2)). Communication to
   residents is not required where art. 34(3) applies (data rendered
   unintelligible, subsequent measures make the high risk no longer likely, or it
   would involve disproportionate effort — in which case a public communication
   is used instead).
5. **Document everything.** Every breach is logged in the app, including those
   that did not require notification, so the association can demonstrate
   compliance (art. 33(5)). The breach log is **append-only** (the
   `data_breaches` table has no delete policy) so the accountability trail stays
   tamper-evident.

## What the platform provides

- **Recording + risk classification** of each breach, scoped per asociație and
  visible only to the controller roles (admin / president), enforced by RLS on
  `data_breaches`.
- **Generated notifications**: the art. 33 ANSPDCP notification and the art. 34
  resident notice, as signature/submission-ready bilingual plain text.
- **The 72-hour deadline** is computed from when the controller became aware, and
  the log flags each record as on-time, due-soon (final 24 h) or overdue.
- **An append-only log** that is the documentation required by art. 33(5).

The platform records and prepares the notifications; **submitting** the art. 33
notification to the ANSPDCP and **delivering** the art. 34 notice to residents
remain the controller's responsibility. Live in-app delivery of the resident
notice through the notification fan-out is a follow-up that lands with the email
channel (BACKLOG T76 / T14).

## Where this is implemented

- Logic: `src/features/gdpr/breachLogic.ts` (risk, deadline, lifecycle, model).
- Notification + procedure content: `src/features/gdpr/breachContent.ts`.
- Store: `src/shared/store/breachStore.ts` (append-only, mirrors to
  `data_breaches` when a backend is present).
- Admin surface: `src/features/gdpr/BreachAdminPage.tsx`
  (`/app/admin/incidente-date`).
- Schema + RLS: `supabase/migrations/20260522000019_data_breaches.sql`.
