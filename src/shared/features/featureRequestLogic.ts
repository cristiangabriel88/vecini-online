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
 * Is there any recorded demand for this module in this asociație, from any
 * resident? A cheap existence check (no grouping, no sorting) the store uses to
 * skip a clear and its best-effort backend delete when an admin enables a module
 * that nobody had asked for, which is the common case.
 */
export function hasAnyRequest(
  requests: FeatureRequest[],
  asociatieId: string,
  featureKey: string,
): boolean {
  return requests.some(
    (r) => r.asociatieId === asociatieId && r.featureKey === featureKey,
  );
}

/**
 * Aggregated demand for a single module in one asociație, as the admin triage
 * queue shows it: how many residents asked, when the most recent ask landed
 * (the queue is sorted newest-first on this), and their display names so the
 * admin can see who is waiting.
 */
export interface FeatureRequestSummary {
  featureKey: string;
  /** Number of distinct residents who asked (one row per resident per module). */
  count: number;
  /** Timestamp of the most recent request for this module. */
  latestCreatedAt: number;
  /** Requester display names, most recent first, with the unnamed dropped. */
  requesterNames: string[];
}

/**
 * Roll the flat request list up into a per-module triage queue for one asociație:
 * one entry per requested module, carrying the requester count and names, sorted
 * newest-first so the freshest demand sits on top. Pure so the admin surface and
 * the unit tests share it.
 */
export function summarizeRequests(
  requests: FeatureRequest[],
  asociatieId: string,
): FeatureRequestSummary[] {
  const byKey = new Map<string, FeatureRequest[]>();
  for (const r of requests) {
    if (r.asociatieId !== asociatieId) continue;
    const list = byKey.get(r.featureKey);
    if (list) list.push(r);
    else byKey.set(r.featureKey, [r]);
  }
  const summaries: FeatureRequestSummary[] = [];
  for (const [featureKey, list] of byKey) {
    const sorted = [...list].sort((a, b) => b.createdAt - a.createdAt);
    summaries.push({
      featureKey,
      count: sorted.length,
      latestCreatedAt: sorted[0].createdAt,
      requesterNames: sorted
        .map((r) => r.requestedByName)
        .filter((n): n is string => Boolean(n)),
    });
  }
  return summaries.sort((a, b) => b.latestCreatedAt - a.latestCreatedAt);
}

/**
 * Drop every request for one module in one asociație, leaving the rest of the
 * list untouched. The admin calls this once they have actioned the demand (e.g.
 * enabled the module), clearing the satisfied requests from the queue.
 */
export function clearRequestsFor(
  requests: FeatureRequest[],
  asociatieId: string,
  featureKey: string,
): FeatureRequest[] {
  return requests.filter(
    (r) => !(r.asociatieId === asociatieId && r.featureKey === featureKey),
  );
}

/**
 * Swap in the freshly hydrated requests for one asociație, keeping every other
 * asociație's rows. Used when a backend is present and the admin queue is loaded
 * from `feature_requests`: the DB is authoritative for that tenant's slice.
 */
export function replaceAsociatieRequests(
  existing: FeatureRequest[],
  asociatieId: string,
  hydrated: FeatureRequest[],
): FeatureRequest[] {
  return [...hydrated, ...existing.filter((r) => r.asociatieId !== asociatieId)];
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
