import Papa from 'papaparse';
import type { Locale, Membership } from '@/shared/types/domain';
import type {
  AnonymousMessage,
  Bike,
  BirthdayConsent,
  CarpoolProfile,
  DirectoryEntry,
  DiscussionThread,
  Idea,
  KidsAgeRange,
  KidsEvent,
  LaundryBooking,
  LendingItem,
  MarketplaceListing,
  MovingBooking,
  Pet,
  Petition,
  PlatformFeedback,
  PrivateThread,
  SitterProfile,
  SkillOffering,
  ThankYou,
  Ticket,
  VenueBooking,
  VisitorReport,
} from '@/shared/types/domain';
import type { ConsentRecord } from '@/features/legal/consentLogic';
import type { AuthAuditEvent } from '@/features/auth/authAudit';

/**
 * GDPR data-subject rights (T06).
 *
 * Pure model for the two rights a resident can exercise under the GDPR:
 *  - access / portability (art. 15 + 20): a machine-readable copy of all the
 *    personal data the platform holds about them, as JSON and CSV;
 *  - erasure (art. 17, "right to be forgotten"): deletion of their account,
 *    with anonymization of the records the association must retain for a legal
 *    or integrity reason (vote validity, accounting) so erasure cannot rewrite
 *    history or destroy evidence it is obliged to keep.
 *
 * Everything here is deterministic and backend-free so it runs in demo mode and
 * is fully unit-testable; the store wires it to the persisted request queue and
 * mirrors requests to `data_subject_requests` when a backend is present.
 */

/* --------------------------------- export --------------------------------- */

/** One labelled group of the subject's personal data (a CSV-able table). */
export interface ExportSection {
  /** Stable key, also the i18n label key under `gdpr.section.*`. */
  key: string;
  rows: Record<string, unknown>[];
}

/** The full portable copy of a resident's personal data. */
export interface DataSubjectExport {
  /** ISO timestamp the copy was generated. */
  generatedAt: string;
  subject: { userId: string; name: string; asociatii: string[] };
  sections: ExportSection[];
}

/**
 * Every store that may hold rows attributable to one resident. The arrays are
 * passed in by the page (so this stays pure and backend-free); each section's
 * `select` filters to the rows that genuinely belong to the subject. New
 * personal-data features must be added here, which makes them part of the
 * export, the erasure plan and the retention policy at once (see SUBJECT_SECTIONS).
 */
export interface CollectInput {
  userId: string;
  name: string;
  email: string | null;
  /** Apartment label (e.g. "Ap. 4") keyed by asociatie_id. Absent key means unknown. */
  apartments: Record<string, string | null>;
  /** Display name keyed by asociatie_id, for every asociație the subject belongs to. */
  asociatiiNames: Record<string, string>;
  tickets: Ticket[];
  marketplace: MarketplaceListing[];
  ideas: Idea[];
  discussionThreads: DiscussionThread[];
  adminChatThreads: PrivateThread[];
  anonymousMessages: AnonymousMessage[];
  petitions: Petition[];
  thankYous: ThankYou[];
  directory: DirectoryEntry[];
  birthdays: BirthdayConsent[];
  carpool: CarpoolProfile[];
  sitters: SitterProfile[];
  barter: SkillOffering[];
  pets: Pet[];
  bikes: Bike[];
  lending: LendingItem[];
  feedback: PlatformFeedback[];
  kidsRanges: KidsAgeRange[];
  kidsEvents: KidsEvent[];
  laundryBookings: LaundryBooking[];
  movingBookings: MovingBooking[];
  venueBookings: VenueBooking[];
  visitorReports: VisitorReport[];
  consentHistory: ConsentRecord[];
  securityEvents: AuthAuditEvent[];
  now?: Date;
}

/**
 * The single source of truth for personal-data sections. Each entry declares,
 * in one place, how to pull the subject's rows for the export (`select`), what
 * happens to that category on erasure (`action` + `reasonKey`) and how long it
 * is retained (`periodKey` + `basisKey`). The export sections, the erasure plan
 * and the retention policy are all derived from this array, so a personal-data
 * feature added here can never silently fall outside any of the three.
 */
