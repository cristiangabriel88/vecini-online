import type { CarpoolProfile } from '@/shared/types/domain';
import { normalizeSearch } from '@/features/faq/faqLogic';

/** A carpool profile needs a destination. */
export function isValidProfile(destination: string): boolean {
  return destination.trim().length >= 2;
}

/** Filter carpool profiles by free-text query over destination + schedule + name,
 *  alphabetically by destination. */
export function searchProfiles(profiles: CarpoolProfile[], query = ''): CarpoolProfile[] {
  const q = normalizeSearch(query.trim());
  return profiles
    .filter((p) =>
      q ? normalizeSearch(`${p.destination} ${p.schedule} ${p.user_name}`).includes(q) : true,
    )
    .sort((a, b) => a.destination.localeCompare(b.destination, 'ro'));
}
