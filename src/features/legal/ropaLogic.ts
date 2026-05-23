import Papa from 'papaparse';
import { FEATURES, type FeatureCategory, type FeatureDef, type FeatureKey } from '@/shared/features/registry';

/**
 * Records of Processing Activities (GDPR art. 30) + the controller/processor
 * split that backs the Data Processing Agreement (art. 28).
 *
 * The asociație de proprietari is the **data controller** and vecini.online is
 * the **processor**. Art. 30 obliges the controller to keep a register of the
 * processing activities it runs: for each one, the purpose, the categories of
 * data subjects and personal data, the recipients, the retention period and the
 * lawful basis. This module **generates that register from the feature/data
 * model** so it always reflects the modules the asociație actually has enabled,
 * rather than being a hand-maintained document that drifts out of date.
 *
 * Everything here is pure and backend-free so it runs in demo mode and is fully
 * unit-testable. The page resolves the i18n keys and offers JSON/CSV export so
 * the admin can produce the register on request (e.g. for ANSPDCP).
 */

/* ----------------------------- data categories ---------------------------- */

/** Coarse categories of personal data the platform processes (art. 30(1)(c)). */
export type RopaDataCategory =
  | 'identity' // name, role
  | 'contact' // e-mail, phone
  | 'apartment' // apartment, stairwell, floor
  | 'content' // submitted content: messages, tickets, documents, photos
  | 'financial' // meter readings, contributions, amounts
  | 'location' // parking spot, routes
  | 'optional' // opt-in extras: date of birth, car plate, pets, directory
  | 'usage'; // technical: session, audit, preferences

/* ------------------------------- profiles --------------------------------- */

/**
 * The processing profile of one activity: what data it touches, on what lawful
 * basis, for how long, and who receives it. All non-data fields are i18n keys so
 * the register can be rendered bilingually.
 */
export interface ProcessingProfile {
  data: RopaDataCategory[];
  /** Lawful basis i18n key under `ropa.basis.*` (carries the art. 6 reference). */
  basisKey: string;
  /** Retention i18n key under `ropa.retain.*`. */
  retentionKey: string;
  /** Recipient category i18n keys under `ropa.recip.*` (art. 30(1)(d)). */
  recipients: string[];
}

/** Recipient keys reused across profiles. */
const COMMITTEE = 'ropa.recip.committee';
const RESIDENTS = 'ropa.recip.residents';
const SELF = 'ropa.recip.self';
const PROCESSOR = 'ropa.recip.processor';

/**
 * Default profile per feature category. Most features process the author's
 * identity plus the content they submit; the category sets the lawful basis and
 * the dominant recipient. Per-feature overrides below sharpen the special cases.
 */
export const CATEGORY_DEFAULTS: Record<FeatureCategory, ProcessingProfile> = {
  communication: {
    data: ['identity', 'content'],
    basisKey: 'ropa.basis.legitimate',
    retentionKey: 'ropa.retain.active',
    recipients: [RESIDENTS, COMMITTEE, PROCESSOR],
  },
  governance: {
    data: ['identity', 'apartment', 'content'],
    basisKey: 'ropa.basis.legal',
    retentionKey: 'ropa.retain.mandate',
    recipients: [RESIDENTS, COMMITTEE, PROCESSOR],
  },
  maintenance: {
    data: ['identity', 'apartment', 'content'],
    basisKey: 'ropa.basis.contract',
    retentionKey: 'ropa.retain.active',
    recipients: [COMMITTEE, PROCESSOR],
  },
  spaces: {
    data: ['identity', 'apartment', 'content'],
    basisKey: 'ropa.basis.contract',
    retentionKey: 'ropa.retain.active',
    recipients: [COMMITTEE, PROCESSOR],
  },
  information: {
    data: ['identity', 'content'],
    basisKey: 'ropa.basis.legitimate',
    retentionKey: 'ropa.retain.active',
    recipients: [RESIDENTS, COMMITTEE, PROCESSOR],
  },
  projects: {
    data: ['identity', 'content'],
    basisKey: 'ropa.basis.contract',
    retentionKey: 'ropa.retain.active',
    recipients: [RESIDENTS, COMMITTEE, PROCESSOR],
  },
  safety: {
    data: ['identity', 'content'],
    basisKey: 'ropa.basis.legitimate',
    retentionKey: 'ropa.retain.active',
    recipients: [COMMITTEE, PROCESSOR],
  },
  community: {
    data: ['identity', 'optional', 'content'],
    basisKey: 'ropa.basis.consent',
    retentionKey: 'ropa.retain.consent',
    recipients: [RESIDENTS, PROCESSOR],
  },
};

