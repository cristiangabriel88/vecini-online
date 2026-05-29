import Papa from 'papaparse';
import {
  CATEGORY_DEFAULTS,
  FEATURES,
  RECIP_COMMITTEE,
  RECIP_PROCESSOR,
  type FeatureDef,
  type FeatureKey,
  type ProcessingProfile,
} from '@/shared/features/registry';

/* ----------------------- Semantic ROPA guards (T109) ----------------------- */

/**
 * Financial data may only be processed under legal obligation or contract
 * performance -- not under legitimate interest or consent.
 */
const FINANCIAL_VALID_BASES = new Set(['ropa.basis.legal', 'ropa.basis.contract']);

/**
 * Returns one violation message per implemented feature whose resolved profile
 * includes `financial` in its data categories but resolves a basis other than
 * legal or contract. A future financial feature filed under the wrong category
 * would silently inherit an inaccurate art. 30 basis without this guard.
 */
export function financialBasisViolations(features: FeatureDef[]): string[] {
  return features
    .filter((f) => f.implemented)
    .flatMap((f) => {
      const p = profileFor(f);
      return p.data.includes('financial') && !FINANCIAL_VALID_BASES.has(p.basisKey)
        ? [`${f.key}: financial data on ${p.basisKey} (must be legal or contract)`]
        : [];
    });
}

/**
 * Returns one violation message per implemented feature whose resolved profile
 * uses `consent` as its lawful basis but does not include `optional` in its
 * data categories. Consent-based processing applies to opt-in personal data,
 * always flagged with the `optional` category in this registry.
 */
export function consentOptionalViolations(features: FeatureDef[]): string[] {
  return features
    .filter((f) => f.implemented)
    .flatMap((f) => {
      const p = profileFor(f);
      return p.basisKey === 'ropa.basis.consent' && !p.data.includes('optional')
        ? [`${f.key}: consent basis without 'optional' in data (should be opt-in)`]
        : [];
    });
}

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
 * Each feature's processing profile is declared on its `FeatureDef` in the
 * registry (the category default in `CATEGORY_DEFAULTS` plus an optional
 * per-feature `processing` override), so the register is generated from the
 * **same single source that defines the feature** rather than a parallel map
 * kept here. `profileFor` resolves the effective profile for one feature.
 *
 * Everything here is pure and backend-free so it runs in demo mode and is fully
 * unit-testable. The page resolves the i18n keys and offers JSON/CSV export so
 * the admin can produce the register on request (e.g. for ANSPDCP).
 */

// Re-exported from the registry so existing consumers keep a stable import site.
export { CATEGORY_DEFAULTS } from '@/shared/features/registry';
export type { ProcessingProfile, RopaDataCategory } from '@/shared/features/registry';

/**
 * The processing profile for one feature: its category default (from the
 * registry) shallow-merged with the feature's own `processing` override when it
 * declares one, else the category default unchanged. Pure: never mutates the
 * shared default.
 */
export function profileFor(feature: FeatureDef): ProcessingProfile {
  const base = CATEGORY_DEFAULTS[feature.category];
  return feature.processing ? { ...base, ...feature.processing } : { ...base };
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
    recipients: [RECIP_COMMITTEE, RECIP_PROCESSOR],
  },
  {
    id: 'plat-security',
    kind: 'platform',
    titleKey: 'ropa.platform.security.title',
    purposeKey: 'ropa.platform.security.purpose',
    data: ['identity', 'usage'],
    basisKey: 'ropa.basis.legitimate',
    retentionKey: 'ropa.retain.security',
    recipients: [RECIP_COMMITTEE, RECIP_PROCESSOR],
  },
  {
    id: 'plat-consent',
    kind: 'platform',
    titleKey: 'ropa.platform.consent.title',
    purposeKey: 'ropa.platform.consent.purpose',
    data: ['identity', 'usage'],
    basisKey: 'ropa.basis.legal',
    retentionKey: 'ropa.retain.consent',
    recipients: [RECIP_COMMITTEE, RECIP_PROCESSOR],
  },
  {
    id: 'plat-dsr',
    kind: 'platform',
    titleKey: 'ropa.platform.dsr.title',
    purposeKey: 'ropa.platform.dsr.purpose',
    data: ['identity', 'content'],
    basisKey: 'ropa.basis.legal',
    retentionKey: 'ropa.retain.active',
    recipients: [RECIP_COMMITTEE, RECIP_PROCESSOR],
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