interface SectionSpec {
  /** Stable key; also the i18n label key under `gdpr.section.*`. */
  key: string;
  action: ErasureAction;
  /** i18n key for the erasure rationale (`gdpr.reason.*`). */
  reasonKey: string;
  /** i18n key for the retention period (`gdpr.retain.*`). */
  periodKey: string;
  /** i18n key for the lawful basis (`gdpr.basis.*`). */
  basisKey: string;
  /** The subject's rows for this section, pulled from the full input. */
  select: (input: CollectInput, userId: string) => Record<string, unknown>[];
}

const SUBJECT_SECTIONS: SectionSpec[] = [
  {
    key: 'profile',
    action: 'delete',
    reasonKey: 'gdpr.reason.profile',
    periodKey: 'gdpr.retain.account',
    basisKey: 'gdpr.basis.contract',
    select: (input, userId) =>
      Object.entries(input.asociatiiNames).map(([id, asocName]) => ({
        user_id: userId,
        name: input.name,
        email: input.email ?? '',
        apartment: input.apartments[id] ?? '',
        asociatie: asocName,
      })),
  },
  {
    key: 'tickets',
    action: 'anonymize',
    reasonKey: 'gdpr.reason.tickets',
    periodKey: 'gdpr.retain.tickets',
    basisKey: 'gdpr.basis.legitimate',
    select: (input, userId) =>
      input.tickets
        .filter((t) => t.reporter_user_id === userId)
        .map((t) => ({
          id: t.id,
          asociatie: input.asociatiiNames[t.asociatie_id] ?? t.asociatie_id,
          title: t.title,
          description: t.description,
          category: t.category,
          severity: t.severity,
          status: t.status,
          created_at: t.created_at,
        })),
  },
  {
    key: 'marketplace',
    action: 'delete',
    reasonKey: 'gdpr.reason.marketplace',
    periodKey: 'gdpr.retain.account',
    basisKey: 'gdpr.basis.consent',
    select: (input, userId) =>
      input.marketplace
        .filter((m) => m.seller_user_id === userId)
        .map((m) => ({
          id: m.id,
          title: m.title,
          description: m.description,
          category: m.category,
          price: m.price ?? '',
          created_at: m.created_at,
        })),
  },
  {
    key: 'ideas',
    action: 'anonymize',
    reasonKey: 'gdpr.reason.ideas',
    periodKey: 'gdpr.retain.community',
    basisKey: 'gdpr.basis.legitimate',
    select: (input, userId) =>
      input.ideas
        .filter((i) => i.author_user_id === userId)
        .map((i) => ({
          id: i.id,
          title: i.title,
          body: i.body,
          status: i.status,
          votes: i.votes,
          created_at: i.created_at,
        })),
  },
  {
    key: 'discussions',
    action: 'anonymize',
    reasonKey: 'gdpr.reason.messages',
    periodKey: 'gdpr.retain.community',
    basisKey: 'gdpr.basis.legitimate',
    select: (input, userId) =>
      input.discussionThreads.flatMap((th) =>
        th.messages
          .filter((m) => m.author_user_id === userId)
          .map((m) => ({
            asociatie: input.asociatiiNames[th.asociatie_id] ?? th.asociatie_id,
            thread: th.title,
            message_id: m.id,
            body: m.body,
            created_at: m.created_at,
          })),
      ),
  },
  {
    key: 'adminchat',
    action: 'anonymize',
    reasonKey: 'gdpr.reason.messages',
    periodKey: 'gdpr.retain.account',
    basisKey: 'gdpr.basis.legitimate',
    select: (input, userId) =>
      input.adminChatThreads
        .filter((th) => th.resident_user_id === userId)
        .flatMap((th) =>
          th.messages
            .filter((m) => m.sender === 'resident')
            .map((m) => ({
              asociatie: input.asociatiiNames[th.asociatie_id] ?? th.asociatie_id,
              subject: th.subject,
              message_id: m.id,
              body: m.body,
              created_at: m.created_at,
            })),
        ),
  },
  {
    key: 'anonymous',
    action: 'anonymize',
    reasonKey: 'gdpr.reason.messages',
    periodKey: 'gdpr.retain.account',
    basisKey: 'gdpr.basis.legitimate',
    select: (input, userId) =>
      input.anonymousMessages
        .filter((m) => m.sender_user_id === userId)
        .map((m) => ({
          id: m.id,
          body: m.body,
          status: m.status,
          created_at: m.created_at,
        })),
  },
  {
    key: 'petitions',
    action: 'anonymize',
    reasonKey: 'gdpr.reason.petitions',
    periodKey: 'gdpr.retain.community',
    basisKey: 'gdpr.basis.legitimate',
    select: (input, userId) =>
      input.petitions
        .filter((p) => p.author_user_id === userId)
        .map((p) => ({
          id: p.id,
          title: p.title,
          body: p.body,
          status: p.status,
          created_at: p.created_at,
        })),
  },
  {
    key: 'thankyous',
    action: 'delete',
    reasonKey: 'gdpr.reason.listings',
    periodKey: 'gdpr.retain.account',
    basisKey: 'gdpr.basis.consent',
    select: (input, userId) =>
      input.thankYous
        .filter((tt) => tt.from_user_id === userId)
        .map((tt) => ({
          id: tt.id,
          to_apartment: tt.to_apartment,
          message: tt.message,
          created_at: tt.created_at,
        })),
  },
  {
    key: 'directory',
    action: 'delete',
    reasonKey: 'gdpr.reason.listings',
    periodKey: 'gdpr.retain.account',
    basisKey: 'gdpr.basis.consent',
    select: (input, userId) =>
      input.directory
        .filter((d) => d.user_id === userId)
        .map((d) => ({
          id: d.id,
          name: d.name,
          apartment: d.apartment,
          phone: d.phone,
          email: d.email,
          show_name: d.show_name,
          show_apartment: d.show_apartment,
          show_phone: d.show_phone,
          show_email: d.show_email,
        })),
  },
  {
    key: 'birthdays',
    action: 'delete',
    reasonKey: 'gdpr.reason.listings',
    periodKey: 'gdpr.retain.account',
    basisKey: 'gdpr.basis.consent',
    select: (input, userId) =>
      input.birthdays
        .filter((b) => b.user_id === userId)
        .map((b) => ({ id: b.id, birth_day: b.birth_day, birth_month: b.birth_month })),
  },
  {
    key: 'carpool',
    action: 'delete',
    reasonKey: 'gdpr.reason.listings',
    periodKey: 'gdpr.retain.account',
    basisKey: 'gdpr.basis.consent',
    select: (input, userId) =>
      input.carpool
        .filter((c) => c.user_id === userId)
        .map((c) => ({ id: c.id, destination: c.destination, schedule: c.schedule })),
  },
  {
    key: 'sitters',
    action: 'delete',
    reasonKey: 'gdpr.reason.listings',
    periodKey: 'gdpr.retain.account',
    basisKey: 'gdpr.basis.consent',
    select: (input, userId) =>
      input.sitters
        .filter((s) => s.user_id === userId)
        .map((s) => ({ id: s.id, kind: s.kind, availability: s.availability, rate: s.rate })),
  },
  {
    key: 'barter',
    action: 'delete',
    reasonKey: 'gdpr.reason.listings',
    periodKey: 'gdpr.retain.account',
    basisKey: 'gdpr.basis.consent',
    select: (input, userId) =>
      input.barter
        .filter((o) => o.user_id === userId)
        .map((o) => ({ id: o.id, offers: o.offers, needs: o.needs })),
  },
  {
    key: 'pets',
    action: 'delete',
    reasonKey: 'gdpr.reason.listings',
    periodKey: 'gdpr.retain.account',
    basisKey: 'gdpr.basis.consent',
    select: (input, userId) =>
      input.pets
        .filter((p) => p.owner_user_id === userId)
        .map((p) => ({
          id: p.id,
          name: p.name,
          species: p.species,
          emergency_contact: p.emergency_contact ?? '',
          created_at: p.created_at,
        })),
  },
  {
    key: 'bikes',
    action: 'delete',
    reasonKey: 'gdpr.reason.listings',
    periodKey: 'gdpr.retain.account',
    basisKey: 'gdpr.basis.consent',
    select: (input, userId) =>
      input.bikes
        .filter((b) => b.owner_user_id === userId)
        .map((b) => ({
          id: b.id,
          description: b.description,
          serial: b.serial ?? '',
          created_at: b.created_at,
        })),
  },
  {
    key: 'lending',
    action: 'delete',
    reasonKey: 'gdpr.reason.listings',
    periodKey: 'gdpr.retain.account',
    basisKey: 'gdpr.basis.consent',
    select: (input, userId) =>
      input.lending
        .filter((it) => it.owner_user_id === userId)
        .map((it) => ({
          id: it.id,
          name: it.name,
          category: it.category,
          available: it.available,
          created_at: it.created_at,
        })),
  },
  {
    key: 'feedback',
    action: 'delete',
    reasonKey: 'gdpr.reason.listings',
    periodKey: 'gdpr.retain.account',
    basisKey: 'gdpr.basis.consent',
    select: (input, userId) =>
      input.feedback
        .filter((f) => !f.anonymous && f.user_id === userId)
        .map((f) => ({ id: f.id, body: f.body, sentiment: f.sentiment, created_at: f.created_at })),
  },
  {
    key: 'kids',
    action: 'delete',
    reasonKey: 'gdpr.reason.listings',
    periodKey: 'gdpr.retain.account',
    basisKey: 'gdpr.basis.consent',
    select: (input, userId) =>
      input.kidsRanges
        .filter((r) => r.user_id === userId)
        .map((r) => ({ id: r.id, bucket: r.bucket, count: r.count })),
  },
  {
    key: 'kidsEvents',
    action: 'delete',
    reasonKey: 'gdpr.reason.listings',
    periodKey: 'gdpr.retain.account',
    basisKey: 'gdpr.basis.consent',
    select: (input, userId) =>
      input.kidsEvents
        .filter((e) => e.organizer_user_id === userId)
        .map((e) => ({
          id: e.id,
          title: e.title,
          date: e.date,
          time: e.time,
          location: e.location,
          created_at: e.created_at,
        })),
  },
  {
    key: 'laundry',
    action: 'delete',
    reasonKey: 'gdpr.reason.bookings',
    periodKey: 'gdpr.retain.bookings',
    basisKey: 'gdpr.basis.legitimate',
    select: (input, userId) =>
      input.laundryBookings
        .filter((b) => b.user_id === userId)
        .map((b) => ({ id: b.id, resource: b.resource, date: b.date, slot: b.slot })),
  },
  {
    key: 'moving',
    action: 'delete',
    reasonKey: 'gdpr.reason.bookings',
    periodKey: 'gdpr.retain.bookings',
    basisKey: 'gdpr.basis.legitimate',
    select: (input, userId) =>
      input.movingBookings
        .filter((b) => b.user_id === userId)
        .map((b) => ({ id: b.id, date: b.date, slot: b.slot, floor: b.floor })),
  },
  {
    key: 'venue',
    action: 'delete',
    reasonKey: 'gdpr.reason.bookings',
    periodKey: 'gdpr.retain.bookings',
    basisKey: 'gdpr.basis.legitimate',
    select: (input, userId) =>
      input.venueBookings
        .filter((b) => b.user_id === userId)
        .map((b) => ({ id: b.id, venue: b.venue, date: b.date, slot: b.slot, purpose: b.purpose })),
  },
  {
    key: 'visitors',
    action: 'anonymize',
    reasonKey: 'gdpr.reason.reports',
    periodKey: 'gdpr.retain.tickets',
    basisKey: 'gdpr.basis.legitimate',
    select: (input, userId) =>
      input.visitorReports
        .filter((r) => r.reporter_user_id === userId)
        .map((r) => ({ id: r.id, note: r.note, status: r.status, created_at: r.created_at })),
  },
  {
    key: 'consent',
    action: 'retain',
    reasonKey: 'gdpr.reason.consent',
    periodKey: 'gdpr.retain.consent',
    basisKey: 'gdpr.basis.obligation',
    select: (input) =>
      input.consentHistory.map((c) => ({
        decided_at: c.decidedAt,
        version: c.version,
        necessary: c.choices.necessary,
        preferences: c.choices.preferences,
        analytics: c.choices.analytics,
        marketing: c.choices.marketing,
      })),
  },
  {
    key: 'security',
    action: 'retain',
    reasonKey: 'gdpr.reason.security',
    periodKey: 'gdpr.retain.security',
    basisKey: 'gdpr.basis.security',
    select: (input) =>
      input.securityEvents.map((e) => ({
        event: e.type,
        email_mask: e.emailMask ?? '',
        at: e.at,
      })),
  },
];