/**
 * Per-feature overrides for activities whose data, basis, retention or
 * recipients genuinely differ from their category default (consent-based opt-in
 * features, financial records with a legal retention, anonymous channels, etc.).
 * A partial profile shallow-merges over the category default.
 */
export const FEATURE_OVERRIDES: Partial<Record<FeatureKey, Partial<ProcessingProfile>>> = {
  // Anonymous message to the committee: no identity is attached.
  F05: { data: ['content'], recipients: [COMMITTEE, PROCESSOR] },
  // AGA: legally-mandated assembly records under Law 196/2018.
  F10: { data: ['identity', 'apartment', 'content'], basisKey: 'ropa.basis.legal', retentionKey: 'ropa.retain.mandate' },
  // Participatory budget: financial decisions kept per accounting law.
  F12: { data: ['identity', 'apartment', 'financial'], basisKey: 'ropa.basis.legal', retentionKey: 'ropa.retain.legal10y' },
  // Meter readings tie to billing: financial data on a contract basis.
  F20: { data: ['identity', 'apartment', 'financial'], basisKey: 'ropa.basis.contract', retentionKey: 'ropa.retain.legal10y' },
  // Parking register + location of the spot.
  F28: { data: ['identity', 'apartment', 'location', 'optional'] },
  // Resident directory: opt-in contact data shared with neighbours by consent.
  F36: { data: ['identity', 'contact', 'apartment', 'optional'], basisKey: 'ropa.basis.consent', retentionKey: 'ropa.retain.consent', recipients: [RESIDENTS, PROCESSOR] },
  // Pets register: opt-in.
  F37: { data: ['identity', 'apartment', 'optional'], basisKey: 'ropa.basis.consent', retentionKey: 'ropa.retain.consent', recipients: [RESIDENTS, PROCESSOR] },
  // Trusted-contacts safety code: opt-in, visible only to the author.
  F49: { data: ['identity', 'optional'], basisKey: 'ropa.basis.consent', retentionKey: 'ropa.retain.consent', recipients: [SELF, PROCESSOR] },
  // Children activities: aggregate only, never identifying a child (see T23).
  F64: { data: ['optional'], basisKey: 'ropa.basis.consent', retentionKey: 'ropa.retain.consent', recipients: [RESIDENTS, PROCESSOR] },
  // Crowdfunding small projects: financial contributions.
  F44: { data: ['identity', 'financial'], basisKey: 'ropa.basis.contract', retentionKey: 'ropa.retain.legal10y' },
  // Birthdays: opt-in date of birth.
  F63: { data: ['identity', 'optional'], basisKey: 'ropa.basis.consent', retentionKey: 'ropa.retain.consent', recipients: [RESIDENTS, PROCESSOR] },
};

/** The processing profile for one feature: category default sharpened by any override. */
export function profileFor(feature: FeatureDef): ProcessingProfile {
  const base = CATEGORY_DEFAULTS[feature.category];
  const override = FEATURE_OVERRIDES[feature.key];
  return override ? { ...base, ...override } : { ...base };
}

/* ----------------------------- activity model ----------------------------- */

