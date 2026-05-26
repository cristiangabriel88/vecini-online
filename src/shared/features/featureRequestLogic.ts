/**
 * Resident-driven feature activation requests (T150).
 *
 * A module disabled for the active asociație is hidden from the nav and gated at
 * the route (see `FeatureRouteGuard`). When a resident reaches such a module they
 * cannot turn it on themselves: only the asociație admin controls the feature
 * flags (live activation, T56). This logic lets a resident *ask* the admin to
 * enable it: a small, deduplicated request the admin can later triage.
 *
 * Everything here is deterministic and backend-free so it runs in demo mode and
 * is fully unit-testable; the store wires it to the persisted request list and
 * mirrors rows to `feature_requests` when a backend is present.
 */

export interface FeatureRequest {
  id: string;
  /** Asociație the activation is being asked for. */
  asociatieId: string;
  /** Registry feature key (e.g. "F12"). */
  featureKey: string;
  /** Resident who asked (auth uid, or the demo user id offline). */
  requestedById: string;
  /** Display name captured at request time, so the admin queue stays readable. */
  requestedByName: string | null;
  createdAt: number;
}

function newId(now: number): string {
  return `frq-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Build a fresh activation request owned by the asociație + requester. */
export function newFeatureRequest(
  asociatieId: string,
  featureKey: string,
  requestedById: string,
  requestedByName: string | null,
  now: number = Date.now(),
): FeatureRequest {
  return {
    id: newId(now),
    asociatieId,
    featureKey,
    requestedById,
    requestedByName: requestedByName?.trim() ? requestedByName.trim() : null,
    createdAt: now,
  };
}

/**
 * Has this resident already asked for this module in this asociație? The button
 * flips to a "requested" state on a match so a single resident cannot spam the
 * admin with duplicates (the table also enforces this with a unique constraint).
 */
export function hasRequested(
  requests: FeatureRequest[],
  asociatieId: string,
  featureKey: string,
  requestedById: string,
): boolean {
  return requests.some(
    (r) =>
      r.asociatieId === asociatieId &&
      r.featureKey === featureKey &&
      r.requestedById === requestedById,
  );
}

/**
 * Append a request unless the same resident already filed one for this module
 * (idempotent). Returns the next list and the record that was added, or `null`
 * when it was a duplicate so the caller can skip the backend mirror.
 */
export function addRequest(
  requests: FeatureRequest[],
  asociatieId: string,
  featureKey: string,
  requestedById: string,
  requestedByName: string | null,
  now: number = Date.now(),
): { requests: FeatureRequest[]; added: FeatureRequest | null } {
  if (hasRequested(requests, asociatieId, featureKey, requestedById)) {
    return { requests, added: null };
  }
  const added = newFeatureRequest(asociatieId, featureKey, requestedById, requestedByName, now);
  return { requests: [added, ...requests], added };
}
