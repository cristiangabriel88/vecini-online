import Papa from 'papaparse';

/**
 * Personal-data breach procedure (T22, GDPR art. 33/34).
 *
 * The asociație is the data controller. When a personal-data breach occurs it
 * must, art. 33, notify the supervisory authority (ANSPDCP) without undue delay
 * and, where feasible, within 72 hours of becoming aware — unless the breach is
 * unlikely to result in a risk to the rights and freedoms of natural persons.
 * Where the breach is likely to result in a *high* risk, art. 34 also requires
 * the affected residents to be informed without undue delay.
 *
 * Everything here is deterministic and backend-free so it runs in demo mode and
 * is fully unit-testable; the store wires it to the persisted breach log and
 * mirrors records to `data_breaches` when a backend is present. The log is
 * append-only (no delete policy) so it stays tamper-evident — the accountability
 * trail the controller must be able to produce on request (art. 33(5)).
 */

/* ----------------------------- risk classification ------------------------ */

export type BreachRisk = 'low' | 'risk' | 'high';

/** The three classic confidentiality / integrity / availability breach types. */
export type BreachNature = 'confidentiality' | 'integrity' | 'availability';

export const BREACH_NATURES: BreachNature[] = ['confidentiality', 'integrity', 'availability'];

/**
 * The factors that drive the severity assessment (after WP29 / EDPB guidance on
 * breach severity): sensitivity and volume of the data, whether individuals can
 * be readily identified, and whether the risk has been neutralised (e.g. the
 * data was rendered unintelligible by encryption, art. 34(3)(a)).
 */
export interface RiskFactors {
  /** Special-category, financial or otherwise sensitive personal data involved. */
  sensitiveData: boolean;
  /** A large number of data subjects / records affected. */
  largeScale: boolean;
  /** Affected individuals can be readily identified from the data. */
  identifiable: boolean;
  /** Risk neutralised — data unintelligible, or measures make high risk unlikely. */
  mitigated: boolean;
}

export const NO_RISK_FACTORS: RiskFactors = {
  sensitiveData: false,
  largeScale: false,
  identifiable: false,
  mitigated: false,
};

/**
 * Suggest a risk level from the factors. Deterministic so the UI can pre-fill a
 * classification the admin then confirms:
 *  - mitigated + non-sensitive → `low` (art. 34(3)(a) neutralisation);
 *  - sensitive data, or large-scale AND identifiable → `high` (notify subjects);
 *  - otherwise identifiable or large-scale → `risk` (notify the authority);
 *  - else `low` (e.g. anonymised data, unlikely to result in a risk).
 */
export function classifyRisk(f: RiskFactors): BreachRisk {
  if (f.mitigated && !f.sensitiveData) return 'low';
  if (f.sensitiveData || (f.largeScale && f.identifiable)) return 'high';
  if (f.identifiable || f.largeScale) return 'risk';
  return 'low';
}

/** art. 33: the authority must be notified for any breach above `low`. */
export function requiresAuthorityNotification(risk: BreachRisk): boolean {
  return risk !== 'low';
}

/** art. 34: the affected residents must be informed only on a `high` risk. */
export function requiresSubjectNotification(risk: BreachRisk): boolean {
  return risk === 'high';
}

/* ------------------------------ 72-hour deadline -------------------------- */

/** art. 33(1): notify the authority within 72 hours of becoming aware. */
export const AUTHORITY_DEADLINE_HOURS = 72;
const HOUR_MS = 60 * 60 * 1000;
/** Window before the deadline at which the UI flags the record as due soon. */
export const DUE_SOON_HOURS = 24;

/** The ISO instant 72 hours after the controller became aware of the breach. */
export function authorityDeadline(discoveredAtIso: string): string {
  return new Date(new Date(discoveredAtIso).getTime() + AUTHORITY_DEADLINE_HOURS * HOUR_MS).toISOString();
}

export type DeadlineState = 'not_required' | 'done' | 'on_time' | 'due_soon' | 'overdue';

/**
 * Where the 72-hour authority deadline stands for a record, relative to `now`:
 * not required (low risk), done (already notified), overdue, due soon (within
 * the final 24h), or on time.
 */
export function deadlineState(record: BreachRecord, now: Date = new Date()): DeadlineState {
  if (!requiresAuthorityNotification(record.risk)) return 'not_required';
  if (record.authority_notified_at) return 'done';
  const deadlineMs = new Date(authorityDeadline(record.discovered_at)).getTime();
  const remaining = deadlineMs - now.getTime();
  if (remaining <= 0) return 'overdue';
  if (remaining <= DUE_SOON_HOURS * HOUR_MS) return 'due_soon';
  return 'on_time';
}

/** Whole hours left until the deadline (negative if overdue). */
export function hoursToDeadline(record: BreachRecord, now: Date = new Date()): number {
  const deadlineMs = new Date(authorityDeadline(record.discovered_at)).getTime();
  return Math.floor((deadlineMs - now.getTime()) / HOUR_MS);
}

/* ------------------------------ status lifecycle -------------------------- */

export type BreachStatus = 'detectat' | 'evaluat' | 'notificat' | 'inchis';

export const BREACH_STATUSES: BreachStatus[] = ['detectat', 'evaluat', 'notificat', 'inchis'];

/** Forward-only lifecycle; `null` means the record is at its final state. */
const NEXT_STATUS: Record<BreachStatus, BreachStatus | null> = {
  detectat: 'evaluat',
  evaluat: 'notificat',
  notificat: 'inchis',
  inchis: null,
};