/**
 * One processing activity in the register. A `feature` activity takes its title
 * and purpose from the feature catalog (i18n); a `platform` activity is one the
 * platform runs for every asociație regardless of enabled features (account,
 * security log, consent proof, data-subject requests) and carries its own keys.
 */
export interface ProcessingActivity extends ProcessingProfile {
  /** Stable id: the feature key, or a `plat-*` id for platform activities. */
  id: string;
  kind: 'feature' | 'platform';
  /** Set when `kind === 'feature'`. */
  featureKey?: FeatureKey;
  /** i18n title key, set when `kind === 'platform'`. */
  titleKey?: string;
  /** i18n purpose key, set when `kind === 'platform'`. */
  purposeKey?: string;
}

/** Categories of data subjects (art. 30(1)(c)) — uniform across the platform. */
export const ROPA_SUBJECTS_KEY = 'ropa.subjects.residents';

/**
 * Baseline activities the platform runs for every asociație, independent of
 * which feature modules are enabled. These exist because there is an account,
 * a security log, a consent record and a data-subject-request channel always.
 */
export const PLATFORM_ACTIVITIES: ProcessingActivity[] = [
  {
    id: 'plat-account',
    kind: 'platform',
    titleKey: 'ropa.platform.account.title',
    purposeKey: 'ropa.platform.account.purpose',
    data: ['identity', 'contact', 'apartment', 'usage'],
    basisKey: 'ropa.basis.contract',
    retentionKey: 'ropa.retain.active',
    recipients: [COMMITTEE, PROCESSOR],
  },
  {
    id: 'plat-security',
    kind: 'platform',
    titleKey: 'ropa.platform.security.title',
    purposeKey: 'ropa.platform.security.purpose',
    data: ['identity', 'usage'],
    basisKey: 'ropa.basis.legitimate',
    retentionKey: 'ropa.retain.security',
    recipients: [COMMITTEE, PROCESSOR],
  },
  {
    id: 'plat-consent',
    kind: 'platform',
    titleKey: 'ropa.platform.consent.title',
    purposeKey: 'ropa.platform.consent.purpose',
    data: ['identity', 'usage'],
    basisKey: 'ropa.basis.legal',
    retentionKey: 'ropa.retain.consent',
    recipients: [COMMITTEE, PROCESSOR],
  },
  {
    id: 'plat-dsr',
    kind: 'platform',
    titleKey: 'ropa.platform.dsr.title',
    purposeKey: 'ropa.platform.dsr.purpose',
    data: ['identity', 'content'],
    basisKey: 'ropa.basis.legal',
    retentionKey: 'ropa.retain.active',
    recipients: [COMMITTEE, PROCESSOR],
  },
];

/**
 * Build the per-asociație register: the always-present platform activities
 * followed by one entry per enabled, implemented feature, in registry order.
 * `enabledKeys` is the set of feature keys turned on for the asociație.
 */
export function buildRopa(enabledKeys: Iterable<string>): ProcessingActivity[] {
  const enabled = new Set(enabledKeys);
  const featureActivities: ProcessingActivity[] = FEATURES.filter(
    (f) => f.implemented && enabled.has(f.key),
  ).map((f) => ({
    id: f.key,
    kind: 'feature',
    featureKey: f.key,
    ...profileFor(f),
  }));
  return [...PLATFORM_ACTIVITIES, ...featureActivities];
}

/* -------------------------------- export ---------------------------------- */

/**
 * Serialize a register (already localized into flat rows by the caller) as CSV
 * for the controller's art. 30 documentation. Empty registers still emit the
 * header row.
 */
export function ropaToCsv(rows: Record<string, unknown>[]): string {
  return rows.length ? Papa.unparse(rows) : '(none)';
}

/** Serialize the localized register as pretty-printed JSON. */
export function ropaToJson(meta: { asociatie: string; generatedAt: string }, rows: Record<string, unknown>[]): string {
  return JSON.stringify({ register: 'art. 30 GDPR', ...meta, activities: rows }, null, 2);
}
