import { FEATURES, type FeatureKey } from './registry';
import type { FeatureFlags } from './featureFlagsLogic';

/**
 * Map from a feature's in-app route path (relative to `/app`) to its feature
 * key, built once from the registry. The single source for resolving a route to
 * its feature so the route guard (T44) does not duplicate the path table.
 */
export const PATH_TO_FEATURE: Readonly<Record<string, FeatureKey>> = Object.freeze(
  Object.fromEntries(FEATURES.filter((f) => f.path).map((f) => [f.path as string, f.key])),
);

/**
 * The first path segment under `/app`: `/app/anunturi` -> `anunturi`,
 * `/app/admin/apartamente` -> `admin`, `/app` and `/app/` -> ``. Returns ``
 * for anything outside `/app`, so a non-app path is never treated as a feature.
 */
export function appRouteSegment(pathname: string): string {
  const match = pathname.replace(/\/+$/, '').match(/^\/app(?:\/(.*))?$/);
  if (!match || !match[1]) return '';
  return match[1].split('/')[0] ?? '';
}

/** The feature key owning a route segment, or undefined for non-feature routes. */
export function featureKeyForRoute(segment: string): FeatureKey | undefined {
  return PATH_TO_FEATURE[segment];
}

/**
 * Is the given `/app/*` pathname a feature route whose flag is OFF for the
 * active asociație? Non-feature routes (home, actiuni, profil, admin, …) and
 * enabled features return false, so only a genuinely disabled module is
 * blocked. This is what stops a disabled module from being reached by typing
 * its URL even though it is hidden from the nav.
 */
export function isFeatureRouteBlocked(flags: FeatureFlags, pathname: string): boolean {
  const key = featureKeyForRoute(appRouteSegment(pathname));
  if (!key) return false;
  return !flags[key];
}