/** All export section keys, in display order (also the `gdpr.section.*` keys). */
export const EXPORT_SECTION_KEYS: string[] = SUBJECT_SECTIONS.map((s) => s.key);

/**
 * The set of asociație ids whose per-asociație stores may hold the subject's
 * rows: every asociație they are a member of, plus the active asociație as a
 * defensive fallback (normally already in the membership list). Deduped, active
 * asociație first so the export is ordered predictably. Used to gather the
 * per-asociație tickets + discussions across all the subject's memberships (T77),
 * so the art. 15 access right is membership-complete rather than active-only
 * (the flat stores already span every asociație; only tickets and discussions
 * are keyed by asociație). Pure, so it stays unit-testable.
 */
export function subjectAsociatieIds(
  memberships: Membership[],
  currentAsociatieId: string | null,
): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  const push = (id: string | null) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  };
  push(currentAsociatieId);
  for (const m of memberships) push(m.asociatie_id);
  return ids;
}

/**
 * Assemble every piece of personal data the platform holds about one resident,
 * filtered to rows that are genuinely theirs (authored/reported by them).
 */
export function collectPersonalData(input: CollectInput): DataSubjectExport {
  const { userId } = input;
  const now = input.now ?? new Date();

  const sections: ExportSection[] = SUBJECT_SECTIONS.map((spec) => ({
    key: spec.key,
    rows: spec.select(input, userId),
  }));

  return {
    generatedAt: now.toISOString(),
    subject: { userId, name: input.name, asociatii: Object.values(input.asociatiiNames) },
    sections,
  };
}

