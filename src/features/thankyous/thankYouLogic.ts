/** Minimum message length for a meaningful thank-you note. */
export const MIN_THANK_YOU_LENGTH = 5;

/** A thank-you needs a target apartment and a non-trivial message. */
export function isValidThankYou(message: string, toApartment: string): boolean {
  return toApartment.trim().length > 0 && message.trim().length >= MIN_THANK_YOU_LENGTH;
}

/** Normalise an apartment label to the `Ap. <n>` form used on the wall. */
export function formatApartmentLabel(input: string): string {
  const trimmed = input.trim();
  if (/^ap\.?\s/i.test(trimmed)) return trimmed.replace(/^ap\.?\s*/i, 'Ap. ');
  if (/^\d+$/.test(trimmed)) return `Ap. ${trimmed}`;
  return trimmed;
}
