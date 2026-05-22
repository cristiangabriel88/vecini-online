/**
 * GDPR / ePrivacy consent model.
 *
 * Non-essential processing (cookies, local storage beyond what is strictly
 * necessary, optional notifications, analytics) is lawful only with the
 * resident's freely given consent (art. 6(1)(a) GDPR, Directiva 2002/58/CE as
 * transposed by Legea nr. 506/2004). This module is the single, pure source of
 * truth for what a resident has agreed to; the store, banner, settings page and
 * notification fan-out all build on it.
 */

/** Bump when the policy text or the category set changes — re-prompts everyone. */
export const CONSENT_VERSION = 1;

export type ConsentCategory = 'necessary' | 'preferences' | 'analytics' | 'marketing';

/** Necessary is mandatory (strictly required to run the app) and never toggled. */
export const OPTIONAL_CATEGORIES: ConsentCategory[] = ['preferences', 'analytics', 'marketing'];
export const ALL_CATEGORIES: ConsentCategory[] = ['necessary', ...OPTIONAL_CATEGORIES];

export type ConsentChoices = Record<ConsentCategory, boolean>;

export interface ConsentRecord {
  choices: ConsentChoices;
  /** Policy version the resident agreed to (drives re-prompting). */
  version: number;
  /** ISO timestamp the decision was recorded — the "when" of who-consented-what. */
  decidedAt: string;
}

/** Only strictly necessary processing on — the privacy-protective default. */
export function defaultChoices(): ConsentChoices {
  return { necessary: true, preferences: false, analytics: false, marketing: false };
}

export function acceptAllChoices(): ConsentChoices {
  return { necessary: true, preferences: true, analytics: true, marketing: true };
}

/** "Reject non-essential" leaves only the mandatory necessary category on. */
export function rejectNonEssentialChoices(): ConsentChoices {
  return defaultChoices();
}

/** Necessary cookies cannot be refused; force them on regardless of input. */
export function normalizeChoices(choices: ConsentChoices): ConsentChoices {
  return { ...choices, necessary: true };
}

/** Whether processing in a category is permitted under the current record. */
export function isAllowed(record: ConsentRecord | null, category: ConsentCategory): boolean {
  if (category === 'necessary') return true;
  return Boolean(record?.choices[category]);
}

/**
 * The consent banner must be shown when the resident has not decided yet or the
 * policy version has advanced past what they last agreed to.
 */
export function needsDecision(record: ConsentRecord | null, version = CONSENT_VERSION): boolean {
  if (!record) return true;
  return record.version < version;
}

/** Build a timestamped, version-stamped record from a set of choices. */
export function makeRecord(
  choices: ConsentChoices,
  now: Date = new Date(),
  version = CONSENT_VERSION,
): ConsentRecord {
  return { choices: normalizeChoices(choices), version, decidedAt: now.toISOString() };
}