/** Serialize the export as pretty-printed JSON (art. 20 machine-readable copy). */
export function toExportJson(exp: DataSubjectExport): string {
  return JSON.stringify(exp, null, 2);
}

/**
 * Serialize the export as a single CSV document, one block per section. Empty
 * sections are emitted with just their header line so the recipient can see the
 * platform holds nothing of that kind, rather than the block being absent.
 */
export function toExportCsv(exp: DataSubjectExport): string {
  const blocks: string[] = [
    `# vecini.online — export date personale / personal data export`,
    `# ${exp.subject.name} · ${exp.subject.asociatii.join(', ')} · ${exp.generatedAt}`,
    '',
  ];
  for (const section of exp.sections) {
    blocks.push(`# ${section.key}`);
    blocks.push(section.rows.length ? Papa.unparse(section.rows) : '(none)');
    blocks.push('');
  }
  return blocks.join('\n');
}

/* --------------------------------- erasure -------------------------------- */

export type ErasureAction = 'delete' | 'anonymize' | 'retain';

/** What happens to one data category when a resident's account is erased. */
export interface ErasureRule {
  /** Section key this rule covers (matches an `ExportSection.key`). */
  category: string;
  action: ErasureAction;
  /** i18n key for the legal rationale shown to the resident. */
  reasonKey: string;
}

