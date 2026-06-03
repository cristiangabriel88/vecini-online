import type { ThankYou } from '@/shared/types/domain';
import { DEMO_ASOCIATIE, DEMO_THANK_YOUS } from '@/shared/demo/demoData';

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

// ── Per-asociatie thank-yous catalog ────────────────────────────────────────

export type ThankYousByAsociatie = Record<string, ThankYou[]>;

const EMPTY_THANKYOUS: ThankYou[] = [];

export function thankYousForAsociatie(
  map: ThankYousByAsociatie,
  asociatieId: string | null,
): ThankYou[] {
  if (!asociatieId) return EMPTY_THANKYOUS;
  return map[asociatieId] ?? EMPTY_THANKYOUS;
}

export function seedThankYous(): ThankYousByAsociatie {
  return { [DEMO_ASOCIATIE.id]: [...DEMO_THANK_YOUS] };
}

export function addThankYouIn(
  map: ThankYousByAsociatie,
  asociatieId: string,
  item: ThankYou,
): ThankYousByAsociatie {
  const current = map[asociatieId] ?? [];
  return { ...map, [asociatieId]: [item, ...current] };
}

export function migrateThankYousState(persisted: unknown): ThankYousByAsociatie {
  const p = persisted as { byAsociatie?: ThankYousByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return { ...existing, [DEMO_ASOCIATIE.id]: [...DEMO_THANK_YOUS] };
}
