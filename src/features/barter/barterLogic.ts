import type { SkillOffering } from '@/shared/types/domain';
import { normalizeSearch } from '@/features/faq/faqLogic';

/** An offering needs at least a short "offers" description. */
export function isValidOffering(offers: string): boolean {
  return offers.trim().length >= 3;
}

/** Filter offerings by free-text over name/offers/needs, sorted by name. */
export function searchOfferings(offerings: SkillOffering[], query = ''): SkillOffering[] {
  const q = normalizeSearch(query.trim());
  return offerings
    .filter((o) =>
      q ? normalizeSearch(`${o.user_name} ${o.offers} ${o.needs}`).includes(q) : true,
    )
    .sort((a, b) => a.user_name.localeCompare(b.user_name, 'ro'));
}