/**
 * Categories the resident contributed to but does not hold as exportable rows
 * of their own (votes are scoped by apartment, financial records by ledger), so
 * they have no export section but are still part of the erasure + retention
 * story: both are retained because their integrity / legal basis requires it.
 */
const RETAINED_ONLY: { category: string; reasonKey: string; periodKey: string; basisKey: string }[] = [
  { category: 'votes', reasonKey: 'gdpr.reason.votes', periodKey: 'gdpr.retain.votes', basisKey: 'gdpr.basis.legal' },
  { category: 'financial', reasonKey: 'gdpr.reason.financial', periodKey: 'gdpr.retain.financial', basisKey: 'gdpr.basis.legal' },
];

/**
 * The erasure plan, derived from {@link SUBJECT_SECTIONS} plus the retain-only
 * categories: free-text contributions and contact data are deleted, but records
 * whose integrity or legal retention the association depends on are kept with
 * the resident's identity stripped (anonymize) or kept intact (retain). Derived
 * so every export section automatically has a documented erasure outcome.
 */
export const ERASURE_PLAN: ErasureRule[] = [
  ...SUBJECT_SECTIONS.map((s) => ({ category: s.key, action: s.action, reasonKey: s.reasonKey })),
  ...RETAINED_ONLY.map((r) => ({ category: r.category, action: 'retain' as const, reasonKey: r.reasonKey })),
];

