import Papa from 'papaparse';
import type { Locale } from '@/shared/types/domain';
import type { Idea, MarketplaceListing, Ticket } from '@/shared/types/domain';
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
  subject: { userId: string; name: string; asociatie: string };
  sections: ExportSection[];
}

export interface CollectInput {
  userId: string;
  name: string;
  email: string | null;
  apartment: string | null;
  asociatieName: string;
  tickets: Ticket[];
  marketplace: MarketplaceListing[];
  ideas: Idea[];
  consentHistory: ConsentRecord[];
  securityEvents: AuthAuditEvent[];
  now?: Date;
}

/**
 * Assemble every piece of personal data the platform holds about one resident,
 * filtered to rows that are genuinely theirs (authored/reported by them).
 */
export function collectPersonalData(input: CollectInput): DataSubjectExport {
  const { userId } = input;
  const now = input.now ?? new Date();

  const sections: ExportSection[] = [
    {
      key: 'profile',
      rows: [
        {
          user_id: userId,
          name: input.name,
          email: input.email ?? '',
          apartment: input.apartment ?? '',
          asociatie: input.asociatieName,
        },
      ],
    },
    {
      key: 'tickets',
      rows: input.tickets
        .filter((t) => t.reporter_user_id === userId)
        .map((t) => ({
          id: t.id,
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
      rows: input.marketplace
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
      rows: input.ideas
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
      key: 'consent',
      rows: input.consentHistory.map((c) => ({
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
      rows: input.securityEvents.map((e) => ({
        event: e.type,
        email_mask: e.emailMask ?? '',
        at: e.at,
      })),
    },
  ];

  return {
    generatedAt: now.toISOString(),
    subject: { userId, name: input.name, asociatie: input.asociatieName },
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
    `# ${exp.subject.name} · ${exp.subject.asociatie} · ${exp.generatedAt}`,
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
 * The erasure plan: free-text contributions and contact data are deleted, but
 * records whose integrity or legal retention the association depends on are
 * kept with the resident's identity stripped (anonymize) or kept intact where
 * the law requires it (retain).
 */
export const ERASURE_PLAN: ErasureRule[] = [
  { category: 'profile', action: 'delete', reasonKey: 'gdpr.reason.profile' },
  { category: 'marketplace', action: 'delete', reasonKey: 'gdpr.reason.marketplace' },
  { category: 'tickets', action: 'anonymize', reasonKey: 'gdpr.reason.tickets' },
  { category: 'ideas', action: 'anonymize', reasonKey: 'gdpr.reason.ideas' },
  { category: 'votes', action: 'retain', reasonKey: 'gdpr.reason.votes' },
  { category: 'financial', action: 'retain', reasonKey: 'gdpr.reason.financial' },
  { category: 'consent', action: 'retain', reasonKey: 'gdpr.reason.consent' },
  { category: 'security', action: 'retain', reasonKey: 'gdpr.reason.security' },
];

/** Placeholder identity that replaces an erased resident on retained records. */
export const ANONYMIZED_NAME: Record<Locale, string> = {
  ro: 'Rezident anonimizat',
  en: 'Anonymized resident',
};

export function anonymizeName(locale: Locale): string {
  return ANONYMIZED_NAME[locale] ?? ANONYMIZED_NAME.ro;
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

export const RETENTION_POLICY: RetentionRule[] = [
  { category: 'profile', periodKey: 'gdpr.retain.account', basisKey: 'gdpr.basis.contract' },
  { category: 'tickets', periodKey: 'gdpr.retain.tickets', basisKey: 'gdpr.basis.legitimate' },
  { category: 'votes', periodKey: 'gdpr.retain.votes', basisKey: 'gdpr.basis.legal' },
  { category: 'financial', periodKey: 'gdpr.retain.financial', basisKey: 'gdpr.basis.legal' },
  { category: 'consent', periodKey: 'gdpr.retain.consent', basisKey: 'gdpr.basis.obligation' },
  { category: 'security', periodKey: 'gdpr.retain.security', basisKey: 'gdpr.basis.security' },
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