export function nextStatus(status: BreachStatus): BreachStatus | null {
  return NEXT_STATUS[status];
}

/* ------------------------------- record model ----------------------------- */

/**
 * A recorded personal-data breach. Carries only what art. 33(3) requires the
 * notification to contain plus the controller's handling trail; it never stores
 * the breached data itself, only its description and approximate scope.
 */
export interface BreachRecord {
  id: string;
  asociatie_id: string;
  /** Short title for the queue. */
  title: string;
  /** Nature of the breach, art. 33(3)(a). */
  description: string;
  nature: BreachNature[];
  /** When the controller became aware (starts the 72-hour clock). */
  discovered_at: string;
  /** When it occurred, if known. */
  occurred_at: string | null;
  /** Data categories involved (i18n keys under `breach.data.*`). */
  data_categories: string[];
  /** Approximate number of data subjects affected, art. 33(3)(a). */
  affected_count: number;
  risk: BreachRisk;
  factors: RiskFactors;
  /** Likely consequences of the breach, art. 33(3)(c). */
  consequences: string;
  /** Measures taken or proposed, art. 33(3)(d). */
  measures: string;
  status: BreachStatus;
  authority_notified_at: string | null;
  subjects_notified_at: string | null;
  /** Display name of whoever recorded it (never extra PII). */
  reported_by: string | null;
  created_at: string;
}

export interface NewBreachInput {
  title: string;
  description: string;
  nature: BreachNature[];
  discoveredAt: string;
  occurredAt?: string | null;
  dataCategories: string[];
  affectedCount: number;
  factors: RiskFactors;
  consequences: string;
  measures: string;
  /** Optional explicit risk; defaults to `classifyRisk(factors)`. */
  risk?: BreachRisk;
}

function newId(now: Date): string {
  return `brk-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Build a freshly-detected breach record owned by the asociație + reporter. */
export function newBreach(
  asociatieId: string,
  reportedBy: string | null,
  input: NewBreachInput,
  now: Date = new Date(),
): BreachRecord {
  return {
    id: newId(now),
    asociatie_id: asociatieId,
    title: input.title.trim(),
    description: input.description.trim(),
    nature: input.nature.length ? input.nature : ['confidentiality'],
    discovered_at: input.discoveredAt,
    occurred_at: input.occurredAt?.trim() ? input.occurredAt : null,
    data_categories: input.dataCategories,
    affected_count: Math.max(0, Math.round(input.affectedCount)),
    risk: input.risk ?? classifyRisk(input.factors),
    factors: input.factors,
    consequences: input.consequences.trim(),
    measures: input.measures.trim(),
    status: 'detectat',
    authority_notified_at: null,
    subjects_notified_at: null,
    reported_by: reportedBy,
    created_at: now.toISOString(),
  };
}

/** Advance the lifecycle one forward step (no-op at the final state). */
export function advanceBreach(record: BreachRecord, now: Date = new Date()): BreachRecord {
  const next = nextStatus(record.status);
  if (!next) return record;
  void now;
  return { ...record, status: next };
}

/**
 * Record that the supervisory authority has been notified (stamps the time and,
 * if still early in the lifecycle, advances at least to `notificat`).
 */
export function markAuthorityNotified(record: BreachRecord, now: Date = new Date()): BreachRecord {
  if (record.authority_notified_at) return record;
  const status: BreachStatus = record.status === 'detectat' || record.status === 'evaluat'
    ? 'notificat'
    : record.status;
  return { ...record, authority_notified_at: now.toISOString(), status };
}

/** Record that the affected residents have been informed (art. 34). */
export function markSubjectsNotified(record: BreachRecord, now: Date = new Date()): BreachRecord {
  if (record.subjects_notified_at) return record;
  return { ...record, subjects_notified_at: now.toISOString() };
}

/* --------------------------------- queries -------------------------------- */

export function isOpen(record: BreachRecord): boolean {
  return record.status !== 'inchis';
}

export function openCount(records: BreachRecord[]): number {
  return records.filter(isOpen).length;
}

/** Records still owing an authority notification (risk above low, not yet sent). */
export function awaitingAuthorityCount(records: BreachRecord[]): number {
  return records.filter((r) => requiresAuthorityNotification(r.risk) && !r.authority_notified_at).length;
}

/** Open first, then most recently discovered. Does not mutate the input. */
export function sortBreaches(records: BreachRecord[]): BreachRecord[] {
  return [...records].sort((a, b) => {
    if (isOpen(a) !== isOpen(b)) return isOpen(a) ? -1 : 1;
    return new Date(b.discovered_at).getTime() - new Date(a.discovered_at).getTime();
  });
}

/* --------------------------------- export --------------------------------- */

/** A flat row per breach for the CSV/JSON register the controller can export. */
export function breachToRow(r: BreachRecord): Record<string, unknown> {
  return {
    id: r.id,
    title: r.title,
    nature: r.nature.join('; '),
    discovered_at: r.discovered_at,
    occurred_at: r.occurred_at ?? '',
    affected_count: r.affected_count,
    risk: r.risk,
    status: r.status,
    authority_notified_at: r.authority_notified_at ?? '',
    subjects_notified_at: r.subjects_notified_at ?? '',
    authority_deadline: authorityDeadline(r.discovered_at),
  };
}

export function breachLogToCsv(records: BreachRecord[]): string {
  if (!records.length) return '(none)';
  return Papa.unparse(records.map(breachToRow));
}