/** Placeholder identity that replaces an erased resident on retained records. */
export const ANONYMIZED_NAME: Record<Locale, string> = {
  ro: 'Rezident anonimizat',
  en: 'Anonymized resident',
};

export function anonymizeName(locale: Locale): string {
  return ANONYMIZED_NAME[locale] ?? ANONYMIZED_NAME.ro;
}

/**
 * Extract non-null photo_path values from a list of rows.
 * Used by the server-side erasure routine to collect Storage objects that must
 * be deleted when a resident's photos are erased.
 */
export function extractPhotoPaths(
  rows: Array<{ photo_path?: string | null }>,
): string[] {
  return rows.flatMap((r) => (r.photo_path ? [r.photo_path] : []));
}

/* ------------------------------ retention --------------------------------- */

/** Documented retention period + lawful basis for a data category. */
export interface RetentionRule {
  category: string;
  /** i18n key for the human retention period (e.g. "until account deletion"). */
  periodKey: string;
  /** i18n key for the lawful basis / obligation. */
  basisKey: string;
}

/**
 * Retention period + lawful basis per category, derived from
 * {@link SUBJECT_SECTIONS} plus the retain-only categories, so every export
 * section documents how long the platform keeps that data and why.
 */
export const RETENTION_POLICY: RetentionRule[] = [
  ...SUBJECT_SECTIONS.map((s) => ({ category: s.key, periodKey: s.periodKey, basisKey: s.basisKey })),
  ...RETAINED_ONLY.map((r) => ({ category: r.category, periodKey: r.periodKey, basisKey: r.basisKey })),
];

/* ----------------------------- request model ------------------------------ */

export type DsrType = 'export' | 'erasure';
export type DsrStatus = 'pending' | 'completed' | 'rejected';

/**
 * A data-subject request. `export` is self-service (the resident downloads
 * immediately), but the request is still logged so the association has an
 * accountability trail; `erasure` requires an admin to action it because it is
 * irreversible and may require manual checks (e.g. outstanding debts).
 */
export interface DataSubjectRequest {
  id: string;
  asociatie_id: string;
  subject_user_id: string;
  subject_name: string;
  type: DsrType;
  status: DsrStatus;
  requested_at: string;
  actioned_at: string | null;
  /** Display name of the admin who actioned it (never extra PII). */
  actioned_by: string | null;
  note: string | null;
}

function newId(now: Date): string {
  return `dsr-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makeRequest(
  type: DsrType,
  subjectUserId: string,
  subjectName: string,
  asociatieId: string,
  now: Date = new Date(),
): DataSubjectRequest {
  return {
    id: newId(now),
    asociatie_id: asociatieId,
    subject_user_id: subjectUserId,
    subject_name: subjectName,
    type,
    status: 'pending',
    requested_at: now.toISOString(),
    actioned_at: null,
    actioned_by: null,
    note: null,
  };
}

/** Apply an admin decision to a pending request (no-op if already actioned). */
export function actionRequest(
  req: DataSubjectRequest,
  status: Extract<DsrStatus, 'completed' | 'rejected'>,
  actor: string,
  note: string | null = null,
  now: Date = new Date(),
): DataSubjectRequest {
  if (req.status !== 'pending') return req;
  return { ...req, status, actioned_by: actor, actioned_at: now.toISOString(), note };
}

export function isPending(req: DataSubjectRequest): boolean {
  return req.status === 'pending';
}

export function pendingCount(reqs: DataSubjectRequest[]): number {
  return reqs.filter(isPending).length;
}

/** Whether the resident already has an open request of this type (avoid dupes). */
export function hasOpenRequest(
  reqs: DataSubjectRequest[],
  userId: string,
  type: DsrType,
): boolean {
  return reqs.some((r) => r.subject_user_id === userId && r.type === type && isPending(r));
}

/** Pending first, then most recently requested. Does not mutate the input. */
export function sortRequests(reqs: DataSubjectRequest[]): DataSubjectRequest[] {
  return [...reqs].sort((a, b) => {
    if (isPending(a) !== isPending(b)) return isPending(a) ? -1 : 1;
    return new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime();
  });
}
