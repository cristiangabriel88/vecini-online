import type { Alert, Apartment } from '@/shared/types/domain';
import { DEMO_ALERTS, DEMO_ASOCIATIE } from '@/shared/demo/demoData';
import { genId } from '@/shared/lib/id';
import {
  type NotifEmailPrefs,
  type NotifPriority,
  shouldSendEmailNotif,
} from '@/shared/lib/notifPrefsLogic';

/**
 * Emergency alerts (F03) scoped per asociație (T184).
 *
 * Pure model so the demo store stays the offline source of truth and the loop
 * (comitet broadcasts, residents are reached) works fully offline. Each asociație
 * owns its own list, keyed by asociație id, so a sent alert belongs to the active
 * tenant and never leaks across asociații. With a real backend the list is
 * hydrated from / written back to `alerts` under RLS (live activation in
 * `alertsApi.ts`); this module stays the single source of the shape, the
 * per-asociație partitioning, the validation, the recipient count and the
 * quiet-hours-bypass rule.
 */

/** All asociații's alerts, keyed by asociație id. */
export type AlertsByAsociatie = Record<string, Alert[]>;

/**
 * The kind tag stamped on every alert sent from the app. Emergency alerts are
 * the only kind for now; the column stays free-text for future variants.
 */
export const ALERT_KIND = 'emergency';

/**
 * Emergency alerts are an essential security communication, so they are
 * dispatched at `urgent` priority, which bypasses both the email opt-out and the
 * configured quiet hours (see `shouldSendEmailNotif`). This constant makes that
 * intent explicit at every call site.
 */
export const ALERT_PRIORITY: NotifPriority = 'urgent';

/**
 * Stable empty list returned for an unknown or null asociație so React selectors
 * keep a constant reference (a fresh `[]` per call would force needless
 * re-renders). Never mutate it; the helpers always build a new array.
 */
const EMPTY_ALERTS = Object.freeze([] as Alert[]) as Alert[];

/**
 * Seed used the first time the store initialises (before any persisted state):
 * the demo asociație gets the seeded alert history so the offline app is
 * populated. Other asociații start empty until a comitet sends one.
 */
export function seedAlerts(): AlertsByAsociatie {
  return { [DEMO_ASOCIATIE.id]: [...DEMO_ALERTS] };
}

/**
 * The alerts for one asociație. Returns the stored list (a stable reference) or
 * a shared frozen empty list when the asociație has none yet or none is active.
 */
export function alertsForAsociatie(
  byAsociatie: AlertsByAsociatie,
  asociatieId: string | null,
): Alert[] {
  if (!asociatieId) return EMPTY_ALERTS;
  return byAsociatie[asociatieId] ?? EMPTY_ALERTS;
}

/** The fields a sender supplies; the rest of the row is derived. */
export interface NewAlertInput {
  title: string;
  body: string;
}

/**
 * Whether the input is sendable: both a title and a body are required (trimmed).
 * Pure so the page's submit guard and the test share one rule.
 */
export function isSendableAlert(input: NewAlertInput): boolean {
  return input.title.trim().length > 0 && input.body.trim().length > 0;
}

/**
 * The real recipient count for the active asociație: the number of residents
 * across its apartments (every listed person on every active apartment). This
 * replaces the old hardcoded 24 so the count reflects the actual building.
 */
export function recipientCount(apartments: Apartment[]): number {
  return apartments.reduce(
    (total, apt) => total + (apt.is_active ? apt.persons.length : 0),
    0,
  );
}

/**
 * Build a sent emergency alert owned by `asociatieId` and authored by the
 * sending user, stamped with the recipient count it reached.
 */
export function newAlert(
  input: NewAlertInput,
  asociatieId: string,
  senderUserId: string,
  recipients: number,
  now: Date = new Date(),
): Alert {
  return {
    id: genId(),
    asociatie_id: asociatieId,
    sender_user_id: senderUserId,
    title: input.title.trim(),
    body: input.body.trim(),
    kind: ALERT_KIND,
    sent_at: now.toISOString(),
    recipient_count: recipients,
  };
}

/**
 * Migrate persisted state from any earlier version to the current shape.
 * Preserves non-demo asociații so a locally-created asociație keeps its sent
 * alerts, but always reseeds the demo asociație from `DEMO_ALERTS` so stale demo
 * content is refreshed on version bump.
 */
export function migrateAlertsState(persisted: unknown): AlertsByAsociatie {
  const state = persisted as { byAsociatie?: unknown } | null;
  const old = state?.byAsociatie;
  if (old && typeof old === 'object') {
    return { ...(old as AlertsByAsociatie), [DEMO_ASOCIATIE.id]: [...DEMO_ALERTS] };
  }
  return seedAlerts();
}

/**
 * Prepend an alert to one asociație's list (newest first), returning a new
 * `byAsociatie` map without mutating the input.
 */
export function addAlertIn(
  byAsociatie: AlertsByAsociatie,
  asociatieId: string,
  alert: Alert,
): AlertsByAsociatie {
  return {
    ...byAsociatie,
    [asociatieId]: [alert, ...(byAsociatie[asociatieId] ?? [])],
  };
}

/**
 * Whether an emergency alert should be delivered to a recipient with the given
 * notification preferences at `nowMs`. Alerts are sent at `urgent` priority, so
 * this returns true even inside the recipient's quiet hours and even when they
 * have opted out of email -- the documented quiet-hours bypass for essential
 * security communication. Kept as a thin, explicitly-named wrapper so the bypass
 * rule is unit-testable on its own.
 */
export function shouldDeliverAlert(prefs: NotifEmailPrefs, nowMs: number): boolean {
  return shouldSendEmailNotif(prefs, ALERT_PRIORITY, nowMs);
}
