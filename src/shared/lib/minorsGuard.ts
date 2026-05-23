/**
 * Minors' privacy guardrails (T23) — Legea 190/2018 + GDPR art. 8.
 *
 * The platform's rule, codified here so it is *enforced, not merely declared*:
 * no feature may collect data that identifies a child. Information about minors
 * (today only F64 Activități copii) is processed strictly in aggregate — counts
 * per age bucket, never a name, photo, date of birth, school or any other
 * identifier. Should a future minor-facing feature ever need a child's
 * identifying data, it must be gated behind the consent of a parent or legal
 * representative (art. 8 GDPR / art. 8 Legea 190/2018) — never collected silently.
 *
 * This module gives both halves the enforcement needs:
 *  - a runtime guard (`assertAggregateOnly`) the minor-facing stores call when
 *    building a record, so an identifying field can never reach the store; and
 *  - the field allowlists + the identity-name detector that the regression tests
 *    lock the F64 data model, the demo seed and the SQL schema against.
 */

/** The legal anchor for the rule, quotable in docs and the consent surface. */
export const MINORS_RULE = {
  legalBasis: 'GDPR art. 8; Legea nr. 190/2018 art. 8',
  /** What the platform commits to and enforces. */
  summary:
    'No feature collects identifying data about children. Data about minors is processed only in aggregate (age-range counts), never identifying a child. Any future minor-facing identifying data requires parental or legal-representative consent.',
} as const;

/**
 * The exact, allowed field set of each minor-facing record. A record that
 * carries any key outside its allowlist is rejected by `assertAggregateOnly`,
 * and the regression tests assert the live types/seed/schema match these sets —
 * so adding a field to a kids record forces a deliberate update here, where the
 * rule above is in view, rather than slipping an identifier in unnoticed.
 */
export const KIDS_AGE_RANGE_FIELDS = ['id', 'asociatie_id', 'user_id', 'bucket', 'count'] as const;

export const KIDS_EVENT_FIELDS = [
  'id',
  'asociatie_id',
  'title',
  'date',
  'time',
  'location',
  'bucket',
  'note',
  'interested',
  'organizer_user_id',
  'organizer_name',
  'created_at',
] as const;

/**
 * Field-name patterns that would identify a *child* (as opposed to the adult
 * parent/organizer, whose `user_id`/`organizer_name` are legitimate). This is the
 * platform-wide net for any future minor-facing record that has no allowlist yet:
 * a column named like `child_name`, `data_nasterii_copilului`, `cnp`, `scoala`,
 * `birthday`, etc. is flagged. Bare `name`/`email` are intentionally NOT here —
 * they describe the responsible adult; only child-scoped or inherently
 * minor-identifying names match.
 */
export const MINOR_IDENTITY_FIELD_PATTERNS: RegExp[] = [
  // Child-scoped identifier: "child"/"kid"/"copil"/"minor"/"elev" near an identity attribute.
  /(child|children|kid|minor|copil|copii|minor[iu]?|elev|pupil|toddler|infant)[_a-z]*?(name|nume|prenume|photo|foto|poz[ăa]|image|avatar|face|address|adres[ăa]|phone|telefon|email|mail|cnp|id)/i,
  // Inherently minor-identifying attributes, on any minor-facing record.
  /(date_?of_?birth|birth_?date|data_?na[șs]ter|birthday|naster)/i,
  /\bcnp\b/i, // Romanian national identification number
  /(school|[șs]coal[ăa]|gr[ăa]dini[țt][ăa]|kindergarten|teacher|[îi]nv[ăa][țt][ăa]tor|class(room)?|clas[ăa])/i,
];

/** The keys of `fieldNames` that look like they would identify a minor. */
export function minorIdentityFields(fieldNames: readonly string[]): string[] {
  return fieldNames.filter((name) => MINOR_IDENTITY_FIELD_PATTERNS.some((re) => re.test(name)));
}

/** The keys of `record` that fall outside the allowed aggregate field set. */
export function unexpectedFields(record: object, allowed: readonly string[]): string[] {
  return Object.keys(record).filter((key) => !allowed.includes(key));
}

/** Raised when a record would carry data that identifies a child. */
export class MinorIdentityError extends Error {
  readonly offendingFields: string[];
  constructor(context: string, offendingFields: string[]) {
    super(
      `Minors' privacy rule (${MINORS_RULE.legalBasis}): "${context}" must stay aggregate, ` +
        `but carries non-aggregate/identifying field(s): ${offendingFields.join(', ')}. ` +
        `Keep minor-facing data aggregate, or gate identifying data behind parental consent.`,
    );
    this.name = 'MinorIdentityError';
    this.offendingFields = offendingFields;
  }
}

/**
 * Enforce that a minor-facing record carries only its allowlisted aggregate
 * fields and nothing that names/identifies a child. Throws `MinorIdentityError`
 * otherwise. Called by the F64 stores on every write so the rule is enforced at
 * runtime, not just asserted in tests.
 */
export function assertAggregateOnly(
  record: object,
  allowed: readonly string[],
  context: string,
): void {
  const offending = [
    ...new Set([...unexpectedFields(record, allowed), ...minorIdentityFields(Object.keys(record))]),
  ];
  if (offending.length > 0) {
    throw new MinorIdentityError(context, offending);
  }
}
