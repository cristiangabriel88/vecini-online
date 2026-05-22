/**
 * Role-based filtering for the assistant's knowledge base.
 *
 * This is the mechanism that enforces "no admin access": an entry is only ever
 * shown if the current viewer's role bucket is in its audience. Admin/comitet
 * features therefore never reach a resident, and an unknown/demo viewer is
 * deliberately treated as a plain resident so nothing privileged leaks.
 */
import type { Role } from '@/shared/types/domain';
import type { FeatureAudience } from '@/shared/features/registry';
import type { KbEntry } from './knowledge';

/**
 * Audience buckets a given role is allowed to see. Privileged roles inherit the
 * lower buckets (an admin sees everything a resident sees); a resident never
 * sees comitet/admin buckets. `null` (no membership / demo) maps to a resident.
 */
export function rolesToBuckets(role: Role | null | undefined): Set<FeatureAudience> {
  switch (role) {
    case 'super_admin':
    case 'admin':
      return new Set<FeatureAudience>(['all', 'admin', 'comitet', 'proprietar', 'chirias']);
    case 'presedinte':
    case 'comitet':
    case 'cenzor':
      return new Set<FeatureAudience>(['all', 'comitet', 'proprietar', 'chirias']);
    case 'proprietar':
      return new Set<FeatureAudience>(['all', 'proprietar']);
    case 'chirias':
      return new Set<FeatureAudience>(['all', 'chirias']);
    default:
      // Unknown / demo: most permissive that is still non-privileged.
      return new Set<FeatureAudience>(['all', 'proprietar']);
  }
}

/** A single entry is visible if its feature flag is on AND the role may see it. */
export function isEntryVisible(
  entry: KbEntry,
  buckets: Set<FeatureAudience>,
  flags: Record<string, boolean>,
): boolean {
  // Feature entries must be enabled for the association.
  if (entry.featureKey && !flags[entry.featureKey]) return false;
  return entry.audience.some((a) => buckets.has(a));
}

/** Filter the knowledge base down to what the current viewer may see. */
export function visibleEntries(
  entries: KbEntry[],
  role: Role | null | undefined,
  flags: Record<string, boolean>,
): KbEntry[] {
  const buckets = rolesToBuckets(role);
  return entries.filter((e) => isEntryVisible(e, buckets, flags));
}
